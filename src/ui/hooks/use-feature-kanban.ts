import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdapter } from '../context/adapter-context';
import type { Feature, FeatureStatus } from '@allpepper/task-orchestrator';
import type { BoardFeature, FeatureBoardColumn } from '../lib/types';

/**
 * Feature-status columns for the feature-based Kanban board
 */
export const FEATURE_KANBAN_STATUSES = [
  { id: 'draft', title: 'Draft', status: 'DRAFT' },
  { id: 'planning', title: 'Planning', status: 'PLANNING' },
  { id: 'in-development', title: 'In Development', status: 'IN_DEVELOPMENT' },
  { id: 'testing', title: 'Testing', status: 'TESTING' },
  { id: 'validating', title: 'Validating', status: 'VALIDATING' },
  { id: 'pending-review', title: 'Pending Review', status: 'PENDING_REVIEW' },
  { id: 'blocked', title: 'Blocked', status: 'BLOCKED' },
  { id: 'on-hold', title: 'On Hold', status: 'ON_HOLD' },
  { id: 'deployed', title: 'Deployed', status: 'DEPLOYED' },
  { id: 'completed', title: 'Completed', status: 'COMPLETED' },
  { id: 'archived', title: 'Archived', status: 'ARCHIVED' },
] as const;

interface UseFeatureKanbanReturn {
  columns: FeatureBoardColumn[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  moveFeature: (featureId: string, newStatus: string) => Promise<boolean>;
}

/**
 * Hook for managing the feature-based Kanban board.
 *
 * Fetches features and tasks for a project, groups features by their status
 * into columns, and nests tasks within each feature card.
 */
export function useFeatureKanban(projectId: string): UseFeatureKanbanReturn {
  const { adapter } = useAdapter();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [tasksByFeature, setTasksByFeature] = useState<Map<string, import('@allpepper/task-orchestrator/src/domain/types').Task[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [featuresResult, tasksResult] = await Promise.all([
      adapter.getFeatures({ projectId }),
      adapter.getTasks({ projectId }),
    ]);

    if (!featuresResult.success) {
      setError(featuresResult.error);
      setLoading(false);
      return;
    }

    if (!tasksResult.success) {
      setError(tasksResult.error);
      setLoading(false);
      return;
    }

    setFeatures(featuresResult.data);

    // Group tasks by featureId
    const grouped = new Map<string, import('@allpepper/task-orchestrator/src/domain/types').Task[]>();
    for (const task of tasksResult.data) {
      if (task.featureId) {
        const list = grouped.get(task.featureId) || [];
        list.push(task);
        grouped.set(task.featureId, list);
      }
    }
    setTasksByFeature(grouped);
    setLoading(false);
  }, [adapter, projectId]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  const columns = useMemo<FeatureBoardColumn[]>(() => {
    return FEATURE_KANBAN_STATUSES.map((statusDef) => {
      const columnFeatures = features
        .filter((f) => f.status === statusDef.status)
        .map((f): BoardFeature => {
          const tasks = tasksByFeature.get(f.id) || [];
          return {
            ...f,
            tasks,
            taskCounts: {
              total: tasks.length,
              completed: tasks.filter((t) => t.status === 'COMPLETED' || t.status === 'DEPLOYED').length,
            },
          };
        });

      return {
        id: statusDef.id,
        title: statusDef.title,
        status: statusDef.status,
        features: columnFeatures,
      };
    });
  }, [features, tasksByFeature]);

  const moveFeature = useCallback(
    async (featureId: string, newStatus: string): Promise<boolean> => {
      // Find feature in current data
      const feature = features.find((f) => f.id === featureId);
      if (!feature) {
        refresh();
        return false;
      }

      try {
        const result = await adapter.setFeatureStatus(
          featureId,
          newStatus as FeatureStatus,
          feature.version
        );

        if (result.success) {
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
    [adapter, features, refresh]
  );

  return {
    columns,
    loading,
    error,
    refresh,
    moveFeature,
  };
}
