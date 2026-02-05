import { useState, useEffect, useCallback } from 'react';
import { useAdapter } from '../context/adapter-context';
import type { Task } from 'task-orchestrator-bun/src/domain/types';
import type { BoardColumn } from '../lib/types';

/**
 * Standard Kanban column definitions
 */
const KANBAN_STATUSES = [
  { id: 'pending', title: 'Pending', status: 'PENDING' },
  { id: 'in-progress', title: 'In Progress', status: 'IN_PROGRESS' },
  { id: 'in-review', title: 'In Review', status: 'IN_REVIEW' },
  { id: 'blocked', title: 'Blocked', status: 'BLOCKED' },
  { id: 'completed', title: 'Completed', status: 'COMPLETED' },
] as const;

interface UseKanbanReturn {
  columns: BoardColumn[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  moveTask: (taskId: string, newStatus: string) => Promise<boolean>;
}

/**
 * Hook for managing Kanban board state
 *
 * Fetches tasks for a project and organizes them into Kanban columns by status.
 * Provides functionality to move tasks between columns with optimistic updates.
 *
 * @param projectId - The project ID to fetch tasks for
 * @returns Kanban board state and operations
 */
export function useKanban(projectId: string): UseKanbanReturn {
  const { adapter } = useAdapter();
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  /**
   * Refresh the board data
   */
  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  /**
   * Fetch tasks and organize into columns
   */
  useEffect(() => {
    let isMounted = true;

    const fetchTasks = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await adapter.getTasks({ projectId });

        if (!isMounted) return;

        if (result.success) {
          // Group tasks by status
          const tasksByStatus = new Map<string, Task[]>();

          for (const task of result.data) {
            const status = task.status;
            if (!tasksByStatus.has(status)) {
              tasksByStatus.set(status, []);
            }
            tasksByStatus.get(status)!.push(task);
          }

          // Build columns array with standard order
          const newColumns: BoardColumn[] = KANBAN_STATUSES.map((statusDef) => ({
            id: statusDef.id,
            title: statusDef.title,
            status: statusDef.status,
            tasks: tasksByStatus.get(statusDef.status) || [],
          }));

          setColumns(newColumns);
        } else {
          setError(result.error);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTasks();

    return () => {
      isMounted = false;
    };
  }, [adapter, projectId, refreshTrigger]);

  /**
   * Move a task to a new status
   *
   * @param taskId - ID of the task to move
   * @param newStatus - New status to assign
   * @returns true if successful, false otherwise
   */
  const moveTask = useCallback(
    async (taskId: string, newStatus: string): Promise<boolean> => {
      // Find the task in current columns
      let task: Task | undefined;
      for (const column of columns) {
        task = column.tasks.find((t) => t.id === taskId);
        if (task) break;
      }

      if (!task) {
        setError(`Task ${taskId} not found`);
        return false;
      }

      try {
        // Call adapter to update task status
        const result = await adapter.setTaskStatus(taskId, newStatus as any, task.version);

        if (result.success) {
          // Refresh the board on success
          refresh();
          return true;
        } else {
          setError(result.error);
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to move task');
        return false;
      }
    },
    [adapter, columns, refresh]
  );

  return {
    columns,
    loading,
    error,
    refresh,
    moveTask,
  };
}
