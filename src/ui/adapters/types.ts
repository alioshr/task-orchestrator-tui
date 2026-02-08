/**
 * Data Adapter Interface
 *
 * Defines how the UI layer accesses data from the domain layer.
 * Implementations can be in-memory, HTTP-based, or other transport mechanisms.
 *
 * v2 changes:
 * - Projects are stateless (no status field)
 * - Status transitions via advance/revert/terminate instead of setStatus
 * - Blocking is field-based (blockedBy/blockedReason), not a status
 * - Dependencies are JSON fields on entities, not a separate table
 */

import type {
  Task,
  Feature,
  Project,
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
  status?: string;
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
 * Workflow state for a task or feature
 */
export interface WorkflowState {
  containerType: string;
  id: string;
  currentStatus: string;
  nextStatus: string | null;
  prevStatus: string | null;
  isTerminal: boolean;
  isBlocked: boolean;
  blockedBy: string[];
  blockedReason: string | null;
  pipelinePosition: string | null;
  relatedEntities: string[];
}

/**
 * Result from advance/revert operations
 */
export interface TransitionResult {
  entity: Task | Feature;
  oldStatus: string;
  newStatus: string;
  pipelinePosition: string | null;
}

/**
 * Data Adapter Interface
 *
 * Provides unified access to domain entities and operations.
 */
export interface DataAdapter {
  // ============================================================================
  // Projects (stateless in v2 - no status field)
  // ============================================================================

  getProjects(params?: SearchParams): Promise<Result<Project[]>>;
  getProject(id: string): Promise<Result<Project>>;
  getProjectOverview(id: string): Promise<Result<ProjectOverview>>;

  createProject(params: {
    name: string;
    summary: string;
    description?: string;
    tags?: string[];
  }): Promise<Result<Project>>;

  updateProject(
    id: string,
    params: {
      name?: string;
      summary?: string;
      description?: string;
      tags?: string[];
      version: number;
    }
  ): Promise<Result<Project>>;

  deleteProject(id: string, options?: { cascade?: boolean }): Promise<Result<boolean>>;

  // ============================================================================
  // Features
  // ============================================================================

  getFeatures(params?: FeatureSearchParams): Promise<Result<Feature[]>>;
  getFeature(id: string): Promise<Result<Feature>>;
  getFeatureOverview(id: string): Promise<Result<FeatureOverview>>;

  createFeature(params: {
    projectId?: string;
    name: string;
    summary: string;
    description?: string;
    priority: Priority;
    tags?: string[];
  }): Promise<Result<Feature>>;

  updateFeature(
    id: string,
    params: {
      name?: string;
      summary?: string;
      description?: string;
      priority?: Priority;
      projectId?: string;
      tags?: string[];
      version: number;
    }
  ): Promise<Result<Feature>>;

  deleteFeature(id: string, options?: { cascade?: boolean }): Promise<Result<boolean>>;

  // ============================================================================
  // Tasks
  // ============================================================================

  getTasks(params?: TaskSearchParams): Promise<Result<Task[]>>;
  getTask(id: string): Promise<Result<Task>>;

  createTask(params: {
    featureId?: string;
    title: string;
    summary: string;
    description?: string;
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

  // ============================================================================
  // Pipeline Operations (v2 - replaces setStatus)
  // ============================================================================

  /**
   * Advance a task or feature one step forward in its pipeline
   */
  advance(
    containerType: 'task' | 'feature',
    id: string,
    version: number
  ): Promise<Result<TransitionResult>>;

  /**
   * Revert a task or feature one step backward in its pipeline
   */
  revert(
    containerType: 'task' | 'feature',
    id: string,
    version: number
  ): Promise<Result<TransitionResult>>;

  /**
   * Terminate a task or feature (set to WILL_NOT_IMPLEMENT)
   */
  terminate(
    containerType: 'task' | 'feature',
    id: string,
    version: number
  ): Promise<Result<TransitionResult>>;

  /**
   * Get workflow state for a task or feature
   */
  getWorkflowState(
    containerType: 'task' | 'feature',
    id: string
  ): Promise<Result<WorkflowState>>;

  /**
   * Get allowed status transitions for a given container type and current status
   */
  getAllowedTransitions(
    containerType: string,
    status: string
  ): Promise<Result<string[]>>;

  // ============================================================================
  // Sections
  // ============================================================================

  getSections(
    entityType: EntityType,
    entityId: string
  ): Promise<Result<Section[]>>;

  // ============================================================================
  // Dependencies (field-based in v2)
  // ============================================================================

  /**
   * Get dependency information for a task (from blockedBy/relatedTo fields)
   */
  getDependencies(taskId: string): Promise<Result<DependencyInfo>>;

  /**
   * Get all blocked tasks (tasks with non-empty blockedBy)
   */
  getBlockedTasks(params?: { projectId?: string }): Promise<Result<Task[]>>;

  /**
   * Get the next actionable task (NEW, not blocked)
   */
  getNextTask(params?: { projectId?: string }): Promise<Result<Task | null>>;

  // ============================================================================
  // Search
  // ============================================================================

  search(query: string): Promise<Result<SearchResults>>;
}
