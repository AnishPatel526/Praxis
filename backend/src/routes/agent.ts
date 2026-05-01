import { Router, type Request, type Response } from "express";
import { readLogFile, DEFAULT_LOG_PATH } from "../mcp/localLogMCPClient.js";
import {
  runCoordinatorAgent,
  runSecurityCritic,
  type AgentResponse,
  type SecurityReview,
} from "../services/coordinatorAgent.js";

const router = Router();

const MAX_RETRIES = 2;

/**
 * POST /api/agent/trigger
 *
 * Autonomous Self-Correction pipeline:
 *   1. MCP → MockDatadogServer → telemetry trace
 *   2. Auto-Fix Loop (up to MAX_RETRIES):
 *      a. Coordinator (gemini-2.5-pro) → A2UI patch payload
 *      b. Security Critic (gemini-2.5-flash) → { rating, critique }
 *      c. SECURE → break and return to UI
 *      d. RISKY  → pass critique as feedback, retry
 *   3. If MAX_RETRIES hit and still RISKY, return anyway for human review
 */
router.post("/trigger", async (req: Request, res: Response) => {
  const { incidentId = "INC-4821", service = "payment-service" } = req.body as {
    incidentId?: string;
    service?: string;
  };

  console.log(`[Praxis] Trigger received — incident=${incidentId} service=${service}`);

  try {
    // Step 1: Read live telemetry from local log via Filesystem MCP
    console.log(`[Praxis] Step 1 — Filesystem MCP: read_file ${DEFAULT_LOG_PATH}`);
    const traceData = await readLogFile(DEFAULT_LOG_PATH);
    console.log(`[Praxis] Log file read (${traceData.length} chars)`);

    // Step 2: Auto-Fix Loop
    let attempts = 0;
    let feedback: string | undefined;
    let agentResponse!: AgentResponse;
    let securityReview!: SecurityReview;

    while (true) {
      console.log(`[Praxis] Auto-Fix Loop — attempt ${attempts + 1}/${MAX_RETRIES + 1}`);

      // (a) Coordinator generates/revises the patch
      agentResponse = await runCoordinatorAgent(traceData, incidentId, feedback);
      console.log(`[Praxis] Coordinator complete — model=${agentResponse.model}`);

      // (b) Security Critic audits the patch
      const patchSummary =
        `Proposed fix summary:\n${agentResponse.agentAnalysis.body}\n\n` +
        `Telemetry context:\n${traceData}`;

      try {
        securityReview = await runSecurityCritic(patchSummary);
        console.log(`[Praxis] Security Critic — rating=${securityReview.rating} (attempt ${attempts + 1})`);
      } catch (secErr) {
        const msg = secErr instanceof Error ? secErr.message : String(secErr);
        console.warn(`[Praxis] Security Critic failed (non-fatal): ${msg}`);
        securityReview = {
          rating: "RISKY",
          critique: "Security critic unavailable — manual review recommended.",
        };
      }

      // (c) SECURE → done
      if (securityReview.rating === "SECURE") {
        console.log(`[Praxis] Auto-Fix Loop: SECURE after ${attempts + 1} attempt(s) — returning to UI`);
        break;
      }

      // (d) RISKY → retry or escalate
      attempts++;
      if (attempts >= MAX_RETRIES) {
        console.log(`[Praxis] Auto-Fix Loop: MAX_RETRIES (${MAX_RETRIES}) hit — escalating to human`);
        break;
      }

      feedback = securityReview.critique;
      console.log(`[Praxis] Auto-Fix Loop: RISKY — passing feedback to Coordinator (attempt ${attempts + 1})`);
    }

    agentResponse.agentAnalysis.securityReview = securityReview;

    res.json({
      success: true,
      incidentId,
      service,
      pipeline: agentResponse,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Praxis] Pipeline error: ${message}`);
    res.status(500).json({ success: false, error: message, incidentId, service });
  }
});

export default router;
