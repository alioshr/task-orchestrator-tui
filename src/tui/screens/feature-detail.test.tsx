import React from 'react';
import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { render } from 'ink-testing-library';
import { FeatureDetail } from './feature-detail';
import { ThemeProvider } from '../../ui/context/theme-context';
import { AdapterProvider } from '../../ui/context/adapter-context';
import type { DataAdapter } from '../../ui/adapters/types';
import { FeatureStatus, TaskStatus, Priority, LockStatus } from '@allpepper/task-orchestrator';
import type { Feature, Task } from '@allpepper/task-orchestrator';

describe('FeatureDetail', () => {
  const mockFeature: Feature = {
    id: 'feature-1',
    projectId: 'proj-1',
    name: 'Test Feature',
    summary: 'This is a test feature summary',
    description: 'This is a detailed description of the test feature',
    status: FeatureStatus.IN_DEVELOPMENT,
    priority: Priority.HIGH,
    version: 1,
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-15'),
    tags: ['frontend', 'ui'],
  };

  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Task A',
      summary: 'Summary A',
      status: TaskStatus.PENDING,
      priority: Priority.HIGH,
      complexity: 5,
      version: 1,
      lockStatus: LockStatus.UNLOCKED,
      createdAt: new Date(),
      modifiedAt: new Date(),
    },
    {
      id: 'task-2',
      title: 'Task B',
      summary: 'Summary B',
      status: TaskStatus.COMPLETED,
      priority: Priority.MEDIUM,
      complexity: 3,
      version: 1,
      lockStatus: LockStatus.UNLOCKED,
      createdAt: new Date(),
      modifiedAt: new Date(),
    },
  ];

  let mockAdapter: DataAdapter;
  let onSelectTask: ReturnType<typeof mock>;
  let onBack: ReturnType<typeof mock>;

  beforeEach(() => {
    onSelectTask = mock(() => {});
    onBack = mock(() => {});

    mockAdapter = {
      getProject: mock(async () => ({ success: true, data: {} as any })),
      getProjects: mock(async () => ({ success: true, data: [] })),
      getProjectOverview: mock(async () => ({ success: true, data: {} as any })),
      createProject: mock(async () => ({ success: true, data: {} as any })),
      updateProject: mock(async () => ({ success: true, data: {} as any })),
      deleteProject: mock(async () => ({ success: true, data: true })),
      getFeatures: mock(async () => ({ success: true, data: [] })),
      getFeature: mock(async () => ({ success: true, data: mockFeature })),
      getFeatureOverview: mock(async () => ({ success: true, data: {} as any })),
      createFeature: mock(async () => ({ success: true, data: mockFeature })),
      updateFeature: mock(async () => ({ success: true, data: mockFeature })),
      deleteFeature: mock(async () => ({ success: true, data: true })),
      getTasks: mock(async () => ({ success: true, data: mockTasks })),
      getTask: mock(async () => ({ success: true, data: {} as any })),
      createTask: mock(async () => ({ success: true, data: {} as any })),
      updateTask: mock(async () => ({ success: true, data: {} as any })),
      deleteTask: mock(async () => ({ success: true, data: true })),
      setTaskStatus: mock(async () => ({ success: true, data: {} as any })),
      setProjectStatus: mock(async () => ({ success: true, data: {} as any })),
      setFeatureStatus: mock(async () => ({ success: true, data: {} as any })),
      getSections: mock(async () => ({ success: true, data: [] })),
      getDependencies: mock(async () => ({ success: true, data: { blockedBy: [], blocks: [] } })),
      getBlockedTasks: mock(async () => ({ success: true, data: [] })),
      getNextTask: mock(async () => ({ success: true, data: null })),
      getAllowedTransitions: mock(async () => ({ success: true, data: [] })),
      search: mock(async () => ({ success: true, data: { projects: [], features: [], tasks: [] } })),
    } as DataAdapter;
  });

  function renderWithProviders(featureId: string) {
    return render(
      <ThemeProvider>
        <AdapterProvider adapter={mockAdapter}>
          <FeatureDetail
            featureId={featureId}
            onSelectTask={onSelectTask}
            onBack={onBack}
          />
        </AdapterProvider>
      </ThemeProvider>
    );
  }

  test('should render loading state initially', () => {
    const { lastFrame } = renderWithProviders('feature-1');
    const output = lastFrame();

    expect(output).toContain('Loading feature...');
  });

  test('should fetch feature and tasks on mount', async () => {
    renderWithProviders('feature-1');

    // Wait for async load
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockAdapter.getFeature).toHaveBeenCalledWith('feature-1');
    expect(mockAdapter.getTasks).toHaveBeenCalledWith({ featureId: 'feature-1' });
  });

  test('should handle adapter error gracefully', async () => {
    mockAdapter.getFeature = mock(async () => ({
      success: false as const,
      error: 'Feature not found',
    }));

    const { lastFrame } = renderWithProviders('feature-1');

    // Wait for async load and state updates
    await new Promise(resolve => setTimeout(resolve, 100));

    const output = lastFrame();
    expect(output).toContain('Error:');
    expect(output).toContain('Feature not found');
  });

  test('should handle missing feature', async () => {
    mockAdapter.getFeature = mock(async () => ({
      success: true as const,
      data: null as any,
    }));

    const { lastFrame } = renderWithProviders('feature-1');

    // Wait for async load
    await new Promise(resolve => setTimeout(resolve, 100));

    const output = lastFrame();
    expect(output).toContain('Feature not found');
  });

  test('should call onBack when h is pressed', async () => {
    const { stdin } = renderWithProviders('feature-1');

    // Wait for async load
    await new Promise(resolve => setTimeout(resolve, 100));

    stdin.write('h');
    expect(onBack).toHaveBeenCalled();
  });
});
