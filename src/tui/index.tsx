#!/usr/bin/env bun

async function canReachMcp(url: string): Promise<boolean> {
  try {
    await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
      },
    });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  // Check if we're in a TTY environment
  if (!process.stdin.isTTY) {
    console.error('TUI requires an interactive terminal. Run directly in a terminal, not through a pipe.');
    process.exit(1);
  }

  const [{ render }, React, { App }, { createAdapterFromEnv, getMcpUrlFromEnv }] = await Promise.all([
    import('ink'),
    import('react'),
    import('./app'),
    import('../ui/adapters/factory'),
  ]);

  const mcpUrl = getMcpUrlFromEnv();
  if (!(await canReachMcp(mcpUrl))) {
    console.error(
      `Unable to connect to MCP server at ${mcpUrl}. Start it first, and ensure it uses the intended TASK_ORCHESTRATOR_HOME.`
    );
    process.exit(1);
  }

  const adapter = await createAdapterFromEnv();

  // Render the TUI
  const { waitUntilExit } = render(<App adapter={adapter} />);
  await waitUntilExit();
}

main().catch(console.error);
