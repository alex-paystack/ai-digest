# Feature: Save Digest to File

## Overview

Added ability to save the engineering digest to a markdown file for easy sharing, archiving, and documentation.

## Implementation

### Changes Made

1. **CLI Option** (`src/index.tsx`)
   - Added `--output <path>` option to the digest command
   - Accepts any file path (relative or absolute)

2. **Markdown Formatter** (`src/commands/digest.tsx`)
   - Created `formatDigestAsMarkdown()` function
   - Generates properly formatted markdown with:
     - Headers and sections
     - Clickable PR/workflow links
     - Tables and lists
     - Risk scores and metadata
     - Timestamps

3. **File Writing** (`src/commands/digest.tsx`)
   - Writes markdown file after AI summary generation
   - Shows success message with file path
   - Displays both terminal output AND saves to file

4. **Documentation** (`README.md`)
   - Updated options section
   - Added examples showing file output usage
   - Documented markdown format benefits

## Usage

```bash
# Basic file output
bun run digest --owner=myorg --repo=myrepo --output=digest.md

# Daily digest with date in filename
bun run digest --owner=myorg --repo=myrepo --output=digest-$(date +%Y-%m-%d).md

# Weekly digest
bun run digest --owner=myorg --repo=myrepo --since=168 --output=weekly-digest.md
```

## Output Format

The markdown file includes:

```markdown
# Engineering Digest — [Date]

**Repository:** owner/repo
**Time Period:** Last X hours

---

## 📝 AI Summary

[AI-generated insights]

## 📊 Overview

- **X** PRs merged
- **X** risky changes flagged
- **X** CI failures
- **X** deployments

## 🏷️ Merged PRs by Label

### Label Name (X PRs)

#### [#123](url) PR Title
- **Files changed:** 5
- **Lines:** +100/-50
- **Risk score:** 25%
- **Author:** @username
- **Labels:** label1, label2

## ⚠️ Risky Changes

[High-risk PRs with details]

## 🔧 CI Status

[Workflow status and failures]

## 🚀 Deployments

[Deployment events]

---

*Generated at [timestamp]*
```

## Use Cases

1. **Team Communication**
   - Share digest in Slack/email
   - Post-mortem documentation
   - Weekly standup reports

2. **Project Management**
   - Archive project history
   - Track velocity and patterns
   - Review for retrospectives

3. **Automation**
   - Scheduled daily/weekly digests
   - CI/CD integration
   - Automated reporting pipelines

4. **Documentation**
   - Project changelogs
   - Release notes foundation
   - Historical reference

## Future Enhancements

- Multiple output formats (JSON, HTML)
- Template customization
- Automatic file naming patterns
- Direct Slack/email integration
- Diff between digest periods

## Technical Details

- Uses Node.js `fs/promises` for async file writing
- UTF-8 encoding for emoji support
- Non-blocking - doesn't interfere with terminal display
- Error handling for file write failures
- Clickable GitHub URLs in markdown


