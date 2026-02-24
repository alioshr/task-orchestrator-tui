/**
 * Data Adapters
 *
 * Barrel export for adapter implementations
 */

export { McpHttpAdapter } from './mcp-http';
export {
  createAdapterFromEnv,
  getMcpUrlFromEnv,
} from './factory';
export type {
  DataAdapter,
  Result,
  SearchParams,
  FeatureSearchParams,
  TaskSearchParams,
} from './types';
