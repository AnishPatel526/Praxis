/**
 * Vector Incident Memory Service
 *
 * Persists approved incident resolutions to Firestore with their embeddings.
 * On each new incident, fetches recent memories and finds the closest match
 * via cosine similarity so the Coordinator can reuse proven solutions.
 *
 * Firestore collection: "incident_memories"
 * Env: GCP_PROJECT_ID
 */

import { Firestore, Timestamp } from "@google-cloud/firestore";
import { cosineSimilarity } from "./embeddingService.js";

const COLLECTION = "incident_memories";
const SIMILARITY_THRESHOLD = 0.90;
const MAX_SCAN = 20; // keep in-memory comparison cheap for demo scale

let _db: Firestore | null = null;

function db(): Firestore {
  if (!_db) {
    _db = new Firestore({ projectId: process.env.GCP_PROJECT_ID });
  }
  return _db;
}

export interface IncidentMemoryDoc {
  incidentId: string;
  errorLog: string;
  patch: string;
  embedding: number[];
  mrUrl: string;
  resolvedAt: Timestamp;
}

/**
 * Persist an approved resolution so future incidents can learn from it.
 * errorLog + patch are the raw strings that were embedded.
 */
export async function saveIncidentMemory(
  incidentId: string,
  errorLog: string,
  patch: string,
  embedding: number[],
  mrUrl: string
): Promise<void> {
  await db()
    .collection(COLLECTION)
    .doc(incidentId)
    .set({
      incidentId,
      errorLog: errorLog.slice(0, 10_000),  // guard Firestore 1 MiB doc limit
      patch:    patch.slice(0, 50_000),
      embedding,
      mrUrl,
      resolvedAt: Timestamp.now(),
    } satisfies IncidentMemoryDoc);

  console.log(`[Memory] Saved resolved incident ${incidentId} → Firestore`);
}

/**
 * Given a query embedding for a new error, scan the most recent memories and
 * return the approved patch text of the closest match above the threshold.
 * Returns null when no sufficiently similar past incident exists.
 */
export async function findSimilarPatch(queryEmbedding: number[]): Promise<string | null> {
  const snapshot = await db()
    .collection(COLLECTION)
    .orderBy("resolvedAt", "desc")
    .limit(MAX_SCAN)
    .get();

  let bestSim   = 0;
  let bestPatch: string | null = null;

  for (const doc of snapshot.docs) {
    const data = doc.data() as IncidentMemoryDoc;
    if (!data.embedding?.length) continue;

    const sim = cosineSimilarity(queryEmbedding, data.embedding);
    console.log(`[Memory] ${data.incidentId} similarity=${sim.toFixed(4)}`);

    if (sim > bestSim) {
      bestSim   = sim;
      bestPatch = data.patch;
    }
  }

  if (bestSim >= SIMILARITY_THRESHOLD && bestPatch) {
    console.log(`[Memory] ✓ Match found — similarity=${bestSim.toFixed(4)} (threshold=${SIMILARITY_THRESHOLD})`);
    return bestPatch;
  }

  console.log(`[Memory] No match above threshold (best=${bestSim.toFixed(4)})`);
  return null;
}
