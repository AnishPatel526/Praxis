import "dotenv/config";
import express from "express";
import cors from "cors";
import agentRoutes from "./routes/agent.js";
import approveRoutes from "./routes/approve.js";
import webhookRoutes from "./routes/webhook.js";
import slackInteractionRoutes from "./routes/slackInteractions.js";
import wargamesRoutes from "./routes/wargames.js";
import { verifyGitLabConnection } from "./mcp/gitlabClient.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

const app = express();

app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "praxis-backend", timestamp: new Date().toISOString() });
});

app.use("/api/agent", agentRoutes);
app.use("/api/agent/approve", approveRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/slack/interactions", slackInteractionRoutes);
app.use("/api/wargames", wargamesRoutes);

app.listen(PORT, async () => {
  console.log(`[Praxis] Backend running on http://localhost:${PORT}`);

  // Verify GitLab connection at startup — non-fatal if token is absent
  try {
    await verifyGitLabConnection();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[GitLab] Startup verification failed: ${msg}`);
    console.warn("[GitLab] Set GITLAB_PERSONAL_ACCESS_TOKEN in .env to enable live MR submission.");
  }
});
