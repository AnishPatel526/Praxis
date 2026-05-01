import "dotenv/config";
import express from "express";
import cors from "cors";
import agentRoutes from "./routes/agent.js";
import approveRoutes from "./routes/approve.js";
import { verifyGitHubMCPServer } from "./mcp/githubMCPClient.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

const app = express();

app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "praxis-backend", timestamp: new Date().toISOString() });
});

app.use("/api/agent", agentRoutes);
app.use("/api/agent/approve", approveRoutes);

app.listen(PORT, async () => {
  console.log(`[Praxis] Backend running on http://localhost:${PORT}`);

  // Verify GitHub MCP server can spawn — non-fatal if it fails
  try {
    await verifyGitHubMCPServer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[GitHub MCP] Startup verification failed: ${msg}`);
    console.warn("[GitHub MCP] Set GITHUB_PERSONAL_ACCESS_TOKEN in .env to enable live PR submission.");
  }
});
