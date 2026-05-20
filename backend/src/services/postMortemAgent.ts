/**
 * Post-Mortem Agent
 *
 * Phase 3 — Automated Knowledge Base
 *
 * After a PR is successfully submitted, this agent generates a structured
 * Markdown post-mortem and persists it to backend/docs/post-mortems/.
 * Uses Gemini 2.5 Flash for fast generation (non-blocking, fire-and-forget).
 */

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POST_MORTEM_DIR = path.resolve(__dirname, "../../docs/post-mortems");

const POST_MORTEM_MODEL = "gemini-2.5-flash";

const ai = new GoogleGenAI({
  vertexai: true,
  project: "project-7e974f18-fb1b-44bd-baa",
  location: "us-central1",
});

const SYSTEM_PROMPT =
  "You are a Lead Site Reliability Engineer. Write a professional Post-Mortem in Markdown format " +
  "based on the provided code changes. Include these exact headers: " +
  "# Incident Summary, ## Root Cause Analysis, ## Resolution, and ## Action Items. " +
  "Be concise and technical.";

export async function generatePostMortem(
  incidentId: string,
  files: Array<{ filePath: string; fileContent: string }>,
  prUrl: string
): Promise<void> {
  console.log(`[PostMortem] Generating post-mortem for ${incidentId}`);

  const filesSummary = files
    .map((f) => `### ${f.filePath}\n\`\`\`\n${f.fileContent.slice(0, 800)}\n\`\`\``)
    .join("\n\n");

  const userPrompt =
    `Incident ID: ${incidentId}\n` +
    `Pull Request: ${prUrl}\n\n` +
    `## Files Changed\n\n${filesSummary}`;

  const response = await ai.models.generateContent({
    model: POST_MORTEM_MODEL,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: { systemInstruction: SYSTEM_PROMPT },
  });

  const markdown = (response.text ?? "").trim();

  // Ensure the output directory exists before writing
  await mkdir(POST_MORTEM_DIR, { recursive: true });

  const outputPath = path.join(POST_MORTEM_DIR, `${incidentId}.md`);
  await writeFile(outputPath, markdown, "utf-8");

  console.log(`[PostMortem] Saved → ${outputPath}`);
}
