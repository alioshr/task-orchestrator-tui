import type { DataAdapter } from './types';

export type AdapterMode = 'direct' | 'mcp-http';

const DEFAULT_MCP_URL = 'http://127.0.0.1:3100/mcp';

export function getAdapterModeFromEnv(
  env: Record<string, string | undefined> = process.env
): AdapterMode {
  const explicit =
    env.TASKS_ADAPTER ??
    env.TASK_ORCHESTRATOR_TUI_ADAPTER ??
    env.ADAPTER_MODE;

  if (explicit === 'direct' || explicit === 'mcp-http') {
    return explicit;
  }

  if (env.TASKS_MCP_URL || env.TASK_ORCHESTRATOR_MCP_URL || env.MCP_URL) {
    return 'mcp-http';
  }

  return 'mcp-http';
}

export function getMcpUrlFromEnv(
  env: Record<string, string | undefined> = process.env
): string {
  return (
    env.TASKS_MCP_URL ??
    env.TASK_ORCHESTRATOR_MCP_URL ??
    env.MCP_URL ??
    DEFAULT_MCP_URL
  );
}

export async function createAdapterFromEnv(
  env: Record<string, string | undefined> = process.env
): Promise<DataAdapter> {
  const mode = getAdapterModeFromEnv(env);

  if (mode === 'mcp-http') {
    const { McpHttpAdapter } = await import('./mcp-http');
    return new McpHttpAdapter({ url: getMcpUrlFromEnv(env) });
  }

  const { DirectAdapter } = await import('./direct');
  return new DirectAdapter();
}
