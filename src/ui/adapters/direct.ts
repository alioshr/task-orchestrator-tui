/**
 * DirectAdapter - In-memory data adapter
 *
 * Implements DataAdapter by directly importing and calling repository functions.
 * This is used when the UI is running in the same process as the domain layer.
 *
 * v2 changes:
 * - Projects are stateless (no status)
 * - Status transitions via advance/revert/terminate
 * - Dependencies are field-based (blockedBy/relatedTo on entities)
 * - No separate dependencies repo
 */

import type {
  DataAdapter,
  Result,
  SearchParams,
  FeatureSearchParams,
  TaskSearchParams,
  WorkflowState,
  TransitionResult,
} from './types';
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

import * as projects from '@allpepper/task-orchestrator/src/repos/projects';
import * as features from '@allpepper/task-orchestrator/src/repos/features';
import * as tasks from '@allpepper/task-orchestrator/src/repos/tasks';
import * as sections from '@allpepper/task-orchestrator/src/repos/sections';
import {
  getAllowedTransitions,
  isValidTransition,
  type ContainerType,
} from '@allpepper/task-orchestrator/src/services/status-validator';
import {
  getWorkflowState as getWorkflowStateFn,
} from '@allpepper/task-orchestrator/src/services/workflow';
import {
  getNextState,
  getPrevState,
  getPipelinePosition,
  EXIT_STATE,
} from '@allpepper/task-orchestrator/src/config';
import { queryAll, queryOne, execute, now } from '@allpepper/task-orchestrator/src/repos/base';

/**
 * DirectAdapter implementation
 *
 * Wraps synchronous repo calls in Promise.resolve() since repos return sync Results.
 */
export class DirectAdapter implements DataAdapter {
  // ============================================================================
  // Projects (stateless in v2)
  // ============================================================================

  async getProjects(params?: SearchParams): Promise<Result<Project[]>> {
    return Promise.resolve(
      projects.searchProjects({
        query: params?.query,
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

    const overview: ProjectOverview = {
      project: {
        id: result.data.project.id,
        name: result.data.project.name,
        summary: result.data.project.summary,
      },
      taskCounts: result.data.taskCounts,
    };

    return Promise.resolve({ success: true, data: overview });
  }

  async createProject(params: {
    name: string;
    summary: string;
    description?: string;
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

  // ============================================================================
  // Pipeline Operations (v2)
  // ============================================================================

  async advance(
    containerType: 'task' | 'feature',
    id: string,
    version: number
  ): Promise<Result<TransitionResult>> {
    try {
      const entity = containerType === 'task'
        ? tasks.getTask(id)
        : features.getFeature(id);

      if (!entity.success) {
        return { success: false, error: entity.error, code: entity.code };
      }

      if (entity.data.version !== version) {
        return { success: false, error: `Version conflict: expected ${version}, found ${entity.data.version}`, code: 'CONFLICT' };
      }

      const currentStatus = entity.data.status;
      const nextState = getNextState(containerType, currentStatus);

      if (!nextState) {
        return { success: false, error: `Cannot advance: no next state from ${currentStatus}`, code: 'INVALID_OPERATION' };
      }

      // Check if blocked
      if ('blockedBy' in entity.data && entity.data.blockedBy.length > 0) {
        return { success: false, error: `Cannot advance: entity is blocked`, code: 'BLOCKED' };
      }

      const table = containerType === 'task' ? 'tasks' : 'features';
      const timestamp = now();
      execute(
        `UPDATE ${table} SET status = ?, version = version + 1, modified_at = ? WHERE id = ?`,
        [nextState, timestamp, id]
      );

      // Re-fetch entity
      const updated = containerType === 'task'
        ? tasks.getTask(id)
        : features.getFeature(id);

      if (!updated.success) {
        return { success: false, error: updated.error, code: updated.code };
      }

      return {
        success: true,
        data: {
          entity: updated.data,
          oldStatus: currentStatus,
          newStatus: nextState,
          pipelinePosition: getPipelinePosition(containerType, nextState),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async revert(
    containerType: 'task' | 'feature',
    id: string,
    version: number
  ): Promise<Result<TransitionResult>> {
    try {
      const entity = containerType === 'task'
        ? tasks.getTask(id)
        : features.getFeature(id);

      if (!entity.success) {
        return { success: false, error: entity.error, code: entity.code };
      }

      if (entity.data.version !== version) {
        return { success: false, error: `Version conflict: expected ${version}, found ${entity.data.version}`, code: 'CONFLICT' };
      }

      const currentStatus = entity.data.status;
      const prevState = getPrevState(containerType, currentStatus);

      if (!prevState) {
        return { success: false, error: `Cannot revert: no previous state from ${currentStatus}`, code: 'INVALID_OPERATION' };
      }

      const table = containerType === 'task' ? 'tasks' : 'features';
      const timestamp = now();
      execute(
        `UPDATE ${table} SET status = ?, version = version + 1, modified_at = ? WHERE id = ?`,
        [prevState, timestamp, id]
      );

      const updated = containerType === 'task'
        ? tasks.getTask(id)
        : features.getFeature(id);

      if (!updated.success) {
        return { success: false, error: updated.error, code: updated.code };
      }

      return {
        success: true,
        data: {
          entity: updated.data,
          oldStatus: currentStatus,
          newStatus: prevState,
          pipelinePosition: getPipelinePosition(containerType, prevState),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async terminate(
    containerType: 'task' | 'feature',
    id: string,
    version: number
  ): Promise<Result<TransitionResult>> {
    try {
      const entity = containerType === 'task'
        ? tasks.getTask(id)
        : features.getFeature(id);

      if (!entity.success) {
        return { success: false, error: entity.error, code: entity.code };
      }

      if (entity.data.version !== version) {
        return { success: false, error: `Version conflict: expected ${version}, found ${entity.data.version}`, code: 'CONFLICT' };
      }

      const currentStatus = entity.data.status;
      const table = containerType === 'task' ? 'tasks' : 'features';
      const timestamp = now();

      execute(
        `UPDATE ${table} SET status = ?, version = version + 1, modified_at = ? WHERE id = ?`,
        [EXIT_STATE, timestamp, id]
      );

      const updated = containerType === 'task'
        ? tasks.getTask(id)
        : features.getFeature(id);

      if (!updated.success) {
        return { success: false, error: updated.error, code: updated.code };
      }

      return {
        success: true,
        data: {
          entity: updated.data,
          oldStatus: currentStatus,
          newStatus: EXIT_STATE,
          pipelinePosition: null,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getWorkflowState(
    containerType: 'task' | 'feature',
    id: string
  ): Promise<Result<WorkflowState>> {
    try {
      const result = getWorkflowStateFn(containerType, id);
      if (!result.success) {
        return { success: false, error: result.error, code: result.code };
      }
      return { success: true, data: result.data as WorkflowState };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // Workflow
  // ============================================================================

  async getAllowedTransitions(
    containerType: string,
    status: string
  ): Promise<Result<string[]>> {
    try {
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
  // Sections
  // ============================================================================

  async getSections(
    entityType: EntityType,
    entityId: string
  ): Promise<Result<Section[]>> {
    return Promise.resolve(sections.getSections(entityId, entityType));
  }

  // ============================================================================
  // Dependencies (field-based in v2)
  // ============================================================================

  async getDependencies(taskId: string): Promise<Result<DependencyInfo>> {
    try {
      const taskResult = tasks.getTask(taskId);
      if (!taskResult.success) {
        return { success: false, error: taskResult.error, code: taskResult.code };
      }

      const task = taskResult.data;

      // blockedBy: fetch each task that blocks this one
      const blockedByTasks: Task[] = [];
      for (const blockerId of task.blockedBy) {
        const blockerResult = tasks.getTask(blockerId);
        if (blockerResult.success) {
          blockedByTasks.push(blockerResult.data);
        }
      }

      // blocks: find all tasks that have this task in their blockedBy
      const blocksTasks: Task[] = [];
      const blockedRows = queryAll<{ id: string; blocked_by: string }>(
        `SELECT id, blocked_by FROM tasks WHERE EXISTS (SELECT 1 FROM json_each(tasks.blocked_by) WHERE value = ?)`,
        [taskId]
      );
      for (const row of blockedRows) {
        const blockedTaskResult = tasks.getTask(row.id);
        if (blockedTaskResult.success) {
          blocksTasks.push(blockedTaskResult.data);
        }
      }

      const dependencyInfo: DependencyInfo = {
        blockedBy: blockedByTasks,
        blocks: blocksTasks,
      };

      return { success: true, data: dependencyInfo };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getBlockedTasks(params?: {
    projectId?: string;
  }): Promise<Result<Task[]>> {
    try {
      const conditions: string[] = ["blocked_by != '[]'"];
      const values: any[] = [];

      if (params?.projectId) {
        conditions.push('project_id = ?');
        values.push(params.projectId);
      }

      const sql = `SELECT * FROM tasks
        WHERE ${conditions.join(' AND ')}
        ORDER BY
          CASE priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END ASC,
          created_at ASC`;

      const rows = queryAll<any>(sql, values);

      // Convert rows to Task objects via getTask for proper mapping
      const blockedTasks: Task[] = [];
      for (const row of rows) {
        const taskResult = tasks.getTask(row.id);
        if (taskResult.success) {
          blockedTasks.push(taskResult.data);
        }
      }

      return { success: true, data: blockedTasks };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getNextTask(params?: {
    projectId?: string;
  }): Promise<Result<Task | null>> {
    try {
      const conditions: string[] = ["status = 'NEW'", "blocked_by = '[]'"];
      const values: any[] = [];

      if (params?.projectId) {
        conditions.push('project_id = ?');
        values.push(params.projectId);
      }

      const sql = `SELECT * FROM tasks
        WHERE ${conditions.join(' AND ')}
        ORDER BY
          CASE priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END ASC,
          complexity ASC,
          created_at ASC
        LIMIT 1`;

      const row = queryOne<any>(sql, values);

      if (!row) {
        return { success: true, data: null };
      }

      const taskResult = tasks.getTask(row.id);
      if (!taskResult.success) {
        return { success: true, data: null };
      }

      return { success: true, data: taskResult.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // Search
  // ============================================================================

  async search(query: string): Promise<Result<SearchResults>> {
    try {
      const projectsResult = projects.searchProjects({ query, limit: 10 });
      const featuresResult = features.searchFeatures({ query, limit: 10 });
      const tasksResult = tasks.searchTasks({ query, limit: 10 });

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
