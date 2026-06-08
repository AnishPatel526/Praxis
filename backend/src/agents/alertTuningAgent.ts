import { generateEmbedding } from "../services/embeddingService.js";
import { findSimilarAlerts, storeAlertMemory, type AlertMetadata } from "../services/pineconeClient.js";

export interface AlertEvalResult {
  status: "NOISY" | "PROCEED";
  matches?: Awaited<ReturnType<typeof findSimilarAlerts>>;
}

const NOISE_THRESHOLD = 0.90;

export async function evaluateAlert(alertData: Record<string, unknown>): Promise<AlertEvalResult> {
  const text = [
    alertData.service    && `service: ${alertData.service}`,
    alertData.errorType  && `error: ${alertData.errorType}`,
    alertData.message    && `message: ${alertData.message}`,
    alertData.trace      && `trace: ${alertData.trace}`,
    alertData.file       && `file: ${alertData.file}`,
  ]
    .filter(Boolean)
    .join("\n") || JSON.stringify(alertData);

  const embedding = await generateEmbedding(text);
  const matches   = await findSimilarAlerts(embedding);

  const noisyMatches = matches.filter((m) => m.score > NOISE_THRESHOLD);
  if (noisyMatches.length > 0) {
    console.log(`[AlertTuning] NOISY — ${noisyMatches.length} match(es) above ${NOISE_THRESHOLD} threshold`);
    return { status: "NOISY", matches: noisyMatches };
  }

  const alertId = `alert-${Date.now()}`;
  const metadata: AlertMetadata = {
    service:   String(alertData.service   ?? "unknown"),
    errorType: String(alertData.errorType ?? "unknown"),
    trace:     String(alertData.trace     ?? ""),
    file:      String(alertData.file      ?? ""),
    timestamp: new Date().toISOString(),
  };

  void storeAlertMemory(alertId, embedding, metadata);
  console.log(`[AlertTuning] PROCEED — stored new alert id=${alertId}`);

  return { status: "PROCEED" };
}
