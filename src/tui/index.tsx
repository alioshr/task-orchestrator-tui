#!/usr/bin/env bun

async function main() {
  // Check if we're in a TTY environment
  if (!process.stdin.isTTY) {
    console.error('TUI requires an interactive terminal. Run directly in a terminal, not through a pipe.');
    process.exit(1);
  }

  const [{ render }, React, { bootstrap }, { App }] = await Promise.all([
    import('ink'),
    import('react'),
    import('@allpepper/task-orchestrator'),
    import('./app'),
  ]);

  bootstrap();

  // Render the TUI
  const { waitUntilExit } = render(<App />);
  await waitUntilExit();
}

main().catch(console.error);
