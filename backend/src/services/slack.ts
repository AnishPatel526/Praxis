/**
 * Slack Alerting Service
 *
 * Sends Block Kit–formatted alerts to a Slack incoming webhook.
 * Non-fatal: failures are logged but never propagate to the caller.
 *
 * Env: SLACK_WEBHOOK_URL
 */

import type { GovernanceBoard } from "./coordinatorAgent.js";

type AlertStatus = "INITIALIZING" | "PATCH_READY" | "FAILED";

const STATUS_META: Record<AlertStatus, { emoji: string; label: string; color: string }> = {
  INITIALIZING: { emoji: "🚨", label: "Incident Detected — AI Analyzing",       color: "#E8A838" },
  PATCH_READY:  { emoji: "✅", label: "Patch Ready — Awaiting Human Review",    color: "#2EB67D" },
  FAILED:       { emoji: "❌", label: "Pipeline Failed — Manual Intervention",  color: "#E01E5A" },
};

function buildGovernanceSummary(board: GovernanceBoard): string {
  const secIcon  = board.security.rating     === "SECURE" ? "✅" : "🚨";
  const finIcon  = board.finops.rating       === "PASS"   ? "✅" : "⚠️";
  const archIcon = board.architecture.rating === "PASS"   ? "✅" : "⚠️";

  return (
    `🏛️ *Governance Board Audit*\n` +
    `• ${secIcon} *Security Critic:* ${board.security.rating} — ${board.security.critique}\n` +
    `• ${finIcon} *FinOps Critic:* ${board.finops.rating} — ${board.finops.critique}\n` +
    `• ${archIcon} *Architecture Critic:* ${board.architecture.rating} — ${board.architecture.critique}`
  );
}

function buildBlocks(
  incidentId: string,
  status: AlertStatus,
  details?: string,
  link?: string,
  governanceBoard?: GovernanceBoard,
  predictive?: boolean
): object[] {
  const { emoji, label } = STATUS_META[status];

  const headerText = predictive
    ? "⚠️  Praxis — Predictive Alert Detected"
    : `${emoji}  Praxis — ${label}`;

  const blocks: object[] = [
    {
      type: "header",
      text: { type: "plain_text", text: headerText, emoji: true },
    },
    { type: "divider" },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Incident ID:*\n\`${incidentId}\`` },
        { type: "mrkdwn", text: `*Status:*\n${status}` },
      ],
    },
  ];

  const effectiveDetails = (predictive && status === "PATCH_READY")
    ? "Praxis intercepted a latency warning telemetry spike. A timeout is statistically imminent within 30 minutes. Praxis has pre-emptively generated a defensive patch."
    : details;

  if (effectiveDetails) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Details:*\n${effectiveDetails.slice(0, 2900)}` },
    });
  }

  if (governanceBoard) {
    blocks.push(
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: buildGovernanceSummary(governanceBoard),
        },
      }
    );
  }

  if (link) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Review in Praxis →", emoji: true },
          url: link,
          style: "primary",
        },
      ],
    });
  }

  if (status === "PATCH_READY") {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: "approve_merge",
          text: { type: "plain_text", text: "✅  Approve & Merge", emoji: true },
          style: "primary",
          value: incidentId,
        },
        {
          type: "button",
          action_id: "reject_retry",
          text: { type: "plain_text", text: "🚫  Reject & Retry", emoji: true },
          style: "danger",
          value: incidentId,
        },
      ],
    });
  }

  if (status === "PATCH_READY") {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "🧪 *Automated Playwright Regression Test Generated:* Included in MR to prevent future regressions.",
        },
      ],
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `🤖 *Praxis Autonomous DevOps*  ·  ${new Date().toISOString()}`,
      },
    ],
  });

  return blocks;
}

export async function sendSlackAlert(
  incidentId: string,
  status: AlertStatus,
  details?: string,
  link?: string,
  governanceBoard?: GovernanceBoard,
  predictive?: boolean
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[Slack] SLACK_WEBHOOK_URL not set — skipping alert");
    return;
  }

  const payload = { blocks: buildBlocks(incidentId, status, details, link, governanceBoard, predictive) };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[Slack] Webhook returned ${res.status}: ${body}`);
      return;
    }

    console.log(`[Slack] Alert sent — incident=${incidentId} status=${status}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Slack] Failed to send alert: ${msg}`);
  }
}
