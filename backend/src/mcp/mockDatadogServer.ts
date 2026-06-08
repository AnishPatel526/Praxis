/**
 * MockDatadogMCPServer
 *
 * Standalone MCP server (stdio transport) that simulates a Datadog
 * telemetry integration. Exposes one tool: get_telemetry_trace.
 *
 * Run directly via: tsx src/mcp/mockDatadogServer.ts
 * In production, replace with the real Datadog MCP server.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const MOCK_TRACE = `
=== DATADOG TRACE — payment-service [2026-04-30T14:02:09Z] ===

ERROR   AuthMiddleware (auth/middleware.ts:47)
        TypeError: Cannot read properties of undefined (reading 'id')
          at validatePaymentToken (auth/middleware.ts:47:23)
          at Layer.handle [as handle_request] (express/router/layer.js:95:5)
          at next (express/router/route.js:149:13)
          at processTicksAndRejections (node:internal/process/task_queues:95:5)

CAUSED BY:
        stripe.customers.retrieve() returned null for customer "cus_Px9fK1"
        Token timestamp: 1746014520000
        Token age at validation: 3847ms
        Max allowed TTL: 3000ms
        Delta: +847ms over threshold

CONTEXT:
        service:      payment-service
        env:          production
        version:      2.4.1
        trace_id:     4bf92f3577b34da6a3ce929d0e0e4736
        span_id:      00f067aa0ba902b7
        host:         payments-prod-07.us-east-1.internal
        p99_latency:  3412ms (breach threshold: 3000ms)

PRIOR OCCURRENCES (last 2h):
        14:02:09Z — FATAL  (this event)
        13:58:41Z — WARN   token_age=3201ms
        13:54:03Z — WARN   token_age=3089ms
        13:49:12Z — WARN   token_age=3044ms

DIAGNOSIS:
        Race condition between Stripe token TTL (3000ms) and
        p99 latency of customers.retrieve() under peak load.
        Recommendation: increase TTL buffer OR add retry backoff.
`.trim();

const server = new McpServer({
  name: "mock-datadog-server",
  version: "1.0.0",
});

server.tool(
  "get_telemetry_trace",
  "Retrieve the latest error telemetry trace for a service from Datadog",
  {
    service_name: z.string().optional().describe("The service to query traces for"),
    time_window: z.string().optional().describe("Lookback window (e.g. '2h', '30m')"),
  },
  async (_args) => {
    return {
      content: [
        {
          type: "text" as const,
          text: MOCK_TRACE,
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
