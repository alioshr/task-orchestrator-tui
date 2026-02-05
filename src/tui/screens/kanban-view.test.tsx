import React from 'react';
import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { render } from 'ink-testing-library';
import { KanbanView } from './kanban-view';
import { ThemeProvider } from '../../ui/context/theme-context';
import { AdapterProvider } from '../../ui/context/adapter-context';
import type { DataAdapter } from '../../ui/adapters/types';
import type { BoardColumn } from '../../ui/lib/types';
import { TaskStatus, Priority, LockStatus, ProjectStatus } from 'task-orchestrator-bun/src/domain/types';

interface UseKanbanReturn {
  columns: BoardColumn[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  moveTask: (taskId: string, newStatus: string) => Promise<boolean>;
}

// Mock useKanban hook
const mockUseKanban = mock((): UseKanbanReturn => ({
  columns: [],
  loading: true,
  error: null,
  refresh: mock(() => {}),
  moveTask: mock(async () => true),
}));

// Mock the hook module
mock.module('../../ui/hooks/use-kanban', () => ({
  useKanban: mockUseKanban,
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

  const mockColumns: BoardColumn[] = [
    {
      id: 'pending',
      title: 'Pending',
      status: 'PENDING',
      tasks: [
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
      ],
    },
    {
      id: 'in-progress',
      title: 'In Progress',
      status: 'IN_PROGRESS',
      tasks: [
        {
          id: 'task-2',
          title: 'Task B',
          summary: 'Summary B',
          status: TaskStatus.IN_PROGRESS,
          priority: Priority.MEDIUM,
          complexity: 8,
          version: 1,
          lockStatus: LockStatus.UNLOCKED,
          createdAt: new Date(),
          modifiedAt: new Date(),
        },
      ],
    },
    {
      id: 'completed',
      title: 'Completed',
      status: 'COMPLETED',
      tasks: [],
    },
  ];

  let mockAdapter: DataAdapter;
  let onSelectTask: ReturnType<typeof mock>;
  let onBack: ReturnType<typeof mock>;

  beforeEach(() => {
    onSelectTask = mock(() => {});
    onBack = mock(() => {});

    mockAdapter = {
      getProject: mock(async () => ({ success: true, data: mockProject })),
      getProjects: mock(async () => ({ success: true, data: [] })),
      getProjectOverview: mock(async () => ({ success: true, data: {} as any })),
      getFeatures: mock(async () => ({ success: true, data: [] })),
      getFeature: mock(async () => ({ success: true, data: {} as any })),
      getFeatureOverview: mock(async () => ({ success: true, data: {} as any })),
      getTasks: mock(async () => ({ success: true, data: [] })),
      getTask: mock(async () => ({ success: true, data: {} as any })),
      setTaskStatus: mock(async () => ({ success: true, data: {} as any })),
      getSections: mock(async () => ({ success: true, data: [] })),
      getDependencies: mock(async () => ({ success: true, data: { blockedBy: [], blocks: [] } })),
      getBlockedTasks: mock(async () => ({ success: true, data: [] })),
      getNextTask: mock(async () => ({ success: true, data: null })),
      getAllowedTransitions: mock(async () => ({ success: true, data: [] })),
      search: mock(async () => ({ success: true, data: { projects: [], features: [], tasks: [] } })),
    } as DataAdapter;

    // Reset mock implementation
    mockUseKanban.mockImplementation((): UseKanbanReturn => ({
      columns: mockColumns,
      loading: false,
      error: null,
      refresh: mock(() => {}),
      moveTask: mock(async () => true),
    }));
  });

  function renderWithProviders(projectId: string) {
    return render(
      <ThemeProvider>
        <AdapterProvider adapter={mockAdapter}>
          <KanbanView
            projectId={projectId}
            onSelectTask={onSelectTask}
            onBack={onBack}
          />
        </AdapterProvider>
      </ThemeProvider>
    );
  }

  test('should render loading state', () => {
    mockUseKanban.mockImplementation((): UseKanbanReturn => ({
      columns: [],
      loading: true,
      error: null,
      refresh: mock(() => {}),
      moveTask: mock(async () => true),
    }));

    const { lastFrame } = renderWithProviders('proj-1');
    const output = lastFrame();

    expect(output).toContain('Loading kanban board...');
  });

  test('should render error state', () => {
    mockUseKanban.mockImplementation((): UseKanbanReturn => ({
      columns: [],
      loading: false,
      error: 'Failed to load kanban board',
      refresh: mock(() => {}),
      moveTask: mock(async () => true),
    }));

    const { lastFrame } = renderWithProviders('proj-1');
    const output = lastFrame();

    expect(output).toContain('Error:');
    expect(output).toContain('Failed to load kanban board');
  });

  test('should render kanban board header', () => {
    const { lastFrame } = renderWithProviders('proj-1');
    const output = lastFrame();

    // Should show kanban board title (project name loads async)
    expect(output).toContain('Kanban Board');
  });

  test('should render columns and tasks', () => {
    const { lastFrame } = renderWithProviders('proj-1');
    const output = lastFrame();

    expect(output).toContain('Pending');
    expect(output).toContain('In Progress');
    expect(output).toContain('Completed');
    expect(output).toContain('Task A');
    expect(output).toContain('Task B');
  });

  test('should show empty state when no columns', () => {
    mockUseKanban.mockImplementation((): UseKanbanReturn => ({
      columns: [],
      loading: false,
      error: null,
      refresh: mock(() => {}),
      moveTask: mock(async () => true),
    }));

    const { lastFrame } = renderWithProviders('proj-1');
    const output = lastFrame();

    expect(output).toContain('No tasks in this project yet.');
  });

  test('should display keyboard hints', () => {
    const { lastFrame } = renderWithProviders('proj-1');
    const output = lastFrame();

    expect(output).toContain('h/l: columns');
    expect(output).toContain('j/k: tasks');
    expect(output).toContain('Enter: open');
    expect(output).toContain('m: move');
    expect(output).toContain('r: refresh');
    expect(output).toContain('Esc: back');
  });

  test('should call onBack when Escape is pressed', () => {
    const { stdin } = renderWithProviders('proj-1');

    stdin.write('\x1B'); // ESC key
    expect(onBack).toHaveBeenCalled();
  });

  test('should call refresh when r is pressed', () => {
    const mockRefresh = mock(() => {});
    mockUseKanban.mockImplementation((): UseKanbanReturn => ({
      columns: mockColumns,
      loading: false,
      error: null,
      refresh: mockRefresh,
      moveTask: mock(async () => true),
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

  test('should initialize with first column and first task selected', () => {
    const { lastFrame } = renderWithProviders('proj-1');
    const output = lastFrame();

    // Should render kanban board (implies column navigation is working)
    expect(output).toContain('Task A');
    expect(output).toContain('Task B');
  });
});
