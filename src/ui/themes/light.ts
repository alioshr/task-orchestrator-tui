import type { Theme } from './types';
import { Priority } from '@allpepper/task-orchestrator';

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    // Base colors
    background: '#ffffff',
    foreground: '#1a1a2e',
    muted: '#9090a0',
    border: '#d0d0e0',

    // Status colors (v2 pipeline states)
    status: {
      NEW: '#7070a0',
      ACTIVE: '#2563eb',
      TO_BE_TESTED: '#0891b2',
      READY_TO_PROD: '#059669',
      CLOSED: '#16a34a',
      WILL_NOT_IMPLEMENT: '#6b7280',
    },

    // Blocked overlay color
    blocked: '#dc2626',

    // Priority colors
    priority: {
      [Priority.HIGH]: '#dc2626',
      [Priority.MEDIUM]: '#d97706',
      [Priority.LOW]: '#16a34a',
    },

    // Semantic colors
    accent: '#2563eb',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    danger: '#dc2626',
    info: '#0891b2',

    // Interactive colors
    selection: '#e0e0f0',
    highlight: '#c0c0e0',
  },
};
