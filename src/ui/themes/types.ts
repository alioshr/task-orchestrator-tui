import type { Priority } from '@allpepper/task-orchestrator';

/**
 * v2 pipeline status keys
 * Task: NEW, ACTIVE, TO_BE_TESTED, READY_TO_PROD, CLOSED, WILL_NOT_IMPLEMENT
 * Feature: NEW, ACTIVE, READY_TO_PROD, CLOSED, WILL_NOT_IMPLEMENT
 * Projects: stateless (no status)
 */
export type StatusKey =
  | 'NEW'
  | 'ACTIVE'
  | 'TO_BE_TESTED'
  | 'READY_TO_PROD'
  | 'CLOSED'
  | 'WILL_NOT_IMPLEMENT';

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

    // Status colors - maps v2 pipeline states
    status: Record<StatusKey, string>;

    // Blocked overlay color (for field-based blocking indicator)
    blocked: string;

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
