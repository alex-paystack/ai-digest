import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { PullRequest } from '../github/types.js';

// Schema for AI risk analysis
const riskAnalysisSchema = z.object({
  riskScore: z.number().min(0).max(1).describe('Overall risk score from 0 to 1'),
  riskFactors: z.array(z.string()).describe('List of specific risk factors identified'),
  reasoning: z.string().describe('Brief explanation of the risk assessment'),
  concerns: z.array(z.string()).describe('Specific areas that need attention'),
  recommendations: z.array(z.string()).describe('Recommendations to mitigate risks'),
});

export type AIRiskAnalysis = z.infer<typeof riskAnalysisSchema>;

/**
 * Use AI to analyze PR risk with contextual understanding
 */
export async function analyzeRiskWithAI(
  pr: PullRequest,
  apiKey: string
): Promise<AIRiskAnalysis> {
  const prompt = `Analyze the risk level of this pull request:

**PR #${pr.number}: ${pr.title}**

Metadata:
- Files changed: ${pr.changedFiles}
- Lines added: ${pr.additions}
- Lines deleted: ${pr.deletions}
- Total changes: ${pr.additions + pr.deletions} lines
- Time to merge: ${Math.round(pr.timeToMergeHours)} hours
- Author: ${pr.author}
- Labels: ${pr.labels.join(', ') || 'none'}

Files affected:
${pr.filesChanged.slice(0, 20).map(f => `- ${f}`).join('\n')}
${pr.filesChanged.length > 20 ? `... and ${pr.filesChanged.length - 20} more files` : ''}

Consider:
1. **Scope**: How many files and lines are changed?
2. **Complexity**: Are critical files affected (config, auth, payments, database)?
3. **Testing**: Are test files included? Is there sufficient test coverage?
4. **Review time**: Was this rushed or carefully reviewed?
5. **File types**: Are infrastructure files (CI/CD, Docker, migrations) modified?
6. **Patterns**: Are there red flags in file names or patterns?

Provide a risk assessment from 0 (no risk) to 1 (high risk).`;
  
  const { object } = await generateObject({
    model: openai('gpt-5'),
    schema: riskAnalysisSchema,
    prompt,
    temperature: 0.3, // Lower temperature for more consistent risk assessment
  });

  return object;
}

/**
 * Batch analyze multiple PRs with AI (with rate limiting)
 */
export async function batchAnalyzeRisksWithAI(
  prs: PullRequest[],
  apiKey: string,
  options: {
    concurrent?: number; // How many to analyze at once
    onProgress?: (current: number, total: number) => void;
  } = {}
): Promise<Map<number, AIRiskAnalysis>> {
  const { concurrent = 3, onProgress } = options;
  const results = new Map<number, AIRiskAnalysis>();

  // Process in batches to avoid rate limits
  for (let i = 0; i < prs.length; i += concurrent) {
    const batch = prs.slice(i, i + concurrent);
    
    const batchResults = await Promise.all(
      batch.map(async (pr) => {
        try {
          const analysis = await analyzeRiskWithAI(pr, apiKey);
          return { prNumber: pr.number, analysis };
        } catch (error) {
          console.error(`Error analyzing PR #${pr.number}:`, error);
          return null;
        }
      })
    );

    // Store results
    for (const result of batchResults) {
      if (result) {
        results.set(result.prNumber, result.analysis);
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + concurrent, prs.length), prs.length);
    }

    // Small delay between batches to be nice to the API
    if (i + concurrent < prs.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Hybrid approach: Use formula for quick scoring, AI for high-risk PRs
 */
export async function hybridRiskAnalysis(
  prs: PullRequest[],
  apiKey: string,
  formulaRiskThreshold = 0.5
): Promise<Map<number, AIRiskAnalysis>> {
  // Filter PRs that meet the formula threshold
  const highRiskPRs = prs.filter(pr => {
    const formulaRisk = calculateFormulaRisk(pr);
    return formulaRisk >= formulaRiskThreshold;
  });

  console.log(`Analyzing ${highRiskPRs.length} high-risk PRs with AI...`);

  return batchAnalyzeRisksWithAI(highRiskPRs, apiKey);
}

/**
 * Calculate risk using the original formula
 */
function calculateFormulaRisk(pr: PullRequest): number {
  const normalizedLines = Math.min(pr.additions + pr.deletions, 2000) / 2000;
  const normalizedFiles = Math.min(pr.changedFiles, 20) / 20;
  const noTests = !pr.filesChanged.some((f) => /test|spec/.test(f));
  const slowMerge = pr.timeToMergeHours > 72;

  return (
    normalizedLines * 0.4 +
    normalizedFiles * 0.3 +
    (noTests ? 0.2 : 0) +
    (slowMerge ? 0.1 : 0)
  );
}

