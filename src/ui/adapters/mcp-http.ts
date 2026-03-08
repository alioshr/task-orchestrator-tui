import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

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

interface OrchestratorToolResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface ToolLink {
  type?: string;
  fromId?: string;
  toId?: string;
}

interface ToolDependencyPayload {
  dependencies?: ToolLink[];
  dependents?: ToolLink[];
}

interface ToolCallResult {
  content?: Array<{ type?: string; text?: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}

const EXIT_STATE = 'WILL_NOT_IMPLEMENT';
const DATE_FIELDS = new Set(['createdAt', 'modifiedAt']);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function reviveDates(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reviveDates);
  }

  if (!isObject(value)) {
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const [key, current] of Object.entries(value)) {
    if (DATE_FIELDS.has(key) && typeof current === 'string') {
      const parsed = new Date(current);
      output[key] = Number.isNaN(parsed.getTime()) ? current : parsed;
      continue;
    }
    output[key] = reviveDates(current);
  }

  return output;
}

/**
 * MCP HTTP adapter for the TUI data layer.
 *
 * This adapter delegates all data operations to task-orchestrator MCP tools
 * over Streamable HTTP, keeping the UI transport-agnostic.
 */
export class McpHttpAdapter implements DataAdapter {
  private readonly url: string;
  private readonly clientName: string;
  private readonly clientVersion: string;
  private clientPromise?: Promise<Client>;
  private transport?: StreamableHTTPClientTransport;

  constructor(options?: {
    url?: string;
    clientName?: string;
    clientVersion?: string;
  }) {
    this.url = options?.url ?? 'http://127.0.0.1:6100/mcp';
    this.clientName = options?.clientName ?? 'task-orchestrator-tui';
    this.clientVersion = options?.clientVersion ?? '3.1.0';
  }

  private toTagsParam(tags?: string[]): string | undefined {
    if (!tags || tags.length === 0) return undefined;
    return tags.join(',');
  }

  private extractItems<T>(data: unknown): T[] {
    if (!isObject(data)) return [];
    const items = data.items;
    return Array.isArray(items) ? (items as T[]) : [];
  }

  private extractNamed<T>(data: unknown, key: string): T | null {
    if (!isObject(data)) return null;
    const value = data[key];
    return value !== undefined ? (value as T) : null;
  }

  private extractTextFromToolResult(result: ToolCallResult): string | null {
    if (!Array.isArray(result.content)) return null;
    const textPart = result.content.find(
      (part) => part.type === 'text' && typeof part.text === 'string'
    );
    return textPart?.text ?? null;
  }

  private parseToolEnvelope<T>(
    raw: unknown,
    toolName: string
  ): Result<OrchestratorToolResponse<T>> {
    if (!isObject(raw) || typeof raw.success !== 'boolean') {
      return {
        success: false,
        error: `Invalid response format from MCP tool ${toolName}`,
      };
    }

    const envelope: OrchestratorToolResponse<T> = {
      success: raw.success,
      message: typeof raw.message === 'string' ? raw.message : '',
      data: raw.data as T | undefined,
      error: typeof raw.error === 'string' ? raw.error : undefined,
    };

    if (!envelope.success) {
      return {
        success: false,
        error: envelope.error || envelope.message || `MCP tool ${toolName} failed`,
      };
    }

    return { success: true, data: envelope };
  }

  private async getClient(): Promise<Client> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const client = new Client(
          { name: this.clientName, version: this.clientVersion },
          { capabilities: {} }
        );
        const transport = new StreamableHTTPClientTransport(new URL(this.url));
        this.transport = transport;
        await client.connect(transport);
        return client;
      })();
    }

    try {
      return await this.clientPromise;
    } catch (error) {
      this.clientPromise = undefined;
      this.transport = undefined;
      throw error;
    }
  }

  private async callTool<T>(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<Result<T>> {
    try {
      const client = await this.getClient();
      const result = (await client.callTool({
        name: toolName,
        arguments: args,
      })) as ToolCallResult;

      if (result.isError) {
        const text = this.extractTextFromToolResult(result);
        return {
          success: false,
          error: text || `MCP tool ${toolName} returned an error`,
        };
      }

      const structuredEnvelope = this.parseToolEnvelope<T>(
        result.structuredContent,
        toolName
      );
      if (structuredEnvelope.success) {
        return {
          success: true,
          data: reviveDates(structuredEnvelope.data.data) as T,
        };
      }

      const text = this.extractTextFromToolResult(result);
      if (!text) {
        return {
          success: false,
          error: `MCP tool ${toolName} returned no text payload`,
        };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return {
          success: false,
          error: `MCP tool ${toolName} returned non-JSON payload`,
        };
      }

      const parsedEnvelope = this.parseToolEnvelope<T>(parsed, toolName);
      if (!parsedEnvelope.success) {
        return parsedEnvelope;
      }

      return {
        success: true,
        data: reviveDates(parsedEnvelope.data.data) as T,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown MCP client error',
      };
    }
  }

  private async fetchTasksByIds(ids: string[]): Promise<Task[]> {
    const unique = uniqueIds(ids);
    if (unique.length === 0) return [];

    const taskResults = await Promise.all(unique.map((id) => this.getTask(id)));
    return taskResults
      .filter((result): result is { success: true; data: Task } => result.success)
      .map((result) => result.data);
  }

  // ============================================================================
  // Projects
  // ============================================================================

  async getProjects(params?: SearchParams): Promise<Result<Project[]>> {
    const result = await this.callTool<{ items?: Project[] }>('query_container', {
      operation: 'search',
      containerType: 'project',
      query: params?.query,
      tags: this.toTagsParam(params?.tags),
      limit: params?.limit,
      offset: params?.offset,
    });

    if (!result.success) return result;
    return { success: true, data: this.extractItems<Project>(result.data) };
  }

  async getProject(id: string): Promise<Result<Project>> {
    const result = await this.callTool<Record<string, unknown>>('query_container', {
      operation: 'get',
      containerType: 'project',
      id,
    });

    if (!result.success) return result as Result<Project>;

    const project = this.extractNamed<Project>(result.data, 'project');
    if (!project) {
      return { success: false, error: 'Project payload missing from MCP response' };
    }

    return { success: true, data: project };
  }

  async getProjectOverview(id: string): Promise<Result<ProjectOverview>> {
    const result = await this.callTool<Record<string, unknown>>('query_container', {
      operation: 'get',
      containerType: 'project',
      id,
    });

    if (!result.success) return result as Result<ProjectOverview>;

    const project = this.extractNamed<Project>(result.data, 'project');
    if (!project) {
      return { success: false, error: 'Project payload missing from MCP response' };
    }

    const taskCounts = this.extractNamed<ProjectOverview['taskCounts']>(
      result.data,
      'taskCounts'
    ) ?? { total: 0, byStatus: {} };

    return {
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          summary: project.summary,
        },
        taskCounts,
      },
    };
  }

  async createProject(params: {
    name: string;
    summary: string;
    description?: string;
    tags?: string[];
  }): Promise<Result<Project>> {
    const result = await this.callTool<Record<string, unknown>>('manage_container', {
      operation: 'create',
      containerType: 'project',
      name: params.name,
      summary: params.summary,
      description: params.description,
      tags: this.toTagsParam(params.tags),
    });

    if (!result.success) return result as Result<Project>;

    const project = this.extractNamed<Project>(result.data, 'project');
    if (!project) {
      return { success: false, error: 'Project payload missing from MCP response' };
    }

    return { success: true, data: project };
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
    const result = await this.callTool<Record<string, unknown>>('manage_container', {
      operation: 'update',
      containerType: 'project',
      id,
      name: params.name,
      summary: params.summary,
      description: params.description,
      tags: this.toTagsParam(params.tags),
      version: params.version,
    });

    if (!result.success) return result as Result<Project>;

    const project = this.extractNamed<Project>(result.data, 'project');
    if (!project) {
      return { success: false, error: 'Project payload missing from MCP response' };
    }

    return { success: true, data: project };
  }

  async deleteProject(
    id: string,
    options?: { cascade?: boolean }
  ): Promise<Result<boolean>> {
    const result = await this.callTool<Record<string, unknown>>('manage_container', {
      operation: 'delete',
      containerType: 'project',
      id,
      cascade: options?.cascade,
    });

    if (!result.success) return result as Result<boolean>;

    if (isObject(result.data) && typeof result.data.deleted === 'boolean') {
      return { success: true, data: result.data.deleted };
    }

    return { success: true, data: true };
  }

  // ============================================================================
  // Features
  // ============================================================================

  async getFeatures(params?: FeatureSearchParams): Promise<Result<Feature[]>> {
    const result = await this.callTool<{ items?: Feature[] }>('query_container', {
      operation: 'search',
      containerType: 'feature',
      query: params?.query,
      status: params?.status,
      priority: params?.priority,
      projectId: params?.projectId,
      tags: this.toTagsParam(params?.tags),
      limit: params?.limit,
      offset: params?.offset,
    });

    if (!result.success) return result;
    return { success: true, data: this.extractItems<Feature>(result.data) };
  }

  async getFeature(id: string): Promise<Result<Feature>> {
    const result = await this.callTool<Record<string, unknown>>('query_container', {
      operation: 'get',
      containerType: 'feature',
      id,
    });

    if (!result.success) return result as Result<Feature>;

    const feature = this.extractNamed<Feature>(result.data, 'feature');
    if (!feature) {
      return { success: false, error: 'Feature payload missing from MCP response' };
    }

    return { success: true, data: feature };
  }

  async getFeatureOverview(id: string): Promise<Result<FeatureOverview>> {
    const result = await this.callTool<Record<string, unknown>>('query_container', {
      operation: 'get',
      containerType: 'feature',
      id,
    });

    if (!result.success) return result as Result<FeatureOverview>;

    const feature = this.extractNamed<Feature>(result.data, 'feature');
    if (!feature) {
      return { success: false, error: 'Feature payload missing from MCP response' };
    }

    const taskCounts = this.extractNamed<FeatureOverview['taskCounts']>(
      result.data,
      'taskCounts'
    ) ?? { total: 0, byStatus: {} };

    return {
      success: true,
      data: {
        feature: {
          id: feature.id,
          name: feature.name,
          summary: feature.summary,
          status: feature.status,
          priority: feature.priority,
        },
        taskCounts,
      },
    };
  }

  async createFeature(params: {
    projectId?: string;
    name: string;
    summary: string;
    description?: string;
    priority: Priority;
    tags?: string[];
  }): Promise<Result<Feature>> {
    const result = await this.callTool<Record<string, unknown>>('manage_container', {
      operation: 'create',
      containerType: 'feature',
      projectId: params.projectId,
      name: params.name,
      summary: params.summary,
      description: params.description,
      priority: params.priority,
      tags: this.toTagsParam(params.tags),
    });

    if (!result.success) return result as Result<Feature>;

    const feature = this.extractNamed<Feature>(result.data, 'feature');
    if (!feature) {
      return { success: false, error: 'Feature payload missing from MCP response' };
    }

    return { success: true, data: feature };
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
    const result = await this.callTool<Record<string, unknown>>('manage_container', {
      operation: 'update',
      containerType: 'feature',
      id,
      name: params.name,
      summary: params.summary,
      description: params.description,
      priority: params.priority,
      projectId: params.projectId,
      tags: this.toTagsParam(params.tags),
      version: params.version,
    });

    if (!result.success) return result as Result<Feature>;

    const feature = this.extractNamed<Feature>(result.data, 'feature');
    if (!feature) {
      return { success: false, error: 'Feature payload missing from MCP response' };
    }

    return { success: true, data: feature };
  }

  async deleteFeature(
    id: string,
    options?: { cascade?: boolean }
  ): Promise<Result<boolean>> {
    const result = await this.callTool<Record<string, unknown>>('manage_container', {
      operation: 'delete',
      containerType: 'feature',
      id,
      cascade: options?.cascade,
    });

    if (!result.success) return result as Result<boolean>;

    if (isObject(result.data) && typeof result.data.deleted === 'boolean') {
      return { success: true, data: result.data.deleted };
    }

    return { success: true, data: true };
  }

  // ============================================================================
  // Tasks
  // ============================================================================

  async getTasks(params?: TaskSearchParams): Promise<Result<Task[]>> {
    const result = await this.callTool<{ items?: Task[] }>('query_container', {
      operation: 'search',
      containerType: 'task',
      query: params?.query,
      status: params?.status,
      priority: params?.priority,
      projectId: params?.projectId,
      featureId: params?.featureId,
      tags: this.toTagsParam(params?.tags),
      limit: params?.limit,
      offset: params?.offset,
    });

    if (!result.success) return result;
    return { success: true, data: this.extractItems<Task>(result.data) };
  }

  async getTask(id: string): Promise<Result<Task>> {
    const result = await this.callTool<Record<string, unknown>>('query_container', {
      operation: 'get',
      containerType: 'task',
      id,
    });

    if (!result.success) return result as Result<Task>;

    const task = this.extractNamed<Task>(result.data, 'task');
    if (!task) {
      return { success: false, error: 'Task payload missing from MCP response' };
    }

    return { success: true, data: task };
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
    const result = await this.callTool<Record<string, unknown>>('manage_container', {
      operation: 'create',
      containerType: 'task',
      featureId: params.featureId,
      title: params.title,
      summary: params.summary,
      description: params.description,
      priority: params.priority,
      complexity: params.complexity,
      tags: this.toTagsParam(params.tags),
    });

    if (!result.success) return result as Result<Task>;

    const task = this.extractNamed<Task>(result.data, 'task');
    if (!task) {
      return { success: false, error: 'Task payload missing from MCP response' };
    }

    return { success: true, data: task };
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
    const result = await this.callTool<Record<string, unknown>>('manage_container', {
      operation: 'update',
      containerType: 'task',
      id,
      title: params.title,
      summary: params.summary,
      description: params.description,
      priority: params.priority,
      complexity: params.complexity,
      projectId: params.projectId,
      featureId: params.featureId,
      tags: this.toTagsParam(params.tags),
      version: params.version,
    });

    if (!result.success) return result as Result<Task>;

    const task = this.extractNamed<Task>(result.data, 'task');
    if (!task) {
      return { success: false, error: 'Task payload missing from MCP response' };
    }

    return { success: true, data: task };
  }

  async deleteTask(id: string): Promise<Result<boolean>> {
    const result = await this.callTool<Record<string, unknown>>('manage_container', {
      operation: 'delete',
      containerType: 'task',
      id,
    });

    if (!result.success) return result as Result<boolean>;

    if (isObject(result.data) && typeof result.data.deleted === 'boolean') {
      return { success: true, data: result.data.deleted };
    }

    return { success: true, data: true };
  }

  // ============================================================================
  // Pipeline Operations
  // ============================================================================

  async advance(
    containerType: 'task' | 'feature',
    id: string,
    version: number
  ): Promise<Result<TransitionResult>> {
    const transitionResult = await this.callTool<Record<string, unknown>>('advance', {
      containerType,
      id,
      version,
    });

    if (!transitionResult.success) {
      return transitionResult as Result<TransitionResult>;
    }

    const entityResult =
      containerType === 'task' ? await this.getTask(id) : await this.getFeature(id);
    if (!entityResult.success) {
      return {
        success: false,
        error: entityResult.error,
      };
    }

    const transition = this.extractNamed<{ from?: string; to?: string }>(
      transitionResult.data,
      'transition'
    );
    const pipelinePositionRaw = isObject(transitionResult.data)
      ? transitionResult.data.pipelinePosition
      : undefined;

    return {
      success: true,
      data: {
        entity: entityResult.data,
        oldStatus: transition?.from ?? 'UNKNOWN',
        newStatus:
          transition?.to ??
          ('status' in entityResult.data ? String(entityResult.data.status) : 'UNKNOWN'),
        pipelinePosition:
          typeof pipelinePositionRaw === 'string' ? pipelinePositionRaw : null,
      },
    };
  }

  async revert(
    containerType: 'task' | 'feature',
    id: string,
    version: number
  ): Promise<Result<TransitionResult>> {
    const transitionResult = await this.callTool<Record<string, unknown>>('revert', {
      containerType,
      id,
      version,
    });

    if (!transitionResult.success) {
      return transitionResult as Result<TransitionResult>;
    }

    const entityResult =
      containerType === 'task' ? await this.getTask(id) : await this.getFeature(id);
    if (!entityResult.success) {
      return {
        success: false,
        error: entityResult.error,
      };
    }

    const transition = this.extractNamed<{ from?: string; to?: string }>(
      transitionResult.data,
      'transition'
    );
    const pipelinePositionRaw = isObject(transitionResult.data)
      ? transitionResult.data.pipelinePosition
      : undefined;

    return {
      success: true,
      data: {
        entity: entityResult.data,
        oldStatus: transition?.from ?? 'UNKNOWN',
        newStatus:
          transition?.to ??
          ('status' in entityResult.data ? String(entityResult.data.status) : 'UNKNOWN'),
        pipelinePosition:
          typeof pipelinePositionRaw === 'string' ? pipelinePositionRaw : null,
      },
    };
  }

  async terminate(
    containerType: 'task' | 'feature',
    id: string,
    version: number
  ): Promise<Result<TransitionResult>> {
    const transitionResult = await this.callTool<Record<string, unknown>>('terminate', {
      containerType,
      id,
      version,
    });

    if (!transitionResult.success) {
      return transitionResult as Result<TransitionResult>;
    }

    const entityResult =
      containerType === 'task' ? await this.getTask(id) : await this.getFeature(id);
    if (!entityResult.success) {
      return {
        success: false,
        error: entityResult.error,
      };
    }

    const transition = this.extractNamed<{ from?: string; to?: string }>(
      transitionResult.data,
      'transition'
    );
    const pipelinePositionRaw = isObject(transitionResult.data)
      ? transitionResult.data.pipelinePosition
      : undefined;

    return {
      success: true,
      data: {
        entity: entityResult.data,
        oldStatus: transition?.from ?? 'UNKNOWN',
        newStatus:
          transition?.to ??
          ('status' in entityResult.data ? String(entityResult.data.status) : EXIT_STATE),
        pipelinePosition:
          typeof pipelinePositionRaw === 'string' ? pipelinePositionRaw : null,
      },
    };
  }

  async getWorkflowState(
    containerType: 'task' | 'feature',
    id: string
  ): Promise<Result<WorkflowState>> {
    const result = await this.callTool<WorkflowState>('query_workflow_state', {
      containerType,
      id,
    });

    if (!result.success) return result;
    return { success: true, data: result.data };
  }

  async getAllowedTransitions(
    containerType: string,
    status: string
  ): Promise<Result<string[]>> {
    if (containerType !== 'task' && containerType !== 'feature') {
      return { success: true, data: [] };
    }

    const normalized = status.toUpperCase();
    if (normalized === 'CLOSED' || normalized === EXIT_STATE) {
      return { success: true, data: [] };
    }

    const pipeline =
      containerType === 'task'
        ? ['NEW', 'ACTIVE', 'TO_BE_TESTED', 'READY_TO_PROD', 'CLOSED']
        : ['NEW', 'ACTIVE', 'READY_TO_PROD', 'CLOSED'];

    const index = pipeline.indexOf(normalized);
    if (index === -1) {
      return { success: true, data: [] };
    }

    const transitions: string[] = [];
    const next = pipeline[index + 1];
    const prev = pipeline[index - 1];

    if (next) transitions.push(next);
    if (prev) transitions.push(prev);
    transitions.push(EXIT_STATE);

    return { success: true, data: transitions };
  }

  // ============================================================================
  // Sections
  // ============================================================================

  async getSections(
    entityType: EntityType,
    entityId: string
  ): Promise<Result<Section[]>> {
    const result = await this.callTool<Section[]>('query_sections', {
      entityType,
      entityId,
      includeContent: true,
    });

    if (!result.success) return result as Result<Section[]>;

    return {
      success: true,
      data: Array.isArray(result.data) ? result.data : [],
    };
  }

  // ============================================================================
  // Dependencies
  // ============================================================================

  async getDependencies(taskId: string): Promise<Result<DependencyInfo>> {
    const result = await this.callTool<ToolDependencyPayload>('query_dependencies', {
      containerType: 'task',
      id: taskId,
      direction: 'both',
    });

    if (!result.success) return result as Result<DependencyInfo>;

    const dependencies = Array.isArray(result.data.dependencies)
      ? result.data.dependencies
      : [];
    const dependents = Array.isArray(result.data.dependents)
      ? result.data.dependents
      : [];

    const blockedByIds = dependencies
      .filter((link) => link.type === 'BLOCKS' && link.toId === taskId && link.fromId !== 'NO_OP')
      .map((link) => link.fromId)
      .filter((id): id is string => typeof id === 'string');

    const blocksIds = dependents
      .filter((link) => link.type === 'BLOCKS' && link.fromId === taskId)
      .map((link) => link.toId)
      .filter((id): id is string => typeof id === 'string');

    const [blockedBy, blocks] = await Promise.all([
      this.fetchTasksByIds(blockedByIds),
      this.fetchTasksByIds(blocksIds),
    ]);

    return {
      success: true,
      data: { blockedBy, blocks },
    };
  }

  async getBlockedTasks(params?: { projectId?: string }): Promise<Result<Task[]>> {
    const result = await this.callTool<Array<{ id?: string }>>('get_blocked_tasks', {
      projectId: params?.projectId,
    });

    if (!result.success) return result as Result<Task[]>;

    const ids = (Array.isArray(result.data) ? result.data : [])
      .map((row) => row.id)
      .filter((id): id is string => typeof id === 'string');

    const tasks = await this.fetchTasksByIds(ids);
    return { success: true, data: tasks };
  }

  async getNextTask(params?: { projectId?: string }): Promise<Result<Task | null>> {
    const result = await this.callTool<{ id?: string } | null>('get_next_task', {
      projectId: params?.projectId,
    });

    if (!result.success) return result as Result<Task | null>;

    if (!result.data || typeof result.data.id !== 'string') {
      return { success: true, data: null };
    }

    const taskResult = await this.getTask(result.data.id);
    if (!taskResult.success) {
      return { success: true, data: null };
    }

    return { success: true, data: taskResult.data };
  }

  // ============================================================================
  // Search
  // ============================================================================

  async search(query: string): Promise<Result<SearchResults>> {
    const [projectsResult, featuresResult, tasksResult] = await Promise.all([
      this.callTool<{ items?: Project[] }>('query_container', {
        operation: 'search',
        containerType: 'project',
        query,
        limit: 10,
        offset: 0,
      }),
      this.callTool<{ items?: Feature[] }>('query_container', {
        operation: 'search',
        containerType: 'feature',
        query,
        limit: 10,
        offset: 0,
      }),
      this.callTool<{ items?: Task[] }>('query_container', {
        operation: 'search',
        containerType: 'task',
        query,
        limit: 10,
        offset: 0,
      }),
    ]);

    const results: SearchResults = {
      projects: projectsResult.success
        ? this.extractItems<Project>(projectsResult.data).map((p) => ({
            id: p.id,
            name: p.name,
            summary: p.summary,
          }))
        : [],
      features: featuresResult.success
        ? this.extractItems<Feature>(featuresResult.data).map((f) => ({
            id: f.id,
            name: f.name,
            summary: f.summary,
            projectId: f.projectId,
          }))
        : [],
      tasks: tasksResult.success
        ? this.extractItems<Task>(tasksResult.data).map((t) => ({
            id: t.id,
            title: t.title,
            summary: t.summary,
            projectId: t.projectId,
            featureId: t.featureId,
          }))
        : [],
    };

    return { success: true, data: results };
  }
}
