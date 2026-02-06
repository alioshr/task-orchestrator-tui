#!/usr/bin/env bun
import { homedir } from 'node:os';
import { join } from 'node:path';

// Set default DB path BEFORE dynamically importing modules that read it
if (!process.env.DATABASE_PATH) {
  process.env.DATABASE_PATH = join(homedir(), '.task-orchestrator', 'tasks.db');
}

async function main() {
  // Check if we're in a TTY environment
  if (!process.stdin.isTTY) {
    console.error('TUI requires an interactive terminal. Run directly in a terminal, not through a pipe.');
    process.exit(1);
  }

  // Dynamic imports so DATABASE_PATH is set before db/client.ts loads
  const [{ render }, React, { runMigrations }, { App }] = await Promise.all([
    import('ink'),
    import('react'),
    import('task-orchestrator-bun/src/db/migrate'),
    import('./app'),
  ]);

  // Run database migrations first
  await runMigrations();

  // Render the TUI
  const { waitUntilExit } = render(<App />);
  await waitUntilExit();
}

main().catch(console.error);
