/**
 * DirectAdapter - In-memory data adapter
 *
 * Implements DataAdapter by directly importing and calling repository functions.
 * This is used when the UI is running in the same process as the domain layer.
 */

import type {
  DataAdapter,
  Result,
  SearchParams,
  FeatureSearchParams,
  TaskSearchParams,
} from './types';
import type {
  Task,
  Feature,
  Project,
  TaskStatus,
  ProjectStatus,
  FeatureStatus,
  Priority,
  Section,
  EntityType,
} from '@allpepper/task-orchestrator';
import type {
  SearchResults,
  DependencyInfo,
  ProjectOverview,
  FeatureOverview,
} from '../lib/types';

// Import repos individually since barrel export is incomplete
import * as projects from '@allpepper/task-orchestrator/src/repos/projects';
import * as features from '@allpepper/task-orchestrator/src/repos/features';
import * as tasks from '@allpepper/task-orchestrator/src/repos/tasks';
import * as sections from '@allpepper/task-orchestrator/src/repos/sections';
import * as dependencies from '@allpepper/task-orchestrator/src/repos/dependencies';
import {
  getAllowedTransitions,
  type ContainerType,
} from '@allpepper/task-orchestrator/src/services/status-validator';

/**
 * DirectAdapter implementation
 *
 * Wraps synchronous repo calls in Promise.resolve() since repos return sync Results.
 */
export class DirectAdapter implements DataAdapter {
  // ============================================================================
  // Projects
  // ============================================================================

  async getProjects(params?: SearchParams): Promise<Result<Project[]>> {
    return Promise.resolve(
      projects.searchProjects({
        query: params?.query,
        status: params?.status,
        tags: params?.tags?.join(','),
        limit: params?.limit,
        offset: params?.offset,
      })
    );
  }

  async getProject(id: string): Promise<Result<Project>> {
    return Promise.resolve(projects.getProject(id));
  }

  async getProjectOverview(id: string): Promise<Result<ProjectOverview>> {
    const result = projects.getProjectOverview(id);

    if (!result.success) {
      return Promise.resolve(result as Result<ProjectOverview>);
    }

    // Transform repo format to UI format
    const overview: ProjectOverview = {
      project: {
        id: result.data.project.id,
        name: result.data.project.name,
        summary: result.data.project.summary,
        status: result.data.project.status,
      },
      taskCounts: result.data.taskCounts,
    };

    return Promise.resolve({ success: true, data: overview });
  }

  async createProject(params: {
    name: string;
    summary: string;
    description?: string;
    status?: ProjectStatus;
    tags?: string[];
  }): Promise<Result<Project>> {
    return Promise.resolve(projects.createProject(params));
  }

  async updateProject(
    id: string,
    params: {
      name?: string;
      summary?: string;
      description?: string;
      status?: ProjectStatus;
      tags?: string[];
      version: number;
    }
  ): Promise<Result<Project>> {
    return Promise.resolve(projects.updateProject(id, params));
  }

  async deleteProject(id: string, options?: { cascade?: boolean }): Promise<Result<boolean>> {
    return Promise.resolve(projects.deleteProject(id, options));
  }

  // ============================================================================
  // Features
  // ============================================================================

  async getFeatures(params?: FeatureSearchParams): Promise<Result<Feature[]>> {
    return Promise.resolve(
      features.searchFeatures({
        query: params?.query,
        status: params?.status,
        priority: params?.priority,
        projectId: params?.projectId,
        tags: params?.tags?.join(','),
        limit: params?.limit,
        offset: params?.offset,
      })
    );
  }

  async getFeature(id: string): Promise<Result<Feature>> {
    return Promise.resolve(features.getFeature(id));
  }

  async getFeatureOverview(id: string): Promise<Result<FeatureOverview>> {
    const result = features.getFeatureOverview(id);

    if (!result.success) {
      return Promise.resolve(result as Result<FeatureOverview>);
    }

    // Transform repo format to UI format
    const overview: FeatureOverview = {
      feature: {
        id: result.data.feature.id,
        name: result.data.feature.name,
        summary: result.data.feature.summary,
        status: result.data.feature.status,
        priority: result.data.feature.priority,
      },
      taskCounts: result.data.taskCounts,
    };

    return Promise.resolve({ success: true, data: overview });
  }

  async createFeature(params: {
    projectId?: string;
    name: string;
    summary: string;
    description?: string;
    status?: FeatureStatus;
    priority: Priority;
    tags?: string[];
  }): Promise<Result<Feature>> {
    return Promise.resolve(features.createFeature(params));
  }

  async updateFeature(
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
  ): Promise<Result<Feature>> {
    return Promise.resolve(features.updateFeature(id, params));
  }

  async deleteFeature(id: string, options?: { cascade?: boolean }): Promise<Result<boolean>> {
    return Promise.resolve(features.deleteFeature(id, options));
  }

  // ============================================================================
  // Tasks
  // ============================================================================

  async getTasks(params?: TaskSearchParams): Promise<Result<Task[]>> {
    return Promise.resolve(
      tasks.searchTasks({
        query: params?.query,
        status: params?.status,
        priority: params?.priority,
        projectId: params?.projectId,
        featureId: params?.featureId,
        tags: params?.tags?.join(','),
        limit: params?.limit,
        offset: params?.offset,
      })
    );
  }

  async getTask(id: string): Promise<Result<Task>> {
    return Promise.resolve(tasks.getTask(id));
  }

  async createTask(params: {
    featureId?: string;
    title: string;
    summary: string;
    description?: string;
    status?: TaskStatus;
    priority: Priority;
    complexity: number;
    tags?: string[];
  }): Promise<Result<Task>> {
    return Promise.resolve(tasks.createTask(params));
  }

  async updateTask(
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
  ): Promise<Result<Task>> {
    return Promise.resolve(tasks.updateTask(id, params));
  }

  async deleteTask(id: string): Promise<Result<boolean>> {
    return Promise.resolve(tasks.deleteTask(id));
  }

  async setTaskStatus(
    id: string,
    status: TaskStatus,
    version: number
  ): Promise<Result<Task>> {
    return Promise.resolve(tasks.setTaskStatus(id, status, version));
  }

  async setProjectStatus(
    id: string,
    status: ProjectStatus,
    version: number
  ): Promise<Result<Project>> {
    return Promise.resolve(projects.updateProject(id, { status, version }));
  }

  async setFeatureStatus(
    id: string,
    status: FeatureStatus,
    version: number
  ): Promise<Result<Feature>> {
    return Promise.resolve(features.updateFeature(id, { status, version }));
  }

  // ============================================================================
  // Sections
  // ============================================================================

  async getSections(
    entityType: EntityType,
    entityId: string
  ): Promise<Result<Section[]>> {
    return Promise.resolve(sections.getSections(entityId, entityType));
  }

  // ============================================================================
  // Dependencies
  // ============================================================================

  async getDependencies(taskId: string): Promise<Result<DependencyInfo>> {
    const result = dependencies.getDependencies(taskId, 'both');

    if (!result.success) {
      return Promise.resolve(result as Result<DependencyInfo>);
    }

    // Transform to DependencyInfo format
    // Dependencies returned have fromTaskId and toTaskId
    // - If fromTaskId === taskId, it's a dependency this task creates (blocks something)
    // - If toTaskId === taskId, it's a dependency blocking this task (blocked by)

    const deps = result.data;
    const blockedByTaskIds = deps
      .filter((d) => d.toTaskId === taskId && d.type === 'BLOCKS')
      .map((d) => d.fromTaskId);
    const blocksTaskIds = deps
      .filter((d) => d.fromTaskId === taskId && d.type === 'BLOCKS')
      .map((d) => d.toTaskId);

    // Fetch the actual task objects
    const blockedByTasks: Task[] = [];
    for (const id of blockedByTaskIds) {
      const taskResult = tasks.getTask(id);
      if (taskResult.success) {
        blockedByTasks.push(taskResult.data);
      }
    }

    const blocksTasks: Task[] = [];
    for (const id of blocksTaskIds) {
      const taskResult = tasks.getTask(id);
      if (taskResult.success) {
        blocksTasks.push(taskResult.data);
      }
    }

    const dependencyInfo: DependencyInfo = {
      blockedBy: blockedByTasks,
      blocks: blocksTasks,
    };

    return Promise.resolve({ success: true, data: dependencyInfo });
  }

  async getBlockedTasks(params?: {
    projectId?: string;
  }): Promise<Result<Task[]>> {
    return Promise.resolve(
      dependencies.getBlockedTasks({
        projectId: params?.projectId,
      })
    );
  }

  async getNextTask(params?: {
    projectId?: string;
  }): Promise<Result<Task | null>> {
    return Promise.resolve(
      dependencies.getNextTask({
        projectId: params?.projectId,
      })
    );
  }

  // ============================================================================
  // Workflow
  // ============================================================================

  async getAllowedTransitions(
    containerType: string,
    status: string
  ): Promise<Result<string[]>> {
    try {
      // getAllowedTransitions returns string[] directly, not a Result
      const transitions = getAllowedTransitions(
        containerType as ContainerType,
        status
      );
      return Promise.resolve({ success: true, data: transitions });
    } catch (error) {
      return Promise.resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ============================================================================
  // Search
  // ============================================================================

  async search(query: string): Promise<Result<SearchResults>> {
    try {
      // Search across all entity types
      const projectsResult = projects.searchProjects({ query, limit: 10 });
      const featuresResult = features.searchFeatures({ query, limit: 10 });
      const tasksResult = tasks.searchTasks({ query, limit: 10 });

      // Build search results
      const results: SearchResults = {
        projects: projectsResult.success
          ? projectsResult.data.map((p) => ({
              id: p.id,
              name: p.name,
              summary: p.summary,
            }))
          : [],
        features: featuresResult.success
          ? featuresResult.data.map((f) => ({
              id: f.id,
              name: f.name,
              summary: f.summary,
              projectId: f.projectId,
            }))
          : [],
        tasks: tasksResult.success
          ? tasksResult.data.map((t) => ({
              id: t.id,
              title: t.title,
              summary: t.summary,
              projectId: t.projectId,
              featureId: t.featureId,
            }))
          : [],
      };

      return Promise.resolve({ success: true, data: results });
    } catch (error) {
      return Promise.resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
