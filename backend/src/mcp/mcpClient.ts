/**
 * MCPClient
 *
 * Spawns the MockDatadogMCPServer as a child process over stdio transport
 * and exposes a typed callTool wrapper for the Praxis pipeline.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SERVER_SCRIPT = path.resolve(__dirname, "mockDatadogServer.ts");

// Path to the tsx binary inside this package's node_modules
const TSX_BIN = path.resolve(__dirname, "../../node_modules/.bin/tsx");

export async function getTelemetryTrace(
  serviceName: string = "payment-service",
  timeWindow: string = "2h"
): Promise<string> {
  const transport = new StdioClientTransport({
    command: TSX_BIN,
    args: [SERVER_SCRIPT],
    env: Object.fromEntries(
      Object.entries(process.env).filter(([, v]) => v !== undefined)
    ) as Record<string, string>,
  });

  const client = new Client({
    name: "praxis-mcp-client",
    version: "1.0.0",
  });

  await client.connect(transport);

  try {
    const result = await client.callTool({
      name: "get_telemetry_trace",
      arguments: {
        service_name: serviceName,
        time_window: timeWindow,
      },
    });

    const contents = result.content as Array<{ type: string; text?: string }>;
    const textContent = contents.find((c) => c.type === "text");
    return textContent?.text ?? "(no trace data returned)";
  } finally {
    await client.close();
  }
}
