import type { Theme } from './types';
import { Priority } from '@allpepper/task-orchestrator';

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    // Base colors
    background: '#1a1a2e',
    foreground: '#eaeaea',
    muted: '#6b6b8d',
    border: '#3d3d5c',

    // Status colors (unique keys only)
    status: {
      // Project/Feature/Task shared
      PLANNING: '#a0a0c0',
      IN_DEVELOPMENT: '#4da6ff',
      ON_HOLD: '#cc9966',
      CANCELLED: '#808080',
      COMPLETED: '#4ade80',
      ARCHIVED: '#555555',

      // Feature/Task shared
      TESTING: '#66cccc',
      BLOCKED: '#ff6666',
      DEPLOYED: '#34d399',

      // Feature only
      DRAFT: '#6b6b8d',
      VALIDATING: '#66cc99',
      PENDING_REVIEW: '#b366ff',

      // Task only
      BACKLOG: '#6b6b8d',
      PENDING: '#a0a0c0',
      IN_PROGRESS: '#4da6ff',
      IN_REVIEW: '#b366ff',
      CHANGES_REQUESTED: '#ff9966',
      READY_FOR_QA: '#66cc99',
      INVESTIGATING: '#ffcc66',
      DEFERRED: '#999999',
    },

    // Priority colors
    priority: {
      [Priority.HIGH]: '#ff6b6b',
      [Priority.MEDIUM]: '#ffd93d',
      [Priority.LOW]: '#6bcb77',
    },

    // Semantic colors
    accent: '#4da6ff',
    success: '#4ade80',
    warning: '#ffd93d',
    error: '#ff6b6b',
    danger: '#ff6666',
    info: '#66cccc',

    // Interactive colors
    selection: '#4a4a7a',
    highlight: '#6060a0',
  },
};
