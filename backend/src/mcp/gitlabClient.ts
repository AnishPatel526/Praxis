/**
 * GitLab REST API Client
 *
 * Replaces the GitHub MCP integration. Uses the GitLab REST API directly
 * (v4) to replicate the same multi-file commit → merge-request flow that
 * the GitHub MCP server provided via its Git tree API.
 *
 * Auth: GITLAB_PERSONAL_ACCESS_TOKEN (PRIVATE-TOKEN header)
 * Project: URL-encoded "namespace/project" path
 */

export interface FileChange {
  filePath: string;
  fileContent: string;
}

export interface GitLabMRParams {
  project: string;       // "namespace/project-name"
  files: FileChange[];
  branchName: string;
  targetBranch: string;  // typically "main"
  commitMessage: string;
  mrTitle: string;
  mrDescription: string;
}

export interface GitLabMRResult {
  mrUrl: string;
  mrIid: number;         // GitLab's internal MR ID within the project
  branchName: string;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const GITLAB_BASE = "https://gitlab.com/api/v4";

function getHeaders(): Record<string, string> {
  const token = process.env.GITLAB_PERSONAL_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "GITLAB_PERSONAL_ACCESS_TOKEN is not set. Add it to backend/.env."
    );
  }
  return { "PRIVATE-TOKEN": token, "Content-Type": "application/json" };
}

function encodeProject(project: string): string {
  return encodeURIComponent(project);
}

async function gitlabFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${GITLAB_BASE}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers as Record<string, string> ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitLab API ${res.status} ${res.statusText}: ${body}`);
  }
  return res;
}

async function fileExistsOnBranch(
  project: string,
  filePath: string,
  branch: string
): Promise<boolean> {
  const token = process.env.GITLAB_PERSONAL_ACCESS_TOKEN ?? "";
  const url =
    `${GITLAB_BASE}/projects/${encodeProject(project)}/repository/files/` +
    `${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: { "PRIVATE-TOKEN": token } });
  return res.ok;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function verifyGitLabConnection(): Promise<void> {
  console.log("[GitLab] Verifying connection...");
  const res = await gitlabFetch("/user");
  const user = (await res.json()) as { username?: string };
  console.log(`[GitLab] Connected as ${user.username ?? "unknown"}`);
}

export async function createGitLabBranch(
  project: string,
  branchName: string,
  ref: string
): Promise<void> {
  console.log(`[GitLab] create_branch: ${branchName} from ${ref}`);
  await gitlabFetch(`/projects/${encodeProject(project)}/repository/branches`, {
    method: "POST",
    body: JSON.stringify({ branch: branchName, ref }),
  });
}

export async function commitFilesToGitLab(
  project: string,
  branchName: string,
  files: FileChange[],
  commitMessage: string
): Promise<void> {
  console.log(`[GitLab] commit: ${files.length} file(s) → ${project}@${branchName}`);

  // Detect whether each file exists on the branch to choose create vs update
  const actions = await Promise.all(
    files.map(async (f) => {
      const exists = await fileExistsOnBranch(project, f.filePath, branchName);
      return {
        action: exists ? "update" : "create",
        file_path: f.filePath,
        content: f.fileContent,
      };
    })
  );

  await gitlabFetch(`/projects/${encodeProject(project)}/repository/commits`, {
    method: "POST",
    body: JSON.stringify({ branch: branchName, commit_message: commitMessage, actions }),
  });

  console.log(`[GitLab] Committed — "${commitMessage}"`);
}

export async function createGitLabMergeRequest(
  project: string,
  sourceBranch: string,
  targetBranch: string,
  title: string,
  description: string
): Promise<{ mrUrl: string; mrIid: number }> {
  console.log(`[GitLab] create_merge_request: "${title}"`);
  const res = await gitlabFetch(`/projects/${encodeProject(project)}/merge_requests`, {
    method: "POST",
    body: JSON.stringify({
      source_branch: sourceBranch,
      target_branch: targetBranch,
      title,
      description,
      remove_source_branch: true,
    }),
  });

  const mr = (await res.json()) as { web_url?: string; iid?: number };
  const mrUrl = mr.web_url ?? `https://gitlab.com/${project}/-/merge_requests`;
  const mrIid = mr.iid ?? 0;
  console.log(`[GitLab] MR created — ${mrUrl}`);
  return { mrUrl, mrIid };
}

// ---------------------------------------------------------------------------
// Orchestrated flow: branch → commit → merge request
// ---------------------------------------------------------------------------

export async function createMergeRequestViaGitLab(
  params: GitLabMRParams
): Promise<GitLabMRResult> {
  const { project, files, targetBranch, commitMessage, mrTitle, mrDescription } = params;

  // Timestamp suffix prevents 400 "Branch already exists" on repeated test runs
  const branchName = `fix-incident-${Date.now()}`;

  // Step 1: Create branch
  await createGitLabBranch(project, branchName, targetBranch);

  // Step 2: Commit all files atomically (GitLab commit actions = Git tree API equivalent)
  await commitFilesToGitLab(project, branchName, files, commitMessage);

  // Step 3: Open merge request
  const { mrUrl, mrIid } = await createGitLabMergeRequest(
    project, branchName, targetBranch, mrTitle, mrDescription
  );

  return { mrUrl, mrIid, branchName };
}
