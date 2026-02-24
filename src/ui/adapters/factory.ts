import type { DataAdapter } from './types';

const DEFAULT_MCP_URL = 'http://127.0.0.1:3100/mcp';

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
  const { McpHttpAdapter } = await import('./mcp-http');
  return new McpHttpAdapter({ url: getMcpUrlFromEnv(env) });
}
