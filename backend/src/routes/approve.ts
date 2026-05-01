import { Router, type Request, type Response } from "express";
import { createPullRequestViaMCP } from "../mcp/githubMCPClient.js";

const router = Router();

interface ApproveRequestBody {
  owner: string;
  repo: string;
  filePath: string;
  patchedContent: string;
  branchName: string;
  baseBranch: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
}

/**
 * POST /api/agent/approve
 *
 * Executes the GitHub MCP tool sequence to submit the patch as a PR:
 *   1. create_branch
 *   2. create_or_update_file
 *   3. create_pull_request
 */
router.post("/", async (req: Request, res: Response) => {
  const body = req.body as ApproveRequestBody;

  const {
    owner = "acme-corp",
    repo = "payments",
    filePath,
    patchedContent,
    branchName,
    baseBranch = "main",
    commitMessage,
    prTitle,
    prBody,
  } = body;

  if (!filePath || !patchedContent || !branchName || !prTitle) {
    res.status(400).json({
      success: false,
      error: "Missing required fields: filePath, patchedContent, branchName, prTitle",
    });
    return;
  }

  console.log(`[Praxis] Approve triggered — repo=${owner}/${repo} branch=${branchName}`);

  try {
    const result = await createPullRequestViaMCP({
      owner,
      repo,
      filePath,
      patchedContent,
      branchName,
      baseBranch,
      commitMessage: commitMessage ?? `fix: ${prTitle}`,
      prTitle,
      prBody: prBody ?? "",
    });

    res.json({
      success: true,
      prUrl: result.prUrl,
      prNumber: result.prNumber,
      branchName: result.branchName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Praxis] Approve error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
