/**
 * GitHub MCP Client
 *
 * Connects to the official GitHub MCP server via stdio transport.
 * The server is spawned via `npx -y @modelcontextprotocol/server-github`
 * and authenticated using GITHUB_PERSONAL_ACCESS_TOKEN from the environment.
 *
 * Exposes a typed PR-creation workflow: create_branch → create_or_update_file
 * → create_pull_request.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

interface GitHubPRParams {
  owner: string;
  repo: string;
  filePath: string;
  patchedContent: string; // plain text — encoded to base64 here before calling MCP
  branchName: string;
  baseBranch: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
}

interface GitHubPRResult {
  prUrl: string;
  prNumber: number;
  branchName: string;
}

function buildGitHubTransport(): StdioClientTransport {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_PERSONAL_ACCESS_TOKEN is not set in the environment. " +
      "Add it to backend/.env before calling the GitHub MCP client."
    );
  }

  return new StdioClientTransport({
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([, v]) => v !== undefined)
      ) as Record<string, string>,
      GITHUB_PERSONAL_ACCESS_TOKEN: token,
    },
  });
}

async function connectGitHubClient(): Promise<Client> {
  const transport = buildGitHubTransport();
  const client = new Client({ name: "praxis-github-client", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

// ---------------------------------------------------------------------------
// Startup verification — call once at server boot to confirm the MCP server
// can be spawned. Lists available tools and logs the count.
// ---------------------------------------------------------------------------

export async function verifyGitHubMCPServer(): Promise<void> {
  console.log("[GitHub MCP] Verifying server startup...");
  const client = await connectGitHubClient();
  try {
    const { tools } = await client.listTools();
    console.log(
      `[GitHub MCP] Server ready — ${tools.length} tools available ` +
      `(${tools.map((t) => t.name).slice(0, 5).join(", ")}...)`
    );
  } finally {
    await client.close();
  }
}

// ---------------------------------------------------------------------------
// PR Creation — three-step MCP tool sequence
// ---------------------------------------------------------------------------

export async function createPullRequestViaMCP(
  params: GitHubPRParams
): Promise<GitHubPRResult> {
  const {
    owner, repo, filePath, patchedContent,
    branchName, baseBranch, commitMessage, prTitle, prBody,
  } = params;

  const client = await connectGitHubClient();

  try {
    // Step 1: Create a new branch off the base branch
    console.log(`[GitHub MCP] Step 1/3 — create_branch: ${branchName} from ${baseBranch}`);
    await client.callTool({
      name: "create_branch",
      arguments: { owner, repo, branch: branchName, from_branch: baseBranch },
    });

    // Step 2: Commit the patched file to the new branch
    // GitHub API requires content as base64
    const base64Content = Buffer.from(patchedContent, "utf-8").toString("base64");
    console.log(`[GitHub MCP] Step 2/3 — create_or_update_file: ${filePath}`);
    await client.callTool({
      name: "create_or_update_file",
      arguments: {
        owner,
        repo,
        path: filePath,
        message: commitMessage,
        content: base64Content,
        branch: branchName,
      },
    });

    // Step 3: Open the pull request
    console.log(`[GitHub MCP] Step 3/3 — create_pull_request: "${prTitle}"`);
    const prResult = await client.callTool({
      name: "create_pull_request",
      arguments: {
        owner,
        repo,
        title: prTitle,
        body: prBody,
        head: branchName,
        base: baseBranch,
      },
    });

    // Extract PR URL and number from the tool response
    const prContent = prResult.content as Array<{ type: string; text?: string }>;
    const prText = prContent.find((c) => c.type === "text")?.text ?? "{}";

    let prUrl = `https://github.com/${owner}/${repo}/pulls`;
    let prNumber = 0;

    try {
      const prData = JSON.parse(prText) as { html_url?: string; number?: number };
      prUrl = prData.html_url ?? prUrl;
      prNumber = prData.number ?? 0;
    } catch {
      // Response wasn't JSON — extract URL via regex as fallback
      const urlMatch = prText.match(/https:\/\/github\.com\/[^\s"]+\/pull\/\d+/);
      if (urlMatch) prUrl = urlMatch[0];
    }

    console.log(`[GitHub MCP] PR created — ${prUrl}`);
    return { prUrl, prNumber, branchName };

  } finally {
    await client.close();
  }
}
