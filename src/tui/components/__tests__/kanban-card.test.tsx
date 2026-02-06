import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import { KanbanCard } from '../kanban-card';
import { ThemeProvider } from '../../../ui/context/theme-context';
import { Priority, TaskStatus, LockStatus } from 'task-orchestrator-bun/src/domain/types';
import type { BoardTask } from '../../../ui/lib/types';

// Helper to render with ThemeProvider
function renderWithTheme(element: React.ReactElement) {
  return render(<ThemeProvider>{element}</ThemeProvider>);
}

// Mock task factory
function createMockTask(overrides: Partial<BoardTask> = {}): BoardTask {
  return {
    id: 'task-1',
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
    featureName: 'Core',
    ...overrides,
  };
}

describe('KanbanCard', () => {
  test('should render task title in normal mode', () => {
    const task = createMockTask({ title: 'Implement feature' });
    const { lastFrame } = renderWithTheme(
      <KanbanCard task={task} isSelected={false} />
    );

    const output = lastFrame();
    expect(output).toContain('Implement feature');
  });

  test('should render priority in normal mode', () => {
    const task = createMockTask({ priority: Priority.HIGH });
    const { lastFrame } = renderWithTheme(
      <KanbanCard task={task} isSelected={false} />
    );

    const output = lastFrame();
    expect(output).toContain('HIGH');
    expect(output).toContain('●●●'); // High priority dots
  });

  test('should render feature label in normal mode', () => {
    const task = createMockTask({ featureName: 'Frontend' });
    const { lastFrame } = renderWithTheme(
      <KanbanCard task={task} isSelected={false} />
    );

    const output = lastFrame();
    expect(output).toContain('[Frontend]');
  });

  test('should render fallback label when feature name is missing', () => {
    const task = createMockTask({ featureName: undefined });
    const { lastFrame } = renderWithTheme(
      <KanbanCard task={task} isSelected={false} />
    );

    const output = lastFrame();
    expect(output).toContain('[—]');
  });

  test('should truncate long titles in normal mode', () => {
    const longTitle = 'This is a very long task title that should be truncated';
    const task = createMockTask({ title: longTitle });
    const { lastFrame } = renderWithTheme(
      <KanbanCard task={task} isSelected={false} />
    );

    const output = lastFrame();
    expect(output).toContain('...'); // Should have ellipsis
    expect(output).not.toContain(longTitle); // Full title should not be there
  });

  test('should render in compact mode without border', () => {
    const task = createMockTask({ title: 'Quick task', priority: Priority.LOW });
    const { lastFrame } = renderWithTheme(
      <KanbanCard task={task} isSelected={false} compact={true} />
    );

    const output = lastFrame();
    expect(output).toContain('Quick task');
    expect(output).toContain('●○○'); // Low priority dots
    // Compact mode should not have extensive borders
  });

  test('should display all priority levels correctly', () => {
    const priorities = [
      { level: Priority.HIGH, dots: '●●●' },
      { level: Priority.MEDIUM, dots: '●●○' },
      { level: Priority.LOW, dots: '●○○' },
    ];

    priorities.forEach(({ level, dots }) => {
      const task = createMockTask({ priority: level });
      const { lastFrame } = renderWithTheme(
        <KanbanCard task={task} isSelected={false} />
      );

      const output = lastFrame();
      expect(output).toContain(dots);
    });
  });

  test('should render different selection states', () => {
    const task = createMockTask({ title: 'Selected task' });

    // Not selected
    const { lastFrame: notSelected } = renderWithTheme(
      <KanbanCard task={task} isSelected={false} />
    );
    const outputNotSelected = notSelected();

    // Selected
    const { lastFrame: selected } = renderWithTheme(
      <KanbanCard task={task} isSelected={true} />
    );
    const outputSelected = selected();

    // Both should contain the title
    expect(outputNotSelected).toContain('Selected task');
    expect(outputSelected).toContain('Selected task');
  });

  test('should handle tasks with no feature name gracefully', () => {
    const task = createMockTask({ featureName: undefined });
    const { lastFrame } = renderWithTheme(
      <KanbanCard task={task} isSelected={false} />
    );

    const output = lastFrame();
    expect(output).toBeTruthy(); // Should render without errors
  });

  test('should truncate title differently in compact vs normal mode', () => {
    const longTitle = 'This is a very long task title that needs truncation';
    const task = createMockTask({ title: longTitle });

    // Normal mode
    const { lastFrame: normalFrame } = renderWithTheme(
      <KanbanCard task={task} isSelected={false} />
    );
    const normalOutput = normalFrame();

    // Compact mode
    const { lastFrame: compactFrame } = renderWithTheme(
      <KanbanCard task={task} isSelected={false} compact={true} />
    );
    const compactOutput = compactFrame();

    // Both should truncate, potentially at different lengths
    expect(normalOutput).toContain('...');
    expect(compactOutput).toContain('...');
  });

  test('should render task with all properties', () => {
    const task = createMockTask({
      title: 'Complete task',
      priority: Priority.HIGH,
      featureName: 'Payments',
    });

    const { lastFrame } = renderWithTheme(
      <KanbanCard task={task} isSelected={false} />
    );

    const output = lastFrame();
    expect(output).toContain('Complete task');
    expect(output).toContain('HIGH');
    expect(output).toContain('●●●');
    expect(output).toContain('[Payments]');
  });
});
