#!/usr/bin/env bun

interface OrchestratorStatusPayload {
  success?: boolean;
  data?: {
    running?: boolean;
    status?: {
      mcpUrl?: string;
    } | null;
  };
}

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

function getStatusUrlFromMcpUrl(mcpUrl: string): string | null {
  try {
    const parsed = new URL(mcpUrl);
    parsed.pathname = '/status';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

async function fetchOrchestratorStatus(statusUrl: string): Promise<OrchestratorStatusPayload | null> {
  try {
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as OrchestratorStatusPayload;
  } catch {
    return null;
  }
}

function getDiscoveryPortsFromEnv(env: Record<string, string | undefined>): number[] {
  const raw = env.TASKS_MCP_DISCOVERY_PORTS;
  if (!raw) {
    return [3100, 3101, 3900];
  }

  const ports = raw
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0 && value < 65536);

  return ports.length > 0 ? ports : [3100, 3101, 3900];
}

async function resolveMcpUrl(
  configuredMcpUrl: string,
  env: Record<string, string | undefined> = process.env
): Promise<string | null> {
  const explicitEnvUrl = env.TASKS_MCP_URL ?? env.TASK_ORCHESTRATOR_MCP_URL ?? env.MCP_URL;
  const statusUrlsToTry: string[] = [];
  const seen = new Set<string>();

  const configuredStatusUrl = getStatusUrlFromMcpUrl(configuredMcpUrl);
  if (configuredStatusUrl) {
    statusUrlsToTry.push(configuredStatusUrl);
    seen.add(configuredStatusUrl);
  }

  if (!explicitEnvUrl) {
    for (const port of getDiscoveryPortsFromEnv(env)) {
      const statusUrl = `http://127.0.0.1:${port}/status`;
      if (!seen.has(statusUrl)) {
        statusUrlsToTry.push(statusUrl);
        seen.add(statusUrl);
      }
    }
  }

  for (const statusUrl of statusUrlsToTry) {
    const payload = await fetchOrchestratorStatus(statusUrl);
    const discoveredMcpUrl = payload?.data?.status?.mcpUrl;
    const running = payload?.data?.running === true;

    if (running && discoveredMcpUrl && (await canReachMcp(discoveredMcpUrl))) {
      return discoveredMcpUrl;
    }
  }

  if (await canReachMcp(configuredMcpUrl)) {
    return configuredMcpUrl;
  }

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

  const configuredMcpUrl = getMcpUrlFromEnv();
  const mcpUrl = await resolveMcpUrl(configuredMcpUrl);
  if (!mcpUrl) {
    console.error(
      `Unable to discover/connect to MCP HTTP server. Checked ${configuredMcpUrl} and /status discovery ports.`
    );
    process.exit(1);
  }

  const adapter = await createAdapterFromEnv({ ...process.env, TASKS_MCP_URL: mcpUrl });

  // Render the TUI
  const { waitUntilExit } = render(<App adapter={adapter} />);
  await waitUntilExit();
}

main().catch(console.error);
