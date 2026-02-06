import { describe, it, expect } from 'bun:test';
import { TaskStatus, Priority, FeatureStatus, LockStatus } from 'task-orchestrator-bun/src/domain/types';
import type { Task } from 'task-orchestrator-bun/src/domain/types';
import type { FeatureWithTasks } from '../../lib/types';
import type { TreeRow } from '../../../tui/components/tree-view';

/**
 * Test helper: Build status-grouped tree rows for tasks
 * This is a copy of the function from use-data.ts for testing purposes
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

const PRIORITY_ORDER: Record<Priority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

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
};

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

  const featureHasTasks = new Set<string>();
  for (const task of tasks) {
    if (task.featureId) {
      featureHasTasks.add(task.featureId);
    }
  }

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

describe('buildStatusGroupedRows', () => {
  const createTask = (
    id: string,
    title: string,
    status: TaskStatus,
    priority: Priority,
    featureId?: string
  ): Task => ({
    id,
    title,
    summary: `Summary for ${title}`,
    status,
    priority,
    complexity: 5,
    version: 1,
    lockStatus: LockStatus.UNLOCKED,
    createdAt: new Date(),
    modifiedAt: new Date(),
    featureId,
  });

  const createFeature = (id: string, name: string): FeatureWithTasks => ({
    id,
    name,
    summary: `Summary for ${name}`,
    status: FeatureStatus.IN_DEVELOPMENT,
    priority: Priority.MEDIUM,
    version: 1,
    createdAt: new Date(),
    modifiedAt: new Date(),
    tasks: [],
  });

  it('should group tasks by status in the correct order', () => {
    const tasks: Task[] = [
      createTask('t1', 'Task 1', 'COMPLETED' as TaskStatus, Priority.HIGH),
      createTask('t2', 'Task 2', 'PENDING' as TaskStatus, Priority.MEDIUM),
      createTask('t3', 'Task 3', 'IN_PROGRESS' as TaskStatus, Priority.LOW),
    ];

    const rows = buildStatusGroupedRows(tasks, [], new Set(['PENDING', 'IN_PROGRESS', 'COMPLETED']));

    // Status groups should appear in STATUS_ORDER (with unassigned sub-groups)
    const statusGroupRows = rows.filter((r) => r.type === 'group' && r.depth === 0);
    expect(statusGroupRows.length).toBe(3);
    expect(statusGroupRows[0]?.type === 'group' && statusGroupRows[0].id).toBe('PENDING');
    expect(statusGroupRows[1]?.type === 'group' && statusGroupRows[1].id).toBe('IN_PROGRESS');
    expect(statusGroupRows[2]?.type === 'group' && statusGroupRows[2].id).toBe('COMPLETED');
  });

  it('should sort tasks by priority within each status group', () => {
    const tasks: Task[] = [
      createTask('t1', 'Low Priority', 'PENDING' as TaskStatus, Priority.LOW),
      createTask('t2', 'High Priority', 'PENDING' as TaskStatus, Priority.HIGH),
      createTask('t3', 'Medium Priority', 'PENDING' as TaskStatus, Priority.MEDIUM),
    ];

    // Need to expand both status and unassigned groups to see tasks
    const rows = buildStatusGroupedRows(tasks, [], new Set(['PENDING', 'PENDING:unassigned']));

    const taskRows = rows.filter((r) => r.type === 'task');
    expect(taskRows.length).toBe(3);
    expect(taskRows[0]?.type === 'task' && taskRows[0].task.title).toBe('High Priority');
    expect(taskRows[1]?.type === 'task' && taskRows[1].task.title).toBe('Medium Priority');
    expect(taskRows[2]?.type === 'task' && taskRows[2].task.title).toBe('Low Priority');
  });

  it('should sort tasks alphabetically when priorities are equal', () => {
    const tasks: Task[] = [
      createTask('t1', 'Zebra Task', 'PENDING' as TaskStatus, Priority.HIGH),
      createTask('t2', 'Alpha Task', 'PENDING' as TaskStatus, Priority.HIGH),
      createTask('t3', 'Beta Task', 'PENDING' as TaskStatus, Priority.HIGH),
    ];

    // Need to expand both status and unassigned groups to see tasks
    const rows = buildStatusGroupedRows(tasks, [], new Set(['PENDING', 'PENDING:unassigned']));

    const taskRows = rows.filter((r) => r.type === 'task');
    expect(taskRows.length).toBe(3);
    expect(taskRows[0]?.type === 'task' && taskRows[0].task.title).toBe('Alpha Task');
    expect(taskRows[1]?.type === 'task' && taskRows[1].task.title).toBe('Beta Task');
    expect(taskRows[2]?.type === 'task' && taskRows[2].task.title).toBe('Zebra Task');
  });

  it('should only show task rows when group is expanded', () => {
    const tasks: Task[] = [
      createTask('t1', 'Task 1', 'PENDING' as TaskStatus, Priority.HIGH),
      createTask('t2', 'Task 2', 'PENDING' as TaskStatus, Priority.MEDIUM),
    ];

    // Not expanded - status group collapsed
    const collapsedRows = buildStatusGroupedRows(tasks, [], new Set());
    expect(collapsedRows.length).toBe(1); // Only the status group row
    expect(collapsedRows[0]?.type).toBe('group');

    // Status expanded, but unassigned group collapsed (tasks have no feature)
    const statusExpandedRows = buildStatusGroupedRows(tasks, [], new Set(['PENDING']));
    expect(statusExpandedRows.length).toBe(2); // Status group + Unassigned group
    expect(statusExpandedRows[0]?.type).toBe('group');
    expect(statusExpandedRows[0]?.type === 'group' && statusExpandedRows[0].id).toBe('PENDING');
    expect(statusExpandedRows[1]?.type).toBe('group');
    expect(statusExpandedRows[1]?.type === 'group' && statusExpandedRows[1].id).toBe('PENDING:unassigned');

    // Both status and unassigned group expanded
    const fullyExpandedRows = buildStatusGroupedRows(tasks, [], new Set(['PENDING', 'PENDING:unassigned']));
    expect(fullyExpandedRows.length).toBe(4); // Status group + Unassigned group + 2 tasks
    expect(fullyExpandedRows[0]?.type).toBe('group');
    expect(fullyExpandedRows[1]?.type).toBe('group');
    expect(fullyExpandedRows[2]?.type).toBe('task');
    expect(fullyExpandedRows[3]?.type).toBe('task');
  });

  it('should group tasks by feature within status', () => {
    const features: FeatureWithTasks[] = [
      createFeature('f1', 'Feature Alpha'),
      createFeature('f2', 'Feature Beta'),
    ];

    const tasks: Task[] = [
      createTask('t1', 'Task 1', 'PENDING' as TaskStatus, Priority.HIGH, 'f1'),
      createTask('t2', 'Task 2', 'PENDING' as TaskStatus, Priority.MEDIUM, 'f2'),
      createTask('t3', 'Task 3', 'PENDING' as TaskStatus, Priority.LOW),
    ];

    // Expand status to see feature groups
    const rows = buildStatusGroupedRows(tasks, features, new Set(['PENDING']));

    // Should have: Status group + 2 Feature groups + Unassigned group
    const groupRows = rows.filter((r) => r.type === 'group');
    expect(groupRows.length).toBe(4); // PENDING, PENDING:f1, PENDING:f2, PENDING:unassigned
    expect(groupRows[0]?.type === 'group' && groupRows[0].id).toBe('PENDING');
    expect(groupRows[1]?.type === 'group' && groupRows[1].id).toBe('PENDING:f1');
    expect(groupRows[1]?.type === 'group' && groupRows[1].label).toBe('Feature Alpha');
    expect(groupRows[2]?.type === 'group' && groupRows[2].id).toBe('PENDING:f2');
    expect(groupRows[2]?.type === 'group' && groupRows[2].label).toBe('Feature Beta');
    expect(groupRows[3]?.type === 'group' && groupRows[3].id).toBe('PENDING:unassigned');
    expect(groupRows[3]?.type === 'group' && groupRows[3].label).toBe('Unassigned');

    // No tasks should be visible yet (feature groups not expanded)
    const taskRows = rows.filter((r) => r.type === 'task');
    expect(taskRows.length).toBe(0);

    // Expand a feature group to see its tasks
    const expandedRows = buildStatusGroupedRows(tasks, features, new Set(['PENDING', 'PENDING:f1']));
    const expandedTaskRows = expandedRows.filter((r) => r.type === 'task');
    expect(expandedTaskRows.length).toBe(1); // Only f1's task
    expect(expandedTaskRows[0]?.type === 'task' && expandedTaskRows[0].task.id).toBe('t1');
    // Tasks nested under features should NOT have featureName
    expect(expandedTaskRows[0]?.type === 'task' && expandedTaskRows[0].featureName).toBeUndefined();
  });

  it('should set isLast correctly for the last task in each feature group', () => {
    const tasks: Task[] = [
      createTask('t1', 'Task 1', 'PENDING' as TaskStatus, Priority.HIGH),
      createTask('t2', 'Task 2', 'PENDING' as TaskStatus, Priority.MEDIUM),
      createTask('t3', 'Task 3', 'IN_PROGRESS' as TaskStatus, Priority.HIGH),
    ];

    // Expand all groups to see tasks
    const rows = buildStatusGroupedRows(tasks, [], new Set(['PENDING', 'PENDING:unassigned', 'IN_PROGRESS', 'IN_PROGRESS:unassigned']));

    // Find tasks within PENDING:unassigned group
    const pendingUnassignedIndex = rows.findIndex(r => r.type === 'group' && r.id === 'PENDING:unassigned');
    const nextGroupAfterPendingUnassigned = rows.findIndex((r, i) => i > pendingUnassignedIndex && r.type === 'group');
    const pendingTasks = rows.slice(pendingUnassignedIndex + 1, nextGroupAfterPendingUnassigned === -1 ? rows.length : nextGroupAfterPendingUnassigned);

    // Last task in PENDING:unassigned should have isLast=true
    const lastPendingTask = pendingTasks[pendingTasks.length - 1];
    expect(lastPendingTask?.type === 'task' && lastPendingTask.isLast).toBe(true);

    // First task in PENDING:unassigned should have isLast=false
    const firstPendingTask = pendingTasks[0];
    expect(firstPendingTask?.type === 'task' && firstPendingTask.isLast).toBe(false);

    // Find tasks within IN_PROGRESS:unassigned group
    const inProgressUnassignedIndex = rows.findIndex(r => r.type === 'group' && r.id === 'IN_PROGRESS:unassigned');
    const inProgressTasks = rows.slice(inProgressUnassignedIndex + 1);

    // Last (and only) task in IN_PROGRESS:unassigned should have isLast=true
    const lastInProgressTask = inProgressTasks[0];
    expect(lastInProgressTask?.type === 'task' && lastInProgressTask.isLast).toBe(true);
  });

  it('should only include status groups that have tasks', () => {
    const tasks: Task[] = [
      createTask('t1', 'Task 1', 'PENDING' as TaskStatus, Priority.HIGH),
      createTask('t2', 'Task 2', 'COMPLETED' as TaskStatus, Priority.MEDIUM),
    ];

    const rows = buildStatusGroupedRows(tasks, [], new Set(['PENDING', 'IN_PROGRESS', 'COMPLETED']));

    // Should have status groups + unassigned sub-groups
    const statusGroupRows = rows.filter((r) => r.type === 'group' && r.depth === 0);
    expect(statusGroupRows.length).toBe(2); // Only PENDING and COMPLETED, not IN_PROGRESS
    expect(statusGroupRows[0]?.type === 'group' && statusGroupRows[0].id).toBe('PENDING');
    expect(statusGroupRows[1]?.type === 'group' && statusGroupRows[1].id).toBe('COMPLETED');
  });

  it('should set correct task count for each group', () => {
    const tasks: Task[] = [
      createTask('t1', 'Task 1', 'PENDING' as TaskStatus, Priority.HIGH),
      createTask('t2', 'Task 2', 'PENDING' as TaskStatus, Priority.MEDIUM),
      createTask('t3', 'Task 3', 'PENDING' as TaskStatus, Priority.LOW),
      createTask('t4', 'Task 4', 'IN_PROGRESS' as TaskStatus, Priority.HIGH),
    ];

    const rows = buildStatusGroupedRows(tasks, [], new Set(['PENDING', 'IN_PROGRESS']));

    // Status groups should show total task count
    const statusGroupRows = rows.filter((r) => r.type === 'group' && r.depth === 0);
    expect(statusGroupRows[0]?.type === 'group' && statusGroupRows[0].taskCount).toBe(3);
    expect(statusGroupRows[1]?.type === 'group' && statusGroupRows[1].taskCount).toBe(1);

    // Unassigned sub-groups should also have correct counts
    const unassignedGroups = rows.filter((r) => r.type === 'group' && r.depth === 1);
    expect(unassignedGroups[0]?.type === 'group' && unassignedGroups[0].taskCount).toBe(3); // PENDING:unassigned
    expect(unassignedGroups[1]?.type === 'group' && unassignedGroups[1].taskCount).toBe(1); // IN_PROGRESS:unassigned
  });

  it('should use display names for status labels', () => {
    const tasks: Task[] = [
      createTask('t1', 'Task 1', 'PENDING' as TaskStatus, Priority.HIGH),
      createTask('t2', 'Task 2', 'IN_PROGRESS' as TaskStatus, Priority.MEDIUM),
    ];

    const rows = buildStatusGroupedRows(tasks, [], new Set(['PENDING', 'IN_PROGRESS']));

    // Check status group labels
    const statusGroupRows = rows.filter((r) => r.type === 'group' && r.depth === 0);
    expect(statusGroupRows[0]?.type === 'group' && statusGroupRows[0].label).toBe('Pending');
    expect(statusGroupRows[1]?.type === 'group' && statusGroupRows[1].label).toBe('In Progress');
  });

  it('should include empty features in their mapped status bucket (status mode)', () => {
    const completedFeature: FeatureWithTasks = {
      ...createFeature('f-complete', 'Completed Feature'),
      status: FeatureStatus.COMPLETED,
    };

    const rows = buildStatusGroupedRows([], [completedFeature], new Set(['COMPLETED']));

    const completedStatus = rows.find((r) => r.type === 'group' && r.depth === 0 && r.id === 'COMPLETED');
    expect(completedStatus?.type).toBe('group');
    expect(completedStatus?.type === 'group' && completedStatus.taskCount).toBe(0);
    expect(completedStatus?.type === 'group' && completedStatus.expandable).toBe(true);

    const completedFeatureRow = rows.find((r) => r.type === 'group' && r.depth === 1 && r.id === 'COMPLETED:f-complete');
    expect(completedFeatureRow?.type).toBe('group');
    expect(completedFeatureRow?.type === 'group' && completedFeatureRow.taskCount).toBe(0);
    expect(completedFeatureRow?.type === 'group' && completedFeatureRow.expandable).toBe(false);
  });
});

/**
 * Copy of FEATURE_STATUS_ORDER and buildFeatureStatusGroupedRows for testing
 */
const FEATURE_STATUS_ORDER: string[] = [
  'DRAFT',
  'PLANNING',
  'IN_DEVELOPMENT',
  'TESTING',
  'VALIDATING',
  'PENDING_REVIEW',
  'BLOCKED',
  'ON_HOLD',
  'DEPLOYED',
  'COMPLETED',
  'ARCHIVED',
];

const FEATURE_STATUS_DISPLAY_NAMES: Record<string, string> = {
  ...STATUS_DISPLAY_NAMES,
  DRAFT: 'Draft',
  PLANNING: 'Planning',
  IN_DEVELOPMENT: 'In Development',
  VALIDATING: 'Validating',
  PENDING_REVIEW: 'Pending Review',
  ARCHIVED: 'Archived',
};

function buildFeatureStatusGroupedRows(
  features: FeatureWithTasks[],
  expandedGroups: Set<string>
): TreeRow[] {
  const rows: TreeRow[] = [];

  const featuresByStatus = new Map<string, FeatureWithTasks[]>();
  for (const feature of features) {
    const status = feature.status as string;
    const group = featuresByStatus.get(status) || [];
    group.push(feature);
    featuresByStatus.set(status, group);
  }

  for (const status of FEATURE_STATUS_ORDER) {
    const statusFeatures = featuresByStatus.get(status) || [];
    if (statusFeatures.length === 0) continue;

    const statusGroupId = `fs:${status}`;
    const statusExpanded = expandedGroups.has(statusGroupId);

    rows.push({
      type: 'group',
      id: statusGroupId,
      label: FEATURE_STATUS_DISPLAY_NAMES[status] || status,
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

describe('buildFeatureStatusGroupedRows', () => {
  const createTask = (
    id: string,
    title: string,
    status: TaskStatus,
    priority: Priority,
    featureId?: string
  ): Task => ({
    id,
    title,
    summary: `Summary for ${title}`,
    status,
    priority,
    complexity: 5,
    version: 1,
    lockStatus: LockStatus.UNLOCKED,
    createdAt: new Date(),
    modifiedAt: new Date(),
    featureId,
  });

  const createFeature = (
    id: string,
    name: string,
    status: FeatureStatus = FeatureStatus.IN_DEVELOPMENT,
    tasks: Task[] = []
  ): FeatureWithTasks => ({
    id,
    name,
    summary: `Summary for ${name}`,
    status,
    priority: Priority.MEDIUM,
    version: 1,
    createdAt: new Date(),
    modifiedAt: new Date(),
    tasks,
  });

  it('should group features by their feature status in the correct order', () => {
    const features: FeatureWithTasks[] = [
      createFeature('f1', 'Feature 1', FeatureStatus.COMPLETED),
      createFeature('f2', 'Feature 2', FeatureStatus.DRAFT),
      createFeature('f3', 'Feature 3', FeatureStatus.IN_DEVELOPMENT),
    ];

    const rows = buildFeatureStatusGroupedRows(features, new Set());

    const statusGroupRows = rows.filter((r) => r.type === 'group' && r.depth === 0);
    expect(statusGroupRows.length).toBe(3);
    expect(statusGroupRows[0]?.type === 'group' && statusGroupRows[0].id).toBe('fs:DRAFT');
    expect(statusGroupRows[1]?.type === 'group' && statusGroupRows[1].id).toBe('fs:IN_DEVELOPMENT');
    expect(statusGroupRows[2]?.type === 'group' && statusGroupRows[2].id).toBe('fs:COMPLETED');
  });

  it('should use display names for feature status labels', () => {
    const features: FeatureWithTasks[] = [
      createFeature('f1', 'Feature 1', FeatureStatus.IN_DEVELOPMENT),
      createFeature('f2', 'Feature 2', FeatureStatus.PENDING_REVIEW),
    ];

    const rows = buildFeatureStatusGroupedRows(features, new Set());

    const statusGroupRows = rows.filter((r) => r.type === 'group' && r.depth === 0);
    expect(statusGroupRows[0]?.type === 'group' && statusGroupRows[0].label).toBe('In Development');
    expect(statusGroupRows[1]?.type === 'group' && statusGroupRows[1].label).toBe('Pending Review');
  });

  it('should skip empty status groups', () => {
    const features: FeatureWithTasks[] = [
      createFeature('f1', 'Feature 1', FeatureStatus.DRAFT),
    ];

    const rows = buildFeatureStatusGroupedRows(features, new Set());

    const statusGroupRows = rows.filter((r) => r.type === 'group' && r.depth === 0);
    expect(statusGroupRows.length).toBe(1);
    expect(statusGroupRows[0]?.type === 'group' && statusGroupRows[0].id).toBe('fs:DRAFT');
  });

  it('should show feature count in taskCount field of status group', () => {
    const features: FeatureWithTasks[] = [
      createFeature('f1', 'Feature 1', FeatureStatus.IN_DEVELOPMENT),
      createFeature('f2', 'Feature 2', FeatureStatus.IN_DEVELOPMENT),
      createFeature('f3', 'Feature 3', FeatureStatus.COMPLETED),
    ];

    const rows = buildFeatureStatusGroupedRows(features, new Set());

    const statusGroupRows = rows.filter((r) => r.type === 'group' && r.depth === 0);
    expect(statusGroupRows[0]?.type === 'group' && statusGroupRows[0].taskCount).toBe(2); // IN_DEVELOPMENT
    expect(statusGroupRows[1]?.type === 'group' && statusGroupRows[1].taskCount).toBe(1); // COMPLETED
  });

  it('should show features when status group is expanded', () => {
    const features: FeatureWithTasks[] = [
      createFeature('f1', 'Feature Alpha', FeatureStatus.IN_DEVELOPMENT),
      createFeature('f2', 'Feature Beta', FeatureStatus.IN_DEVELOPMENT),
    ];

    // Collapsed
    const collapsedRows = buildFeatureStatusGroupedRows(features, new Set());
    expect(collapsedRows.length).toBe(1); // Only status group

    // Expanded
    const expandedRows = buildFeatureStatusGroupedRows(features, new Set(['fs:IN_DEVELOPMENT']));
    expect(expandedRows.length).toBe(3); // Status group + 2 features
    expect(expandedRows[1]?.type).toBe('group');
    expect(expandedRows[1]?.type === 'group' && expandedRows[1].depth).toBe(1);
    expect(expandedRows[1]?.type === 'group' && expandedRows[1].featureId).toBe('f1');
    expect(expandedRows[2]?.type === 'group' && expandedRows[2].featureId).toBe('f2');
  });

  it('should show tasks when feature is expanded', () => {
    const tasks = [
      createTask('t1', 'High Task', 'IN_PROGRESS' as TaskStatus, Priority.HIGH, 'f1'),
      createTask('t2', 'Low Task', 'IN_PROGRESS' as TaskStatus, Priority.LOW, 'f1'),
    ];
    const features: FeatureWithTasks[] = [
      createFeature('f1', 'Feature 1', FeatureStatus.IN_DEVELOPMENT, tasks),
    ];

    const rows = buildFeatureStatusGroupedRows(
      features,
      new Set(['fs:IN_DEVELOPMENT', 'fs:IN_DEVELOPMENT:f1'])
    );

    // Status group + feature group + 2 tasks
    expect(rows.length).toBe(4);
    const taskRows = rows.filter((r) => r.type === 'task');
    expect(taskRows.length).toBe(2);
    // Sorted by priority descending
    expect(taskRows[0]?.type === 'task' && taskRows[0].task.title).toBe('High Task');
    expect(taskRows[1]?.type === 'task' && taskRows[1].task.title).toBe('Low Task');
    // isLast on last task
    expect(taskRows[0]?.type === 'task' && taskRows[0].isLast).toBe(false);
    expect(taskRows[1]?.type === 'task' && taskRows[1].isLast).toBe(true);
  });

  it('should mark features without tasks as not expandable', () => {
    const features: FeatureWithTasks[] = [
      createFeature('f1', 'Empty Feature', FeatureStatus.DRAFT, []),
    ];

    const rows = buildFeatureStatusGroupedRows(features, new Set(['fs:DRAFT']));

    const featureRow = rows.find((r) => r.type === 'group' && r.depth === 1);
    expect(featureRow?.type === 'group' && featureRow.expandable).toBe(false);
  });

  it('should set featureId on feature group rows', () => {
    const features: FeatureWithTasks[] = [
      createFeature('f1', 'Feature 1', FeatureStatus.PLANNING),
    ];

    const rows = buildFeatureStatusGroupedRows(features, new Set(['fs:PLANNING']));

    const featureRow = rows.find((r) => r.type === 'group' && r.depth === 1);
    expect(featureRow?.type === 'group' && featureRow.featureId).toBe('f1');
    expect(featureRow?.type === 'group' && featureRow.id).toBe('fs:PLANNING:f1');
  });
});
