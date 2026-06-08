export type StreamEventStatus = "pending" | "active" | "complete" | "error";

export interface StreamEvent {
  id: string;
  label: string;
  detail?: string;
  status: StreamEventStatus;
  tool?: string;
  timestamp: string;
}

export interface SecurityReview {
  rating: "SECURE" | "RISKY";
  critique: string;
}

export interface FileChange {
  filePath: string;
  fileContent: string;
}

export interface A2UIPayload {
  type: "analysis" | "telemetry" | "root_cause" | "patch_ready" | "idle";
  title: string;
  body: string;
  meta?: Record<string, string>;
  codeBlock?: {
    language: string;
    content: string;
  };
  severity?: "critical" | "high" | "medium" | "low";
  files?: FileChange[];
  securityReview?: SecurityReview;
}

export const INCIDENT = {
  id: "INC-4821",
  service: "payment-service",
  repo: "acme-corp/payments",
  branch: "main",
  commit: "a7f3c91",
  triggeredAt: "14m ago",
  buildNumber: "#2847",
  status: "FAILED",
};

export const STREAM_EVENTS_SEQUENCE: StreamEvent[][] = [
  // Step 0: Initial trigger
  [
    {
      id: "e1",
      label: "Build failure alert received",
      detail: "INC-4821 · payment-service",
      status: "complete",
      timestamp: "14:02:11",
    },
    {
      id: "e2",
      label: "Initializing Coordinator Agent",
      status: "active",
      timestamp: "14:02:12",
    },
  ],
  // Step 1: Connecting to Datadog
  [
    {
      id: "e1",
      label: "Build failure alert received",
      detail: "INC-4821 · payment-service",
      status: "complete",
      timestamp: "14:02:11",
    },
    {
      id: "e2",
      label: "Initializing Coordinator Agent",
      status: "complete",
      timestamp: "14:02:12",
    },
    {
      id: "e3",
      label: "Connecting to Datadog MCP",
      tool: "MCP",
      status: "active",
      timestamp: "14:02:14",
    },
  ],
  // Step 2: Logs retrieved
  [
    {
      id: "e1",
      label: "Build failure alert received",
      detail: "INC-4821 · payment-service",
      status: "complete",
      timestamp: "14:02:11",
    },
    {
      id: "e2",
      label: "Initializing Coordinator Agent",
      status: "complete",
      timestamp: "14:02:12",
    },
    {
      id: "e3",
      label: "Connecting to Datadog MCP",
      tool: "MCP",
      status: "complete",
      timestamp: "14:02:14",
    },
    {
      id: "e4",
      label: "Retrieving telemetry logs",
      detail: "Querying last 2h of traces",
      tool: "MCP",
      status: "active",
      timestamp: "14:02:15",
    },
  ],
  // Step 3: GitHub MCP
  [
    {
      id: "e1",
      label: "Build failure alert received",
      detail: "INC-4821 · payment-service",
      status: "complete",
      timestamp: "14:02:11",
    },
    {
      id: "e2",
      label: "Initializing Coordinator Agent",
      status: "complete",
      timestamp: "14:02:12",
    },
    {
      id: "e3",
      label: "Connecting to Datadog MCP",
      tool: "MCP",
      status: "complete",
      timestamp: "14:02:14",
    },
    {
      id: "e4",
      label: "Retrieving telemetry logs",
      detail: "Querying last 2h of traces",
      tool: "MCP",
      status: "complete",
      timestamp: "14:02:15",
    },
    {
      id: "e5",
      label: "Connecting to GitHub MCP",
      tool: "MCP",
      status: "active",
      timestamp: "14:02:19",
    },
  ],
  // Step 4: Root cause analysis
  [
    {
      id: "e1",
      label: "Build failure alert received",
      detail: "INC-4821 · payment-service",
      status: "complete",
      timestamp: "14:02:11",
    },
    {
      id: "e2",
      label: "Initializing Coordinator Agent",
      status: "complete",
      timestamp: "14:02:12",
    },
    {
      id: "e3",
      label: "Connecting to Datadog MCP",
      tool: "MCP",
      status: "complete",
      timestamp: "14:02:14",
    },
    {
      id: "e4",
      label: "Retrieving telemetry logs",
      detail: "Querying last 2h of traces",
      tool: "MCP",
      status: "complete",
      timestamp: "14:02:15",
    },
    {
      id: "e5",
      label: "Connecting to GitHub MCP",
      tool: "MCP",
      status: "complete",
      timestamp: "14:02:19",
    },
    {
      id: "e6",
      label: "Reading repository issues & context",
      detail: "acme-corp/payments · 3 open issues",
      tool: "MCP",
      status: "complete",
      timestamp: "14:02:21",
    },
    {
      id: "e7",
      label: "Synthesizing root cause",
      detail: "Reflection Agent active",
      status: "active",
      timestamp: "14:02:24",
    },
  ],
  // Step 5: Patch generation
  [
    {
      id: "e1",
      label: "Build failure alert received",
      detail: "INC-4821 · payment-service",
      status: "complete",
      timestamp: "14:02:11",
    },
    {
      id: "e2",
      label: "Initializing Coordinator Agent",
      status: "complete",
      timestamp: "14:02:12",
    },
    {
      id: "e3",
      label: "Connecting to Datadog MCP",
      tool: "MCP",
      status: "complete",
      timestamp: "14:02:14",
    },
    {
      id: "e4",
      label: "Retrieving telemetry logs",
      detail: "Querying last 2h of traces",
      tool: "MCP",
      status: "complete",
      timestamp: "14:02:15",
    },
    {
      id: "e5",
      label: "Connecting to GitHub MCP",
      tool: "MCP",
      status: "complete",
      timestamp: "14:02:19",
    },
    {
      id: "e6",
      label: "Reading repository issues & context",
      detail: "acme-corp/payments · 3 open issues",
      tool: "MCP",
      status: "complete",
      timestamp: "14:02:21",
    },
    {
      id: "e7",
      label: "Synthesizing root cause",
      detail: "Reflection Agent active",
      status: "complete",
      timestamp: "14:02:24",
    },
    {
      id: "e8",
      label: "Generating code patch",
      detail: "Generator + Critic pattern",
      status: "complete",
      timestamp: "14:02:28",
    },
    {
      id: "e9",
      label: "Running sandbox verification",
      detail: "Secure code execution environment",
      status: "active",
      timestamp: "14:02:31",
    },
  ],
  // Step 6: HITL ready
  [
    {
      id: "e1",
      label: "Build failure alert received",
      detail: "INC-4821 · payment-service",
      status: "complete",
      timestamp: "14:02:11",
    },
    {
      id: "e2",
      label: "Initializing Coordinator Agent",
      status: "complete",
      timestamp: "14:02:12",
    },
    {
      id: "e3",
      label: "Connecting to Datadog MCP",
      tool: "MCP",
      status: "complete",
      timestamp: "14:02:14",
    },
    {
      id: "e4",
      label: "Retrieving telemetry logs",
      detail: "Querying last 2h of traces",
      tool: "MCP",
      status: "complete",
      timestamp: "14:02:15",
    },
    {
      id: "e5",
      label: "Connecting to GitHub MCP",
      tool: "MCP",
      status: "complete",
      timestamp: "14:02:19",
    },
    {
      id: "e6",
      label: "Reading repository issues & context",
      detail: "acme-corp/payments · 3 open issues",
      tool: "MCP",
      status: "complete",
      timestamp: "14:02:21",
    },
    {
      id: "e7",
      label: "Synthesizing root cause",
      detail: "Reflection Agent active",
      status: "complete",
      timestamp: "14:02:24",
    },
    {
      id: "e8",
      label: "Generating code patch",
      detail: "Generator + Critic pattern",
      status: "complete",
      timestamp: "14:02:28",
    },
    {
      id: "e9",
      label: "Running sandbox verification",
      detail: "Secure code execution environment",
      status: "complete",
      timestamp: "14:02:31",
    },
    {
      id: "e10",
      label: "Sandbox: all 14 tests passed",
      status: "complete",
      timestamp: "14:02:38",
    },
    {
      id: "e11",
      label: "Awaiting human approval",
      detail: "HITL override required",
      status: "active",
      timestamp: "14:02:39",
    },
  ],
];

export const A2UI_PAYLOADS: A2UIPayload[] = [
  {
    type: "idle",
    title: "MONITORING PIPELINE",
    body: "No active incidents. Praxis is monitoring your CI/CD pipelines.",
  },
  {
    type: "analysis",
    title: "INCIDENT TRIAGED",
    body: "Build #2847 failed on main. The payment-service deployment pipeline aborted at the test phase. Dispatching telemetry agent.",
    severity: "critical",
    meta: {
      "Exit Code": "1",
      "Stage": "test",
      "Duration": "0:02:14",
    },
  },
  {
    type: "telemetry",
    title: "TELEMETRY RETRIEVED",
    body: "Datadog trace analysis complete. Identified fatal exception in auth middleware during payment token validation.",
    severity: "critical",
    codeBlock: {
      language: "log",
      content: `ERROR payment-service [14:02:09] AuthMiddleware
  TypeError: Cannot read properties of undefined
    at validatePaymentToken (auth/middleware.ts:47:23)
    at Layer.handle [as handle_request]
    at next (/node_modules/express/router/layer.js:95)

  Caused by: stripe.customers.retrieve() returned null
  Payment token TTL expired before validation completed.
  Token age: 3847ms | Max allowed: 3000ms`,
    },
    meta: {
      "Trace ID": "4bf92f3577b34da6",
      "Service": "payment-service",
      "Env": "production",
    },
  },
  {
    type: "root_cause",
    title: "ROOT CAUSE IDENTIFIED",
    body: "Race condition in token validation timing. The Stripe token TTL (3000ms) is shorter than the p99 latency of the customers.retrieve() call under load. Fix: increase TTL buffer or add retry logic with exponential backoff.",
    severity: "high",
    meta: {
      "Confidence": "94%",
      "Pattern": "Race condition",
      "File": "auth/middleware.ts:47",
    },
  },
  {
    type: "patch_ready",
    title: "PATCH VERIFIED — REVIEW REQUIRED",
    body: "A fix has been generated and validated in sandbox. 14/14 tests pass. Human approval required before submitting pull request to acme-corp/payments.",
    severity: "medium",
    meta: {
      "Tests": "14 / 14 passed",
      "Files changed": "1",
      "Lines": "+12 / -3",
    },
  },
];

export const MOCK_DIFF = `diff --git a/auth/middleware.ts b/auth/middleware.ts
index a7f3c91..b2e4d12 100644
--- a/auth/middleware.ts
+++ b/auth/middleware.ts
@@ -42,12 +42,21 @@ import { stripe } from '../config/stripe';

 export async function validatePaymentToken(
   token: string,
-  maxAge: number = 3000
+  maxAge: number = 8000
 ): Promise<boolean> {
   const tokenAge = Date.now() - decodeTokenTimestamp(token);

-  if (tokenAge > maxAge) {
-    throw new TypeError('Payment token TTL expired');
-  }
+  if (tokenAge > maxAge) {
+    logger.warn(\`Token age \${tokenAge}ms exceeds maxAge \${maxAge}ms\`);
+    throw new TypeError(\`Payment token TTL expired after \${tokenAge}ms\`);
+  }

-  const customer = await stripe.customers.retrieve(
-    extractCustomerId(token)
-  );
+  const customer = await retryWithBackoff(
+    () => stripe.customers.retrieve(extractCustomerId(token)),
+    { maxRetries: 3, baseDelay: 200, factor: 2 }
+  );

   return customer !== null && customer.id !== undefined;
 }`;

// ---------------------------------------------------------------------------
// Patch submission payload — sent to POST /api/agent/approve
// Update owner/repo to a real repository before live testing.
// ---------------------------------------------------------------------------

export const TARGET_GITLAB_PROJECT = "82145569";

export const PATCH_SUBMISSION = {
  incidentId: "INC-4821",
  project: TARGET_GITLAB_PROJECT,
  branchName: "praxis/gitlab-migration-v1",
  targetBranch: "main",
  commitMessage: "fix(auth): increase payment token TTL and add retry backoff",
  mrTitle: "fix(auth): increase payment token TTL to 8s and add retry backoff",
  mrDescription: `## Summary

- Increases \`maxAge\` default in \`validatePaymentToken\` from 3 000 ms → 8 000 ms to accommodate p99 latency of \`stripe.customers.retrieve()\` under production load.
- Extracts retry logic into \`utils/retry.ts\` — \`retryWithBackoff()\` (3 retries, 200 ms base delay, factor 2).
- Adds structured warning log on token age breach for future observability.

## Root Cause

Race condition: Stripe token TTL (3 000 ms) < p99 latency of \`customers.retrieve()\` (3 412 ms) under peak load. Trace ID: \`4bf92f3577b34da6\`.

## Test Plan

- [ ] Run \`npm test -- auth/middleware\` — all 14 tests pass in sandbox
- [ ] Verify no regression in \`payment-service\` integration tests
- [ ] Monitor GitLab pipeline for token TTL warnings post-deploy

---
🤖 Automated patch generated by [Praxis](https://gitlab.com/praxis-agent) · Incident INC-4821`,

  files: [
    {
      filePath: "auth/middleware.ts",
      fileContent: `import { stripe } from '../config/stripe';
import { retryWithBackoff } from '../utils/retry';
import { logger } from '../utils/logger';
import { decodeTokenTimestamp, extractCustomerId } from '../utils/token';

export async function validatePaymentToken(
  token: string,
  maxAge: number = 8000
): Promise<boolean> {
  const tokenAge = Date.now() - decodeTokenTimestamp(token);

  if (tokenAge > maxAge) {
    logger.warn(\`Token age \${tokenAge}ms exceeds maxAge \${maxAge}ms\`);
    throw new TypeError(\`Payment token TTL expired after \${tokenAge}ms\`);
  }

  const customer = await retryWithBackoff(
    () => stripe.customers.retrieve(extractCustomerId(token)),
    { maxRetries: 3, baseDelay: 200, factor: 2 }
  );

  return customer !== null && customer.id !== undefined;
}
`,
    },
    {
      filePath: "utils/retry.ts",
      fileContent: `interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  factor: number;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, baseDelay, factor } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(factor, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}
`,
    },
  ],
};
