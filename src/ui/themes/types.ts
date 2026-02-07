import type { Priority } from '@allpepper/task-orchestrator';

/**
 * All possible status values across Project, Feature, and Task
 * Using string literal union to avoid duplicate key issues
 */
export type StatusKey =
  // Project statuses
  | 'PLANNING'
  | 'IN_DEVELOPMENT'
  | 'ON_HOLD'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'ARCHIVED'
  // Feature-only statuses
  | 'DRAFT'
  | 'TESTING'
  | 'VALIDATING'
  | 'PENDING_REVIEW'
  | 'BLOCKED'
  | 'DEPLOYED'
  // Task-only statuses
  | 'BACKLOG'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'READY_FOR_QA'
  | 'INVESTIGATING'
  | 'DEFERRED';

/**
 * Theme interface for the Task Orchestrator UI
 * Supports both TUI (terminal) and web renderers
 */
export interface Theme {
  name: 'dark' | 'light';
  colors: {
    // Base colors
    background: string;
    foreground: string;
    muted: string;
    border: string;

    // Status colors - maps all unique status values
    status: Record<StatusKey, string>;

    // Priority colors
    priority: Record<Priority, string>;

    // Semantic colors
    accent: string;
    success: string;
    warning: string;
    error: string;
    danger: string;
    info: string;

    // Interactive colors
    selection: string;
    highlight: string;
  };
}

/**
 * Task counts structure used in overviews
 */
export interface TaskCounts {
  total: number;
  byStatus: Record<string, number>;
}
