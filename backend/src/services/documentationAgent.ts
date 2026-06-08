/**
 * Documentation Agent
 *
 * Generates a professional Markdown Post-Mortem Runbook for a resolved incident.
 * Uses gemini-2.5-flash for speed. Returns raw Markdown — no JSON wrapping.
 */

import { GoogleGenAI } from "@google/genai";

const DOCUMENTATION_INSTRUCTION =
  "You are a Lead Technical Writer and SRE. Your job is to write a highly professional, " +
  "beautifully formatted Markdown Post-Mortem document for a resolved incident. " +
  "Use clear headings, bullet points, tables, and fenced code blocks where appropriate. " +
  "Output ONLY the Markdown document — no preamble, no JSON, no code fence wrapping the whole document.";

export async function runDocumentationAgent(
  incidentId: string,
  traceData: string,
  governanceSummary: string,
  patchText: string
): Promise<string> {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GCP_PROJECT_ID,
    location: process.env.GCP_LOCATION ?? "us-central1",
  });

  const message =
    `${DOCUMENTATION_INSTRUCTION}\n\n` +
    `Generate a Post-Mortem for **Incident ID: ${incidentId}**.\n\n` +
    `The document MUST contain these four sections with these exact headings:\n` +
    `## Incident Summary\n` +
    `## Root Cause Analysis\n` +
    `## Governance Audit Trail\n` +
    `## Resolution\n\n` +
    `---\n\n` +
    `**Original Error Trace:**\n\`\`\`\n${traceData.slice(0, 3_000)}\n\`\`\`\n\n` +
    `**Governance Board Verdict:**\n${governanceSummary}\n\n` +
    `**Approved Code Patch:**\n\`\`\`\n${patchText.slice(0, 4_000)}\n\`\`\``;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: message,
    config: { temperature: 0.3 },
  });

  const markdown = response.text ?? "";
  if (!markdown.trim()) {
    throw new Error("Documentation agent returned an empty response");
  }

  console.log(`[DocAgent] Post-mortem generated (${markdown.length} chars)`);
  return markdown;
}
