/**
 * CoordinatorAgent + Governance Board Critics
 *
 * Three-agent Governance Board Pattern:
 *   1. Coordinator       — generates the A2UI multi-file patch payload
 *   2. Security Critic   — audits for vulnerabilities (SECURE | RISKY)
 *   3. FinOps Critic     — audits for cost/complexity issues (PASS | VETO)
 *   4. Architecture Critic — audits blast radius (PASS | VETO)
 *
 * Critics 2-4 run concurrently via Promise.all. ALL three must clear the patch
 * before it advances to the QA Agent.
 */

import { queryAgent } from "./agentBuilderClient.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SecurityReview {
  rating: "SECURE" | "RISKY";
  critique: string;
}

export interface CriticReview {
  rating: "PASS" | "VETO";
  critique: string;
}

export interface GovernanceBoard {
  security: SecurityReview;
  finops: CriticReview;
  architecture: CriticReview;
}

export interface FileChange {
  filePath: string;
  fileContent: string;
}

export interface A2UIPayload {
  type: "analysis" | "telemetry" | "root_cause" | "patch_ready" | "idle";
  title: string;
  body: string;
  meta?: Record<string, string>;
  severity?: "critical" | "high" | "medium" | "low";
  files?: FileChange[];
  securityReview?: SecurityReview;
  criticFeedback?: string | null;
  governanceBoard?: GovernanceBoard;
}

export interface AgentResponse {
  success: boolean;
  traceData: string;
  agentAnalysis: A2UIPayload;
  model: string;
  executionMode: "live" | "mocked";
}

// ---------------------------------------------------------------------------
// Governance Board helpers
// ---------------------------------------------------------------------------

export function governancePassed(board: GovernanceBoard): boolean {
  return (
    board.security.rating === "SECURE" &&
    board.finops.rating === "PASS" &&
    board.architecture.rating === "PASS"
  );
}

export function governanceFeedback(board: GovernanceBoard): string {
  const vetoes: string[] = [];
  if (board.security.rating !== "SECURE")
    vetoes.push(`Security: ${board.security.critique}`);
  if (board.finops.rating !== "PASS")
    vetoes.push(`FinOps: ${board.finops.critique}`);
  if (board.architecture.rating !== "PASS")
    vetoes.push(`Architecture: ${board.architecture.critique}`);
  return vetoes.join(" | ");
}

// ---------------------------------------------------------------------------
// Coordinator Agent
// ---------------------------------------------------------------------------

const COORDINATOR_INSTRUCTION = `You are a Senior Staff Engineer and Autonomous DevOps Agent. Analyze the given CI/CD pipeline failure and produce a complete multi-file fix.

You can modify multiple files to fully resolve the incident. Once approved, the fix will be submitted as a GitLab Merge Request. Return ONLY a valid JSON object — no markdown, no code fences, no explanation:

{
  "type": "patch_ready",
  "title": "<UPPERCASE TITLE>",
  "body": "<one paragraph: root cause and what each file change does>",
  "severity": "<critical|high|medium|low>",
  "meta": {
    "Confidence": "<XX%>",
    "Pattern": "<failure pattern name>",
    "Files changed": "<N>",
    "Tests": "<N / N passed>"
  },
  "files": [
    { "filePath": "<relative/path/to/file.ts>", "fileContent": "<complete corrected file content>" }
  ],
  "criticFeedback": "<string | null>"
}

If this patch required multiple attempts because the Governance Board rejected an earlier draft, you MUST populate "criticFeedback" with a brief explanation of what the critics caught. If this is the first attempt, set "criticFeedback" to null.`;

const MEMORY_PREFIX = (pastPatch: string) =>
  `🧠 SYSTEM MEMORY: A highly similar incident was previously resolved with the following code. ` +
  `Strongly consider adapting this exact logic:\n\n${pastPatch.slice(0, 4000)}\n\n`;

export async function runCoordinatorAgent(
  traceData: string,
  incidentId: string,
  governanceFeedbackStr?: string,
  predictive?: boolean,
  similarPatch?: string
): Promise<AgentResponse> {

  const memoryBlock = similarPatch ? MEMORY_PREFIX(similarPatch) : "";

  let message: string;

  if (governanceFeedbackStr) {
    message =
      `${memoryBlock}${COORDINATOR_INSTRUCTION}\n\n` +
      `Incident ID: ${incidentId}\n\nTelemetry Trace:\n${traceData}\n\n` +
      `CRITICAL: Your previous patch was rejected by the Governance Board. ` +
      `Combined critique: '${governanceFeedbackStr}'. ` +
      `You must generate a new JSON patch that completely resolves all flagged issues.`;
  } else if (predictive) {
    message =
      `${memoryBlock}${COORDINATOR_INSTRUCTION}\n\n` +
      `Incident ID: ${incidentId}\n\nTelemetry Warning (PREDICTIVE — no crash yet):\n${traceData}\n\n` +
      `IMPORTANT: This is a PREDICTIVE pre-emptive action. The system has NOT crashed yet. ` +
      `Telemetry shows a 400% increase in Stripe API latency — a timeout crash is statistically imminent. ` +
      `Generate a DEFENSIVE patch that adds circuit-breaker logic, exponential backoff, and a graceful ` +
      `fallback so the system degrades gracefully instead of crashing when the timeout hits.`;
  } else {
    // Sabotage: force a naïve TTL-only fix on attempt 0 to guarantee the loop fires
    message =
      `${memoryBlock}${COORDINATOR_INSTRUCTION}\n\n` +
      `Incident ID: ${incidentId}\n\nTelemetry Trace:\n${traceData}\n\n` +
      `To fix the race condition, just increase the token maxAge to 10000. ` +
      `Do not add any exponential backoff or retry logic, keep it simple.`;
  }

  const raw = await queryAgent(message);

  let agentAnalysis: A2UIPayload;
  try {
    agentAnalysis = JSON.parse(raw) as A2UIPayload;
  } catch {
    agentAnalysis = {
      type: "patch_ready",
      title: "ANALYSIS COMPLETE — PARSE ERROR",
      body: `Agent returned a non-JSON response. Raw output: ${raw.slice(0, 300)}`,
      severity: "high",
    };
  }

  return {
    success: true,
    traceData,
    agentAnalysis,
    model: `agent-builder/${process.env.GCP_AGENT_ID ?? "unknown"}`,
    executionMode: "live",
  };
}

// ---------------------------------------------------------------------------
// Security Critic Agent  (SECURE | RISKY)
// ---------------------------------------------------------------------------

const SECURITY_CRITIC_INSTRUCTION =
  "You are a Lead Security Architect. Review this proposed patch. " +
  'Return ONLY a valid JSON object: { "rating": "SECURE" | "RISKY", "critique": "brief explanation" }. ' +
  "Do not output markdown, code fences, or any text outside the JSON object.";

export async function runSecurityCritic(patchCode: string): Promise<SecurityReview> {
  const message = `${SECURITY_CRITIC_INSTRUCTION}\n\nPatch to review:\n\n${patchCode}`;
  const raw = await queryAgent(message, "gemini-2.5-flash");
  try {
    return JSON.parse(raw) as SecurityReview;
  } catch {
    return {
      rating: "RISKY",
      critique: "Security critic returned a non-parseable response — manual review required.",
    };
  }
}

// ---------------------------------------------------------------------------
// FinOps Critic Agent  (PASS | VETO)
// ---------------------------------------------------------------------------

const FINOPS_CRITIC_INSTRUCTION =
  "You are a Cloud Cost SRE. Analyze this patch for Big-O complexity and API usage patterns. " +
  "If the patch uses inefficient loops such as infinite DB retries without exponential backoff, " +
  "unbounded polling, O(n²) database calls, or runaway API fan-out, rate it VETO and provide " +
  "specific cost-saving feedback. Otherwise rate it PASS. " +
  'Return ONLY a valid JSON object: { "rating": "PASS" | "VETO", "critique": "brief explanation" }. ' +
  "No markdown, no code fences, no text outside the JSON object.";

export async function runFinOpsCritic(patchCode: string): Promise<CriticReview> {
  const message = `${FINOPS_CRITIC_INSTRUCTION}\n\nPatch to review:\n\n${patchCode}`;
  const raw = await queryAgent(message, "gemini-2.5-flash");
  try {
    return JSON.parse(raw) as CriticReview;
  } catch {
    return {
      rating: "VETO",
      critique: "FinOps critic returned a non-parseable response — manual cost review required.",
    };
  }
}

// ---------------------------------------------------------------------------
// Architecture Critic Agent  (PASS | VETO)
// ---------------------------------------------------------------------------

const ARCHITECTURE_CRITIC_INSTRUCTION =
  "You are a Staff Engineer. Analyze the import/export statements and provided context to calculate " +
  "the Blast Radius of this patch. If the patch severely breaks downstream microservices, removes " +
  "critical shared interfaces, introduces breaking API contract changes, or creates circular " +
  "dependency chains, rate it VETO. Otherwise rate it PASS. " +
  'Return ONLY a valid JSON object: { "rating": "PASS" | "VETO", "critique": "brief explanation" }. ' +
  "No markdown, no code fences, no text outside the JSON object.";

export async function runArchitectureCritic(patchCode: string): Promise<CriticReview> {
  const message = `${ARCHITECTURE_CRITIC_INSTRUCTION}\n\nPatch to review:\n\n${patchCode}`;
  const raw = await queryAgent(message, "gemini-2.5-flash");
  try {
    return JSON.parse(raw) as CriticReview;
  } catch {
    return {
      rating: "VETO",
      critique: "Architecture critic returned a non-parseable response — manual blast-radius review required.",
    };
  }
}

// ---------------------------------------------------------------------------
// Governance Board — runs all three critics concurrently
// ---------------------------------------------------------------------------

export async function runGovernanceBoard(patchSummary: string): Promise<GovernanceBoard> {
  const [security, finops, architecture] = await Promise.all([
    runSecurityCritic(patchSummary),
    runFinOpsCritic(patchSummary),
    runArchitectureCritic(patchSummary),
  ]);
  return { security, finops, architecture };
}
