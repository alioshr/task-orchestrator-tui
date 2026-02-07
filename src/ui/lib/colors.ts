import type { Theme, StatusKey } from '../themes/types';
import type { Priority } from '@allpepper/task-orchestrator';

/**
 * Get the color for a status value
 * Falls back to muted color if status not found
 */
export function getStatusColor(status: string, theme: Theme): string {
  const color = theme.colors.status[status as StatusKey];
  return color ?? theme.colors.muted;
}

/**
 * Get the color for a priority value
 */
export function getPriorityColor(priority: Priority, theme: Theme): string {
  return theme.colors.priority[priority] ?? theme.colors.muted;
}

/**
 * Get priority dots visual indicator
 * HIGH: ●●● (3 filled)
 * MEDIUM: ●●○ (2 filled)
 * LOW: ●○○ (1 filled)
 */
export function getPriorityDots(priority: Priority): string {
  switch (priority) {
    case 'HIGH':
      return '●●●';
    case 'MEDIUM':
      return '●●○';
    case 'LOW':
      return '●○○';
    default:
      return '○○○';
  }
}

/**
 * Get a semantic color from theme
 */
export function getSemanticColor(
  type: 'success' | 'warning' | 'error' | 'info',
  theme: Theme
): string {
  return theme.colors[type];
}

/**
 * Determine if a status represents an "active" state
 */
export function isActiveStatus(status: string): boolean {
  const activeStatuses = [
    'IN_PROGRESS',
    'IN_DEVELOPMENT',
    'IN_REVIEW',
    'TESTING',
    'VALIDATING',
    'INVESTIGATING',
    'READY_FOR_QA',
  ];
  return activeStatuses.includes(status);
}

/**
 * Determine if a status represents a "blocked" state
 */
export function isBlockedStatus(status: string): boolean {
  const blockedStatuses = ['BLOCKED', 'ON_HOLD', 'CHANGES_REQUESTED'];
  return blockedStatuses.includes(status);
}

/**
 * Determine if a status represents a "completed" state
 */
export function isCompletedStatus(status: string): boolean {
  const completedStatuses = ['COMPLETED', 'DEPLOYED', 'ARCHIVED', 'CANCELLED'];
  return completedStatuses.includes(status);
}
