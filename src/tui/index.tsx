#!/usr/bin/env bun
import { render } from 'ink';
import React from 'react';
import { runMigrations } from 'task-orchestrator-bun/src/db/migrate';
import { App } from './app';

async function main() {
  // Check if we're in a TTY environment
  if (!process.stdin.isTTY) {
    console.error('TUI requires an interactive terminal. Run directly in a terminal, not through a pipe.');
    process.exit(1);
  }

  // Run database migrations first
  await runMigrations();

  // Render the TUI
  const { waitUntilExit } = render(<App />);
  await waitUntilExit();
}

main().catch(console.error);
