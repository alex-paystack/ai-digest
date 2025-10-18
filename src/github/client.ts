import { Octokit } from '@octokit/rest';

let octokitInstance: Octokit | null = null;

export function initGitHubClient(token: string): Octokit {
  octokitInstance = new Octokit({
    auth: token,
  });
  return octokitInstance;
}

export function getGitHubClient(): Octokit {
  if (!octokitInstance) {
    throw new Error('GitHub client not initialized. Call initGitHubClient first.');
  }
  return octokitInstance;
}

