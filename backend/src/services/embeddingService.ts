/**
 * Embedding Service
 *
 * Wraps the Vertex AI text-embedding-004 model and provides cosine similarity.
 * Auth: Application Default Credentials (same as the rest of the Vertex AI calls).
 */

import { GoogleGenAI } from "@google/genai";

// text-embedding-004 accepts up to 2048 tokens — cap input at ~8k chars to stay safe
const MAX_EMBED_CHARS = 8_000;

export async function generateEmbedding(text: string): Promise<number[]> {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GCP_PROJECT_ID,
    location: process.env.GCP_LOCATION ?? "us-central1",
  });

  const truncated = text.length > MAX_EMBED_CHARS ? text.slice(0, MAX_EMBED_CHARS) : text;

  const result = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: truncated,
  });

  const values = result.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error("Embedding API returned an empty vector");
  }

  console.log(`[Embedding] Generated ${values.length}-dim vector`);
  return values;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot   += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
