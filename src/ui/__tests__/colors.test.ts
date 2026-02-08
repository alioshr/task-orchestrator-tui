import { describe, test, expect } from 'bun:test';
import {
  getStatusColor,
  getPriorityColor,
  getPriorityDots,
  getSemanticColor,
  isActiveStatus,
  isBlockedStatus,
  isCompletedStatus,
  isNewStatus,
} from '../lib/colors';
import { darkTheme } from '../themes/dark';
import { lightTheme } from '../themes/light';
import { Priority } from '@allpepper/task-orchestrator';

describe('color utilities', () => {
  describe('getStatusColor', () => {
    test('returns correct color for v2 pipeline status (dark)', () => {
      expect(getStatusColor('ACTIVE', darkTheme)).toBe('#4da6ff');
      expect(getStatusColor('CLOSED', darkTheme)).toBe('#4ade80');
      expect(getStatusColor('NEW', darkTheme)).toBe('#a0a0c0');
      expect(getStatusColor('TO_BE_TESTED', darkTheme)).toBe('#66cccc');
      expect(getStatusColor('READY_TO_PROD', darkTheme)).toBe('#66cc99');
      expect(getStatusColor('WILL_NOT_IMPLEMENT', darkTheme)).toBe('#808080');
    });

    test('returns correct color for v2 pipeline status (light)', () => {
      expect(getStatusColor('ACTIVE', lightTheme)).toBe('#2563eb');
      expect(getStatusColor('CLOSED', lightTheme)).toBe('#16a34a');
      expect(getStatusColor('NEW', lightTheme)).toBe('#7070a0');
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
      expect(getPriorityColor(Priority.MEDIUM, lightTheme)).toBe('#d97706');
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
      expect(getSemanticColor('info', darkTheme)).toBe('#66cccc');
    });

    test('returns semantic colors (light)', () => {
      expect(getSemanticColor('success', lightTheme)).toBe('#16a34a');
      expect(getSemanticColor('warning', lightTheme)).toBe('#d97706');
      expect(getSemanticColor('error', lightTheme)).toBe('#dc2626');
      expect(getSemanticColor('info', lightTheme)).toBe('#0891b2');
    });
  });

  describe('status classification', () => {
    test('isActiveStatus', () => {
      expect(isActiveStatus('ACTIVE')).toBe(true);
      expect(isActiveStatus('TO_BE_TESTED')).toBe(true);
      expect(isActiveStatus('READY_TO_PROD')).toBe(true);
      expect(isActiveStatus('CLOSED')).toBe(false);
      expect(isActiveStatus('NEW')).toBe(false);
    });

    test('isBlockedStatus always returns false (blocking is field-based in v2)', () => {
      expect(isBlockedStatus('ACTIVE')).toBe(false);
      expect(isBlockedStatus('NEW')).toBe(false);
      expect(isBlockedStatus('CLOSED')).toBe(false);
    });

    test('isCompletedStatus', () => {
      expect(isCompletedStatus('CLOSED')).toBe(true);
      expect(isCompletedStatus('WILL_NOT_IMPLEMENT')).toBe(true);
      expect(isCompletedStatus('ACTIVE')).toBe(false);
      expect(isCompletedStatus('NEW')).toBe(false);
    });

    test('isNewStatus', () => {
      expect(isNewStatus('NEW')).toBe(true);
      expect(isNewStatus('ACTIVE')).toBe(false);
    });
  });
});
