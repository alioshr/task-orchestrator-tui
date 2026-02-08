import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdapter } from '../context/adapter-context';
import type { Feature, Task } from '@allpepper/task-orchestrator';
import type { BoardFeature, FeatureBoardColumn } from '../lib/types';
import { isCompletedStatus } from '../lib/colors';

/**
 * v2 Feature-status columns for the feature-based Kanban board
 * Features: NEW → ACTIVE → READY_TO_PROD → CLOSED (+ WILL_NOT_IMPLEMENT)
 */
export const FEATURE_KANBAN_STATUSES = [
  { id: 'new', title: 'New', status: 'NEW' },
  { id: 'active', title: 'Active', status: 'ACTIVE' },
  { id: 'ready-to-prod', title: 'Ready to Prod', status: 'READY_TO_PROD' },
  { id: 'closed', title: 'Closed', status: 'CLOSED' },
  { id: 'will-not-implement', title: 'Will Not Implement', status: 'WILL_NOT_IMPLEMENT' },
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
 * In v2, features move through the pipeline via advance/revert.
 */
export function useFeatureKanban(projectId: string): UseFeatureKanbanReturn {
  const { adapter } = useAdapter();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [tasksByFeature, setTasksByFeature] = useState<Map<string, Task[]>>(new Map());
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

    const grouped = new Map<string, Task[]>();
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
              completed: tasks.filter((t) => isCompletedStatus(t.status)).length,
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
      const feature = features.find((f) => f.id === featureId);
      if (!feature) {
        refresh();
        return false;
      }

      try {
        // Determine direction based on pipeline position
        const currentIdx = FEATURE_KANBAN_STATUSES.findIndex(s => s.status === feature.status);
        const targetIdx = FEATURE_KANBAN_STATUSES.findIndex(s => s.status === newStatus);

        if (currentIdx === -1 || targetIdx === -1) {
          refresh();
          return false;
        }

        // Handle terminate (WILL_NOT_IMPLEMENT)
        if (newStatus === 'WILL_NOT_IMPLEMENT') {
          const result = await adapter.terminate('feature', featureId, feature.version);
          refresh();
          return result.success;
        }

        // Step through the pipeline
        let currentVersion = feature.version;
        const direction = targetIdx > currentIdx ? 'advance' : 'revert';
        const steps = Math.abs(targetIdx - currentIdx);

        for (let i = 0; i < steps; i++) {
          const result = direction === 'advance'
            ? await adapter.advance('feature', featureId, currentVersion)
            : await adapter.revert('feature', featureId, currentVersion);

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
