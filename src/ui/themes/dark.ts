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

    // Status colors (v2 pipeline states)
    status: {
      NEW: '#a0a0c0',
      ACTIVE: '#4da6ff',
      TO_BE_TESTED: '#66cccc',
      READY_TO_PROD: '#66cc99',
      CLOSED: '#4ade80',
      WILL_NOT_IMPLEMENT: '#808080',
    },

    // Blocked overlay color
    blocked: '#ff6666',

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
