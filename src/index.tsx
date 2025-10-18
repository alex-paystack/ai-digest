#!/usr/bin/env bun
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { DigestCommand } from './commands/digest.js';

const program = new Command();

program
  .name('eng-digest')
  .description('AI-powered engineering digest CLI')
  .version('1.0.0');

program
  .command('digest')
  .description('Generate an engineering digest for a repository')
  .option('--owner <owner>', 'GitHub repository owner/organization')
  .option('--repo <repo>', 'GitHub repository name')
  .option('--since <hours>', 'Hours to look back (default: 24)', '24')
  .action(async (options) => {
    render(<DigestCommand owner={options.owner} repo={options.repo} since={options.since} />);
  });

// If no command specified, show help
if (process.argv.length === 2) {
  program.help();
}

program.parse();

