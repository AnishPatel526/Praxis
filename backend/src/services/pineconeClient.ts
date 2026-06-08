import { Pinecone } from "@pinecone-database/pinecone";

export interface AlertMetadata {
  service: string;
  errorType: string;
  trace: string;
  file: string;
  timestamp: string;
  [key: string]: string;
}

export interface SimilarAlert {
  id: string;
  score: number;
  metadata: AlertMetadata;
}

let _client: Pinecone | null = null;

function getClient(): Pinecone {
  if (!_client) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) throw new Error("PINECONE_API_KEY is not set");
    _client = new Pinecone({ apiKey });
  }
  return _client;
}

function getIndex() {
  const indexName = process.env.PINECONE_INDEX_NAME ?? "praxis-alert";
  return getClient().index(indexName).namespace("alerts");
}

export async function storeAlertMemory(
  alertId: string,
  embedding: number[],
  metadata: AlertMetadata
): Promise<void> {
  try {
    await getIndex().upsert({ records: [{ id: alertId, values: embedding, metadata }] });
    console.log(`[Pinecone] Stored alert memory — id=${alertId}`);
  } catch (err) {
    console.warn(`[Pinecone] storeAlertMemory failed (non-fatal): ${err instanceof Error ? err.message : err}`);
  }
}

export async function findSimilarAlerts(embedding: number[]): Promise<SimilarAlert[]> {
  try {
    const result = await getIndex().query({
      vector: embedding,
      topK: 3,
      includeMetadata: true,
    });
    return (result.matches ?? []).map((m) => ({
      id: m.id,
      score: m.score ?? 0,
      metadata: m.metadata as unknown as AlertMetadata,
    }));
  } catch (err) {
    console.warn(`[Pinecone] findSimilarAlerts failed (non-fatal): ${err instanceof Error ? err.message : err}`);
    return [];
  }
}
