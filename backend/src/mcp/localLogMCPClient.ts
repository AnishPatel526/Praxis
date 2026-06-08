/**
 * Local Filesystem MCP Client
 *
 * Connects to @modelcontextprotocol/server-filesystem via stdio transport.
 * The allowed directory is scoped to the /backend folder so the agent can
 * only read files within that tree.
 *
 * Exposes readLogFile() which calls the `read_file` MCP tool and returns
 * the raw log text for the Coordinator Agent's prompt.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Absolute path to the /backend directory — the only tree the MCP server can access
export const BACKEND_DIR = path.resolve(__dirname, "../../");

// Default log file location
export const DEFAULT_LOG_PATH = path.join(BACKEND_DIR, "server.log");

function buildFilesystemTransport(): StdioClientTransport {
  return new StdioClientTransport({
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", BACKEND_DIR],
    env: Object.fromEntries(
      Object.entries(process.env).filter(([, v]) => v !== undefined)
    ) as Record<string, string>,
  });
}

export async function readLogFile(
  absolutePath: string = DEFAULT_LOG_PATH
): Promise<string> {
  const transport = buildFilesystemTransport();
  const client = new Client({ name: "praxis-filesystem-client", version: "1.0.0" });
  await client.connect(transport);

  try {
    const result = await client.callTool({
      name: "read_file",
      arguments: { path: absolutePath },
    });

    const contents = result.content as Array<{ type: string; text?: string }>;
    const textContent = contents.find((c) => c.type === "text");
    return textContent?.text ?? "(empty log file)";
  } finally {
    await client.close();
  }
}
