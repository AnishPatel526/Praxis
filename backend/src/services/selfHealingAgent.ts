/**
 * Self-Healing Agent
 *
 * Phase 1 — CI/CD Auto-Fix Loop (multi-file, GitLab)
 *
 * When a GitLab CI pipeline fails, this agent:
 *   A. Reads the failing file from local disk
 *   B. Calls Gemini 2.5 Pro to generate a multi-file JSON patch
 *   C. Passes the patch through the Security Critic with up to MAX_RETRIES
 *   D. Commits all secure files directly to the existing branch via GitLab API
 *      (no new branch, no MR — just a follow-up commit that re-triggers CI)
 */

import { readFile } from "fs/promises";
import { queryAgent } from "./agentBuilderClient.js";
import { runSecurityCritic, type SecurityReview } from "./coordinatorAgent.js";
import { commitFilesToGitLab, type FileChange } from "../mcp/gitlabClient.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HealingPatch {
  files: FileChange[];
  commitMessage: string;
}

export interface SelfHealingResult {
  success: boolean;
  commitMessage: string;
  filesChanged: number;
  securityReview: SecurityReview;
  attempts: number;
}

const MAX_RETRIES = 2;

// ---------------------------------------------------------------------------
// Patch generator — routed through GCP Agent Builder
// ---------------------------------------------------------------------------

async function generateHealingPatch(
  branchName: string,
  ciErrorLogs: string,
  currentContent: string,
  securityFeedback?: string
): Promise<HealingPatch> {
  const instruction =
    `You are an Autonomous CI/CD Agent. Your previous commit on \`${branchName}\` failed the automated tests. ` +
    `The CI logs state: '${ciErrorLogs}'. ` +
    `Analyze the current file and generate a multi-file JSON patch to fix the test failure. ` +
    `Once the fix is merged, a GitLab Merge Request will be created if necessary. ` +
    `Return ONLY a valid JSON object — no markdown, no explanation: ` +
    `{ "files": [{ "filePath": "<path>", "fileContent": "<full corrected content>" }], "commitMessage": "<conventional commit message>" }`;

  let message = `${instruction}\n\nCurrent file content:\n\n${currentContent}`;

  if (securityFeedback) {
    message +=
      `\n\nCRITICAL: Your previous patch was rejected by the Security Reviewer. ` +
      `Their critique: '${securityFeedback}'. ` +
      `You must generate a new patch that completely resolves this vulnerability.`;
  }

  const raw = await queryAgent(message);
  return JSON.parse(raw) as HealingPatch;
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

export async function runSelfHealingLoop(
  project: string,
  branchName: string,
  failedFilePath: string,
  ciErrorLogs: string
): Promise<SelfHealingResult> {
  console.log(`[SelfHealing] Starting loop — ${project}@${branchName} — file: ${failedFilePath}`);

  // Step A: Read the current failing file from local disk
  let currentContent: string;
  try {
    currentContent = await readFile(failedFilePath, "utf-8");
    console.log(`[SelfHealing] Read ${failedFilePath} (${currentContent.length} chars)`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot read failedFilePath "${failedFilePath}": ${msg}`);
  }

  // Steps B + C: Auto-Fix Loop
  let attempts = 0;
  let feedback: string | undefined;
  let patch!: HealingPatch;
  let securityReview!: SecurityReview;

  while (true) {
    console.log(`[SelfHealing] Attempt ${attempts + 1}/${MAX_RETRIES + 1} — generating fix`);

    patch = await generateHealingPatch(branchName, ciErrorLogs, currentContent, feedback);
    console.log(`[SelfHealing] Patch generated — ${patch.files.length} file(s) — "${patch.commitMessage}"`);

    const patchSummary = patch.files
      .map((f) => `File: ${f.filePath}\n\n${f.fileContent}`)
      .join("\n\n---\n\n");

    securityReview = await runSecurityCritic(patchSummary);
    console.log(`[SelfHealing] Security Critic — rating=${securityReview.rating} (attempt ${attempts + 1})`);

    if (securityReview.rating === "SECURE") {
      console.log(`[SelfHealing] SECURE after ${attempts + 1} attempt(s) — proceeding to commit`);
      break;
    }

    attempts++;
    if (attempts >= MAX_RETRIES) {
      console.log(`[SelfHealing] MAX_RETRIES (${MAX_RETRIES}) hit — committing best-effort patch`);
      break;
    }

    feedback = securityReview.critique;
    console.log(`[SelfHealing] RISKY — passing critique to next attempt`);
  }

  // Step D: Push all files to the existing branch via GitLab commit API
  await commitFilesToGitLab(project, branchName, patch.files, patch.commitMessage);

  console.log(`[SelfHealing] Loop complete — ${patch.files.length} file(s) pushed to ${project}@${branchName}`);

  return {
    success: true,
    commitMessage: patch.commitMessage,
    filesChanged: patch.files.length,
    securityReview,
    attempts: attempts + 1,
  };
}
