import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdapter } from '../context/adapter-context';
import type { Project, Task, Section, EntityType, TaskStatus, Priority, FeatureStatus } from 'task-orchestrator-bun/src/domain/types';
import type { FeatureWithTasks, ProjectOverview, SearchResults, DependencyInfo, BoardCard, BoardTask } from '../lib/types';
import type { TreeRow } from '../../tui/components/tree-view';

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
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
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
      if (task.status === 'COMPLETED') {
        counts.completed++;
      }
      countsByProject.set(task.projectId, counts);
    }
  }

  return countsByProject;
}

/**
 * Project with task count information for dashboard display
 */
export interface ProjectWithCounts extends Project {
  taskCounts: TaskCounts;
}

/**
 * Hook for fetching and managing the list of projects for the dashboard.
 * Includes task counts for each project.
 *
 * @returns Project list state with loading/error states and refresh function
 *
 * @example
 * ```tsx
 * const { projects, loading, error, refresh } = useProjects();
 * ```
 */
export function useProjects() {
  const { adapter } = useAdapter();
  const [projects, setProjects] = useState<ProjectWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Fetch projects and all tasks in parallel
    const [projectsResult, tasksResult] = await Promise.all([
      adapter.getProjects(),
      adapter.getTasks({ limit: 1000 }), // Get all tasks to count by project
    ]);

    if (!projectsResult.success) {
      setError(projectsResult.error);
      setLoading(false);
      return;
    }

    // Build task counts by project using shared utility
    const taskCountsByProject = tasksResult.success
      ? calculateTaskCountsByProject(tasksResult.data)
      : new Map<string, TaskCounts>();

    // Merge task counts into projects
    const projectsWithCounts: ProjectWithCounts[] = projectsResult.data.map(project => ({
      ...project,
      taskCounts: taskCountsByProject.get(project.id) || { total: 0, completed: 0 },
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
 *
 * @param id - The project ID
 * @returns Project and overview state with loading/error states and refresh function
 *
 * @example
 * ```tsx
 * const { project, overview, loading, error, refresh } = useProjectOverview('proj-123');
 * ```
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
      // Only set error if project fetch didn't already fail
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
 * Status order for grouping tasks - active statuses first, then terminal statuses
 */
const STATUS_ORDER: TaskStatus[] = [
  'PENDING' as TaskStatus,
  'IN_PROGRESS' as TaskStatus,
  'IN_REVIEW' as TaskStatus,
  'BLOCKED' as TaskStatus,
  'ON_HOLD' as TaskStatus,
  'COMPLETED' as TaskStatus,
  'CANCELLED' as TaskStatus,
];

/**
 * Priority order for sorting tasks within status groups
 */
const PRIORITY_ORDER: Record<Priority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const BOARD_STATUS_ORDER: TaskStatus[] = [
  'PENDING' as TaskStatus,
  'IN_PROGRESS' as TaskStatus,
  'IN_REVIEW' as TaskStatus,
  'BLOCKED' as TaskStatus,
  'COMPLETED' as TaskStatus,
];

/**
 * Display names for task statuses
 */
const STATUS_DISPLAY_NAMES: Record<string, string> = {
  BACKLOG: 'Backlog',
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  CHANGES_REQUESTED: 'Changes Requested',
  TESTING: 'Testing',
  READY_FOR_QA: 'Ready for QA',
  INVESTIGATING: 'Investigating',
  BLOCKED: 'Blocked',
  ON_HOLD: 'On Hold',
  DEPLOYED: 'Deployed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DEFERRED: 'Deferred',
  DRAFT: 'Draft',
  PLANNING: 'Planning',
  IN_DEVELOPMENT: 'In Development',
  VALIDATING: 'Validating',
  PENDING_REVIEW: 'Pending Review',
  ARCHIVED: 'Archived',
};

/**
 * Feature status order for grouping features by their own status
 */
const FEATURE_STATUS_ORDER: FeatureStatus[] = [
  'DRAFT' as FeatureStatus,
  'PLANNING' as FeatureStatus,
  'IN_DEVELOPMENT' as FeatureStatus,
  'TESTING' as FeatureStatus,
  'VALIDATING' as FeatureStatus,
  'PENDING_REVIEW' as FeatureStatus,
  'BLOCKED' as FeatureStatus,
  'ON_HOLD' as FeatureStatus,
  'DEPLOYED' as FeatureStatus,
  'COMPLETED' as FeatureStatus,
  'ARCHIVED' as FeatureStatus,
];

/**
 * Build status-grouped tree rows for tasks
 * Groups tasks by status, then by feature within each status
 *
 * @param tasks - All tasks to group
 * @param features - Features to lookup task feature info
 * @param expandedGroups - Set of expanded group IDs (both status groups and composite feature keys)
 * @returns TreeRow[] grouped by status → feature → tasks
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
  const tasksByStatus = new Map<TaskStatus, Task[]>();
  for (const task of tasks) {
    const status = task.status as TaskStatus;
    const group = tasksByStatus.get(status) || [];
    group.push(task);
    tasksByStatus.set(status, group);
  }

  const featureStatusToTaskStatus = (status: FeatureStatus): TaskStatus => {
    switch (status) {
      case 'COMPLETED':
      case 'DEPLOYED':
        return 'COMPLETED' as TaskStatus;
      case 'BLOCKED':
        return 'BLOCKED' as TaskStatus;
      case 'ON_HOLD':
        return 'ON_HOLD' as TaskStatus;
      case 'ARCHIVED':
        return 'CANCELLED' as TaskStatus;
      case 'PENDING_REVIEW':
        return 'IN_REVIEW' as TaskStatus;
      case 'IN_DEVELOPMENT':
      case 'TESTING':
      case 'VALIDATING':
        return 'IN_PROGRESS' as TaskStatus;
      case 'PLANNING':
      case 'DRAFT':
      default:
        return 'PENDING' as TaskStatus;
    }
  };

  // Only inject empty features into status buckets to avoid duplicate feature rows across statuses.
  const featureHasTasks = new Set<string>();
  for (const task of tasks) {
    if (task.featureId) {
      featureHasTasks.add(task.featureId);
    }
  }

  // Group features by their mapped status bucket
  const featuresByStatus = new Map<TaskStatus, FeatureWithTasks[]>();
  for (const feature of features) {
    if (featureHasTasks.has(feature.id)) {
      continue;
    }
    const mappedStatus = featureStatusToTaskStatus(feature.status as FeatureStatus);
    const group = featuresByStatus.get(mappedStatus) || [];
    group.push(feature);
    featuresByStatus.set(mappedStatus, group);
  }

  // Build rows in status order
  for (const status of STATUS_ORDER) {
    const statusTasks = tasksByStatus.get(status) || [];
    const statusFeatures = featuresByStatus.get(status) || [];
    if (statusTasks.length === 0 && statusFeatures.length === 0) continue;

    const statusGroupId = status;
    const statusExpanded = expandedGroups.has(statusGroupId);
    const statusExpandable = statusTasks.length > 0 || statusFeatures.length > 0;

    // Add status group row (depth 0)
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

    // If status group is expanded, group tasks by feature
    if (statusExpanded) {
      // Group tasks by featureId (with null for unassigned)
      const tasksByFeature = new Map<string | null, Task[]>();
      for (const task of statusTasks) {
        const featureId = task.featureId || null;
        const group = tasksByFeature.get(featureId) || [];
        group.push(task);
        tasksByFeature.set(featureId, group);
      }

      // Sort tasks within each feature by priority (descending) then title
      for (const [_, featureTasks] of tasksByFeature.entries()) {
        featureTasks.sort((a, b) => {
          const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.title.localeCompare(b.title);
        });
      }

      // Build feature sub-groups
      // First, collect features that have tasks in this status (sorted by creation date)
      const tasksByFeatureId = new Map<string, Task[]>();
      for (const [featureId, featureTasks] of tasksByFeature.entries()) {
        if (featureId !== null) {
          tasksByFeatureId.set(featureId, featureTasks);
        }
      }

      // Sort mapped features by creation date (ascending, oldest first), including empty features
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

      // Add feature sub-group rows
      for (const feature of sortedStatusFeatures) {
        const featureId = feature.id;
        const featureTasks = tasksByFeatureId.get(featureId) || [];
        const compositeFeatureId = `${status}:${featureId}`;
        const featureExpandable = featureTasks.length > 0;
        const featureExpanded = featureExpandable && expandedGroups.has(compositeFeatureId);

        // Add feature group row (depth 1)
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

        // Add task rows if feature is expanded (depth 1)
        if (featureExpanded) {
          featureTasks.forEach((task, index) => {
            const isLast = index === featureTasks.length - 1;
            rows.push({
              type: 'task',
              task,
              isLast,
              depth: 2,
              // No featureName needed - tasks are nested under their feature
            });
          });
        }
      }

      // Add unassigned tasks (if any)
      const unassignedTasks = tasksByFeature.get(null);
      if (unassignedTasks && unassignedTasks.length > 0) {
        const unassignedId = `${status}:unassigned`;
        const unassignedExpanded = expandedGroups.has(unassignedId);

        // Sort unassigned tasks by priority (descending) then title
        unassignedTasks.sort((a, b) => {
          const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.title.localeCompare(b.title);
        });

        // Add unassigned group row (depth 1)
        rows.push({
          type: 'group',
          id: unassignedId,
          label: 'Unassigned',
          status: status, // Use parent status for consistency
          taskCount: unassignedTasks.length,
          expanded: unassignedExpanded,
          depth: 1,
        });

        // Add task rows if unassigned group is expanded (depth 1)
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
 * Groups features by their feature status, then nests tasks within each feature
 *
 * @param features - All features with their tasks
 * @param expandedGroups - Set of expanded group IDs
 * @returns TreeRow[] grouped by feature status → feature → tasks
 */
function buildFeatureStatusGroupedRows(
  features: FeatureWithTasks[],
  expandedGroups: Set<string>
): TreeRow[] {
  const rows: TreeRow[] = [];

  // Group features by their status
  const featuresByStatus = new Map<string, FeatureWithTasks[]>();
  for (const feature of features) {
    const status = feature.status as string;
    const group = featuresByStatus.get(status) || [];
    group.push(feature);
    featuresByStatus.set(status, group);
  }

  // Build rows in feature status order
  for (const status of FEATURE_STATUS_ORDER) {
    const statusFeatures = featuresByStatus.get(status) || [];
    if (statusFeatures.length === 0) continue;

    const statusGroupId = `fs:${status}`;
    const statusExpanded = expandedGroups.has(statusGroupId);

    // Count total tasks across all features in this status
    const totalTasks = statusFeatures.reduce((sum, f) => sum + f.tasks.length, 0);

    // Add status group row (depth 0)
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
      // Sort features by creation date (oldest first)
      const sortedFeatures = [...statusFeatures].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      for (const feature of sortedFeatures) {
        const compositeFeatureId = `fs:${status}:${feature.id}`;
        const featureExpandable = feature.tasks.length > 0;
        const featureExpanded = featureExpandable && expandedGroups.has(compositeFeatureId);

        // Add feature group row (depth 1)
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

        // Add task rows if feature is expanded (depth 2)
        if (featureExpanded) {
          // Sort tasks by priority (descending) then title
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
 * Also includes unassigned tasks (tasks without a feature).
 *
 * @param projectId - The project ID
 * @returns Project, features with nested tasks, unassigned tasks, task counts, status-grouped rows, loading/error states, and refresh function
 *
 * @example
 * ```tsx
 * const { project, features, unassignedTasks, taskCounts, statusGroupedRows, loading, error, refresh } = useProjectTree('proj-123');
 * ```
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

    // Sort features by creation date ascending (oldest first)
    const sortedFeatures = [...allFeatures].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Build feature tree with nested tasks
    const featuresWithTasks: FeatureWithTasks[] = sortedFeatures.map((feature) => ({
      ...feature,
      tasks: tasks.filter((task) => task.featureId === feature.id),
    }));

    // Find unassigned tasks (no featureId)
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

  // Build status-grouped rows using useMemo to recalculate when data changes
  const statusGroupedRows = useMemo(() => {
    return buildStatusGroupedRows(allTasks, features, expandedGroups);
  }, [allTasks, features, expandedGroups]);

  // Build feature-status-grouped rows
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
 * Returns tasks grouped by status with feature labels for each card.
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
 *
 * @param id - The task ID
 * @returns Task, sections, dependencies, loading/error states, and refresh function
 *
 * @example
 * ```tsx
 * const { task, sections, dependencies, loading, error, refresh } = useTask('task-123');
 * ```
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
 *
 * @param id - The feature ID
 * @returns Feature, tasks, sections, loading/error states, and refresh function
 *
 * @example
 * ```tsx
 * const { feature, tasks, sections, loading, error, refresh } = useFeature('feat-123');
 * ```
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
 * Use with useDebounce to avoid excessive API calls.
 *
 * @param query - The search query string
 * @returns Search results with loading/error states
 *
 * @example
 * ```tsx
 * const [inputValue, setInputValue] = useState('');
 * const debouncedQuery = useDebounce(inputValue, 300);
 * const { results, loading, error } = useSearch(debouncedQuery);
 * ```
 */
export function useSearch(query: string) {
  const { adapter } = useAdapter();
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't search for empty queries
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
