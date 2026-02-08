import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdapter } from '../context/adapter-context';
import type { Project, Task, Feature, Section, EntityType, Priority } from '@allpepper/task-orchestrator';
import type { FeatureWithTasks, ProjectOverview, SearchResults, DependencyInfo, BoardCard, BoardTask } from '../lib/types';
import type { TreeRow } from '../../tui/components/tree-view';
import { isCompletedStatus } from '../lib/colors';

/**
 * Task counts structure
 */
export interface TaskCounts {
  total: number;
  completed: number;
}

/**
 * Calculate task counts from an array of tasks
 */
export function calculateTaskCounts(tasks: Task[]): TaskCounts {
  return {
    total: tasks.length,
    completed: tasks.filter(t => isCompletedStatus(t.status)).length,
  };
}

/**
 * Group tasks by project ID and calculate counts for each
 */
export function calculateTaskCountsByProject(tasks: Task[]): Map<string, TaskCounts> {
  const countsByProject = new Map<string, TaskCounts>();

  for (const task of tasks) {
    if (task.projectId) {
      const counts = countsByProject.get(task.projectId) || { total: 0, completed: 0 };
      counts.total++;
      if (isCompletedStatus(task.status)) {
        counts.completed++;
      }
      countsByProject.set(task.projectId, counts);
    }
  }

  return countsByProject;
}

/**
 * Feature counts structure
 */
export interface FeatureCounts {
  total: number;
  completed: number;
}

/**
 * Group features by project ID and calculate counts for each
 */
export function calculateFeatureCountsByProject(featureList: Feature[]): Map<string, FeatureCounts> {
  const countsByProject = new Map<string, FeatureCounts>();

  for (const feature of featureList) {
    if (feature.projectId) {
      const counts = countsByProject.get(feature.projectId) || { total: 0, completed: 0 };
      counts.total++;
      if (isCompletedStatus(feature.status)) {
        counts.completed++;
      }
      countsByProject.set(feature.projectId, counts);
    }
  }

  return countsByProject;
}

/**
 * Project with task and feature count information for dashboard display
 */
export interface ProjectWithCounts extends Project {
  taskCounts: TaskCounts;
  featureCounts: FeatureCounts;
}

/**
 * Hook for fetching and managing the list of projects for the dashboard.
 */
export function useProjects() {
  const { adapter } = useAdapter();
  const [projects, setProjects] = useState<ProjectWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [projectsResult, tasksResult, featuresResult] = await Promise.all([
      adapter.getProjects(),
      adapter.getTasks({ limit: 1000 }),
      adapter.getFeatures({ limit: 1000 }),
    ]);

    if (!projectsResult.success) {
      setError(projectsResult.error);
      setLoading(false);
      return;
    }

    const taskCountsByProject = tasksResult.success
      ? calculateTaskCountsByProject(tasksResult.data)
      : new Map<string, TaskCounts>();

    const featureCountsByProject = featuresResult.success
      ? calculateFeatureCountsByProject(featuresResult.data)
      : new Map<string, FeatureCounts>();

    const projectsWithCounts: ProjectWithCounts[] = projectsResult.data.map(project => ({
      ...project,
      taskCounts: taskCountsByProject.get(project.id) || { total: 0, completed: 0 },
      featureCounts: featureCountsByProject.get(project.id) || { total: 0, completed: 0 },
    }));

    setProjects(projectsWithCounts);
    setLoading(false);
  }, [adapter]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    projects,
    loading,
    error,
    refresh: loadProjects,
  };
}

/**
 * Hook for fetching a single project with its overview statistics.
 */
export function useProjectOverview(id: string) {
  const { adapter } = useAdapter();
  const [project, setProject] = useState<Project | null>(null);
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjectOverview = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [projectResult, overviewResult] = await Promise.all([
      adapter.getProject(id),
      adapter.getProjectOverview(id),
    ]);

    if (projectResult.success) {
      setProject(projectResult.data);
    } else {
      setError(projectResult.error);
    }

    if (overviewResult.success) {
      setOverview(overviewResult.data);
    } else if (!error) {
      setError(overviewResult.error);
    }

    setLoading(false);
  }, [adapter, id, error]);

  useEffect(() => {
    loadProjectOverview();
  }, [loadProjectOverview]);

  return {
    project,
    overview,
    loading,
    error,
    refresh: loadProjectOverview,
  };
}

/**
 * v2 pipeline status order for task columns
 * Tasks: NEW → ACTIVE → TO_BE_TESTED → READY_TO_PROD → CLOSED (+ WILL_NOT_IMPLEMENT)
 */
const TASK_STATUS_ORDER: string[] = [
  'NEW',
  'ACTIVE',
  'TO_BE_TESTED',
  'READY_TO_PROD',
  'CLOSED',
  'WILL_NOT_IMPLEMENT',
];

/**
 * Priority order for sorting tasks within status groups
 */
const PRIORITY_ORDER: Record<Priority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/**
 * Board status order (subset for kanban view)
 */
const BOARD_STATUS_ORDER: string[] = [
  'NEW',
  'ACTIVE',
  'TO_BE_TESTED',
  'READY_TO_PROD',
  'CLOSED',
];

/**
 * Display names for v2 pipeline statuses
 */
const STATUS_DISPLAY_NAMES: Record<string, string> = {
  NEW: 'New',
  ACTIVE: 'Active',
  TO_BE_TESTED: 'To Be Tested',
  READY_TO_PROD: 'Ready to Prod',
  CLOSED: 'Closed',
  WILL_NOT_IMPLEMENT: 'Will Not Implement',
};

/**
 * Feature status order for grouping features
 * Features: NEW → ACTIVE → READY_TO_PROD → CLOSED (+ WILL_NOT_IMPLEMENT)
 */
const FEATURE_STATUS_ORDER: string[] = [
  'NEW',
  'ACTIVE',
  'READY_TO_PROD',
  'CLOSED',
  'WILL_NOT_IMPLEMENT',
];

/**
 * Build status-grouped tree rows for tasks
 */
function buildStatusGroupedRows(
  tasks: Task[],
  features: FeatureWithTasks[],
  expandedGroups: Set<string>
): TreeRow[] {
  const rows: TreeRow[] = [];

  const featureMap = new Map<string, FeatureWithTasks>();
  for (const feature of features) {
    featureMap.set(feature.id, feature);
  }

  // Group tasks by status
  const tasksByStatus = new Map<string, Task[]>();
  for (const task of tasks) {
    const group = tasksByStatus.get(task.status) || [];
    group.push(task);
    tasksByStatus.set(task.status, group);
  }

  // Track which features have tasks
  const featureHasTasks = new Set<string>();
  for (const task of tasks) {
    if (task.featureId) {
      featureHasTasks.add(task.featureId);
    }
  }

  // Map feature status to the closest task status for empty features
  const featureStatusToTaskBucket = (featureStatus: string): string => {
    switch (featureStatus) {
      case 'CLOSED':
      case 'WILL_NOT_IMPLEMENT':
        return featureStatus;
      case 'ACTIVE':
      case 'READY_TO_PROD':
        return featureStatus;
      case 'NEW':
      default:
        return 'NEW';
    }
  };

  // Group empty features by their mapped status bucket
  const featuresByStatus = new Map<string, FeatureWithTasks[]>();
  for (const feature of features) {
    if (featureHasTasks.has(feature.id)) continue;
    const mappedStatus = featureStatusToTaskBucket(feature.status);
    const group = featuresByStatus.get(mappedStatus) || [];
    group.push(feature);
    featuresByStatus.set(mappedStatus, group);
  }

  // Build rows in status order
  for (const status of TASK_STATUS_ORDER) {
    const statusTasks = tasksByStatus.get(status) || [];
    const statusFeatures = featuresByStatus.get(status) || [];
    if (statusTasks.length === 0 && statusFeatures.length === 0) continue;

    const statusGroupId = status;
    const statusExpanded = expandedGroups.has(statusGroupId);
    const statusExpandable = statusTasks.length > 0 || statusFeatures.length > 0;

    rows.push({
      type: 'group',
      id: statusGroupId,
      label: STATUS_DISPLAY_NAMES[status] || status,
      status,
      taskCount: statusTasks.length,
      expanded: statusExpanded,
      depth: 0,
      expandable: statusExpandable,
    });

    if (statusExpanded) {
      // Group tasks by featureId
      const tasksByFeature = new Map<string | null, Task[]>();
      for (const task of statusTasks) {
        const featureId = task.featureId || null;
        const group = tasksByFeature.get(featureId) || [];
        group.push(task);
        tasksByFeature.set(featureId, group);
      }

      // Sort tasks within each feature by priority then title
      for (const [_, featureTasks] of tasksByFeature.entries()) {
        featureTasks.sort((a, b) => {
          const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.title.localeCompare(b.title);
        });
      }

      // Build feature sub-groups
      const tasksByFeatureId = new Map<string, Task[]>();
      for (const [featureId, featureTasks] of tasksByFeature.entries()) {
        if (featureId !== null) {
          tasksByFeatureId.set(featureId, featureTasks);
        }
      }

      // Sort features by creation date
      const statusFeatureMap = new Map<string, FeatureWithTasks>();
      for (const feature of statusFeatures) {
        statusFeatureMap.set(feature.id, feature);
      }
      for (const featureId of tasksByFeatureId.keys()) {
        const feature = featureMap.get(featureId);
        if (feature) {
          statusFeatureMap.set(feature.id, feature);
        }
      }

      const sortedStatusFeatures = [...statusFeatureMap.values()].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      for (const feature of sortedStatusFeatures) {
        const featureId = feature.id;
        const featureTasks = tasksByFeatureId.get(featureId) || [];
        const compositeFeatureId = `${status}:${featureId}`;
        const featureExpandable = featureTasks.length > 0;
        const featureExpanded = featureExpandable && expandedGroups.has(compositeFeatureId);

        rows.push({
          type: 'group',
          id: compositeFeatureId,
          label: feature.name,
          status: feature.status,
          taskCount: featureTasks.length,
          expanded: featureExpanded,
          depth: 1,
          expandable: featureExpandable,
          featureId,
        });

        if (featureExpanded) {
          featureTasks.forEach((task, index) => {
            const isLast = index === featureTasks.length - 1;
            rows.push({
              type: 'task',
              task,
              isLast,
              depth: 2,
            });
          });
        }
      }

      // Add unassigned tasks
      const unassignedTasks = tasksByFeature.get(null);
      if (unassignedTasks && unassignedTasks.length > 0) {
        const unassignedId = `${status}:unassigned`;
        const unassignedExpanded = expandedGroups.has(unassignedId);

        unassignedTasks.sort((a, b) => {
          const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.title.localeCompare(b.title);
        });

        rows.push({
          type: 'group',
          id: unassignedId,
          label: 'Unassigned',
          status: status,
          taskCount: unassignedTasks.length,
          expanded: unassignedExpanded,
          depth: 1,
        });

        if (unassignedExpanded) {
          unassignedTasks.forEach((task, index) => {
            const isLast = index === unassignedTasks.length - 1;
            rows.push({
              type: 'task',
              task,
              isLast,
              depth: 2,
            });
          });
        }
      }
    }
  }

  return rows;
}

/**
 * Build feature-status-grouped tree rows
 */
function buildFeatureStatusGroupedRows(
  features: FeatureWithTasks[],
  expandedGroups: Set<string>
): TreeRow[] {
  const rows: TreeRow[] = [];

  const featuresByStatus = new Map<string, FeatureWithTasks[]>();
  for (const feature of features) {
    const group = featuresByStatus.get(feature.status) || [];
    group.push(feature);
    featuresByStatus.set(feature.status, group);
  }

  for (const status of FEATURE_STATUS_ORDER) {
    const statusFeatures = featuresByStatus.get(status) || [];
    if (statusFeatures.length === 0) continue;

    const statusGroupId = `fs:${status}`;
    const statusExpanded = expandedGroups.has(statusGroupId);

    rows.push({
      type: 'group',
      id: statusGroupId,
      label: STATUS_DISPLAY_NAMES[status] || status,
      status,
      taskCount: statusFeatures.length,
      expanded: statusExpanded,
      depth: 0,
      expandable: true,
    });

    if (statusExpanded) {
      const sortedFeatures = [...statusFeatures].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      for (const feature of sortedFeatures) {
        const compositeFeatureId = `fs:${status}:${feature.id}`;
        const featureExpandable = feature.tasks.length > 0;
        const featureExpanded = featureExpandable && expandedGroups.has(compositeFeatureId);

        rows.push({
          type: 'group',
          id: compositeFeatureId,
          label: feature.name,
          status: feature.status,
          taskCount: feature.tasks.length,
          expanded: featureExpanded,
          depth: 1,
          expandable: featureExpandable,
          featureId: feature.id,
        });

        if (featureExpanded) {
          const sortedTasks = [...feature.tasks].sort((a, b) => {
            const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return a.title.localeCompare(b.title);
          });

          sortedTasks.forEach((task, index) => {
            rows.push({
              type: 'task',
              task,
              isLast: index === sortedTasks.length - 1,
              depth: 2,
            });
          });
        }
      }
    }
  }

  return rows;
}

/**
 * Hook for fetching a project tree with features and their tasks.
 */
export function useProjectTree(projectId: string, expandedGroups: Set<string> = new Set()) {
  const { adapter } = useAdapter();
  const [project, setProject] = useState<Project | null>(null);
  const [features, setFeatures] = useState<FeatureWithTasks[]>([]);
  const [unassignedTasks, setUnassignedTasks] = useState<Task[]>([]);
  const [taskCounts, setTaskCounts] = useState<TaskCounts>({ total: 0, completed: 0 });
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjectTree = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [projectResult, featuresResult, tasksResult] = await Promise.all([
      adapter.getProject(projectId),
      adapter.getFeatures({ projectId }),
      adapter.getTasks({ projectId }),
    ]);

    if (!projectResult.success) {
      setError(projectResult.error);
      setLoading(false);
      return;
    }

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

    const projectData = projectResult.data;
    const allFeatures = featuresResult.data;
    const tasks = tasksResult.data;

    const sortedFeatures = [...allFeatures].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const featuresWithTasks: FeatureWithTasks[] = sortedFeatures.map((feature) => ({
      ...feature,
      tasks: tasks.filter((task) => task.featureId === feature.id),
    }));

    const unassigned = tasks.filter((task) => !task.featureId);

    setProject(projectData);
    setFeatures(featuresWithTasks);
    setUnassignedTasks(unassigned);
    setAllTasks(tasks);
    setTaskCounts(calculateTaskCounts(tasks));
    setLoading(false);
  }, [adapter, projectId]);

  useEffect(() => {
    loadProjectTree();
  }, [loadProjectTree]);

  const statusGroupedRows = useMemo(() => {
    return buildStatusGroupedRows(allTasks, features, expandedGroups);
  }, [allTasks, features, expandedGroups]);

  const featureStatusGroupedRows = useMemo(() => {
    return buildFeatureStatusGroupedRows(features, expandedGroups);
  }, [features, expandedGroups]);

  return {
    project,
    features,
    unassignedTasks,
    taskCounts,
    statusGroupedRows,
    featureStatusGroupedRows,
    loading,
    error,
    refresh: loadProjectTree,
  };
}

/**
 * Hook for fetching board data (kanban columns) for a project.
 */
export function useBoardData(projectId: string) {
  const { adapter } = useAdapter();
  const [columnsByStatus, setColumnsByStatus] = useState<Map<string, BoardCard[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const loadBoardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [tasksResult, featuresResult] = await Promise.all([
      adapter.getTasks({ projectId }),
      adapter.getFeatures({ projectId }),
    ]);

    if (!tasksResult.success) {
      setError(tasksResult.error);
      setLoading(false);
      return;
    }

    if (!featuresResult.success) {
      setError(featuresResult.error);
      setLoading(false);
      return;
    }

    const featureNameById = new Map(featuresResult.data.map((feature) => [feature.id, feature.name] as const));
    const grouped = new Map<string, BoardCard[]>();

    for (const status of BOARD_STATUS_ORDER) {
      grouped.set(status, []);
    }

    for (const task of tasksResult.data) {
      if (!grouped.has(task.status)) continue;

      const featureName = task.featureId ? featureNameById.get(task.featureId) ?? null : null;
      const boardTask: BoardTask = {
        ...task,
        featureName: featureName ?? undefined,
      };

      const card: BoardCard = {
        id: task.id,
        title: task.title,
        featureName,
        priority: task.priority,
        task: boardTask,
      };

      grouped.get(task.status)?.push(card);
    }

    setColumnsByStatus(grouped);
    setLoading(false);
  }, [adapter, projectId]);

  useEffect(() => {
    loadBoardData();
  }, [loadBoardData, refreshTrigger]);

  return {
    columnsByStatus,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for fetching a single task with its sections and dependencies.
 */
export function useTask(id: string) {
  const { adapter } = useAdapter();
  const [task, setTask] = useState<Task | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [dependencies, setDependencies] = useState<DependencyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTask = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [taskResult, sectionsResult, dependenciesResult] = await Promise.all([
      adapter.getTask(id),
      adapter.getSections('TASK' as EntityType, id),
      adapter.getDependencies(id),
    ]);

    if (taskResult.success) {
      setTask(taskResult.data);
    } else {
      setError(taskResult.error);
    }

    if (sectionsResult.success) {
      setSections(sectionsResult.data);
    } else if (!error) {
      setError(sectionsResult.error);
    }

    if (dependenciesResult.success) {
      setDependencies(dependenciesResult.data);
    } else if (!error) {
      setError(dependenciesResult.error);
    }

    setLoading(false);
  }, [adapter, id, error]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  return {
    task,
    sections,
    dependencies,
    loading,
    error,
    refresh: loadTask,
  };
}

/**
 * Hook for fetching a single feature with its tasks and sections.
 */
export function useFeature(id: string) {
  const { adapter } = useAdapter();
  const [feature, setFeature] = useState<FeatureWithTasks | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeature = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [featureResult, tasksResult, sectionsResult] = await Promise.all([
      adapter.getFeature(id),
      adapter.getTasks({ featureId: id }),
      adapter.getSections('FEATURE' as EntityType, id),
    ]);

    let loadError: string | null = null;

    if (featureResult.success && featureResult.data) {
      const featureWithTasks: FeatureWithTasks = {
        ...featureResult.data,
        tasks: tasksResult.success ? tasksResult.data : [],
      };
      setFeature(featureWithTasks);
    } else if (!featureResult.success) {
      loadError = featureResult.error;
    }

    if (sectionsResult.success) {
      setSections(sectionsResult.data);
    } else if (!loadError) {
      loadError = sectionsResult.error;
    }

    setError(loadError);
    setLoading(false);
  }, [adapter, id]);

  useEffect(() => {
    loadFeature();
  }, [loadFeature]);

  return {
    feature,
    tasks: feature?.tasks || [],
    sections,
    loading,
    error,
    refresh: loadFeature,
  };
}

/**
 * Hook for performing full-text search across all entities.
 */
export function useSearch(query: string) {
  const { adapter } = useAdapter();
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError(null);

      const result = await adapter.search(query);

      if (result.success) {
        setResults(result.data);
      } else {
        setError(result.error);
        setResults(null);
      }

      setLoading(false);
    };

    performSearch();
  }, [adapter, query]);

  return {
    results,
    loading,
    error,
  };
}
