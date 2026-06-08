import { Router, type Request, type Response } from "express";
import { readLogFile, DEFAULT_LOG_PATH } from "../mcp/localLogMCPClient.js";
import { runAgentPipeline } from "../services/pipeline.js";
import { sendSlackAlert } from "../services/slack.js";

const router = Router();

/**
 * POST /api/agent/trigger
 *
 * Reads live telemetry from the local log file, then hands off to the shared
 * runAgentPipeline which runs the full Governance Board + QA + Slack flow.
 */
router.post("/trigger", async (req: Request, res: Response) => {
  const { incidentId = "INC-4821", service = "payment-service" } = req.body as {
    incidentId?: string;
    service?: string;
  };

  console.log(`[Praxis] Trigger received — incident=${incidentId} service=${service}`);

  try {
    console.log(`[Praxis] Filesystem MCP: read_file ${DEFAULT_LOG_PATH}`);
    const traceData = await readLogFile(DEFAULT_LOG_PATH);
    console.log(`[Praxis] Log file read (${traceData.length} chars)`);

    const agentResponse = await runAgentPipeline(traceData, incidentId, service);

    res.json({
      success: true,
      incidentId,
      service,
      pipeline: agentResponse,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Praxis] Pipeline error: ${message}`);
    await sendSlackAlert(incidentId, "FAILED", message);
    res.status(500).json({ success: false, error: message, incidentId, service });
  }
});

export default router;
