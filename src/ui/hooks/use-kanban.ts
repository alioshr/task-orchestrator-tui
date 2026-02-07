import { useMemo, useCallback } from 'react';
import { useAdapter } from '../context/adapter-context';
import type { Task } from '@allpepper/task-orchestrator';
import type { BoardColumn } from '../lib/types';
import { useBoardData } from './use-data';

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
  const { columnsByStatus, loading, error, refresh } = useBoardData(projectId);

  const columns = useMemo<BoardColumn[]>(() => (
    KANBAN_STATUSES.map((statusDef) => ({
      id: statusDef.id,
      title: statusDef.title,
      status: statusDef.status,
      tasks: (columnsByStatus.get(statusDef.status) || []).map((card) => card.task),
    }))
  ), [columnsByStatus]);

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
        // Board may be stale; ask the caller to refresh and retry.
        refresh();
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
          refresh();
          return false;
        }
      } catch (_err) {
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
