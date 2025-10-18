export interface PullRequest {
  number: number;
  title: string;
  url: string;
  labels: string[];
  additions: number;
  deletions: number;
  changedFiles: number;
  filesChanged: string[];
  createdAt: Date;
  mergedAt: Date | null;
  timeToMergeHours: number;
  author: string;
  riskScore?: number;
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  url: string;
  createdAt: Date;
  branch: string;
  failedJobs?: FailedJob[];
}

export interface FailedJob {
  name: string;
  conclusion: string;
  url: string;
  steps: JobStep[];
}

export interface JobStep {
  name: string;
  conclusion: string;
  number: number;
}

export interface Deployment {
  id: number;
  environment: string;
  createdAt: Date;
  url: string;
  ref: string;
  sha: string;
  prNumbers?: number[];
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  url: string;
  createdAt: Date;
}

export interface DigestData {
  prs: PullRequest[];
  groupedPRs: Map<string, PullRequest[]>;
  riskyPRs: PullRequest[];
  workflows: WorkflowRun[];
  deployments: Deployment[];
  commits: Commit[];
  since: Date;
  owner: string;
  repo: string;
}

