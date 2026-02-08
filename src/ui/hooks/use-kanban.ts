import { useMemo, useCallback } from 'react';
import { useAdapter } from '../context/adapter-context';
import type { Task } from '@allpepper/task-orchestrator';
import type { BoardColumn } from '../lib/types';
import { useBoardData } from './use-data';

/**
 * v2 Kanban column definitions (pipeline states)
 */
const KANBAN_STATUSES = [
  { id: 'new', title: 'New', status: 'NEW' },
  { id: 'active', title: 'Active', status: 'ACTIVE' },
  { id: 'to-be-tested', title: 'To Be Tested', status: 'TO_BE_TESTED' },
  { id: 'ready-to-prod', title: 'Ready to Prod', status: 'READY_TO_PROD' },
  { id: 'closed', title: 'Closed', status: 'CLOSED' },
] as const;

interface UseKanbanReturn {
  columns: BoardColumn[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  moveTask: (taskId: string, newStatus: string) => Promise<boolean>;
}

/**
 * Hook for managing Kanban board state.
 * In v2, tasks move through the pipeline via advance/revert.
 * The moveTask function uses advance for forward moves and revert for backward moves.
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
   * Move a task to a new status via advance/revert pipeline operations
   */
  const moveTask = useCallback(
    async (taskId: string, newStatus: string): Promise<boolean> => {
      let task: Task | undefined;
      for (const column of columns) {
        task = column.tasks.find((t) => t.id === taskId);
        if (task) break;
      }

      if (!task) {
        refresh();
        return false;
      }

      try {
        // Determine direction based on pipeline position
        const currentIdx = KANBAN_STATUSES.findIndex(s => s.status === task!.status);
        const targetIdx = KANBAN_STATUSES.findIndex(s => s.status === newStatus);

        if (currentIdx === -1 || targetIdx === -1) {
          refresh();
          return false;
        }

        // Step through the pipeline one step at a time
        let currentVersion = task.version;
        const direction = targetIdx > currentIdx ? 'advance' : 'revert';
        const steps = Math.abs(targetIdx - currentIdx);

        for (let i = 0; i < steps; i++) {
          const result = direction === 'advance'
            ? await adapter.advance('task', taskId, currentVersion)
            : await adapter.revert('task', taskId, currentVersion);

          if (!result.success) {
            refresh();
            return false;
          }
          currentVersion = result.data.entity.version;
        }

        refresh();
        return true;
      } catch (_err) {
        refresh();
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
