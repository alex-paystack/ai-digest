import type { PullRequest } from '../github/types.js';

export function calculateRisk(pr: PullRequest): number {
  // Normalize lines changed (cap at 2000 lines)
  const totalLines = pr.additions + pr.deletions;
  const normalizedLines = Math.min(totalLines, 2000) / 2000;

  // Normalize files changed (cap at 20 files)
  const normalizedFiles = Math.min(pr.changedFiles, 20) / 20;

  // Check if tests were added (look for test/spec files)
  const noTests = !pr.filesChanged.some((f) =>
    /test|spec|\.test\.|\.spec\./.test(f.toLowerCase())
  );

  // Check if merge took a long time (>72 hours)
  const slowMerge = pr.timeToMergeHours > 72;

  // Calculate weighted risk score
  const risk =
    normalizedLines * 0.4 +
    normalizedFiles * 0.3 +
    (noTests ? 0.2 : 0) +
    (slowMerge ? 0.1 : 0);

  return risk;
}

export function calculateRiskForPRs(prs: PullRequest[]): PullRequest[] {
  return prs.map((pr) => ({
    ...pr,
    riskScore: calculateRisk(pr),
  }));
}

export function getRiskyPRs(prs: PullRequest[], threshold = 0.5): PullRequest[] {
  return prs.filter((pr) => (pr.riskScore || 0) >= threshold);
}

