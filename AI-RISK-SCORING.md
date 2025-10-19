# AI-Powered Risk Scoring

## Overview

The AI-powered risk scoring feature uses GPT-4 to provide contextual, nuanced risk assessments for pull requests. Instead of relying solely on quantitative metrics, AI can understand the semantic meaning of changes and identify risks that formula-based approaches might miss.

## Why Use AI for Risk Scoring?

### Formula-Based Approach (Default)

- **Pros**: Fast, consistent, no API costs
- **Cons**: Misses context, can't understand semantics
- **Formula**:

  ```bash
  risk = (lines_changed * 0.4) + (files_changed * 0.3) 
       + (no_tests * 0.2) + (slow_merge * 0.1)
  ```

### AI-Enhanced Approach

- **Pros**: Contextual understanding, identifies hidden risks
- **Cons**: Slower, uses API credits
- **Analyzes**:
  - Critical file types (auth, payments, migrations)
  - Code patterns and anti-patterns
  - Test coverage quality
  - Infrastructure changes
  - Security implications

## Usage

### Basic AI Risk Scoring

```bash
# Use AI for ALL PRs (slow, expensive)
bun run digest --owner=myorg --repo=myrepo --ai-risk
```

### Hybrid Approach (Recommended)

```bash
# Only use AI for PRs that exceed formula threshold of 50%
bun run digest --owner=myorg --repo=myrepo --ai-risk --ai-risk-threshold=0.5

# Use AI only for very high-risk PRs (>70%)
bun run digest --owner=myorg --repo=myrepo --ai-risk --ai-risk-threshold=0.7
```

## How It Works

### 1. Initial Formula-Based Screening

All PRs are first scored using the fast formula-based approach.

### 2. AI Analysis for High-Risk PRs

PRs that exceed the threshold are sent to GPT-4 for analysis:

```typescript
// Hybrid approach: Formula first, AI for high-risk
const highRiskPRs = prs.filter(pr => formulaRisk(pr) >= 0.5);
const aiAnalysis = await analyzeWithAI(highRiskPRs);
```

### 3. Structured AI Response

The AI returns structured data using `generateObject`:

```json
{
  "riskScore": 0.75,
  "riskFactors": [
    "Modifies authentication middleware",
    "Changes database migration files",
    "No integration tests added"
  ],
  "reasoning": "This PR touches critical auth code without adequate test coverage",
  "concerns": [
    "Authentication bypass potential",
    "Database schema changes could break existing data"
  ],
  "recommendations": [
    "Add integration tests for auth flows",
    "Review migration rollback strategy",
    "Consider feature flag for gradual rollout"
  ]
}
```

## Output

### Terminal Display

```mdx
⚠️ Risky Changes

#842 Add idempotency to charge route
🤖 [Risk: 78%]
  14 files, +420/-120 lines

  🤖 AI: This PR modifies payment processing logic without comprehensive
      integration tests. High-impact code requires additional validation.
  
  ⚠️  Payment processing modified without integration tests,
      Database transaction handling changed
```

### Markdown File Output

```markdown
## ⚠️ Risky Changes

### [#842](url) Add idempotency to charge route
- **Risk score:** 78% 🤖 (AI-enhanced)
- **Changes:** 14 files, 540 lines

**🤖 AI Risk Analysis:**
- This PR modifies payment processing logic without comprehensive integration tests

**Concerns:**
- ⚠️ Payment processing modified without integration tests
- ⚠️ Database transaction handling changed
- ⚠️ No rollback plan documented

**Recommendations:**
- 💡 Add integration tests for payment flows
- 💡 Test idempotency with concurrent requests
- 💡 Document rollback procedure
```

## AI Analysis Factors

The AI considers multiple dimensions:

### 1. File Criticality

- **High**: auth, payments, migrations, security
- **Medium**: API routes, database models
- **Low**: UI components, documentation

### 2. Change Patterns

- Refactoring vs. new features
- Breaking changes
- Configuration changes
- Dependency updates

### 3. Test Coverage

- Quality of tests, not just presence
- Integration vs. unit tests
- Coverage of edge cases

### 4. Review Indicators

- Time to merge (rushed?)
- Number of review rounds
- Size of changes

## Cost & Performance

### API Costs

- **Model**: GPT-4-turbo
- **Cost**: ~$0.01-0.03 per PR analysis
- **Tokens**: ~500-1000 per request

### Example Costs

```
10 PRs/day × 30 days × $0.02/PR = $6/month
50 PRs/day × 30 days × $0.02/PR = $30/month
```

### Performance

```
Formula-based: ~10ms per PR
AI-enhanced: ~2-5 seconds per PR

100 PRs with 10 high-risk:
- Formula only: ~1 second total
- AI-enhanced: ~30-50 seconds total
```

### Optimization Strategies

1. **Hybrid Approach**: Only analyze high-risk PRs
2. **Batch Processing**: Analyze multiple PRs concurrently (3-5 at a time)
3. **Caching**: Cache results for unchanged PRs
4. **Selective Analysis**: Only analyze PRs touching critical paths

## Implementation Details

### File Structure

```mdx
src/analysis/
├── risk.ts        # Formula-based scoring
├── ai-risk.ts     # AI-powered analysis
└── grouping.ts    # PR grouping
```

### Key Functions

```typescript
// Analyze single PR with AI
analyzeRiskWithAI(pr, apiKey): Promise<AIRiskAnalysis>

// Batch analyze with rate limiting
batchAnalyzeRisksWithAI(prs, apiKey, options): Promise<Map<number, AIRiskAnalysis>>

// Hybrid: formula + AI for high-risk
hybridRiskAnalysis(prs, apiKey, threshold): Promise<Map<number, AIRiskAnalysis>>
```

## Configuration

### Environment Variables

```bash
OPENAI_API_KEY=sk-xxx  # Required for AI features
```

### CLI Options

```bash
--ai-risk                    # Enable AI risk scoring
--ai-risk-threshold <0-1>    # Threshold for AI analysis (default: 0.5)
```

## Examples

### Example 1: Daily Digest with AI

```bash
#!/bin/bash
# daily-digest.sh

bun run digest \
  --owner=myorg \
  --repo=myrepo \
  --since=24 \
  --ai-risk \
  --ai-risk-threshold=0.6 \
  --output=digest-$(date +%Y-%m-%d).md
```

### Example 2: Weekly High-Risk Review

```bash
# Only analyze very risky PRs with AI
bun run digest \
  --owner=myorg \
  --repo=myrepo \
  --since=168 \
  --ai-risk \
  --ai-risk-threshold=0.7 \
  --output=weekly-risks.md
```

### Example 3: Post-Deployment Review

```bash
# Comprehensive analysis after deployment
bun run digest \
  --owner=myorg \
  --repo=myrepo \
  --since=2 \
  --ai-risk \
  --ai-risk-threshold=0.3 \
  --output=deployment-review.md
```

## Best Practices

### 1. Use Hybrid Approach

Don't analyze every PR with AI. Use formula first, then AI for flagged PRs.

### 2. Tune Threshold

Start with 0.5, adjust based on your needs:

- **0.3-0.4**: Aggressive (more AI calls, higher cost)
- **0.5-0.6**: Balanced (recommended)
- **0.7-0.8**: Conservative (fewer AI calls, might miss risks)

### 3. Schedule Strategically

- **Daily digest**: Use AI with threshold 0.6
- **Weekly review**: Use AI with threshold 0.4
- **Real-time**: Formula only

### 4. Review AI Recommendations

AI analysis includes actionable recommendations. Share these with PR authors.

### 5. Track Accuracy

Monitor AI predictions vs. actual incidents to tune thresholds.

## Troubleshooting

### "Error: OPENAI_API_KEY not found"

```bash
# Add to .env file
echo "OPENAI_API_KEY=sk-xxx" >> .env
```

### "Rate limit exceeded"

Reduce concurrent requests or add delays:

```typescript
// In ai-risk.ts
const options = {
  concurrent: 2  // Lower from default 3
};
```

### "Timeout errors"

Increase timeout or reduce batch size for large PRs.

## Future Enhancements

1. **Custom AI Models**: Support for Claude, Gemini, etc.
2. **Learning from Feedback**: Fine-tune based on incident history
3. **Team-Specific Rules**: Custom risk factors per team
4. **Historical Analysis**: Learn from past incidents
5. **Real-Time Analysis**: Analyze PRs as they're created

## Comparison Matrix

| Feature | Formula | AI-Enhanced |
|---------|---------|-------------|
| Speed | ⚡ Instant | 🐌 2-5s per PR |
| Cost | 💰 Free | 💰💰 ~$0.02/PR |
| Accuracy | ⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent |
| Context | ❌ None | ✅ Full understanding |
| Consistency | ✅ Perfect | ⚠️ Slight variance |
| Recommendations | ❌ No | ✅ Actionable |

## Summary

AI-powered risk scoring provides deep, contextual analysis at the cost of speed and API credits. Use the hybrid approach to get the best of both worlds: fast formula-based screening with AI insights for truly risky changes.

**Recommended Command:**

```bash
bun run digest --owner=myorg --repo=myrepo --ai-risk --ai-risk-threshold=0.5 --output=digest.md
```

This gives you AI analysis for moderately risky PRs while keeping costs reasonable.
