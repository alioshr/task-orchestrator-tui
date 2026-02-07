import { test, expect, describe, mock } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { DependencyList } from './dependency-list';
import type { Task } from '@allpepper/task-orchestrator';
import type { DependencyInfo } from '../../ui/lib/types';
import { TaskStatus, Priority, LockStatus } from '@allpepper/task-orchestrator';
import { ThemeProvider } from '../../ui/context/theme-context';

// Helper to wrap component with ThemeProvider
function renderWithTheme(component: React.ReactElement) {
  return render(<ThemeProvider>{component}</ThemeProvider>);
}

describe('DependencyList', () => {
  const mockTask1: Task = {
    id: 'task-1',
    title: 'Task One',
    summary: 'Summary one',
    status: TaskStatus.BLOCKED,
    priority: Priority.HIGH,
    complexity: 3,
    version: 1,
    lockStatus: LockStatus.UNLOCKED,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  const mockTask2: Task = {
    id: 'task-2',
    title: 'Task Two',
    summary: 'Summary two',
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.MEDIUM,
    complexity: 2,
    version: 1,
    lockStatus: LockStatus.UNLOCKED,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  const mockTask3: Task = {
    id: 'task-3',
    title: 'Task Three',
    summary: 'Summary three',
    status: TaskStatus.PENDING,
    priority: Priority.LOW,
    complexity: 1,
    version: 1,
    lockStatus: LockStatus.UNLOCKED,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  test('should render "No dependencies" when dependencies is null', () => {
    const { lastFrame } = renderWithTheme(<DependencyList dependencies={null} />);
    expect(lastFrame()).toContain('No dependencies');
  });

  test('should render "No dependencies" when both blockedBy and blocks are empty', () => {
    const emptyDependencies: DependencyInfo = {
      blockedBy: [],
      blocks: [],
    };
    const { lastFrame } = renderWithTheme(<DependencyList dependencies={emptyDependencies} />);
    expect(lastFrame()).toContain('No dependencies');
  });

  test('should render "Blocked By" section with tasks', () => {
    const dependencies: DependencyInfo = {
      blockedBy: [mockTask1, mockTask2],
      blocks: [],
    };
    const { lastFrame } = renderWithTheme(<DependencyList dependencies={dependencies} />);
    const output = lastFrame();

    expect(output).toContain('Blocked By:');
    expect(output).toContain('Task One');
    expect(output).toContain('Task Two');
  });

  test('should render "Blocks" section with tasks', () => {
    const dependencies: DependencyInfo = {
      blockedBy: [],
      blocks: [mockTask3],
    };
    const { lastFrame } = renderWithTheme(<DependencyList dependencies={dependencies} />);
    const output = lastFrame();

    expect(output).toContain('Blocks:');
    expect(output).toContain('Task Three');
  });

  test('should render both sections when both blockedBy and blocks have items', () => {
    const dependencies: DependencyInfo = {
      blockedBy: [mockTask1],
      blocks: [mockTask2, mockTask3],
    };
    const { lastFrame } = renderWithTheme(<DependencyList dependencies={dependencies} />);
    const output = lastFrame();

    expect(output).toContain('Blocked By:');
    expect(output).toContain('Task One');
    expect(output).toContain('Blocks:');
    expect(output).toContain('Task Two');
    expect(output).toContain('Task Three');
  });

  test('should render with onSelectTask callback prop', () => {
    const onSelectTask = mock(() => {});
    const dependencies: DependencyInfo = {
      blockedBy: [mockTask1],
      blocks: [mockTask2],
    };

    const { lastFrame } = renderWithTheme(
      <DependencyList
        dependencies={dependencies}
        onSelectTask={onSelectTask}
        isActive={true}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Blocked By:');
    expect(output).toContain('Task One');
  });

  test('should render when isActive is false', () => {
    const onSelectTask = mock(() => {});
    const dependencies: DependencyInfo = {
      blockedBy: [mockTask1],
      blocks: [],
    };

    const { lastFrame } = renderWithTheme(
      <DependencyList
        dependencies={dependencies}
        onSelectTask={onSelectTask}
        isActive={false}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Blocked By:');
    expect(output).toContain('Task One');
  });
});
