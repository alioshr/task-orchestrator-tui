import React from 'react';
import { test, expect, describe } from 'bun:test';
import { render } from 'ink-testing-library';
import { KanbanBoard } from './kanban-board';
import type { FeatureBoardColumn, BoardFeature } from '../../ui/lib/types';
import { FeatureStatus, Priority, TaskStatus, LockStatus } from '@allpepper/task-orchestrator';
import { ThemeProvider } from '../../ui/context/theme-context';

function makeFeature(overrides: Partial<BoardFeature> & { id: string; name: string }): BoardFeature {
  return {
    projectId: 'proj-1',
    summary: `Summary for ${overrides.name}`,
    status: FeatureStatus.DRAFT,
    priority: Priority.MEDIUM,
    version: 1,
    createdAt: new Date(),
    modifiedAt: new Date(),
    tasks: [],
    taskCounts: { total: 0, completed: 0 },
    ...overrides,
  };
}

describe('KanbanBoard', () => {
  const mockColumns: FeatureBoardColumn[] = [
    {
      id: 'draft',
      title: 'DRAFT',
      status: FeatureStatus.DRAFT,
      features: [
        makeFeature({
          id: 'feat-1',
          name: 'Feature A',
          priority: Priority.HIGH,
        }),
        makeFeature({
          id: 'feat-2',
          name: 'Feature D',
          priority: Priority.LOW,
        }),
      ],
    },
    {
      id: 'in-development',
      title: 'IN_DEVELOPMENT',
      status: FeatureStatus.IN_DEVELOPMENT,
      features: [
        makeFeature({
          id: 'feat-3',
          name: 'Feature B',
          status: FeatureStatus.IN_DEVELOPMENT,
          priority: Priority.MEDIUM,
          tasks: [
            {
              id: 'task-1',
              featureId: 'feat-3',
              title: 'Task 1',
              summary: 'Task 1 summary',
              status: TaskStatus.IN_PROGRESS,
              priority: Priority.HIGH,
              complexity: 5,
              version: 1,
              lockStatus: LockStatus.UNLOCKED,
              createdAt: new Date(),
              modifiedAt: new Date(),
            },
            {
              id: 'task-2',
              featureId: 'feat-3',
              title: 'Task 2',
              summary: 'Task 2 summary',
              status: TaskStatus.PENDING,
              priority: Priority.LOW,
              complexity: 3,
              version: 1,
              lockStatus: LockStatus.UNLOCKED,
              createdAt: new Date(),
              modifiedAt: new Date(),
            },
          ],
          taskCounts: { total: 2, completed: 0 },
        }),
      ],
    },
    {
      id: 'deployed',
      title: 'DEPLOYED',
      status: FeatureStatus.DEPLOYED,
      features: [],
    },
  ];

  const defaultProps = {
    columns: mockColumns,
    activeColumnIndex: 0,
    selectedFeatureIndex: 0,
    expandedFeatureId: null,
    selectedTaskIndex: -1,
    onColumnChange: () => {},
    onFeatureChange: () => {},
    onExpandFeature: () => {},
    onTaskChange: () => {},
    onSelectTask: () => {},
    activeStatuses: new Set(['DRAFT', 'IN_DEVELOPMENT', 'DEPLOYED']),
    isFilterMode: false,
    filterCursorIndex: 0,
    onToggleStatus: () => {},
    onFilterCursorChange: () => {},
    onFilterModeChange: () => {},
  };

  test('should render with default props', () => {
    const { lastFrame } = render(
      <ThemeProvider>
        <KanbanBoard {...defaultProps} />
      </ThemeProvider>
    );

    const output = lastFrame();
    expect(output).toBeTruthy();
    expect(output).toContain('DRAFT');
    expect(output).toContain('Feature A');
  });

  test('should display column titles with feature counts', () => {
    const { lastFrame } = render(
      <ThemeProvider>
        <KanbanBoard {...defaultProps} />
      </ThemeProvider>
    );

    const output = lastFrame();
    expect(output).toContain('DRAFT (2)');
    expect(output).toContain('IN_DEVELOPMENT (1)');
    expect(output).toContain('DEPLOYED (0)');
  });

  test('should show all features in columns', () => {
    const { lastFrame } = render(
      <ThemeProvider>
        <KanbanBoard {...defaultProps} />
      </ThemeProvider>
    );

    const output = lastFrame();
    expect(output).toContain('Feature A');
    expect(output).toContain('Feature D');
    expect(output).toContain('Feature B');
  });

  test('should highlight active column', () => {
    const { lastFrame } = render(
      <ThemeProvider>
        <KanbanBoard {...defaultProps} activeColumnIndex={1} />
      </ThemeProvider>
    );

    const output = lastFrame();
    expect(output).toBeTruthy();
  });

  test('should show "No features" for empty columns', () => {
    const { lastFrame } = render(
      <ThemeProvider>
        <KanbanBoard
          {...defaultProps}
          activeColumnIndex={2}
          selectedFeatureIndex={-1}
        />
      </ThemeProvider>
    );

    const output = lastFrame();
    expect(output).toContain('No features');
  });

  test('should handle inactive state', () => {
    const { lastFrame } = render(
      <ThemeProvider>
        <KanbanBoard {...defaultProps} isActive={false} />
      </ThemeProvider>
    );

    const output = lastFrame();
    expect(output).toBeTruthy();
  });

  describe('keyboard navigation', () => {
    test('should navigate to next column with l key', () => {
      let columnIndex = 0;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={columnIndex}
            onColumnChange={(index) => { columnIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('l');
      expect(columnIndex).toBe(1);
    });

    test('should navigate to previous column with h key', () => {
      let columnIndex = 1;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={columnIndex}
            onColumnChange={(index) => { columnIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('h');
      expect(columnIndex).toBe(0);
    });

    test('should wrap to first column when navigating right from last column', () => {
      let columnIndex = 2;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={columnIndex}
            selectedFeatureIndex={-1}
            onColumnChange={(index) => { columnIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('l');
      expect(columnIndex).toBe(0);
    });

    test('should wrap to last column when navigating left from first column', () => {
      let columnIndex = 0;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={columnIndex}
            onColumnChange={(index) => { columnIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('h');
      expect(columnIndex).toBe(2);
    });

    test('should navigate to next feature with j key', () => {
      let featureIndex = 0;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={0}
            selectedFeatureIndex={featureIndex}
            onFeatureChange={(index) => { featureIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('j');
      expect(featureIndex).toBe(1);
    });

    test('should navigate to previous feature with k key', () => {
      let featureIndex = 1;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={0}
            selectedFeatureIndex={featureIndex}
            onFeatureChange={(index) => { featureIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('k');
      expect(featureIndex).toBe(0);
    });

    test('should wrap to first feature when navigating down from last feature', () => {
      let featureIndex = 1;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={0}
            selectedFeatureIndex={featureIndex}
            onFeatureChange={(index) => { featureIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('j');
      expect(featureIndex).toBe(0);
    });

    test('should wrap to last feature when navigating up from first feature', () => {
      let featureIndex = 0;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={0}
            selectedFeatureIndex={featureIndex}
            onFeatureChange={(index) => { featureIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('k');
      expect(featureIndex).toBe(1);
    });

    test('should expand feature on Enter key', () => {
      let expandedId = null as string | null;
      let taskIndex = -1;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={1}
            selectedFeatureIndex={0}
            onExpandFeature={(id) => { expandedId = id; }}
            onTaskChange={(index) => { taskIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('\r');
      expect(expandedId).toBe('feat-3');
      expect(taskIndex).toBe(0);
    });

    test('should set taskIndex to -1 when expanding feature with no tasks', () => {
      let expandedId = null as string | null;
      let taskIndex = -1;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={0}
            selectedFeatureIndex={0}
            onExpandFeature={(id) => { expandedId = id; }}
            onTaskChange={(index) => { taskIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('\r');
      expect(expandedId).toBe('feat-1');
      expect(taskIndex).toBe(-1);
    });

    test('should not do anything if m is pressed without onMoveFeature', () => {
      let featureIndex = 0;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={0}
            selectedFeatureIndex={featureIndex}
            onFeatureChange={(index) => { featureIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('m');
      expect(featureIndex).toBe(0);
    });

    test('should reset feature selection when changing columns', () => {
      let columnIndex = 0;
      let featureIndex = 1;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={columnIndex}
            selectedFeatureIndex={featureIndex}
            onColumnChange={(index) => { columnIndex = index; }}
            onFeatureChange={(index) => { featureIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('l');
      expect(columnIndex).toBe(1);
      expect(featureIndex).toBe(0);
    });

    test('should not navigate when inactive', () => {
      let columnIndex = 0;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={columnIndex}
            onColumnChange={(index) => { columnIndex = index; }}
            isActive={false}
          />
        </ThemeProvider>
      );

      stdin.write('l');
      expect(columnIndex).toBe(0);
    });

    test('should handle empty columns when navigating', () => {
      let columnIndex = 1;
      let featureIndex = 0;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={columnIndex}
            selectedFeatureIndex={featureIndex}
            onColumnChange={(index) => { columnIndex = index; }}
            onFeatureChange={(index) => { featureIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('l');
      expect(columnIndex).toBe(2);
      expect(featureIndex).toBe(-1);
    });
  });

  describe('task mode navigation', () => {
    test('should navigate tasks with j key when feature is expanded', () => {
      let taskIndex = 0;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={1}
            selectedFeatureIndex={0}
            expandedFeatureId="feat-3"
            selectedTaskIndex={taskIndex}
            onTaskChange={(index) => { taskIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('j');
      expect(taskIndex).toBe(1);
    });

    test('should navigate tasks with k key when feature is expanded', () => {
      let taskIndex = 1;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={1}
            selectedFeatureIndex={0}
            expandedFeatureId="feat-3"
            selectedTaskIndex={taskIndex}
            onTaskChange={(index) => { taskIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('k');
      expect(taskIndex).toBe(0);
    });

    test('should wrap task navigation with j key', () => {
      let taskIndex = 1;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={1}
            selectedFeatureIndex={0}
            expandedFeatureId="feat-3"
            selectedTaskIndex={taskIndex}
            onTaskChange={(index) => { taskIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('j');
      expect(taskIndex).toBe(0);
    });

    test('should wrap task navigation with k key', () => {
      let taskIndex = 0;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={1}
            selectedFeatureIndex={0}
            expandedFeatureId="feat-3"
            selectedTaskIndex={taskIndex}
            onTaskChange={(index) => { taskIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('k');
      expect(taskIndex).toBe(1);
    });

    test('should select task with Enter in task mode', () => {
      let selectedTaskId = '';
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={1}
            selectedFeatureIndex={0}
            expandedFeatureId="feat-3"
            selectedTaskIndex={0}
            onSelectTask={(id) => { selectedTaskId = id; }}
          />
        </ThemeProvider>
      );

      stdin.write('\r');
      expect(selectedTaskId).toBe('task-1');
    });

    test('should collapse feature with Escape in task mode', () => {
      let expandedId = 'feat-3' as string | null;
      let taskIndex = 0;
      const { stdin } = render(
        <ThemeProvider>
          <KanbanBoard
            {...defaultProps}
            activeColumnIndex={1}
            selectedFeatureIndex={0}
            expandedFeatureId={expandedId}
            selectedTaskIndex={taskIndex}
            onExpandFeature={(id) => { expandedId = id; }}
            onTaskChange={(index) => { taskIndex = index; }}
          />
        </ThemeProvider>
      );

      stdin.write('\x1B');
      expect(expandedId).toBe(null);
      expect(taskIndex).toBe(-1);
    });
  });
});
