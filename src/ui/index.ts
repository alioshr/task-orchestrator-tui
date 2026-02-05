/**
 * Task Orchestrator UI - Shared Layer
 *
 * Platform-agnostic foundation for TUI, web, and Electron renderers.
 */

// Themes
export { darkTheme } from './themes/dark';
export { lightTheme } from './themes/light';
export type { Theme, TaskCounts, StatusKey } from './themes/types';

// Lib - Types
export {
  Screen,
  type ScreenParams,
  type NavigationState,
  type Shortcut,
  type TreeNode,
  type FeatureWithTasks,
  type BoardColumn,
  type SearchResults,
  type DependencyInfo,
  type ProjectOverview,
  type FeatureOverview,
} from './lib/types';

// Lib - Format utilities
export {
  timeAgo,
  truncateId,
  truncateText,
  pluralize,
  formatTaskCount,
  formatCount,
  formatStatus,
  formatPriority,
} from './lib/format';

// Lib - Color utilities
export {
  getStatusColor,
  getPriorityColor,
  getPriorityDots,
  getSemanticColor,
  isActiveStatus,
  isBlockedStatus,
  isCompletedStatus,
} from './lib/colors';

// Adapters
export type {
  DataAdapter,
  Result,
  SearchParams,
  FeatureSearchParams,
  TaskSearchParams,
} from './adapters/types';
export { DirectAdapter } from './adapters/direct';

// Context
export { ThemeProvider, useTheme } from './context/theme-context';
export { AdapterProvider, useAdapter } from './context/adapter-context';

// Hooks
export { NavigationProvider, useNavigation } from './hooks/use-navigation';
export {
  useProjects,
  useProjectOverview,
  useProjectTree,
  useTask,
  useSearch,
} from './hooks/use-data';
export { useDebounce } from './hooks/use-debounce';
