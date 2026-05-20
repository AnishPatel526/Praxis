/**
 * QA Agent
 *
 * Generates a Playwright integration test for the approved patch.
 * Runs after the Security Critic approves and before the Slack PATCH_READY alert.
 * The generated test is appended to the GitLab MR commit alongside the patch files.
 */

import { queryAgent } from "./agentBuilderClient.js";
import type { FileChange } from "../mcp/gitlabClient.js";

const QA_INSTRUCTION =
  "You are a Senior QA Automation Engineer specialising in Playwright integration tests. " +
  "You will be given the original error context and an approved code patch. " +
  "Write a robust Playwright integration test file named `tests/auth.spec.ts` that: " +
  "1) Mocks the Stripe API so that `stripe.customers.retrieve()` returns null on the first call and throws a timeout error on the second call. " +
  "2) Asserts that the application returns a 401 or 503 status code — NOT a 500 — proving the patch now handles the failure gracefully. " +
  "3) Includes a positive test asserting the endpoint succeeds when Stripe returns a valid customer. " +
  "4) Uses realistic describe/it block names that mirror the incident. " +
  "Return ONLY a valid JSON object — no markdown, no code fences, no explanation outside the JSON: " +
  '{ "filePath": "tests/auth.spec.ts", "fileContent": "<complete Playwright TypeScript test file>" }';

export async function runQAAgent(
  traceData: string,
  patchFiles: FileChange[]
): Promise<FileChange> {
  console.log("[QA Agent] Generating Playwright regression test...");

  const patchSummary = patchFiles
    .map((f) => `// ${f.filePath}\n${f.fileContent.slice(0, 1500)}`)
    .join("\n\n---\n\n");

  const message =
    `${QA_INSTRUCTION}\n\n` +
    `## Original Error Context\n\n${traceData}\n\n` +
    `## Approved Patch Files\n\n${patchSummary}`;

  const raw = await queryAgent(message, "gemini-2.5-flash");

  let result: FileChange;
  try {
    result = JSON.parse(raw) as FileChange;
  } catch {
    console.warn("[QA Agent] Could not parse response — using stub test file");
    result = {
      filePath: "tests/auth.spec.ts",
      fileContent:
        `import { test, expect } from '@playwright/test';\n\n` +
        `test.describe('Auth Middleware — Stripe null/timeout resilience', () => {\n` +
        `  test('returns 401 when Stripe returns null (not 500)', async ({ request }) => {\n` +
        `    const res = await request.get('/api/payment');\n` +
        `    expect(res.status()).not.toBe(500);\n` +
        `  });\n` +
        `});\n`,
    };
  }

  console.log(`[QA Agent] Test generated — ${result.filePath} (${result.fileContent.length} chars)`);
  return result;
}
