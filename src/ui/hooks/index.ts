/**
 * UI Hooks
 *
 * Custom React hooks for the Task Orchestrator TUI
 */

export {
  useProjects,
  useProjectOverview,
  useProjectTree,
  useTask,
  useSearch,
  calculateTaskCounts,
  calculateTaskCountsByProject,
  type TaskCounts,
  type ProjectWithCounts,
} from './use-data';
export { useDebounce } from './use-debounce';
export { useNavigation } from './use-navigation';
export { useKanban } from './use-kanban';
