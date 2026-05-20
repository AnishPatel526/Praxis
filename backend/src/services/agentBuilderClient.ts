/**
 * Agent Builder Client — Gemini 2.5 Pro (native @google/genai)
 *
 * Executes the Praxis Coordinator agent directly via the Google GenAI SDK.
 * Auth: Application Default Credentials via GOOGLE_GENAI_USE_VERTEXAI=true
 *       or GEMINI_API_KEY for direct API access.
 *
 * Env: GOOGLE_GENAI_USE_VERTEXAI, GCP_PROJECT_ID, GCP_LOCATION
 *      (or GEMINI_API_KEY for non-Vertex path)
 */

import { GoogleGenAI } from "@google/genai";

// ---------------------------------------------------------------------------
// JSON extraction — robust against markdown fences and conversational filler
// ---------------------------------------------------------------------------

export function extractJSON(raw: string): string {
  // 1. Markdown code fence: ```json ... ``` or ``` ... ```
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]?.trim()) return fenceMatch[1].trim();

  // 2. Bracket-matching scan — finds the outermost { } or [ ] block
  const firstObj = raw.indexOf("{");
  const firstArr = raw.indexOf("[");

  let start = -1;
  let open = "";
  let close = "";

  if (firstObj === -1 && firstArr === -1) return raw.trim();
  if (firstObj === -1) { start = firstArr; open = "["; close = "]"; }
  else if (firstArr === -1) { start = firstObj; open = "{"; close = "}"; }
  else if (firstObj < firstArr) { start = firstObj; open = "{"; close = "}"; }
  else { start = firstArr; open = "["; close = "]"; }

  let depth = 0;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === open) depth++;
    else if (raw[i] === close) {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }

  return raw.slice(start).trim();
}

// ---------------------------------------------------------------------------
// Core query function
// ---------------------------------------------------------------------------

export async function queryAgent(message: string, model = "gemini-2.5-pro"): Promise<string> {
  console.log(`[Enterprise GenAI] Calling ${model}...`);

  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GCP_PROJECT_ID,
    location: process.env.GCP_LOCATION ?? "us-central1",
  });

  const response = await ai.models.generateContent({
    model,
    contents: message,
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const raw = response.text ?? "";
  console.log(`[Enterprise GenAI] Response received (${raw.length} chars)`);

  return extractJSON(raw);
}
