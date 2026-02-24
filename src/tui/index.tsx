#!/usr/bin/env bun

function isLocalMcpUrl(url: URL): boolean {
  return url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost');
}

async function canReachMcp(url: string): Promise<boolean> {
  try {
    await fetch(url, { method: 'GET' });
    return true;
  } catch {
    return false;
  }
}

async function ensureMcpServer(url: string): Promise<ReturnType<typeof Bun.spawn> | null> {
  if (await canReachMcp(url)) {
    return null;
  }

  const autoStartFlag = process.env.TASKS_AUTO_START_MCP?.toLowerCase();
  const autoStartDisabled =
    autoStartFlag === '0' || autoStartFlag === 'false' || autoStartFlag === 'no';

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (autoStartDisabled || !isLocalMcpUrl(parsed)) {
    return null;
  }

  const port = parsed.port || '3100';
  const child = Bun.spawn(['bunx', '@allpepper/task-orchestrator', '--http'], {
    env: {
      ...process.env,
      PORT: port,
      TRANSPORT: 'http',
    },
    stdout: 'ignore',
    stderr: 'ignore',
  });

  for (let i = 0; i < 40; i++) {
    if (await canReachMcp(url)) {
      return child;
    }
    await Bun.sleep(200);
  }

  try {
    child.kill();
  } catch {}

  return null;
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
  const spawnedServer = await ensureMcpServer(mcpUrl);

  if (!(await canReachMcp(mcpUrl))) {
    console.error(
      `Unable to connect to MCP server at ${mcpUrl}. Start it with: bunx @allpepper/task-orchestrator --http`
    );
    process.exit(1);
  }

  if (spawnedServer) {
    process.on('exit', () => {
      try {
        spawnedServer.kill();
      } catch {}
    });
  }

  const adapter = await createAdapterFromEnv();

  // Render the TUI
  const { waitUntilExit } = render(<App adapter={adapter} />);
  await waitUntilExit();
}

main().catch(console.error);
