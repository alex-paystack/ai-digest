# Quick Start Guide

Get your AI Engineering Summary bot running in 5 minutes!

## Prerequisites

- [Bun](https://bun.sh/) installed (`curl -fsSL https://bun.sh/install | bash`)
- GitHub account with a Personal Access Token
- OpenAI API key

## Setup Steps

### 1. Install Dependencies

```bash
bun install
```

This will install:
- `@octokit/rest` - GitHub API client
- `@ai-sdk/openai` and `ai` - Vercel AI SDK
- `ink` and `react` - CLI UI framework
- `commander` - CLI parsing
- `dotenv` - Environment variables

### 2. Configure Environment

```bash
# Copy the template
cp env.template .env
```

Edit `.env` and add your tokens:

```env
GITHUB_TOKEN=ghp_your_actual_github_token_here
OPENAI_API_KEY=sk-your_actual_openai_key_here
```

**Getting your tokens:**

- **GitHub Token**: 
  1. Go to https://github.com/settings/tokens
  2. Click "Generate new token (classic)"
  3. Select scope: `repo` (Full control of private repositories)
  4. Copy the token

- **OpenAI Key**:
  1. Go to https://platform.openai.com/api-keys
  2. Click "Create new secret key"
  3. Copy the key

### 3. Test Run

Try it with a popular open-source repo:

```bash
bun run src/index.tsx digest --owner=facebook --repo=react --since=168
```

This will generate a 7-day digest for the React repository.

### 4. Try with Your Repo

```bash
bun run src/index.tsx digest --owner=YOUR_ORG --repo=YOUR_REPO
```

## What You'll See

The tool will:
1. ✅ Fetch GitHub data (PRs, CI, deployments)
2. ✅ Analyze risk scores
3. ✅ Generate AI summary
4. ✅ Display beautiful formatted digest

## Expected Output

```
╔═══════════════════════════════════════════════════════════╗
Engineering Digest — Sat, 18 Oct 2025
Repository: facebook/react • Last 24h
╚═══════════════════════════════════════════════════════════╝

📝 AI Summary
...

📊 Overview
• 5 PRs merged
• 2 risky changes flagged
• 0 CI failures
• 1 deployments

🏷️ Merged PRs by Label
...

⚠️ Risky Changes
...

🔧 CI Status
...

🚀 Deployments
...
```

## Common Issues

### "Command not found: bun"
Install Bun: `curl -fsSL https://bun.sh/install | bash`

### "GITHUB_TOKEN environment variable is required"
Make sure you created `.env` file with your token

### "Rate limit exceeded"
You've hit GitHub API rate limits. Wait an hour or use a different token.

### No PRs showing up
- Check the `--since` parameter (default is 24 hours)
- Verify the repo has recent merged PRs
- Make sure your token has access to the repo

## Next Steps

- Try different time ranges with `--since`
- Experiment with different repos
- Check out the main [README.md](./README.md) for detailed docs
- Consider setting up a scheduled cron job for daily digests

## Making it Easier

Add to your shell profile (~/.zshrc or ~/.bashrc):

```bash
alias eng-digest="cd /path/to/ai-summary && bun run src/index.tsx digest"
```

Then you can run:
```bash
eng-digest --owner=myorg --repo=myrepo
```

## Future: Slack Integration

Once you're comfortable with the CLI, you can extend it to post to Slack:
- Add `@slack/bolt` package
- Create Slack bot token
- Schedule with cron or GitHub Actions
- Post digest to channel

Enjoy your AI-powered engineering digests! 🚀

