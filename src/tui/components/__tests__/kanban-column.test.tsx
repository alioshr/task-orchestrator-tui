import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import { KanbanColumn } from '../kanban-column';
import { ThemeProvider } from '../../../ui/context/theme-context';
import { Priority, TaskStatus, LockStatus } from 'task-orchestrator-bun/src/domain/types';
import type { Task } from 'task-orchestrator-bun/src/domain/types';
import type { BoardColumn } from '../../../ui/lib/types';

// Helper to render with ThemeProvider
function renderWithTheme(element: React.ReactElement) {
  return render(<ThemeProvider>{element}</ThemeProvider>);
}

// Mock task factory
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${Math.random()}`,
    title: 'Test Task',
    summary: 'Test summary',
    description: 'Test description',
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.MEDIUM,
    complexity: 3,
    version: 1,
    lockStatus: LockStatus.UNLOCKED,
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
    tags: [],
    ...overrides,
  };
}

// Mock column factory
function createMockColumn(overrides: Partial<BoardColumn> = {}): BoardColumn {
  return {
    id: 'column-1',
    title: 'In Progress',
    status: 'IN_PROGRESS',
    tasks: [],
    ...overrides,
  };
}

describe('KanbanColumn', () => {
  test('should render column title with task count', () => {
    const tasks = [
      createMockTask({ title: 'Task 1' }),
      createMockTask({ title: 'Task 2' }),
      createMockTask({ title: 'Task 3' }),
    ];
    const column = createMockColumn({ title: 'In Progress', tasks });

    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={false}
        selectedTaskIndex={-1}
      />
    );

    const output = lastFrame();
    expect(output).toContain('In Progress (3)');
  });

  test('should render tasks in the column', () => {
    const tasks = [
      createMockTask({ title: 'First task' }),
      createMockTask({ title: 'Second task' }),
    ];
    const column = createMockColumn({ tasks });

    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={false}
        selectedTaskIndex={-1}
      />
    );

    const output = lastFrame();
    expect(output).toContain('First task');
    expect(output).toContain('Second task');
  });

  test('should show "No tasks" for empty column', () => {
    const column = createMockColumn({ tasks: [] });

    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={false}
        selectedTaskIndex={-1}
      />
    );

    const output = lastFrame();
    expect(output).toContain('No tasks');
  });

  test('should highlight active column header', () => {
    const column = createMockColumn({ title: 'Active Column' });

    // Active column
    const { lastFrame: activeFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={true}
        selectedTaskIndex={-1}
      />
    );
    const activeOutput = activeFrame();
    expect(activeOutput).toContain('Active Column');

    // Inactive column
    const { lastFrame: inactiveFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={false}
        selectedTaskIndex={-1}
      />
    );
    const inactiveOutput = inactiveFrame();
    expect(inactiveOutput).toContain('Active Column');
  });

  test('should highlight selected task', () => {
    const tasks = [
      createMockTask({ title: 'Task 1' }),
      createMockTask({ title: 'Task 2' }),
      createMockTask({ title: 'Task 3' }),
    ];
    const column = createMockColumn({ tasks });

    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={true}
        selectedTaskIndex={1}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Task 2');
  });

  test('should show scroll indicator when tasks exceed visible limit', () => {
    const tasks = Array.from({ length: 15 }, (_, i) =>
      createMockTask({ title: `Task ${i + 1}` })
    );
    const column = createMockColumn({ tasks });

    // availableHeight of 50 = 50 - 8 (chrome) = 42 / 5 (lines per task) = 8 visible tasks
    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={false}
        selectedTaskIndex={-1}
        availableHeight={50}
      />
    );

    const output = lastFrame();
    expect(output).toContain('↓ 7 more');
  });

  test('should not show scroll indicator when tasks are within limit', () => {
    const tasks = Array.from({ length: 5 }, (_, i) =>
      createMockTask({ title: `Task ${i + 1}` })
    );
    const column = createMockColumn({ tasks });

    // availableHeight of 50 allows 10 visible tasks, we only have 5
    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={false}
        selectedTaskIndex={-1}
        availableHeight={50}
      />
    );

    const output = lastFrame();
    expect(output).not.toContain('more');
  });

  test('should render only visible tasks when scrolling is needed', () => {
    const tasks = Array.from({ length: 15 }, (_, i) =>
      createMockTask({ title: `Task ${i + 1}` })
    );
    const column = createMockColumn({ tasks });

    // availableHeight of 28 = 28 - 8 (chrome) = 20 / 5 (lines per task) = 4 visible tasks
    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={false}
        selectedTaskIndex={-1}
        availableHeight={28}
      />
    );

    const output = lastFrame();
    // Should show first 4 tasks
    expect(output).toContain('Task 1');
    expect(output).toContain('Task 4');
    // Should not show tasks beyond visible limit
    expect(output).not.toContain('Task 5');
    expect(output).not.toContain('Task 15');
    // Should show scroll indicator
    expect(output).toContain('↓ 11 more');
  });

  test('should render column with different statuses', () => {
    const statuses = ['BACKLOG', 'IN_PROGRESS', 'COMPLETED'];

    statuses.forEach(status => {
      const column = createMockColumn({
        status,
        title: status,
        tasks: [createMockTask()],
      });

      const { lastFrame } = renderWithTheme(
        <KanbanColumn
          column={column}
          isActiveColumn={false}
          selectedTaskIndex={-1}
        />
      );

      const output = lastFrame();
      expect(output).toContain(status);
    });
  });

  test('should handle no selection correctly', () => {
    const tasks = [
      createMockTask({ title: 'Task 1' }),
      createMockTask({ title: 'Task 2' }),
    ];
    const column = createMockColumn({ tasks });

    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={true}
        selectedTaskIndex={-1}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Task 1');
    expect(output).toContain('Task 2');
  });

  test('should render column with high priority tasks', () => {
    const tasks = [
      createMockTask({ title: 'High priority task', priority: Priority.HIGH }),
    ];
    const column = createMockColumn({ tasks });

    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={false}
        selectedTaskIndex={-1}
      />
    );

    const output = lastFrame();
    expect(output).toContain('High priority task');
    expect(output).toContain('●●●');
  });

  test('should implement sliding window to keep selected task visible', () => {
    const tasks = Array.from({ length: 20 }, (_, i) =>
      createMockTask({ title: `Task ${i + 1}` })
    );
    const column = createMockColumn({ tasks });

    // availableHeight of 28 = 5 visible tasks
    // Select task 10 (index 9) - should be in the middle of the window
    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={true}
        selectedTaskIndex={9}
        availableHeight={28}
      />
    );

    const output = lastFrame();
    // Should show scroll indicators on both sides when in the middle
    expect(output).toContain('↑');
    expect(output).toContain('more');
    expect(output).toContain('↓');
    expect(output).toContain('more');
  });

  test('should show top scroll indicator when scrolled down', () => {
    const tasks = Array.from({ length: 20 }, (_, i) =>
      createMockTask({ title: `Task ${i + 1}` })
    );
    const column = createMockColumn({ tasks });

    // availableHeight of 28 = 5 visible tasks
    // Select last task - window should be at the end
    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={true}
        selectedTaskIndex={19}
        availableHeight={28}
      />
    );

    const output = lastFrame();
    // Should show last tasks
    expect(output).toContain('Task 20');
    // Should show top scroll indicator
    expect(output).toContain('↑');
    // Should not show bottom scroll indicator
    expect(output).not.toContain('↓');
  });
});
