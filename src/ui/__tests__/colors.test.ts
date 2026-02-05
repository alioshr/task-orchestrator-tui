import { describe, test, expect } from 'bun:test';
import {
  getStatusColor,
  getPriorityColor,
  getPriorityDots,
  getSemanticColor,
  isActiveStatus,
  isBlockedStatus,
  isCompletedStatus,
} from '../lib/colors';
import { darkTheme } from '../themes/dark';
import { lightTheme } from '../themes/light';
import { Priority } from 'task-orchestrator-bun/src/domain/types';

describe('color utilities', () => {
  describe('getStatusColor', () => {
    test('returns correct color for task status (dark)', () => {
      expect(getStatusColor('IN_PROGRESS', darkTheme)).toBe('#4da6ff');
      expect(getStatusColor('COMPLETED', darkTheme)).toBe('#4ade80');
      expect(getStatusColor('BLOCKED', darkTheme)).toBe('#ff6666');
    });

    test('returns correct color for task status (light)', () => {
      expect(getStatusColor('IN_PROGRESS', lightTheme)).toBe('#3b82f6');
      expect(getStatusColor('COMPLETED', lightTheme)).toBe('#16a34a');
      expect(getStatusColor('BLOCKED', lightTheme)).toBe('#ef4444');
    });

    test('returns muted for unknown status', () => {
      expect(getStatusColor('UNKNOWN_STATUS', darkTheme)).toBe(darkTheme.colors.muted);
    });
  });

  describe('getPriorityColor', () => {
    test('returns correct colors (dark)', () => {
      expect(getPriorityColor(Priority.HIGH, darkTheme)).toBe('#ff6b6b');
      expect(getPriorityColor(Priority.MEDIUM, darkTheme)).toBe('#ffd93d');
      expect(getPriorityColor(Priority.LOW, darkTheme)).toBe('#6bcb77');
    });

    test('returns correct colors (light)', () => {
      expect(getPriorityColor(Priority.HIGH, lightTheme)).toBe('#dc2626');
      expect(getPriorityColor(Priority.MEDIUM, lightTheme)).toBe('#ca8a04');
      expect(getPriorityColor(Priority.LOW, lightTheme)).toBe('#16a34a');
    });
  });

  describe('getPriorityDots', () => {
    test('returns correct dot patterns', () => {
      expect(getPriorityDots(Priority.HIGH)).toBe('●●●');
      expect(getPriorityDots(Priority.MEDIUM)).toBe('●●○');
      expect(getPriorityDots(Priority.LOW)).toBe('●○○');
    });

    test('returns empty dots for unknown priority', () => {
      expect(getPriorityDots('UNKNOWN' as Priority)).toBe('○○○');
    });
  });

  describe('getSemanticColor', () => {
    test('returns semantic colors (dark)', () => {
      expect(getSemanticColor('success', darkTheme)).toBe('#4ade80');
      expect(getSemanticColor('warning', darkTheme)).toBe('#ffd93d');
      expect(getSemanticColor('error', darkTheme)).toBe('#ff6b6b');
      expect(getSemanticColor('info', darkTheme)).toBe('#4da6ff');
    });

    test('returns semantic colors (light)', () => {
      expect(getSemanticColor('success', lightTheme)).toBe('#16a34a');
      expect(getSemanticColor('warning', lightTheme)).toBe('#ca8a04');
      expect(getSemanticColor('error', lightTheme)).toBe('#dc2626');
      expect(getSemanticColor('info', lightTheme)).toBe('#2563eb');
    });
  });

  describe('status classification', () => {
    test('isActiveStatus', () => {
      expect(isActiveStatus('IN_PROGRESS')).toBe(true);
      expect(isActiveStatus('IN_DEVELOPMENT')).toBe(true);
      expect(isActiveStatus('TESTING')).toBe(true);
      expect(isActiveStatus('COMPLETED')).toBe(false);
      expect(isActiveStatus('BLOCKED')).toBe(false);
    });

    test('isBlockedStatus', () => {
      expect(isBlockedStatus('BLOCKED')).toBe(true);
      expect(isBlockedStatus('ON_HOLD')).toBe(true);
      expect(isBlockedStatus('CHANGES_REQUESTED')).toBe(true);
      expect(isBlockedStatus('IN_PROGRESS')).toBe(false);
    });

    test('isCompletedStatus', () => {
      expect(isCompletedStatus('COMPLETED')).toBe(true);
      expect(isCompletedStatus('DEPLOYED')).toBe(true);
      expect(isCompletedStatus('ARCHIVED')).toBe(true);
      expect(isCompletedStatus('CANCELLED')).toBe(true);
      expect(isCompletedStatus('IN_PROGRESS')).toBe(false);
    });
  });
});
