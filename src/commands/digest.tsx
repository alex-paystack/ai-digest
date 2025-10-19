import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { writeFile } from 'fs/promises';
import { initGitHubClient } from '../github/client.js';
import {
  fetchMergedPRs,
  fetchCIStatus,
  fetchDeployments,
  fetchRecentCommits,
} from '../github/fetchers.js';
import { calculateRiskForPRs, getRiskyPRs } from '../analysis/risk.js';
import { groupPRsByLabel } from '../analysis/grouping.js';
import { generateDigestSummary } from '../ai/summarizer.js';
import { hybridRiskAnalysis } from '../analysis/ai-risk.js';
import { LoadingView, DigestView } from '../ui/DigestView.js';
import { loadConfig } from '../config/index.js';
import type { DigestData } from '../github/types.js';

interface DigestCommandProps {
  owner?: string;
  repo?: string;
  since?: string;
  output?: string;
  aiRisk?: boolean;
  aiRiskThreshold?: number;
}

function formatDigestAsMarkdown(data: DigestData, aiSummary: string): string {
  const { prs, groupedPRs, riskyPRs, workflows, deployments, owner, repo, since } = data;
  const hoursBack = Math.round((Date.now() - since.getTime()) / (1000 * 60 * 60));
  const failedWorkflows = workflows.filter((w) => w.conclusion === 'failure');
  const topLabels = Array.from(groupedPRs.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);

  let markdown = `# Engineering Digest — ${new Date().toDateString()}\n\n`;
  markdown += `**Repository:** ${owner}/${repo}  \n`;
  markdown += `**Time Period:** Last ${hoursBack} hours\n\n`;
  markdown += `---\n\n`;

  // AI Summary
  markdown += `## 📝 AI Summary\n\n`;
  markdown += `${aiSummary}\n\n`;

  // Overview
  markdown += `## 📊 Overview\n\n`;
  markdown += `- **${prs.length}** PRs merged\n`;
  markdown += `- **${riskyPRs.length}** risky changes flagged\n`;
  markdown += `- **${failedWorkflows.length}** CI failures\n`;
  markdown += `- **${deployments.length}** deployments\n\n`;

  // PRs by Label
  if (topLabels.length > 0) {
    markdown += `## 🏷️ Merged PRs by Label\n\n`;
    for (const [label, labelPRs] of topLabels) {
      markdown += `### ${label} (${labelPRs.length} PRs)\n\n`;
      for (const pr of labelPRs.slice(0, 5)) {
        markdown += `#### [#${pr.number}](${pr.url}) ${pr.title}\n`;
        markdown += `- **Files changed:** ${pr.changedFiles}\n`;
        markdown += `- **Lines:** +${pr.additions}/-${pr.deletions}\n`;
        markdown += `- **Risk score:** ${((pr.riskScore || 0) * 100).toFixed(0)}%\n`;
        markdown += `- **Author:** @${pr.author}\n`;
        if (pr.labels.length > 0) {
          markdown += `- **Labels:** ${pr.labels.join(', ')}\n`;
        }
        markdown += `\n`;
      }
    }
  }

  // Risky PRs
  if (riskyPRs.length > 0) {
    markdown += `## ⚠️ Risky Changes\n\n`;
    for (const pr of riskyPRs) {
      markdown += `### [#${pr.number}](${pr.url}) ${pr.title}\n`;
      markdown += `- **Risk score:** ${((pr.riskScore || 0) * 100).toFixed(0)}%${pr.aiRiskAnalysis ? ' 🤖 (AI-enhanced)' : ''}\n`;
      markdown += `- **Changes:** ${pr.changedFiles} files, ${pr.additions + pr.deletions} lines\n`;
      
      // AI Analysis
      if (pr.aiRiskAnalysis) {
        markdown += `\n**🤖 AI Risk Analysis:**\n`;
        markdown += `- ${pr.aiRiskAnalysis.reasoning}\n`;
        if (pr.aiRiskAnalysis.concerns.length > 0) {
          markdown += `\n**Concerns:**\n`;
          for (const concern of pr.aiRiskAnalysis.concerns) {
            markdown += `- ⚠️ ${concern}\n`;
          }
        }
        if (pr.aiRiskAnalysis.recommendations.length > 0) {
          markdown += `\n**Recommendations:**\n`;
          for (const rec of pr.aiRiskAnalysis.recommendations) {
            markdown += `- 💡 ${rec}\n`;
          }
        }
        markdown += `\n`;
      } else {
        // Formula-based factors
        const hasTests = pr.filesChanged.some((f) => /test|spec/.test(f));
        if (!hasTests) {
          markdown += `- ⚠️ No tests added\n`;
        }
        if (pr.timeToMergeHours > 72) {
          markdown += `- ⚠️ Took ${Math.round(pr.timeToMergeHours)} hours to merge\n`;
        }
      }
      markdown += `\n`;
    }
  }

  // CI Status
  markdown += `## 🔧 CI Status\n\n`;
  if (failedWorkflows.length > 0) {
    markdown += `**${failedWorkflows.length} workflow(s) failed:**\n\n`;
    for (const workflow of failedWorkflows.slice(0, 5)) {
      markdown += `### [${workflow.name}](${workflow.url})\n`;
      markdown += `- **Branch:** ${workflow.branch}\n`;
      markdown += `- **Status:** ${workflow.conclusion}\n`;
      if (workflow.failedJobs && workflow.failedJobs.length > 0) {
        markdown += `- **Failed jobs:**\n`;
        for (const job of workflow.failedJobs) {
          markdown += `  - ${job.name}\n`;
        }
      }
      markdown += `\n`;
    }
  } else {
    markdown += `✅ All workflows passing\n\n`;
  }

  // Deployments
  if (deployments.length > 0) {
    markdown += `## 🚀 Deployments\n\n`;
    for (const deployment of deployments.slice(0, 5)) {
      markdown += `- **${deployment.environment}** @ ${deployment.createdAt.toLocaleString()}`;
      if (deployment.prNumbers && deployment.prNumbers.length > 0) {
        markdown += ` (PRs: ${deployment.prNumbers.map((n) => `#${n}`).join(', ')})`;
      }
      markdown += `\n`;
    }
    markdown += `\n`;
  }

  markdown += `---\n\n`;
  markdown += `*Generated at ${new Date().toLocaleString()}*\n`;

  return markdown;
}

export function DigestCommand(props: DigestCommandProps) {
  const [status, setStatus] = useState<'loading' | 'generating' | 'done' | 'error'>('loading');
  const [message, setMessage] = useState('Initializing...');
  const [data, setData] = useState<DigestData | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [fileWritten, setFileWritten] = useState<string>('');

  useEffect(() => {
    async function run() {
      try {
        // Load configuration
        setMessage('Loading configuration...');
        const config = loadConfig(props);

        // Initialize GitHub client
        initGitHubClient(config.github.token);

        // Fetch GitHub data in parallel
        setMessage('Fetching GitHub data...');
        const [prs, workflows, deployments, commits] = await Promise.all([
          fetchMergedPRs(config.github.owner, config.github.repo, config.since),
          fetchCIStatus(config.github.owner, config.github.repo, config.since),
          fetchDeployments(config.github.owner, config.github.repo, config.since),
          fetchRecentCommits(config.github.owner, config.github.repo, config.since),
        ]);

        // Calculate risk scores
        setMessage('Analyzing risks...');
        const prsWithRisk = calculateRiskForPRs(prs);
        
        // Use AI for enhanced risk scoring if enabled
        if (props.aiRisk) {
          setMessage('Using AI to analyze high-risk PRs...');
          const aiRiskResults = await hybridRiskAnalysis(
            prsWithRisk,
            config.openai.apiKey,
            props.aiRiskThreshold || 0.5
          );
          
          // Merge AI analysis into PR objects
          for (const pr of prsWithRisk) {
            const aiAnalysis = aiRiskResults.get(pr.number);
            if (aiAnalysis) {
              pr.aiRiskAnalysis = aiAnalysis;
              // Use AI risk score if available, otherwise keep formula score
              pr.riskScore = aiAnalysis.riskScore;
            }
          }
        }
        
        const riskyPRs = getRiskyPRs(prsWithRisk);

        // Group PRs by labels
        const groupedPRs = groupPRsByLabel(prsWithRisk);

        // Prepare digest data
        const digestData: DigestData = {
          prs: prsWithRisk,
          groupedPRs,
          riskyPRs,
          workflows,
          deployments,
          commits,
          since: config.since,
          owner: config.github.owner,
          repo: config.github.repo,
        };

        setData(digestData);

        // Generate AI summary
        setStatus('generating');
        setMessage('Generating AI summary...');
        const summary = await generateDigestSummary(digestData);
        setAiSummary(summary);

        // Write to file if output path specified
        if (props.output) {
          setMessage('Writing to file...');
          const markdown = formatDigestAsMarkdown(digestData, summary);
          await writeFile(props.output, markdown, 'utf-8');
          setFileWritten(props.output);
        }

        setStatus('done');
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    run();
  }, [props.owner, props.repo, props.since, props.output, props.aiRisk, props.aiRiskThreshold]);

  if (status === 'error') {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text color="red">❌ Error: {error}</Text>
      </Box>
    );
  }

  if (status === 'loading' || status === 'generating') {
    return <LoadingView message={message} />;
  }

  if (status === 'done' && data) {
    return (
      <Box flexDirection="column">
        <DigestView data={data} aiSummary={aiSummary} />
        {fileWritten && (
          <Box marginTop={1} paddingX={2}>
            <Text color="green">✅ Digest written to: {fileWritten}</Text>
          </Box>
        )}
      </Box>
    );
  }

  return null;
}

