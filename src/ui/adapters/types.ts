/**
 * Data Adapter Interface
 *
 * Defines how the UI layer accesses data from the domain layer.
 * Implementations can be in-memory, HTTP-based, or other transport mechanisms.
 */

import type {
  Task,
  Feature,
  Project,
  TaskStatus,
  ProjectStatus,
  FeatureStatus,
  Section,
  EntityType,
  Priority,
} from '@allpepper/task-orchestrator';

import type {
  SearchResults,
  DependencyInfo,
  ProjectOverview,
  FeatureOverview,
} from '../lib/types';

/**
 * Result type for adapter operations
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Base search parameters
 */
export interface SearchParams {
  query?: string;
  status?: TaskStatus;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Feature-specific search parameters
 */
export interface FeatureSearchParams extends SearchParams {
  projectId?: string;
  priority?: Priority;
}

/**
 * Task-specific search parameters
 */
export interface TaskSearchParams extends FeatureSearchParams {
  featureId?: string;
}

/**
 * Data Adapter Interface
 *
 * Provides unified access to domain entities and operations.
 */
export interface DataAdapter {
  // ============================================================================
  // Projects
  // ============================================================================

  /**
   * Get all projects matching the search parameters
   */
  getProjects(params?: SearchParams): Promise<Result<Project[]>>;

  /**
   * Get a single project by ID
   */
  getProject(id: string): Promise<Result<Project>>;

  /**
   * Get project overview with aggregated statistics
   */
  getProjectOverview(id: string): Promise<Result<ProjectOverview>>;

  createProject(params: {
    name: string;
    summary: string;
    description?: string;
    status?: ProjectStatus;
    tags?: string[];
  }): Promise<Result<Project>>;

  updateProject(
    id: string,
    params: {
      name?: string;
      summary?: string;
      description?: string;
      status?: ProjectStatus;
      tags?: string[];
      version: number;
    }
  ): Promise<Result<Project>>;

  deleteProject(id: string): Promise<Result<boolean>>;

  // ============================================================================
  // Features
  // ============================================================================

  /**
   * Get all features matching the search parameters
   */
  getFeatures(params?: FeatureSearchParams): Promise<Result<Feature[]>>;

  /**
   * Get a single feature by ID
   */
  getFeature(id: string): Promise<Result<Feature>>;

  /**
   * Get feature overview with aggregated statistics
   */
  getFeatureOverview(id: string): Promise<Result<FeatureOverview>>;

  createFeature(params: {
    projectId?: string;
    name: string;
    summary: string;
    description?: string;
    status?: FeatureStatus;
    priority: Priority;
    tags?: string[];
  }): Promise<Result<Feature>>;

  updateFeature(
    id: string,
    params: {
      name?: string;
      summary?: string;
      description?: string;
      status?: FeatureStatus;
      priority?: Priority;
      projectId?: string;
      tags?: string[];
      version: number;
    }
  ): Promise<Result<Feature>>;

  deleteFeature(id: string): Promise<Result<boolean>>;

  // ============================================================================
  // Tasks
  // ============================================================================

  /**
   * Get all tasks matching the search parameters
   */
  getTasks(params?: TaskSearchParams): Promise<Result<Task[]>>;

  /**
   * Get a single task by ID
   */
  getTask(id: string): Promise<Result<Task>>;

  createTask(params: {
    projectId?: string;
    featureId?: string;
    title: string;
    summary: string;
    description?: string;
    status?: TaskStatus;
    priority: Priority;
    complexity: number;
    tags?: string[];
  }): Promise<Result<Task>>;

  updateTask(
    id: string,
    params: {
      title?: string;
      summary?: string;
      description?: string;
      status?: TaskStatus;
      priority?: Priority;
      complexity?: number;
      projectId?: string;
      featureId?: string;
      lastModifiedBy?: string;
      tags?: string[];
      version: number;
    }
  ): Promise<Result<Task>>;

  deleteTask(id: string): Promise<Result<boolean>>;

  /**
   * Update a task's status with optimistic concurrency control
   */
  setTaskStatus(
    id: string,
    status: TaskStatus,
    version: number
  ): Promise<Result<Task>>;

  setProjectStatus(
    id: string,
    status: ProjectStatus,
    version: number
  ): Promise<Result<Project>>;

  setFeatureStatus(
    id: string,
    status: FeatureStatus,
    version: number
  ): Promise<Result<Feature>>;

  // ============================================================================
  // Sections
  // ============================================================================

  /**
   * Get all sections for a given entity (project, feature, or task)
   */
  getSections(
    entityType: EntityType,
    entityId: string
  ): Promise<Result<Section[]>>;

  // ============================================================================
  // Dependencies
  // ============================================================================

  /**
   * Get dependency information for a task (blockers and blocked tasks)
   */
  getDependencies(taskId: string): Promise<Result<DependencyInfo>>;

  /**
   * Get all blocked tasks, optionally filtered by project
   */
  getBlockedTasks(params?: { projectId?: string }): Promise<Result<Task[]>>;

  /**
   * Get the next actionable task (no blockers, not completed)
   */
  getNextTask(params?: { projectId?: string }): Promise<Result<Task | null>>;

  // ============================================================================
  // Workflow
  // ============================================================================

  /**
   * Get allowed status transitions for a given container type and current status
   */
  getAllowedTransitions(
    containerType: string,
    status: string
  ): Promise<Result<string[]>>;

  // ============================================================================
  // Search
  // ============================================================================

  /**
   * Full-text search across all entities
   */
  search(query: string): Promise<Result<SearchResults>>;
}
