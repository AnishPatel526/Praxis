/**
 * CoordinatorAgent + SecurityCritic Services
 *
 * Two-agent Reflection Pattern:
 *   1. Coordinator (gemini-2.5-pro)  — generates the A2UI patch payload
 *   2. SecurityCritic (gemini-2.5-flash) — audits the patch before HITL
 *
 * Both use Vertex AI with Application Default Credentials (ADC).
 * PRD model names: "Gemini 3.1 Pro" → gemini-2.5-pro
 *                  "Gemini 3.1 Flash" → gemini-2.5-flash
 */

import { GoogleGenAI } from "@google/genai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SecurityReview {
  rating: "SECURE" | "RISKY";
  critique: string;
}

export interface A2UIPayload {
  type: "analysis" | "telemetry" | "root_cause" | "patch_ready" | "idle";
  title: string;
  body: string;
  meta?: Record<string, string>;
  severity?: "critical" | "high" | "medium" | "low";
  securityReview?: SecurityReview;
}

export interface AgentResponse {
  success: boolean;
  traceData: string;
  agentAnalysis: A2UIPayload;
  model: string;
  executionMode: "live" | "mocked";
}

// ---------------------------------------------------------------------------
// Shared Vertex AI client — ADC resolves credentials automatically
// ---------------------------------------------------------------------------

const ORCHESTRATOR_MODEL = "gemini-2.5-pro";     // PRD: "Gemini 3.1 Pro"
const SECURITY_CRITIC_MODEL = "gemini-2.5-flash"; // PRD: "Gemini 3.1 Flash"

const ai = new GoogleGenAI({
  vertexai: true,
  project: "project-7e974f18-fb1b-44bd-baa",
  location: "us-central1",
});

// ---------------------------------------------------------------------------
// Coordinator Agent
// ---------------------------------------------------------------------------

const COORDINATOR_SYSTEM_PROMPT = `Analyze this telemetry trace and return ONLY a valid JSON object matching our A2UI schema. Do not include markdown formatting, code blocks, or conversational text.

You are Praxis, an autonomous DevOps orchestration agent. Given a CI/CD pipeline failure trace, identify the root cause and propose a fix.

Return exactly this JSON structure — no other text:
{
  "type": "patch_ready",
  "title": "<UPPERCASE TITLE>",
  "body": "<one paragraph explanation of root cause and fix>",
  "severity": "<critical|high|medium|low>",
  "meta": {
    "Confidence": "<XX%>",
    "Pattern": "<failure pattern name>",
    "File": "<file:line>",
    "Tests": "<N / N passed>",
    "Files changed": "<N>",
    "Lines": "+N / -N"
  }
}`;

export async function runCoordinatorAgent(
  traceData: string,
  incidentId: string,
  securityFeedback?: string
): Promise<AgentResponse> {

  let userPrompt: string;

  if (securityFeedback) {
    userPrompt =
      `Incident ID: ${incidentId}\n\nTelemetry Trace:\n${traceData}\n\n` +
      `CRITICAL: Your previous patch was rejected by the Security Reviewer. ` +
      `Their critique: '${securityFeedback}'. ` +
      `You must generate a new JSON patch that completely resolves this vulnerability.`;
  } else {
    // Sabotage: force a naïve TTL-only fix on attempt 0 to guarantee the loop fires
    userPrompt =
      `Incident ID: ${incidentId}\n\nTelemetry Trace:\n${traceData}\n\n` +
      `To fix the race condition, just increase the token maxAge to 10000. ` +
      `Do not add any exponential backoff or retry logic, keep it simple.`;
  }

  const response = await ai.models.generateContent({
    model: ORCHESTRATOR_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    config: {
      systemInstruction: COORDINATOR_SYSTEM_PROMPT,
      responseMimeType: "application/json",
    },
  });

  const raw = (response.text ?? "{}").trim();

  let agentAnalysis: A2UIPayload;
  try {
    agentAnalysis = JSON.parse(raw) as A2UIPayload;
  } catch {
    agentAnalysis = {
      type: "patch_ready",
      title: "ANALYSIS COMPLETE — PARSE ERROR",
      body: `Model returned a non-JSON response. Raw output: ${raw.slice(0, 300)}`,
      severity: "high",
    };
  }

  return {
    success: true,
    traceData,
    agentAnalysis,
    model: ORCHESTRATOR_MODEL,
    executionMode: "live",
  };
}

// ---------------------------------------------------------------------------
// Security Critic Agent
// ---------------------------------------------------------------------------

const SECURITY_CRITIC_SYSTEM_PROMPT =
  "You are a Lead Security Architect. Review this patch. " +
  "Return ONLY a valid JSON object matching this schema: " +
  '{ "rating": "SECURE" | "RISKY", "critique": "brief explanation" }. ' +
  "Do not output markdown.";

export async function runSecurityCritic(
  patchCode: string
): Promise<SecurityReview> {
  const response = await ai.models.generateContent({
    model: SECURITY_CRITIC_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: `Review this proposed patch:\n\n${patchCode}` }],
      },
    ],
    config: {
      systemInstruction: SECURITY_CRITIC_SYSTEM_PROMPT,
      responseMimeType: "application/json",
    },
  });

  const raw = (response.text ?? "{}").trim();

  try {
    return JSON.parse(raw) as SecurityReview;
  } catch {
    return {
      rating: "RISKY",
      critique: "Security critic returned a non-parseable response — manual review required.",
    };
  }
}
