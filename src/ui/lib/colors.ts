/**
 * Color and Status Utilities
 *
 * Theme-aware color helpers for status badges, priority indicators, etc.
 * Updated for v2 pipeline states.
 */

import type { Theme, StatusKey } from '../themes/types';
import type { Priority } from '@allpepper/task-orchestrator';

/**
 * Get the color for a status value.
 * Falls back to muted color if status not found.
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
 * Check if a status represents an active/in-progress state
 */
export function isActiveStatus(status: string): boolean {
  return status === 'ACTIVE' || status === 'TO_BE_TESTED' || status === 'READY_TO_PROD';
}

/**
 * Check if a status represents a terminal/completed state
 */
export function isCompletedStatus(status: string): boolean {
  return status === 'CLOSED' || status === 'WILL_NOT_IMPLEMENT';
}

/**
 * Check if a status is the initial state
 */
export function isNewStatus(status: string): boolean {
  return status === 'NEW';
}

/**
 * In v2, blocking is field-based (blockedBy array), not a status.
 * This function always returns false since no status is "blocked".
 * Use the blockedBy field on the entity instead.
 * @deprecated Use entity.blockedBy.length > 0 instead
 */
export function isBlockedStatus(_status: string): boolean {
  return false;
}
