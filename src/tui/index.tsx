#!/usr/bin/env bun

async function main() {
  // Check if we're in a TTY environment
  if (!process.stdin.isTTY) {
    console.error('TUI requires an interactive terminal. Run directly in a terminal, not through a pipe.');
    process.exit(1);
  }

  const [{ render }, React, { App }, { createAdapterFromEnv }] = await Promise.all([
    import('ink'),
    import('react'),
    import('./app'),
    import('../ui/adapters/factory'),
  ]);

  const adapter = await createAdapterFromEnv();

  // Render the TUI
  const { waitUntilExit } = render(<App adapter={adapter} />);
  await waitUntilExit();
}

main().catch(console.error);
