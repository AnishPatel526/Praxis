/**
 * Pending Patch Store
 *
 * In-memory map from incidentId → { GitLab MR params, original error log, governance board }.
 * Written by the agent/webhook routes when a patch is ready for human review.
 * Read by the Slack interaction handler when an approve button is clicked.
 */

import type { GitLabMRParams } from "../mcp/gitlabClient.js";
import type { GovernanceBoard } from "./coordinatorAgent.js";

interface StoredIncident {
  params: GitLabMRParams;
  traceData: string;
  governanceBoard?: GovernanceBoard;
}

const store = new Map<string, StoredIncident>();

export function storePatch(
  incidentId: string,
  params: GitLabMRParams,
  traceData = "",
  governanceBoard?: GovernanceBoard
): void {
  store.set(incidentId, { params, traceData, governanceBoard });
  console.log(`[PatchStore] Stored patch for ${incidentId}`);
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
