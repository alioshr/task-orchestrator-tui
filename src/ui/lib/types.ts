import type { Task, Feature, Priority } from '@allpepper/task-orchestrator';

/**
 * Navigation screens for the TUI
 */
export enum Screen {
  Dashboard = 'dashboard',
  ProjectView = 'project-view',
  FeatureView = 'feature-view',
  TaskDetail = 'task-detail',
  Search = 'search',
  Help = 'help',
}

/**
 * Screen parameters for navigation
 */
export interface ScreenParams {
  [Screen.Dashboard]: Record<string, never>;
  [Screen.ProjectView]: { projectId: string };
  [Screen.FeatureView]: { featureId: string };
  [Screen.TaskDetail]: { taskId: string };
  [Screen.Search]: { query?: string };
  [Screen.Help]: Record<string, never>;
}

/**
 * Navigation state with screen stack
 */
export interface NavigationState {
  stack: Array<{
    screen: Screen;
    params: Record<string, unknown>;
  }>;
}

/**
 * Keyboard shortcut definition
 */
export interface Shortcut {
  key: string;
  label: string;
  action: () => void;
}

/**
 * Generic tree node for hierarchical data
 */
export interface TreeNode<T> {
  data: T;
  children: TreeNode<T>[];
  expanded: boolean;
  level: number;
}

/**
 * Feature with nested tasks for tree view
 */
export interface FeatureWithTasks extends Feature {
  tasks: Task[];
}

/**
 * Kanban board task with optional feature label
 */
export interface BoardTask extends Task {
  featureName?: string;
}

/**
 * Kanban board card definition
 */
export interface BoardCard {
  id: string;
  title: string;
  featureName: string | null;
  priority: Priority;
  task: BoardTask;
}

/**
 * Kanban board column definition
 */
export interface BoardColumn {
  id: string;
  title: string;
  status: string;
  tasks: BoardTask[];
}

/**
 * Search result types
 */
export interface SearchResults {
  projects: Array<{ id: string; name: string; summary: string }>;
  features: Array<{ id: string; name: string; summary: string; projectId?: string }>;
  tasks: Array<{ id: string; title: string; summary: string; projectId?: string; featureId?: string }>;
}

/**
 * Dependency information for a task
 */
export interface DependencyInfo {
  blockedBy: Task[];
  blocks: Task[];
}

/**
 * Project overview data
 */
export interface ProjectOverview {
  project: {
    id: string;
    name: string;
    summary: string;
    status: string;
  };
  taskCounts: {
    total: number;
    byStatus: Record<string, number>;
  };
}

/**
 * Feature overview data
 */
export interface FeatureOverview {
  feature: {
    id: string;
    name: string;
    summary: string;
    status: string;
    priority: Priority;
  };
  taskCounts: {
    total: number;
    byStatus: Record<string, number>;
  };
}

/**
 * Feature card for the feature-based Kanban board
 */
export interface BoardFeature extends Feature {
  tasks: Task[];
  taskCounts: { total: number; completed: number };
}

/**
 * Column in the feature-based Kanban board
 */
export interface FeatureBoardColumn {
  id: string;
  title: string;
  status: string;
  features: BoardFeature[];
}
