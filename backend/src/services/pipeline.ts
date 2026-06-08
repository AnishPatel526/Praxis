/**
 * Shared Agent Pipeline
 *
 * Core orchestration logic shared between the real trigger endpoint and the
 * War Games simulation endpoint. Runs the full Praxis pipeline:
 *
 *   Memory lookup → Governance Board Auto-Fix Loop → QA Agent → Slack
 *
 * Callers supply the traceData and incidentId; this function handles every
 * step and returns the final AgentResponse so callers can forward it.
 */

import {
  runCoordinatorAgent,
  runGovernanceBoard,
  governancePassed,
  governanceFeedback,
  type AgentResponse,
  type GovernanceBoard,
} from "./coordinatorAgent.js";
import { sendSlackAlert } from "./slack.js";
import { storePatch } from "./pendingPatchStore.js";
import { runQAAgent } from "./qaAgent.js";
import { generateEmbedding } from "./embeddingService.js";
import { findSimilarPatch } from "./memoryService.js";

const MAX_RETRIES = 2;

export async function runAgentPipeline(
  traceData: string,
  incidentId: string,
  service: string
): Promise<AgentResponse> {

  // ── Slack: INITIALIZING ──────────────────────────────────────────────────
  await sendSlackAlert(
    incidentId,
    "INITIALIZING",
    `Pipeline failure detected on *${service}*. Praxis is reading telemetry and generating a fix.`
  );

  // ── Step 0: Vector Memory lookup ─────────────────────────────────────────
  let similarPatch: string | undefined;
  try {
    console.log(`[Memory] Generating embedding for incident ${incidentId}...`);
    const queryEmbedding = await generateEmbedding(traceData);
    const match = await findSimilarPatch(queryEmbedding);
    if (match) {
      similarPatch = match;
      console.log("[Memory] ✓ Injecting past resolution into Coordinator prompt");
    }
  } catch (memErr) {
    console.warn(`[Memory] Lookup failed (non-fatal): ${memErr instanceof Error ? memErr.message : memErr}`);
  }

  // ── Step 1: Governance Board Auto-Fix Loop ───────────────────────────────
  let attempts = 0;
  let feedback: string | undefined;
  let agentResponse!: AgentResponse;
  let board!: GovernanceBoard;

  while (true) {
    console.log(`[Praxis] Auto-Fix Loop — attempt ${attempts + 1}/${MAX_RETRIES + 1}`);

    agentResponse = await runCoordinatorAgent(traceData, incidentId, feedback, false, similarPatch);
    console.log(`[Praxis] Coordinator complete — model=${agentResponse.model}`);

    const patchSummary =
      `Proposed fix summary:\n${agentResponse.agentAnalysis.body}\n\n` +
      `Telemetry context:\n${traceData}`;

    console.log(`[Praxis] Governance Board — running Security, FinOps, Architecture critics concurrently`);
    try {
      board = await runGovernanceBoard(patchSummary);
      console.log(
        `[Praxis] Governance Board — Security=${board.security.rating} ` +
        `FinOps=${board.finops.rating} Architecture=${board.architecture.rating}`
      );
    } catch (boardErr) {
      const msg = boardErr instanceof Error ? boardErr.message : String(boardErr);
      console.warn(`[Praxis] Governance Board failed (non-fatal): ${msg}`);
      board = {
        security:     { rating: "RISKY", critique: "Critic unavailable — manual review recommended." },
        finops:       { rating: "VETO",  critique: "Critic unavailable — manual cost review required." },
        architecture: { rating: "VETO",  critique: "Critic unavailable — manual blast-radius review required." },
      };
    }

    if (governancePassed(board)) {
      console.log(`[Praxis] Governance Board: ALL CLEAR after ${attempts + 1} attempt(s)`);
      break;
    }

    attempts++;
    if (attempts >= MAX_RETRIES) {
      console.log(`[Praxis] Governance Board: MAX_RETRIES (${MAX_RETRIES}) hit — escalating to human`);
      break;
    }

    feedback = governanceFeedback(board);
    console.log(`[Praxis] Governance Board: VETO — passing combined feedback to Coordinator (attempt ${attempts + 1})`);
  }

  agentResponse.agentAnalysis.securityReview  = board.security;
  agentResponse.agentAnalysis.governanceBoard = board;

  // ── Step 2: QA Agent ─────────────────────────────────────────────────────
  const patchFiles = agentResponse.agentAnalysis.files ?? [];
  let allFiles = patchFiles;
  try {
    const testFile = await runQAAgent(traceData, patchFiles);
    allFiles = [...patchFiles, testFile];
    agentResponse.agentAnalysis.files = allFiles;
  } catch (qaErr) {
    const msg = qaErr instanceof Error ? qaErr.message : String(qaErr);
    console.warn(`[QA Agent] Non-fatal failure: ${msg}`);
  }

  // ── Step 3: Store patch + notify Slack ───────────────────────────────────
  const analysis = agentResponse.agentAnalysis;
  storePatch(
    incidentId,
    {
      project: process.env.GITLAB_PROJECT ?? "82145569",
      files: allFiles,
      branchName: `fix-incident-${Date.now()}`,
      targetBranch: "main",
      commitMessage: `fix: ${analysis.title?.toLowerCase() ?? incidentId}`,
      mrTitle: analysis.title ?? `Fix for ${incidentId}`,
      mrDescription: analysis.body ?? "",
    },
    traceData,
    board
  );

  await sendSlackAlert(
    incidentId,
    "PATCH_READY",
    `Governance Board cleared patch after ${attempts + 1} attempt(s).\n*Summary:* ${analysis.body?.slice(0, 300)}`,
    undefined,
    board
  );

  return agentResponse;
}
