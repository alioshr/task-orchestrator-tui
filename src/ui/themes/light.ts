import type { Theme } from './types';
import { Priority } from '@allpepper/task-orchestrator';

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    // Base colors
    background: '#ffffff',
    foreground: '#1a1a2e',
    muted: '#6b7280',
    border: '#e5e7eb',

    // Status colors (unique keys only)
    status: {
      // Project/Feature/Task shared
      PLANNING: '#6b7280',
      IN_DEVELOPMENT: '#3b82f6',
      ON_HOLD: '#d97706',
      CANCELLED: '#6b7280',
      COMPLETED: '#16a34a',
      ARCHIVED: '#9ca3af',

      // Feature/Task shared
      TESTING: '#06b6d4',
      BLOCKED: '#ef4444',
      DEPLOYED: '#22c55e',

      // Feature only
      DRAFT: '#9ca3af',
      VALIDATING: '#14b8a6',
      PENDING_REVIEW: '#8b5cf6',

      // Task only
      BACKLOG: '#9ca3af',
      PENDING: '#6b7280',
      IN_PROGRESS: '#3b82f6',
      IN_REVIEW: '#8b5cf6',
      CHANGES_REQUESTED: '#f97316',
      READY_FOR_QA: '#14b8a6',
      INVESTIGATING: '#eab308',
      DEFERRED: '#9ca3af',
    },

    // Priority colors
    priority: {
      [Priority.HIGH]: '#dc2626',
      [Priority.MEDIUM]: '#ca8a04',
      [Priority.LOW]: '#16a34a',
    },

    // Semantic colors
    accent: '#2563eb',
    success: '#16a34a',
    warning: '#ca8a04',
    error: '#dc2626',
    danger: '#dc2626',
    info: '#0891b2',

    // Interactive colors
    selection: '#dbeafe',
    highlight: '#bfdbfe',
  },
};
