import { Router, type Request, type Response } from "express";
import { runAgentPipeline } from "../services/pipeline.js";
import { sendSlackAlert } from "../services/slack.js";

const router = Router();

// ── Synthetic anomaly payload ────────────────────────────────────────────────

function buildSyntheticTrace(incidentId: string, ts: string): string {
  return `\
[${ts}] CRITICAL — payment-gateway  incident=${incidentId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SERVICE        payment-gateway
ENVIRONMENT    production
ERROR          500 Internal Server Error
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Stack Trace:
  TimeoutError: Request timeout exceeding 10000ms at stripe.createCharge()
    at PaymentService.processCharge (src/services/payment.ts:142:18)
    at async CheckoutController.handlePayment (src/controllers/checkout.ts:87:12)
    at async RateLimiter.middleware (src/middleware/rateLimiter.ts:56:5)
    at async AuthMiddleware.verify (src/middleware/auth.ts:34:5)
    at async app (/app/node_modules/express/lib/router/layer.js:95:5)

Root Context:
  File        : src/services/payment.ts
  Function    : stripe.createCharge
  Timeout     : 10000ms
  Stripe SDK  : v12.4.0
  Node        : v20.11.0

Telemetry Snapshot:
  p99 latency      : 12,450ms  (baseline: 890ms  — +1,298%)
  Error rate       : 23.4%     (baseline: 0.01%)
  Affected requests: 1,847 / min
  Revenue at risk  : ~$18,470 / min
  Last healthy     : ${ts.slice(0, 16).replace("T", " ")} UTC − 4 min

Recent Errors (last 60s):
  [ERR] stripe.createCharge timeout after 10001ms — charge_id=ch_3P9kXL2eZvKYlo2C1F3RxE
  [ERR] stripe.createCharge timeout after 10003ms — charge_id=ch_3P9kXM2eZvKYlo2C0B7QwA
  [ERR] stripe.createCharge timeout after 10002ms — charge_id=ch_3P9kXN2eZvKYlo2C2GH91z
  [WARN] Circuit breaker OPEN — downstream: stripe-api
  [ERR] PaymentService: no retry logic configured for TimeoutError

Suspected Cause:
  Stripe API gateway degradation. No exponential backoff or circuit-breaker
  logic exists in PaymentService. All in-flight charges are blocking the
  event loop. Suggest adding: retry with backoff, circuit-breaker, and a
  graceful fallback (queue or decline-with-retry response to client).
`;
}

// ── Route ────────────────────────────────────────────────────────────────────

/**
 * POST /api/wargames/initiate
 *
 * Injects a synthetic critical failure into the Praxis pipeline. Returns 202
 * immediately; the full Governance Board + QA + Slack flow runs async.
 *
 * This is the primary demo trigger — safe to call repeatedly.
 */
router.post("/initiate", (req: Request, res: Response) => {
  const service    = (req.body as { service?: string }).service ?? "payment-gateway";
  const incidentId = `WG-${Date.now()}`;
  const ts         = new Date().toISOString();

  // ── Visually distinct terminal banner ────────────────────────────────────
  console.log("\x1b[41m\x1b[97m\x1b[1m");
  console.log("  ╔══════════════════════════════════════════════════════════╗  ");
  console.log("  ║   🚨 WAR GAMES INITIATED: Synthetic Anomaly Injected    ║  ");
  console.log(`  ║   incident=${incidentId}   service=${service}${"".padEnd(Math.max(0, 23 - service.length - incidentId.length))}║  `);
  console.log("  ╚══════════════════════════════════════════════════════════╝  ");
  console.log("\x1b[0m");

  // Respond immediately — pipeline runs async
  res.status(202).json({
    message: "Simulation initiated. Check terminal and Slack.",
    incidentId,
    service,
  });

  // ── Fire-and-forget the full pipeline ────────────────────────────────────
  void (async () => {
    try {
      const traceData = buildSyntheticTrace(incidentId, ts);
      await runAgentPipeline(traceData, incidentId, service);
      console.log(`\x1b[32m[War Games] ✓ Simulation complete — incident=${incidentId}\x1b[0m`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\x1b[31m[War Games] Pipeline error: ${msg}\x1b[0m`);
      await sendSlackAlert(incidentId, "FAILED", msg).catch(() => {});
    }
  })();
});

export default router;
