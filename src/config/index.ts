import 'dotenv/config';

export interface Config {
  github: {
    token: string;
    owner: string;
    repo: string;
  };
  openai: {
    apiKey: string;
  };
  since: Date;
}

export function loadConfig(options: {
  owner?: string;
  repo?: string;
  since?: string;
}): Config {
  // Load from environment
  const githubToken = process.env.GITHUB_TOKEN;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  // Validate required env vars
  if (!githubToken) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  // Validate required CLI args
  if (!options.owner) {
    throw new Error('--owner argument is required');
  }

  if (!options.repo) {
    throw new Error('--repo argument is required');
  }

  // Parse since parameter (hours to look back, defaults to 24)
  const hoursBack = options.since ? parseInt(options.since, 10) : 24;
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  return {
    github: {
      token: githubToken,
      owner: options.owner,
      repo: options.repo,
    },
    openai: {
      apiKey: openaiApiKey,
    },
    since,
  };
}

