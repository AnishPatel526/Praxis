import { Router, type Request, type Response } from "express";
import { createMergeRequestViaGitLab } from "../mcp/gitlabClient.js";
import { generatePostMortem } from "../services/postMortemAgent.js";

const router = Router();

interface ApproveRequestBody {
  incidentId?: string;
  project: string;       // GitLab "namespace/project"
  files: Array<{ filePath: string; fileContent: string }>;
  branchName: string;
  targetBranch: string;
  commitMessage: string;
  mrTitle: string;
  mrDescription: string;
}

/**
 * POST /api/agent/approve
 *
 * GitLab flow: create_branch → commit files (actions API) → create_merge_request
 *
 * After a successful MR, asynchronously generates a post-mortem and writes it
 * to backend/docs/post-mortems/{incidentId}.md (non-blocking).
 */
router.post("/", async (req: Request, res: Response) => {
  const body = req.body as ApproveRequestBody;

  const {
    incidentId = "INC-UNKNOWN",
    project = "acme-corp/payments",
    files,
    branchName,
    targetBranch = "main",
    commitMessage,
    mrTitle,
    mrDescription,
  } = body;

  if (!files?.length || !branchName || !mrTitle) {
    res.status(400).json({
      success: false,
      error: "Missing required fields: files, branchName, mrTitle",
    });
    return;
  }

  console.log(`[Praxis] Approve triggered — project=${project} branch=${branchName} files=${files.length}`);

  try {
    const result = await createMergeRequestViaGitLab({
      project,
      files,
      branchName,
      targetBranch,
      commitMessage: commitMessage ?? `fix: ${mrTitle}`,
      mrTitle,
      mrDescription: mrDescription ?? "",
    });

    res.json({
      success: true,
      prUrl: result.mrUrl,   // keep key as prUrl — App.tsx reads this field
      mrUrl: result.mrUrl,
      mrIid: result.mrIid,
      branchName: result.branchName,
    });

    generatePostMortem(incidentId, files, result.mrUrl).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[PostMortem] Generation failed (non-fatal): ${msg}`);
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Praxis] Approve error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
