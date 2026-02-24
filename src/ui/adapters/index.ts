/**
 * Data Adapters
 *
 * Barrel export for adapter implementations
 */

export { DirectAdapter } from './direct';
export { McpHttpAdapter } from './mcp-http';
export {
  createAdapterFromEnv,
  getAdapterModeFromEnv,
  getMcpUrlFromEnv,
  type AdapterMode,
} from './factory';
export type {
  DataAdapter,
  Result,
  SearchParams,
  FeatureSearchParams,
  TaskSearchParams,
} from './types';
