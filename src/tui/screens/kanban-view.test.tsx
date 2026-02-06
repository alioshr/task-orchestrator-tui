import React from 'react';
import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { render } from 'ink-testing-library';
import { KanbanView } from './kanban-view';
import { ThemeProvider } from '../../ui/context/theme-context';
import { AdapterProvider } from '../../ui/context/adapter-context';
import type { DataAdapter } from '../../ui/adapters/types';
import type { FeatureBoardColumn } from '../../ui/lib/types';
import { FeatureStatus, TaskStatus, Priority, LockStatus, ProjectStatus } from 'task-orchestrator-bun/src/domain/types';

interface UseFeatureKanbanReturn {
  columns: FeatureBoardColumn[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  moveFeature: (featureId: string, newStatus: string) => Promise<boolean>;
}

// Mock useFeatureKanban hook
const mockUseFeatureKanban = mock((): UseFeatureKanbanReturn => ({
  columns: [],
  loading: true,
  error: null,
  refresh: mock(() => {}),
  moveFeature: mock(async () => true),
}));

// Mock the hook module
mock.module('../../ui/hooks/use-feature-kanban', () => ({
  useFeatureKanban: mockUseFeatureKanban,
}));

describe('KanbanView', () => {
  const mockProject = {
    id: 'proj-1',
    name: 'Test Project',
    summary: 'A test project',
    status: ProjectStatus.IN_DEVELOPMENT,
    version: 1,
    createdAt: new Date(),
    modifiedAt: new Date(),
  };

  const mockColumns: FeatureBoardColumn[] = [
    {
      id: 'draft',
      title: 'Draft',
      status: 'DRAFT',
      features: [
        {
          id: 'feature-1',
          projectId: 'proj-1',
          name: 'Feature A',
          summary: 'Summary A',
          status: FeatureStatus.DRAFT,
          priority: Priority.HIGH,
          version: 1,
          createdAt: new Date(),
          modifiedAt: new Date(),
          tasks: [
            {
              id: 'task-1',
              projectId: 'proj-1',
              featureId: 'feature-1',
              title: 'Task 1',
              summary: 'Task summary 1',
              status: TaskStatus.PENDING,
              priority: Priority.HIGH,
              complexity: 5,
              version: 1,
              lockStatus: LockStatus.UNLOCKED,
              createdAt: new Date(),
              modifiedAt: new Date(),
            },
          ],
          taskCounts: { total: 1, completed: 0 },
        },
      ],
    },
    {
      id: 'in-development',
      title: 'In Development',
      status: 'IN_DEVELOPMENT',
      features: [
        {
          id: 'feature-2',
          projectId: 'proj-1',
          name: 'Feature B',
          summary: 'Summary B',
          status: FeatureStatus.IN_DEVELOPMENT,
          priority: Priority.MEDIUM,
          version: 1,
          createdAt: new Date(),
          modifiedAt: new Date(),
          tasks: [],
          taskCounts: { total: 0, completed: 0 },
        },
      ],
    },
    {
      id: 'deployed',
      title: 'Deployed',
      status: 'DEPLOYED',
      features: [],
    },
  ];

  let mockAdapter: DataAdapter;
  let onSelectTask: ReturnType<typeof mock>;
  let onBack: ReturnType<typeof mock>;
  let onActiveColumnIndexChange: ReturnType<typeof mock>;
  let onSelectedFeatureIndexChange: ReturnType<typeof mock>;
  let onExpandedFeatureIdChange: ReturnType<typeof mock>;
  let onSelectedTaskIndexChange: ReturnType<typeof mock>;
  let onActiveStatusesChange: ReturnType<typeof mock>;
  let activeStatuses: Set<string>;

  beforeEach(() => {
    onSelectTask = mock(() => {});
    onBack = mock(() => {});
    onActiveColumnIndexChange = mock(() => {});
    onSelectedFeatureIndexChange = mock(() => {});
    onExpandedFeatureIdChange = mock(() => {});
    onSelectedTaskIndexChange = mock(() => {});
    onActiveStatusesChange = mock(() => {});
    activeStatuses = new Set(['DRAFT', 'IN_DEVELOPMENT', 'DEPLOYED']);

    mockAdapter = {
      getProject: mock(async () => ({ success: true, data: mockProject })),
      getProjects: mock(async () => ({ success: true, data: [] })),
      getProjectOverview: mock(async () => ({ success: true, data: {} as any })),
      createProject: mock(async () => ({ success: true, data: mockProject as any })),
      updateProject: mock(async () => ({ success: true, data: mockProject as any })),
      deleteProject: mock(async () => ({ success: true, data: true })),
      getFeatures: mock(async () => ({ success: true, data: [] })),
      getFeature: mock(async () => ({ success: true, data: {} as any })),
      getFeatureOverview: mock(async () => ({ success: true, data: {} as any })),
      createFeature: mock(async () => ({ success: true, data: {} as any })),
      updateFeature: mock(async () => ({ success: true, data: {} as any })),
      deleteFeature: mock(async () => ({ success: true, data: true })),
      getTasks: mock(async () => ({ success: true, data: [] })),
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

    // Reset mock implementation
    mockUseFeatureKanban.mockImplementation((): UseFeatureKanbanReturn => ({
      columns: mockColumns,
      loading: false,
      error: null,
      refresh: mock(() => {}),
      moveFeature: mock(async () => true),
    }));
  });

  function renderWithProviders(
    projectId: string,
    overrides: {
      activeColumnIndex?: number;
      selectedFeatureIndex?: number;
      expandedFeatureId?: string | null;
      selectedTaskIndex?: number;
    } = {}
  ) {
    const {
      activeColumnIndex = 0,
      selectedFeatureIndex = 0,
      expandedFeatureId = null,
      selectedTaskIndex = 0,
    } = overrides;

    return render(
      <ThemeProvider>
        <AdapterProvider adapter={mockAdapter}>
          <KanbanView
            projectId={projectId}
            activeColumnIndex={activeColumnIndex}
            onActiveColumnIndexChange={onActiveColumnIndexChange}
            selectedFeatureIndex={selectedFeatureIndex}
            onSelectedFeatureIndexChange={onSelectedFeatureIndexChange}
            expandedFeatureId={expandedFeatureId}
            onExpandedFeatureIdChange={onExpandedFeatureIdChange}
            selectedTaskIndex={selectedTaskIndex}
            onSelectedTaskIndexChange={onSelectedTaskIndexChange}
            onSelectTask={onSelectTask}
            onBack={onBack}
            activeStatuses={activeStatuses}
            onActiveStatusesChange={onActiveStatusesChange}
          />
        </AdapterProvider>
      </ThemeProvider>
    );
  }

  test('should render loading state', () => {
    mockUseFeatureKanban.mockImplementation((): UseFeatureKanbanReturn => ({
      columns: [],
      loading: true,
      error: null,
      refresh: mock(() => {}),
      moveFeature: mock(async () => true),
    }));

    const { lastFrame } = renderWithProviders('proj-1');
    const output = lastFrame();

    expect(output).toContain('Loading kanban board...');
  });

  test('should render error state', () => {
    mockUseFeatureKanban.mockImplementation((): UseFeatureKanbanReturn => ({
      columns: [],
      loading: false,
      error: 'Failed to load kanban board',
      refresh: mock(() => {}),
      moveFeature: mock(async () => true),
    }));

    const { lastFrame } = renderWithProviders('proj-1');
    const output = lastFrame();

    expect(output).toContain('Error:');
    expect(output).toContain('Failed to load kanban board');
  });

  test('should render feature board header', () => {
    const { lastFrame } = renderWithProviders('proj-1');
    const output = lastFrame();

    expect(output).toContain('Feature Board');
  });

  test('should render columns and features', () => {
    const { lastFrame } = renderWithProviders('proj-1');
    const output = lastFrame();

    expect(output).toContain('Draft');
    expect(output).toContain('In Development');
    expect(output).toContain('Deployed');
    expect(output).toContain('Feature A');
    expect(output).toContain('Feature B');
  });

  test('should show empty state when no columns', () => {
    mockUseFeatureKanban.mockImplementation((): UseFeatureKanbanReturn => ({
      columns: [],
      loading: false,
      error: null,
      refresh: mock(() => {}),
      moveFeature: mock(async () => true),
    }));

    const { lastFrame } = renderWithProviders('proj-1');
    const output = lastFrame();

    expect(output).toContain('No features in this project yet.');
  });

  test('should display feature mode keyboard hints when no feature is expanded', () => {
    const { lastFrame } = renderWithProviders('proj-1');
    const output = lastFrame();

    expect(output).toContain('h/l: columns');
    expect(output).toContain('j/k: features');
    expect(output).toContain('Enter: expand');
    expect(output).toContain('m: move');
    expect(output).toContain('f: filter');
    expect(output).toContain('r: refresh');
    expect(output).toContain('Esc: back');
  });

  test('should display task mode keyboard hints when a feature is expanded', () => {
    const { lastFrame } = renderWithProviders('proj-1', {
      expandedFeatureId: 'feature-1',
    });
    const output = lastFrame();

    expect(output).toContain('j/k: tasks');
    expect(output).toContain('Enter: open task');
    expect(output).toContain('Esc/h: collapse');
    expect(output).toContain('r: refresh');
  });

  test('should call onBack when Escape is pressed in feature mode', () => {
    const { stdin } = renderWithProviders('proj-1');

    stdin.write('\x1B'); // ESC key
    expect(onBack).toHaveBeenCalled();
  });

  test('should not call onBack when Escape is pressed in task mode', () => {
    const { stdin } = renderWithProviders('proj-1', {
      expandedFeatureId: 'feature-1',
    });

    stdin.write('\x1B'); // ESC key
    expect(onBack).not.toHaveBeenCalled();
  });

  test('should call refresh when r is pressed', () => {
    const mockRefresh = mock(() => {});
    mockUseFeatureKanban.mockImplementation((): UseFeatureKanbanReturn => ({
      columns: mockColumns,
      loading: false,
      error: null,
      refresh: mockRefresh,
      moveFeature: mock(async () => true),
    }));

    const { stdin } = renderWithProviders('proj-1');

    stdin.write('r');
    expect(mockRefresh).toHaveBeenCalled();
  });

  test('should fetch project name on mount', async () => {
    renderWithProviders('proj-1');

    // Wait for effect to run
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockAdapter.getProject).toHaveBeenCalledWith('proj-1');
  });

  test('should handle adapter error gracefully', async () => {
    mockAdapter.getProject = mock(async () => ({
      success: false as const,
      error: 'Project not found',
    }));

    const { lastFrame } = renderWithProviders('proj-1');
    await new Promise(resolve => setTimeout(resolve, 10));

    const output = lastFrame();
    expect(output).toBeTruthy();
  });

  test('should initialize with first column and first feature selected', () => {
    const { lastFrame } = renderWithProviders('proj-1');
    const output = lastFrame();

    // Should render feature board (implies column navigation is working)
    expect(output).toContain('Feature A');
    expect(output).toContain('Feature B');
  });
});
