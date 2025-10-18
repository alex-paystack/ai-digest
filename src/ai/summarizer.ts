import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { DigestData } from '../github/types.js';

function buildPrompt(data: DigestData): string {
  const { prs, groupedPRs, riskyPRs, workflows, deployments } = data;

  let prompt = `You are an engineering summary assistant. Generate a concise, human-readable digest of repository activity.

Repository: ${data.owner}/${data.repo}
Time Period: Last ${Math.round((Date.now() - data.since.getTime()) / (1000 * 60 * 60))} hours

## Merged Pull Requests (${prs.length} total)

`;

  // Group PRs by label
  const topLabels = Array.from(groupedPRs.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);

  for (const [label, labelPRs] of topLabels) {
    prompt += `### ${label} (${labelPRs.length} PRs)\n`;
    for (const pr of labelPRs.slice(0, 3)) {
      prompt += `- #${pr.number}: ${pr.title}\n`;
      prompt += `  Files: ${pr.changedFiles}, Lines: +${pr.additions}/-${pr.deletions}\n`;
      prompt += `  Risk: ${((pr.riskScore || 0) * 100).toFixed(0)}%\n`;
    }
    prompt += '\n';
  }

  // Risky PRs
  if (riskyPRs.length > 0) {
    prompt += `## Risky Changes (${riskyPRs.length} flagged)\n\n`;
    for (const pr of riskyPRs) {
      prompt += `- #${pr.number}: ${pr.title}\n`;
      prompt += `  Risk factors: ${pr.changedFiles} files, ${pr.additions + pr.deletions} lines`;
      const hasTests = pr.filesChanged.some((f) => /test|spec/.test(f));
      if (!hasTests) {
        prompt += ', no tests added';
      }
      if (pr.timeToMergeHours > 72) {
        prompt += `, took ${Math.round(pr.timeToMergeHours)}h to merge`;
      }
      prompt += '\n';
    }
    prompt += '\n';
  }

  // CI Status
  const failedWorkflows = workflows.filter((w) => w.conclusion === 'failure');
  if (failedWorkflows.length > 0) {
    prompt += `## CI Failures (${failedWorkflows.length})\n\n`;
    for (const workflow of failedWorkflows.slice(0, 3)) {
      prompt += `- ${workflow.name} failed on ${workflow.branch}\n`;
      if (workflow.failedJobs && workflow.failedJobs.length > 0) {
        const job = workflow.failedJobs[0];
        prompt += `  Failed job: ${job.name}\n`;
      }
    }
    prompt += '\n';
  }

  // Deployments
  if (deployments.length > 0) {
    prompt += `## Deployments (${deployments.length})\n\n`;
    for (const deployment of deployments.slice(0, 3)) {
      prompt += `- ${deployment.environment} @ ${deployment.createdAt.toLocaleTimeString()}`;
      if (deployment.prNumbers && deployment.prNumbers.length > 0) {
        prompt += ` (PRs: ${deployment.prNumbers.map((n) => `#${n}`).join(', ')})`;
      }
      prompt += '\n';
    }
    prompt += '\n';
  }

  prompt += `
Generate a digest summary with these sections:

1. **Highlights**: 2-3 bullet points of the most important changes/issues
2. **Key Merged PRs**: List 3-5 most impactful PRs with brief impact descriptions
3. **Risks**: Mention any risky changes that need attention
4. **CI Status**: Summarize build health
5. **Deployments**: List recent deployments if any

Keep it concise and actionable. Focus on what matters to the team.`;

  return prompt;
}

export async function generateDigestSummary(
  data: DigestData,
  apiKey: string
): Promise<string> {
  const prompt = buildPrompt(data);

  try {
    const { text } = await generateText({
      model: openai('gpt-4-turbo', { apiKey }),
      prompt,
      maxTokens: 1000,
      temperature: 0.7,
    });

    return text;
  } catch (error) {
    console.error('Error generating AI summary:', error);
    throw error;
  }
}

