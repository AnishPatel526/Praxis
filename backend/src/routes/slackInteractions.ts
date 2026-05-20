import { Router, type Request, type Response } from "express";
import { createMergeRequestViaGitLab, commitFilesToGitLab } from "../mcp/gitlabClient.js";
import {
  retrievePatch,
  retrieveTraceData,
  retrieveGovernanceBoard,
} from "../services/pendingPatchStore.js";
import { generateEmbedding } from "../services/embeddingService.js";
import { saveIncidentMemory } from "../services/memoryService.js";
import { runDocumentationAgent } from "../services/documentationAgent.js";

const router = Router();

type SlackBlock = Record<string, unknown>;

interface SlackInteractionPayload {
  actions?: Array<{ action_id: string; value: string }>;
  response_url?: string;
  message?: { blocks?: SlackBlock[] };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function updateSlackMessage(
  responseUrl: string,
  originalBlocks: SlackBlock[],
  replacementText: string
): Promise<void> {
  const withoutButtons = originalBlocks.filter(
    (b) => !(b.type === "actions" && Array.isArray(b.elements))
  );

  const updatedBlocks: SlackBlock[] = [
    ...withoutButtons,
    { type: "context", elements: [{ type: "mrkdwn", text: replacementText }] },
  ];

  const res = await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ replace_original: true, blocks: updatedBlocks }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[ChatOps] Slack response_url update failed ${res.status}: ${body}`);
  } else {
    console.log("[ChatOps] Slack message updated — buttons removed");
  }
}

async function postAnomalyAlert(incidentId: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[ChatOps] SLACK_WEBHOOK_URL not set — skipping anomaly alert");
    return;
  }

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🚨  Praxis — Post-Merge Anomaly Detected",
        emoji: true,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "🚨 *Post-Merge Anomaly Detected:* Telemetry indicates a *14% spike in 500 errors* on " +
          "`payment-service` immediately following the merge of the AI patch.",
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Incident ID:*\n\`${incidentId}\`` },
        { type: "mrkdwn", text: "*Window:*\n5 min post-merge" },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: "rollback_pr",
          text: { type: "plain_text", text: "⏪  Rollback PR", emoji: true },
          style: "danger",
          value: incidentId,
        },
        {
          type: "button",
          action_id: "ignore_anomaly",
          text: { type: "plain_text", text: "👁️  Ignore (False Alarm)", emoji: true },
          value: incidentId,
        },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `🤖 *Praxis Auto-Rollback Net*  ·  ${new Date().toISOString()}`,
        },
      ],
    },
  ];

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[ChatOps] Anomaly alert failed ${res.status}: ${body}`);
  } else {
    console.log(`[ChatOps] 🚨 Anomaly alert sent for ${incidentId}`);
  }
}

async function postRunbookNotification(incidentId: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `📄 *Zero-Touch Post-Mortem Generated* — Runbook committed to ` +
          `\`docs/incidents/${incidentId}.md\` by Praxis Documentation Agent.`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `🤖 *Praxis Documentation Agent*  ·  ${new Date().toISOString()}`,
        },
      ],
    },
  ];

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[DocAgent] Slack notification failed ${res.status}: ${body}`);
  } else {
    console.log(`[DocAgent] Slack notification sent for ${incidentId}`);
  }
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

/**
 * POST /api/slack/interactions
 *
 * Handles all Slack interactive component payloads (button clicks).
 * Responds 200 OK immediately (Slack requires this within 3 s), then
 * processes the action asynchronously.
 *
 * approve_merge   — creates real GitLab MR, updates message, schedules anomaly alert
 * reject_retry    — updates message to indicate patch rejected
 * rollback_pr     — logs rollback intent, updates anomaly message
 * ignore_anomaly  — dismisses anomaly, updates message
 */
router.post("/", (req: Request, res: Response) => {
  res.status(200).send();

  void (async () => {
    try {
      const payload = JSON.parse(req.body.payload ?? "{}") as SlackInteractionPayload;

      const action = payload.actions?.[0];
      if (!action) {
        console.warn("[ChatOps] Interaction received with no actions");
        return;
      }

      const { action_id, value: incidentId } = action;
      const originalBlocks = payload.message?.blocks ?? [];
      const responseUrl = payload.response_url;

      // ── approve_merge ────────────────────────────────────────────────────
      if (action_id === "approve_merge") {
        console.log(`\x1b[32m[ChatOps] 🟢 Approve clicked for ${incidentId} — creating GitLab MR...\x1b[0m`);

        const patch = retrievePatch(incidentId);
        if (!patch) {
          console.error(`[ChatOps] No stored patch for ${incidentId}`);
          if (responseUrl) {
            await updateSlackMessage(
              responseUrl, originalBlocks,
              `❌ *Error: No patch found for \`${incidentId}\`. Approve via the Praxis dashboard.*`
            );
          }
          return;
        }

        let confirmationText: string;
        let mergeSucceeded = false;
        let mrUrl = "";

        try {
          const result = await createMergeRequestViaGitLab(patch);
          mrUrl = result.mrUrl;
          console.log(`\x1b[32m[ChatOps] 🟢 MR created: ${mrUrl}\x1b[0m`);
          confirmationText = `✅ *Merged successfully via ChatOps.* <${mrUrl}|View Merge Request →>`;
          mergeSucceeded = true;

          // Snapshot shared data once for both async tasks below
          const traceData  = retrieveTraceData(incidentId);
          const patchText  = patch.files
            .map((f) => `// ${f.filePath}\n${f.fileContent}`)
            .join("\n\n");
          const boardSnap  = retrieveGovernanceBoard(incidentId);

          // Vector Memory: embed error log + patch → Firestore (non-fatal, fire-and-forget)
          void (async () => {
            try {
              const memoryText = `ERROR LOG:\n${traceData}\n\nAPPROVED PATCH:\n${patchText}`;
              console.log(`[Memory] Generating embedding for approved incident ${incidentId}...`);
              const embedding = await generateEmbedding(memoryText);
              await saveIncidentMemory(incidentId, traceData, patchText, embedding, mrUrl);
            } catch (memErr) {
              console.warn(`[Memory] Save failed (non-fatal): ${memErr instanceof Error ? memErr.message : memErr}`);
            }
          })();

          // Zero-Touch Post-Mortem: generate runbook → commit to GitLab → notify Slack (non-fatal, fire-and-forget)
          void (async () => {
            try {
              const governanceSummary = boardSnap
                ? `Security Critic: ${boardSnap.security.rating} — ${boardSnap.security.critique}\n` +
                  `FinOps Critic: ${boardSnap.finops.rating} — ${boardSnap.finops.critique}\n` +
                  `Architecture Critic: ${boardSnap.architecture.rating} — ${boardSnap.architecture.critique}`
                : "Governance board data unavailable for this incident.";

              console.log(`[DocAgent] Generating post-mortem for ${incidentId}...`);
              const markdown = await runDocumentationAgent(
                incidentId, traceData, governanceSummary, patchText
              );

              const runbookPath = `docs/incidents/${incidentId}.md`;
              await commitFilesToGitLab(
                patch.project,
                patch.targetBranch,
                [{ filePath: runbookPath, fileContent: markdown }],
                `docs: zero-touch post-mortem for ${incidentId} [skip ci]`
              );
              console.log(`[DocAgent] ✓ Runbook committed → ${runbookPath}`);

              await postRunbookNotification(incidentId);
            } catch (docErr) {
              console.warn(`[DocAgent] Post-mortem failed (non-fatal): ${docErr instanceof Error ? docErr.message : docErr}`);
            }
          })();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[ChatOps] GitLab MR creation failed: ${msg}`);
          confirmationText = `❌ *MR creation failed:* ${msg.slice(0, 200)}`;
        }

        if (responseUrl) {
          await updateSlackMessage(responseUrl, originalBlocks, confirmationText);
        }

        // Schedule post-merge telemetry anomaly simulation (15 s ≈ 5-min window)
        if (mergeSucceeded) {
          console.log(`[ChatOps] ⏱ Anomaly monitor armed — fires in 15 s for ${incidentId}`);
          setTimeout(() => {
            console.log(`[ChatOps] 🚨 Anomaly window elapsed — posting alert for ${incidentId}`);
            postAnomalyAlert(incidentId).catch((err) => {
              const msg = err instanceof Error ? err.message : String(err);
              console.error(`[ChatOps] postAnomalyAlert error: ${msg}`);
            });
          }, 15_000);
        }

      // ── reject_retry ─────────────────────────────────────────────────────
      } else if (action_id === "reject_retry") {
        console.log(`\x1b[33m[ChatOps] 🚫 Patch rejected for ${incidentId}\x1b[0m`);
        if (responseUrl) {
          await updateSlackMessage(responseUrl, originalBlocks, "❌ *Patch rejected. AI is retrying...*");
        }

      // ── rollback_pr ──────────────────────────────────────────────────────
      } else if (action_id === "rollback_pr") {
        console.log(`\x1b[31m[ChatOps] ⏪ Rollback initiated for ${incidentId} — reverting GitLab MR...\x1b[0m`);
        if (responseUrl) {
          await updateSlackMessage(
            responseUrl, originalBlocks,
            "⏪ *Rollback initiated. Reverting to previous stable commit.*"
          );
        }

      // ── ignore_anomaly ───────────────────────────────────────────────────
      } else if (action_id === "ignore_anomaly") {
        console.log(`[ChatOps] 👁️ Anomaly dismissed for ${incidentId}`);
        if (responseUrl) {
          await updateSlackMessage(
            responseUrl, originalBlocks,
            "✅ *Anomaly dismissed by DevOps. Continuing monitoring.*"
          );
        }

      } else {
        console.log(`[ChatOps] Unknown action_id: ${action_id}`);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ChatOps] Failed to handle interaction: ${msg}`);
    }
  })();
});

export default router;
