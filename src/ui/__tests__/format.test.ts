import { describe, test, expect } from 'bun:test';
import {
  timeAgo,
  truncateId,
  truncateText,
  pluralize,
  formatTaskCount,
  formatCount,
  formatStatus,
  formatPriority,
} from '../lib/format';

describe('format utilities', () => {
  describe('timeAgo', () => {
    test('returns "just now" for recent times', () => {
      const now = new Date();
      expect(timeAgo(now)).toBe('just now');
    });

    test('returns minutes for times under an hour', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      expect(timeAgo(date)).toBe('5m ago');
    });

    test('returns hours for times under a day', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(timeAgo(date)).toBe('3h ago');
    });

    test('returns days for times under a week', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(timeAgo(date)).toBe('2d ago');
    });

    test('returns weeks for times under a month', () => {
      const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      expect(timeAgo(date)).toBe('2w ago');
    });

    test('returns months for times under a year', () => {
      const date = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      expect(timeAgo(date)).toBe('2mo ago');
    });

    test('returns years for older times', () => {
      const date = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
      expect(timeAgo(date)).toBe('1y ago');
    });
  });

  describe('truncateId', () => {
    test('truncates long IDs', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      expect(truncateId(id)).toBe('550e84...');
    });

    test('respects custom length', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      expect(truncateId(id, 10)).toBe('550e8400-e...');
    });

    test('returns short IDs unchanged', () => {
      const id = 'abc';
      expect(truncateId(id)).toBe('abc');
    });
  });

  describe('truncateText', () => {
    test('truncates long text', () => {
      expect(truncateText('Hello World', 8)).toBe('Hello...');
    });

    test('returns short text unchanged', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
    });

    test('handles very short maxLength', () => {
      expect(truncateText('Hello', 2)).toBe('He');
    });
  });

  describe('pluralize', () => {
    test('returns singular for count of 1', () => {
      expect(pluralize(1, 'task')).toBe('task');
    });

    test('returns plural for count > 1', () => {
      expect(pluralize(5, 'task')).toBe('tasks');
    });

    test('returns plural for count of 0', () => {
      expect(pluralize(0, 'task')).toBe('tasks');
    });

    test('uses custom plural', () => {
      expect(pluralize(5, 'person', 'people')).toBe('people');
    });
  });

  describe('formatTaskCount', () => {
    test('formats task counts correctly', () => {
      expect(formatTaskCount({ total: 12, byStatus: { COMPLETED: 5 } })).toBe('5/12 tasks');
    });

    test('handles zero completed', () => {
      expect(formatTaskCount({ total: 3, byStatus: {} })).toBe('0/3 tasks');
    });

    test('handles singular', () => {
      expect(formatTaskCount({ total: 1, byStatus: { COMPLETED: 0 } })).toBe('0/1 task');
    });
  });

  describe('formatCount', () => {
    test('formats count with label', () => {
      expect(formatCount(5, 'task')).toBe('5 tasks');
    });

    test('handles singular', () => {
      expect(formatCount(1, 'task')).toBe('1 task');
    });
  });

  describe('formatStatus', () => {
    test('converts status to title case', () => {
      expect(formatStatus('IN_PROGRESS')).toBe('In Progress');
    });

    test('handles single word', () => {
      expect(formatStatus('COMPLETED')).toBe('Completed');
    });
  });

  describe('formatPriority', () => {
    test('formats priority', () => {
      expect(formatPriority('HIGH')).toBe('High');
      expect(formatPriority('MEDIUM')).toBe('Medium');
      expect(formatPriority('LOW')).toBe('Low');
    });
  });
});
