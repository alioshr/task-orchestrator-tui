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
  Section,
  EntityType,
  Dependency,
  Priority,
} from 'task-orchestrator-bun/src/domain/types';

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

  /**
   * Update a task's status with optimistic concurrency control
   */
  setTaskStatus(
    id: string,
    status: TaskStatus,
    version: number
  ): Promise<Result<Task>>;

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
