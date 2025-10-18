import { getGitHubClient } from './client.js';
import type {
  PullRequest,
  WorkflowRun,
  Deployment,
  Commit,
  FailedJob,
} from './types.js';

export async function fetchMergedPRs(
  owner: string,
  repo: string,
  since: Date
): Promise<PullRequest[]> {
  const client = getGitHubClient();
  const prs: PullRequest[] = [];

  try {
    // Fetch closed PRs (merged ones will be filtered)
    const { data } = await client.pulls.list({
      owner,
      repo,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
    });

    for (const pr of data) {
      // Only include merged PRs within the time window
      if (pr.merged_at) {
        const mergedAt = new Date(pr.merged_at);
        if (mergedAt >= since) {
          // Fetch PR details for file changes
          const { data: prDetail } = await client.pulls.get({
            owner,
            repo,
            pull_number: pr.number,
          });

          // Fetch files changed
          const { data: files } = await client.pulls.listFiles({
            owner,
            repo,
            pull_number: pr.number,
          });

          const createdAt = new Date(pr.created_at);
          const timeToMergeMs = mergedAt.getTime() - createdAt.getTime();
          const timeToMergeHours = timeToMergeMs / (1000 * 60 * 60);

          prs.push({
            number: pr.number,
            title: pr.title,
            url: pr.html_url,
            labels: pr.labels.map((l: any) => (typeof l === 'string' ? l : l.name || '')),
            additions: prDetail.additions || 0,
            deletions: prDetail.deletions || 0,
            changedFiles: prDetail.changed_files || 0,
            filesChanged: files.map((f: any) => f.filename),
            createdAt,
            mergedAt,
            timeToMergeHours,
            author: pr.user?.login || 'unknown',
          });
        }
      }
    }
  } catch (error) {
    console.error('Error fetching PRs:', error);
    throw error;
  }

  return prs;
}

export async function fetchCIStatus(
  owner: string,
  repo: string,
  since: Date
): Promise<WorkflowRun[]> {
  const client = getGitHubClient();
  const workflows: WorkflowRun[] = [];

  try {
    const { data } = await client.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 50,
      branch: 'main',
    });

    for (const run of data.workflow_runs) {
      const createdAt = new Date(run.created_at);
      if (createdAt >= since) {
        const workflow: WorkflowRun = {
          id: run.id,
          name: run.name || 'Unnamed workflow',
          status: run.status || 'unknown',
          conclusion: run.conclusion,
          url: run.html_url,
          createdAt,
          branch: run.head_branch || 'unknown',
        };

        // If failed, fetch job details
        if (run.conclusion === 'failure') {
          try {
            const { data: jobs } = await client.actions.listJobsForWorkflowRun({
              owner,
              repo,
              run_id: run.id,
            });

            const failedJobs: FailedJob[] = jobs.jobs
              .filter((job: any) => job.conclusion === 'failure')
              .map((job: any) => ({
                name: job.name,
                conclusion: job.conclusion || 'unknown',
                url: job.html_url || '',
                steps: job.steps?.map((step: any) => ({
                  name: step.name,
                  conclusion: step.conclusion || 'unknown',
                  number: step.number,
                })) || [],
              }));

            workflow.failedJobs = failedJobs;
          } catch (error) {
            console.error(`Error fetching jobs for workflow ${run.id}:`, error);
          }
        }

        workflows.push(workflow);
      }
    }
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    throw error;
  }

  return workflows;
}

export async function fetchDeployments(
  owner: string,
  repo: string,
  since: Date
): Promise<Deployment[]> {
  const client = getGitHubClient();
  const deployments: Deployment[] = [];

  try {
    const { data } = await client.repos.listDeployments({
      owner,
      repo,
      per_page: 50,
    });

    for (const deployment of data) {
      const createdAt = new Date(deployment.created_at);
      if (createdAt >= since) {
        // Try to extract PR numbers from commit messages
        let prNumbers: number[] = [];
        try {
          const { data: commit } = await client.repos.getCommit({
            owner,
            repo,
            ref: deployment.sha,
          });
          const prMatches = commit.commit.message.match(/#(\d+)/g);
          if (prMatches) {
            prNumbers = prMatches.map((match: string) => parseInt(match.substring(1), 10));
          }
        } catch (error) {
          // Ignore errors fetching commit details
        }

        deployments.push({
          id: deployment.id,
          environment: deployment.environment || 'unknown',
          createdAt,
          url: deployment.url,
          ref: deployment.ref,
          sha: deployment.sha,
          prNumbers,
        });
      }
    }
  } catch (error) {
    console.error('Error fetching deployments:', error);
    // Don't throw - deployments might not be configured
  }

  return deployments;
}

export async function fetchRecentCommits(
  owner: string,
  repo: string,
  since: Date
): Promise<Commit[]> {
  const client = getGitHubClient();
  const commits: Commit[] = [];

  try {
    const { data } = await client.repos.listCommits({
      owner,
      repo,
      since: since.toISOString(),
      per_page: 50,
    });

    for (const commit of data) {
      commits.push({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author?.name || commit.author?.login || 'unknown',
        url: commit.html_url,
        createdAt: new Date(commit.commit.author?.date || Date.now()),
      });
    }
  } catch (error) {
    console.error('Error fetching commits:', error);
    throw error;
  }

  return commits;
}

