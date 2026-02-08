import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import { KanbanColumn } from '../kanban-column';
import { ThemeProvider } from '../../../ui/context/theme-context';
import { Priority } from '@allpepper/task-orchestrator';
import type { Task } from '@allpepper/task-orchestrator';
import type { FeatureBoardColumn, BoardFeature } from '../../../ui/lib/types';

// Helper to render with ThemeProvider
function renderWithTheme(element: React.ReactElement) {
  return render(<ThemeProvider>{element}</ThemeProvider>);
}

// Mock feature factory
function createMockFeature(overrides: Partial<BoardFeature> = {}): BoardFeature {
  const tasks = overrides.tasks ?? [];
  const completed = tasks.filter(t => t.status === 'CLOSED').length;

  return {
    id: `feature-${Math.random()}`,
    name: 'Test Feature',
    summary: 'Test summary',
    status: 'ACTIVE',
    priority: Priority.MEDIUM,
    blockedBy: [],
    relatedTo: [],
    version: 1,
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
    tags: [],
    tasks,
    taskCounts: overrides.taskCounts ?? { total: tasks.length, completed },
    ...overrides,
  };
}

// Mock task factory (for expanded feature tests)
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${Math.random()}`,
    title: 'Test Task',
    summary: 'Test summary',
    description: 'Test description',
    status: 'ACTIVE',
    priority: Priority.MEDIUM,
    complexity: 3,
    blockedBy: [],
    relatedTo: [],
    version: 1,
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
    tags: [],
    ...overrides,
  };
}

// Mock column factory
function createMockColumn(overrides: Partial<FeatureBoardColumn> = {}): FeatureBoardColumn {
  return {
    id: 'column-1',
    title: 'Active',
    status: 'ACTIVE',
    features: [],
    ...overrides,
  };
}

describe('KanbanColumn', () => {
  test('should render column title with feature count', () => {
    const features = [
      createMockFeature({ name: 'Feature 1' }),
      createMockFeature({ name: 'Feature 2' }),
      createMockFeature({ name: 'Feature 3' }),
    ];
    const column = createMockColumn({ title: 'In Development', features });

    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={false}
        selectedFeatureIndex={-1}
        expandedFeatureId={null}
        selectedTaskIndex={-1}
      />
    );

    const output = lastFrame();
    expect(output).toContain('In Development (3)');
  });

  test('should render features in the column', () => {
    const features = [
      createMockFeature({ name: 'First feature' }),
      createMockFeature({ name: 'Second feature' }),
    ];
    const column = createMockColumn({ features });

    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={false}
        selectedFeatureIndex={-1}
        expandedFeatureId={null}
        selectedTaskIndex={-1}
      />
    );

    const output = lastFrame();
    expect(output).toContain('First feature');
    expect(output).toContain('Second feature');
  });

  test('should show "No features" for empty column', () => {
    const column = createMockColumn({ features: [] });

    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={false}
        selectedFeatureIndex={-1}
        expandedFeatureId={null}
        selectedTaskIndex={-1}
      />
    );

    const output = lastFrame();
    expect(output).toContain('No features');
  });

  test('should highlight active column header', () => {
    const column = createMockColumn({ title: 'Active Column' });

    // Active column
    const { lastFrame: activeFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={true}
        selectedFeatureIndex={-1}
        expandedFeatureId={null}
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
        selectedFeatureIndex={-1}
        expandedFeatureId={null}
        selectedTaskIndex={-1}
      />
    );
    const inactiveOutput = inactiveFrame();
    expect(inactiveOutput).toContain('Active Column');
  });

  test('should highlight selected feature', () => {
    const features = [
      createMockFeature({ name: 'Feature 1' }),
      createMockFeature({ name: 'Feature 2' }),
      createMockFeature({ name: 'Feature 3' }),
    ];
    const column = createMockColumn({ features });

    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={true}
        selectedFeatureIndex={1}
        expandedFeatureId={null}
        selectedTaskIndex={-1}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Feature 2');
  });

  test('should show scroll indicator when features exceed visible limit', () => {
    const features = Array.from({ length: 15 }, (_, i) =>
      createMockFeature({ name: `Feature ${i + 1}` })
    );
    const column = createMockColumn({ features });

    // The sliding window only activates when a feature is selected (>= 0).
    // Select the first feature so the window algorithm runs and clips overflow.
    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={true}
        selectedFeatureIndex={0}
        expandedFeatureId={null}
        selectedTaskIndex={-1}
        availableHeight={30}
      />
    );

    const output = lastFrame();
    expect(output).toContain('more');
  });

  test('should not show scroll indicator when features are within limit', () => {
    const features = Array.from({ length: 3 }, (_, i) =>
      createMockFeature({ name: `Feature ${i + 1}` })
    );
    const column = createMockColumn({ features });

    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={false}
        selectedFeatureIndex={-1}
        expandedFeatureId={null}
        selectedTaskIndex={-1}
        availableHeight={50}
      />
    );

    const output = lastFrame();
    expect(output).not.toContain('more');
  });

  test('should render only visible features when scrolling is needed', () => {
    const features = Array.from({ length: 15 }, (_, i) =>
      createMockFeature({ name: `Feature ${i + 1}` })
    );
    const column = createMockColumn({ features });

    // The sliding window only activates when a feature is selected (>= 0).
    // Select the first feature so the window clips to a subset.
    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={true}
        selectedFeatureIndex={0}
        expandedFeatureId={null}
        selectedTaskIndex={-1}
        availableHeight={20}
      />
    );

    const output = lastFrame();
    // Should show the selected feature
    expect(output).toContain('Feature 1');
    // Should show scroll indicator for features below
    expect(output).toContain('more');
  });

  test('should render column with different statuses', () => {
    const statuses = ['NEW', 'ACTIVE', 'CLOSED'];

    statuses.forEach(status => {
      const column = createMockColumn({
        status,
        title: status,
        features: [createMockFeature()],
      });

      const { lastFrame } = renderWithTheme(
        <KanbanColumn
          column={column}
          isActiveColumn={false}
          selectedFeatureIndex={-1}
          expandedFeatureId={null}
          selectedTaskIndex={-1}
        />
      );

      const output = lastFrame();
      expect(output).toContain(status);
    });
  });

  test('should handle no selection correctly', () => {
    const features = [
      createMockFeature({ name: 'Feature 1' }),
      createMockFeature({ name: 'Feature 2' }),
    ];
    const column = createMockColumn({ features });

    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={true}
        selectedFeatureIndex={-1}
        expandedFeatureId={null}
        selectedTaskIndex={-1}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Feature 1');
    expect(output).toContain('Feature 2');
  });

  test('should render column with high priority features', () => {
    const features = [
      createMockFeature({ name: 'High priority feature', priority: Priority.HIGH }),
    ];
    const column = createMockColumn({ features });

    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={false}
        selectedFeatureIndex={-1}
        expandedFeatureId={null}
        selectedTaskIndex={-1}
      />
    );

    const output = lastFrame();
    expect(output).toContain('High priority feature');
  });

  test('should implement sliding window to keep selected feature visible', () => {
    const features = Array.from({ length: 20 }, (_, i) =>
      createMockFeature({ name: `Feature ${i + 1}` })
    );
    const column = createMockColumn({ features });

    // Select feature 10 (index 9) with small available height - should show scroll indicators on both sides
    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={true}
        selectedFeatureIndex={9}
        expandedFeatureId={null}
        selectedTaskIndex={-1}
        availableHeight={25}
      />
    );

    const output = lastFrame();
    // Should show scroll indicators on both sides when in the middle
    expect(output).toContain('↑');
    expect(output).toContain('more');
    expect(output).toContain('↓');
  });

  test('should show top scroll indicator when scrolled down', () => {
    const features = Array.from({ length: 20 }, (_, i) =>
      createMockFeature({ name: `Feature ${i + 1}` })
    );
    const column = createMockColumn({ features });

    // Select last feature - window should be at the end
    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={true}
        selectedFeatureIndex={19}
        expandedFeatureId={null}
        selectedTaskIndex={-1}
        availableHeight={25}
      />
    );

    const output = lastFrame();
    // Should show last feature
    expect(output).toContain('Feature 20');
    // Should show top scroll indicator
    expect(output).toContain('↑');
    // Should not show bottom scroll indicator
    expect(output).not.toContain('↓');
  });

  test('should render expanded feature with tasks', () => {
    const tasks = [
      createMockTask({ title: 'Task Alpha' }),
      createMockTask({ title: 'Task Beta' }),
    ];
    const featureId = 'feature-expand-1';
    const features = [
      createMockFeature({
        id: featureId,
        name: 'Expandable Feature',
        tasks,
        taskCounts: { total: 2, completed: 0 },
      }),
    ];
    const column = createMockColumn({ features });

    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={true}
        selectedFeatureIndex={0}
        expandedFeatureId={featureId}
        selectedTaskIndex={-1}
        availableHeight={40}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Expandable Feature');
    expect(output).toContain('Task Alpha');
    expect(output).toContain('Task Beta');
  });

  test('should display task counts on feature cards', () => {
    const features = [
      createMockFeature({
        name: 'Feature with tasks',
        taskCounts: { total: 8, completed: 3 },
      }),
    ];
    const column = createMockColumn({ features });

    const { lastFrame } = renderWithTheme(
      <KanbanColumn
        column={column}
        isActiveColumn={false}
        selectedFeatureIndex={-1}
        expandedFeatureId={null}
        selectedTaskIndex={-1}
      />
    );

    const output = lastFrame();
    expect(output).toContain('3/8');
  });
});
