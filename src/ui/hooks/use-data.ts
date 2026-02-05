import { useState, useEffect, useCallback } from 'react';
import { useAdapter } from '../context/adapter-context';
import type { Project, Task, Section, EntityType } from 'task-orchestrator-bun/src/domain/types';
import type { FeatureWithTasks, ProjectOverview, SearchResults, DependencyInfo } from '../lib/types';

/**
 * Hook for fetching and managing the list of projects for the dashboard.
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await adapter.getProjects();

    if (result.success) {
      setProjects(result.data);
    } else {
      setError(result.error);
    }

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
 * Hook for fetching a project tree with features and their tasks.
 * Also includes unassigned tasks (tasks without a feature).
 *
 * @param projectId - The project ID
 * @returns Features with nested tasks, unassigned tasks, loading/error states, and refresh function
 *
 * @example
 * ```tsx
 * const { features, unassignedTasks, loading, error, refresh } = useProjectTree('proj-123');
 * ```
 */
export function useProjectTree(projectId: string) {
  const { adapter } = useAdapter();
  const [features, setFeatures] = useState<FeatureWithTasks[]>([]);
  const [unassignedTasks, setUnassignedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjectTree = useCallback(async () => {
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

    const allFeatures = featuresResult.data;
    const allTasks = tasksResult.data;

    // Build feature tree with nested tasks
    const featuresWithTasks: FeatureWithTasks[] = allFeatures.map((feature) => ({
      ...feature,
      tasks: allTasks.filter((task) => task.featureId === feature.id),
    }));

    // Find unassigned tasks (no featureId)
    const unassigned = allTasks.filter((task) => !task.featureId);

    setFeatures(featuresWithTasks);
    setUnassignedTasks(unassigned);
    setLoading(false);
  }, [adapter, projectId]);

  useEffect(() => {
    loadProjectTree();
  }, [loadProjectTree]);

  return {
    features,
    unassignedTasks,
    loading,
    error,
    refresh: loadProjectTree,
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
