import { Router, type Request, type Response } from "express";
import { runSelfHealingLoop } from "../services/selfHealingAgent.js";
import { readLogFile, DEFAULT_LOG_PATH } from "../mcp/localLogMCPClient.js";
import {
  runCoordinatorAgent,
  runGovernanceBoard,
  governancePassed,
  governanceFeedback,
  type GovernanceBoard,
} from "../services/coordinatorAgent.js";
import { runQAAgent } from "../services/qaAgent.js";
import { storePatch } from "../services/pendingPatchStore.js";
import { sendSlackAlert } from "../services/slack.js";

const router = Router();

interface CIFailurePayload {
  project: string;       // GitLab "namespace/project"
  branchName: string;
  failedFilePath: string;
  ciErrorLogs: string;
}

/**
 * POST /api/webhooks/ci-failure
 *
 * Accepts a GitLab CI failure notification and immediately responds 202.
 * The self-healing loop runs asynchronously — caller does not wait for completion.
 */
router.post("/ci-failure", (req: Request, res: Response) => {
  const { project, branchName, failedFilePath, ciErrorLogs } =
    req.body as CIFailurePayload;

  if (!project || !branchName || !failedFilePath || !ciErrorLogs) {
    res.status(400).json({
      success: false,
      error: "Missing required fields: project, branchName, failedFilePath, ciErrorLogs",
    });
    return;
  }

  console.log(
    `[Webhook] CI failure received — ${project}@${branchName} — file: ${failedFilePath}`
  );

  res.status(202).json({
    message: "Self-healing initiated",
    project,
    branchName,
    failedFilePath,
  });

  runSelfHealingLoop(project, branchName, failedFilePath, ciErrorLogs).catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Webhook] Self-healing loop failed: ${msg}`);
  });
});

// ---------------------------------------------------------------------------
// Predictive Patching — Datadog latency warning webhook
// ---------------------------------------------------------------------------

const PREDICTIVE_WARNING =
  "LATENCY WARNING: Stripe API p99 response time has increased by 400% over the last 10 minutes. " +
  "Current p99: 11,840ms (baseline: 2,960ms). " +
  "Rate of degradation suggests a full timeout crash within 30 minutes. " +
  "No 500 errors yet — system is still operational. Predictive patch required.";

const MAX_RETRIES = 2;

/**
 * POST /api/webhooks/datadog/warning
 *
 * Simulates a Datadog latency-spike alert. Responds 202 immediately and runs
 * the full Praxis Governance Board pipeline (Coordinator → 3 concurrent critics
 * → QA Agent → Slack) in PREDICTIVE mode.
 */
router.post("/datadog/warning", (req: Request, res: Response) => {
  const incidentId = `PRED-${Date.now()}`;
  const service = (req.body as { service?: string }).service ?? "payment-service";

  console.log(`[Predictive] Warning received — incident=${incidentId} service=${service}`);

  res.status(202).json({ message: "Predictive pipeline initiated", incidentId, service });

  void (async () => {
    try {
      await sendSlackAlert(
        incidentId,
        "INITIALIZING",
        `⚠️ Latency spike detected on *${service}*. Praxis is generating a pre-emptive defensive patch.`,
        undefined, undefined, true
      );

      let serverLog = "";
      try { serverLog = await readLogFile(DEFAULT_LOG_PATH); } catch { /* non-fatal */ }
      const traceData = `${PREDICTIVE_WARNING}\n\n--- Live Server Log ---\n${serverLog}`;

      let attempts = 0;
      let feedback: string | undefined;
      let agentResponse = await runCoordinatorAgent(traceData, incidentId, undefined, true);
      let board!: GovernanceBoard;

      while (true) {
        console.log(`[Predictive] Governance Board — attempt ${attempts + 1}/${MAX_RETRIES + 1}`);

        if (attempts > 0) {
          agentResponse = await runCoordinatorAgent(traceData, incidentId, feedback, true);
        }

        const patchSummary =
          `Proposed fix summary:\n${agentResponse.agentAnalysis.body}\n\nTelemetry:\n${traceData}`;

        try {
          board = await runGovernanceBoard(patchSummary);
          console.log(
            `[Predictive] Governance Board — Security=${board.security.rating} ` +
            `FinOps=${board.finops.rating} Architecture=${board.architecture.rating}`
          );
        } catch {
          console.warn("[Predictive] Governance Board unavailable — escalating");
          board = {
            security:     { rating: "RISKY", critique: "Critic unavailable." },
            finops:       { rating: "VETO",  critique: "Critic unavailable." },
            architecture: { rating: "VETO",  critique: "Critic unavailable." },
          };
        }

        if (governancePassed(board)) break;

        attempts++;
        if (attempts >= MAX_RETRIES) break;
        feedback = governanceFeedback(board);
      }

      agentResponse.agentAnalysis.governanceBoard = board;

      const patchFiles = agentResponse.agentAnalysis.files ?? [];
      let allFiles = patchFiles;
      try {
        const testFile = await runQAAgent(traceData, patchFiles);
        allFiles = [...patchFiles, testFile];
        agentResponse.agentAnalysis.files = allFiles;
      } catch (err) {
        console.warn(`[Predictive] QA Agent non-fatal: ${err instanceof Error ? err.message : err}`);
      }

      const analysis = agentResponse.agentAnalysis;
      storePatch(
        incidentId,
        {
          project: process.env.GITLAB_PROJECT ?? "82145569",
          files: allFiles,
          branchName: `predictive-${Date.now()}`,
          targetBranch: "main",
          commitMessage: `perf: predictive defence — ${analysis.title?.toLowerCase() ?? incidentId}`,
          mrTitle: `[PREDICTIVE] ${analysis.title ?? `Pre-emptive fix for ${incidentId}`}`,
          mrDescription: analysis.body ?? "",
        },
        traceData,
        board
      );

      await sendSlackAlert(
        incidentId,
        "PATCH_READY",
        analysis.body?.slice(0, 300),
        undefined,
        board,
        true
      );

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Predictive] Pipeline error: ${msg}`);
      await sendSlackAlert(incidentId, "FAILED", msg, undefined, undefined, true);
    }
  })();
});

export default router;
