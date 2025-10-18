import type { PullRequest } from '../github/types.js';

export function groupPRsByLabel(prs: PullRequest[]): Map<string, PullRequest[]> {
  const grouped = new Map<string, PullRequest[]>();

  for (const pr of prs) {
    if (pr.labels.length === 0) {
      // Add to "unlabeled" group
      const unlabeled = grouped.get('unlabeled') || [];
      unlabeled.push(pr);
      grouped.set('unlabeled', unlabeled);
    } else {
      // Add to each label group
      for (const label of pr.labels) {
        const group = grouped.get(label) || [];
        group.push(pr);
        grouped.set(label, group);
      }
    }
  }

  return grouped;
}

export function getTopLabels(grouped: Map<string, PullRequest[]>, limit = 5): string[] {
  return Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, limit)
    .map(([label]) => label);
}

