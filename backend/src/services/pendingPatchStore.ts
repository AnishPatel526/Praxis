/**
 * Pending Patch Store
 *
 * In-memory map from incidentId → { GitLab MR params, original error log, governance board }.
 * Written by the agent/webhook routes when a patch is ready for human review.
 * Read by the Slack interaction handler when an approve button is clicked.
 *
 * TTL: entries older than MAX_AGE_MS are evicted on every write to prevent
 * unbounded memory growth under rapid War Game / test simulations.
 */

import type { GitLabMRParams } from "../mcp/gitlabClient.js";
import type { GovernanceBoard } from "./coordinatorAgent.js";

const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

interface StoredIncident {
  params: GitLabMRParams;
  traceData: string;
  governanceBoard?: GovernanceBoard;
  storedAt: number;
}

const store = new Map<string, StoredIncident>();

function purgeStale(): void {
  const cutoff = Date.now() - MAX_AGE_MS;
  for (const [id, entry] of store) {
    if (entry.storedAt < cutoff) {
      store.delete(id);
      console.log(`[PatchStore] Evicted stale entry: ${id}`);
    }
  }
}

export function storePatch(
  incidentId: string,
  params: GitLabMRParams,
  traceData = "",
  governanceBoard?: GovernanceBoard
): void {
  purgeStale();
  store.set(incidentId, { params, traceData, governanceBoard, storedAt: Date.now() });
  console.log(`[PatchStore] Stored patch for ${incidentId} (store size: ${store.size})`);
}

export function retrievePatch(incidentId: string): GitLabMRParams | undefined {
  return store.get(incidentId)?.params;
}

export function retrieveTraceData(incidentId: string): string {
  return store.get(incidentId)?.traceData ?? "";
}

export function retrieveGovernanceBoard(incidentId: string): GovernanceBoard | undefined {
  return store.get(incidentId)?.governanceBoard;
}
