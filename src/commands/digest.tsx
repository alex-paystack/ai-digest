import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
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
import { LoadingView, DigestView } from '../ui/DigestView.js';
import { loadConfig } from '../config/index.js';
import type { DigestData } from '../github/types.js';

interface DigestCommandProps {
  owner?: string;
  repo?: string;
  since?: string;
}

export function DigestCommand(props: DigestCommandProps) {
  const [status, setStatus] = useState<'loading' | 'generating' | 'done' | 'error'>('loading');
  const [message, setMessage] = useState('Initializing...');
  const [data, setData] = useState<DigestData | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [error, setError] = useState<string>('');

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
        const summary = await generateDigestSummary(digestData, config.openai.apiKey);
        setAiSummary(summary);

        setStatus('done');
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    run();
  }, [props.owner, props.repo, props.since]);

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
    return <DigestView data={data} aiSummary={aiSummary} />;
  }

  return null;
}

