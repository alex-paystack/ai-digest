import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { DigestData, PullRequest, WorkflowRun, Deployment } from '../github/types.js';

interface DigestViewProps {
  data: DigestData;
  aiSummary: string;
}

export function LoadingView({ message }: { message: string }) {
  return (
    <Box flexDirection="row" gap={1}>
      <Text color="cyan">
        <Spinner type="dots" />
      </Text>
      <Text color="cyan">{message}</Text>
    </Box>
  );
}

export function SectionHeader({ title }: { title: string }) {
  return (
    <Box marginTop={1} marginBottom={1}>
      <Text bold color="yellow">
        {title}
      </Text>
    </Box>
  );
}

export function PRItem({ pr }: { pr: PullRequest }) {
  const riskColor = 
    (pr.riskScore || 0) >= 0.7 ? 'red' : 
    (pr.riskScore || 0) >= 0.5 ? 'yellow' : 
    'green';

  return (
    <Box flexDirection="column" marginLeft={2} marginBottom={1}>
      <Box flexDirection="row" gap={1}>
        <Text color="cyan">#{pr.number}</Text>
        <Text>{pr.title}</Text>
        {pr.riskScore !== undefined && (
          <RiskBadge score={pr.riskScore} color={riskColor} />
        )}
      </Box>
      <Box marginLeft={2}>
        <Text dimColor>
          {pr.changedFiles} files, +{pr.additions}/-{pr.deletions} lines
          {pr.labels.length > 0 && ` • ${pr.labels.join(', ')}`}
        </Text>
      </Box>
      <Box marginLeft={2}>
        <Text dimColor>{pr.url}</Text>
      </Box>
    </Box>
  );
}

export function RiskBadge({ score, color }: { score: number; color: string }) {
  return (
    <Text color={color as any}>
      [Risk: {(score * 100).toFixed(0)}%]
    </Text>
  );
}

export function WorkflowItem({ workflow }: { workflow: WorkflowRun }) {
  const statusColor = workflow.conclusion === 'success' ? 'green' : 'red';

  return (
    <Box flexDirection="column" marginLeft={2} marginBottom={1}>
      <Box flexDirection="row" gap={1}>
        <Text color={statusColor as any}>●</Text>
        <Text>{workflow.name}</Text>
        <Text dimColor>({workflow.conclusion || workflow.status})</Text>
      </Box>
      {workflow.failedJobs && workflow.failedJobs.length > 0 && (
        <Box marginLeft={4}>
          <Text color="red">
            Failed: {workflow.failedJobs.map((j) => j.name).join(', ')}
          </Text>
        </Box>
      )}
      <Box marginLeft={4}>
        <Text dimColor>{workflow.url}</Text>
      </Box>
    </Box>
  );
}

export function DeploymentItem({ deployment }: { deployment: Deployment }) {
  return (
    <Box flexDirection="column" marginLeft={2} marginBottom={1}>
      <Box flexDirection="row" gap={1}>
        <Text color="green">→</Text>
        <Text>{deployment.environment}</Text>
        <Text dimColor>@ {deployment.createdAt.toLocaleString()}</Text>
      </Box>
      {deployment.prNumbers && deployment.prNumbers.length > 0 && (
        <Box marginLeft={4}>
          <Text dimColor>
            PRs: {deployment.prNumbers.map((n) => `#${n}`).join(', ')}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export function DigestView({ data, aiSummary }: DigestViewProps) {
  const { prs, groupedPRs, riskyPRs, workflows, deployments, owner, repo, since } = data;
  
  const failedWorkflows = workflows.filter((w) => w.conclusion === 'failure');
  const topLabels = Array.from(groupedPRs.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);

  const hoursBack = Math.round((Date.now() - since.getTime()) / (1000 * 60 * 60));

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="magenta">
          ╔═══════════════════════════════════════════════════════════╗
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text bold color="magenta">
          Engineering Digest — {new Date().toDateString()}
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text dimColor>
          Repository: {owner}/{repo} • Last {hoursBack}h
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text bold color="magenta">
          ╚═══════════════════════════════════════════════════════════╝
        </Text>
      </Box>

      {/* AI Summary */}
      <SectionHeader title="📝 AI Summary" />
      <Box marginLeft={2} marginBottom={1} flexDirection="column">
        <Text>{aiSummary}</Text>
      </Box>

      {/* Overview Stats */}
      <SectionHeader title="📊 Overview" />
      <Box marginLeft={2} flexDirection="column">
        <Text>
          • <Text color="cyan">{prs.length}</Text> PRs merged
        </Text>
        <Text>
          • <Text color={riskyPRs.length > 0 ? 'yellow' : 'green'}>
            {riskyPRs.length}
          </Text> risky changes flagged
        </Text>
        <Text>
          • <Text color={failedWorkflows.length > 0 ? 'red' : 'green'}>
            {failedWorkflows.length}
          </Text> CI failures
        </Text>
        <Text>
          • <Text color="green">{deployments.length}</Text> deployments
        </Text>
      </Box>

      {/* PRs by Label */}
      {topLabels.length > 0 && (
        <>
          <SectionHeader title="🏷️  Merged PRs by Label" />
          {topLabels.map(([label, labelPRs]) => (
            <Box key={label} flexDirection="column" marginBottom={1}>
              <Box marginLeft={2}>
                <Text color="blue" bold>
                  {label} ({labelPRs.length})
                </Text>
              </Box>
              {labelPRs.slice(0, 3).map((pr) => (
                <PRItem key={pr.number} pr={pr} />
              ))}
            </Box>
          ))}
        </>
      )}

      {/* Risky PRs */}
      {riskyPRs.length > 0 && (
        <>
          <SectionHeader title="⚠️  Risky Changes" />
          {riskyPRs.map((pr) => (
            <PRItem key={pr.number} pr={pr} />
          ))}
        </>
      )}

      {/* CI Status */}
      {workflows.length > 0 && (
        <>
          <SectionHeader title="🔧 CI Status" />
          {failedWorkflows.length > 0 ? (
            failedWorkflows.slice(0, 5).map((workflow) => (
              <WorkflowItem key={workflow.id} workflow={workflow} />
            ))
          ) : (
            <Box marginLeft={2}>
              <Text color="green">✓ All workflows passing</Text>
            </Box>
          )}
        </>
      )}

      {/* Deployments */}
      {deployments.length > 0 && (
        <>
          <SectionHeader title="🚀 Deployments" />
          {deployments.slice(0, 5).map((deployment) => (
            <DeploymentItem key={deployment.id} deployment={deployment} />
          ))}
        </>
      )}

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          ───────────────────────────────────────────────────────────
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          Generated at {new Date().toLocaleTimeString()}
        </Text>
      </Box>
    </Box>
  );
}

