import { describe, it, expect } from 'bun:test';
import { Priority } from '@allpepper/task-orchestrator';
import type { Task } from '@allpepper/task-orchestrator';
import type { FeatureWithTasks } from '../../lib/types';
import type { TreeRow } from '../../../tui/components/tree-view';

/**
 * Test helper: Build status-grouped tree rows for tasks
 * This is a copy of the function from use-data.ts for testing purposes (v2 pipeline)
 */
const STATUS_ORDER: string[] = [
  'NEW',
  'ACTIVE',
  'TO_BE_TESTED',
  'READY_TO_PROD',
  'CLOSED',
  'WILL_NOT_IMPLEMENT',
];

const PRIORITY_ORDER: Record<Priority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const STATUS_DISPLAY_NAMES: Record<string, string> = {
  NEW: 'New',
  ACTIVE: 'Active',
  TO_BE_TESTED: 'To Be Tested',
  READY_TO_PROD: 'Ready to Prod',
  CLOSED: 'Closed',
  WILL_NOT_IMPLEMENT: 'Will Not Implement',
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
  const tasksByStatus = new Map<string, Task[]>();
  for (const task of tasks) {
    const status = task.status;
    const group = tasksByStatus.get(status) || [];
    group.push(task);
    tasksByStatus.set(status, group);
  }

  // Features without tasks go into their own status bucket
  const featureHasTasks = new Set<string>();
  for (const task of tasks) {
    if (task.featureId) {
      featureHasTasks.add(task.featureId);
    }
  }

  const featuresByStatus = new Map<string, FeatureWithTasks[]>();
  for (const feature of features) {
    if (featureHasTasks.has(feature.id)) {
      continue;
    }
    const status = feature.status;
    const group = featuresByStatus.get(status) || [];
    group.push(feature);
    featuresByStatus.set(status, group);
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

        // Add task rows if feature is expanded (depth 2)
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
          status: status,
          taskCount: unassignedTasks.length,
          expanded: unassignedExpanded,
          depth: 1,
        });

        // Add task rows if unassigned group is expanded (depth 2)
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
    status: string,
    priority: Priority,
    featureId?: string
  ): Task => ({
    id,
    title,
    summary: `Summary for ${title}`,
    status,
    priority,
    complexity: 5,
    blockedBy: [],
    relatedTo: [],
    version: 1,
    createdAt: new Date(),
    modifiedAt: new Date(),
    featureId,
  });

  const createFeature = (id: string, name: string): FeatureWithTasks => ({
    id,
    name,
    summary: `Summary for ${name}`,
    status: 'ACTIVE',
    priority: Priority.MEDIUM,
    blockedBy: [],
    relatedTo: [],
    version: 1,
    createdAt: new Date(),
    modifiedAt: new Date(),
    tasks: [],
  });

  it('should group tasks by status in the correct order', () => {
    const tasks: Task[] = [
      createTask('t1', 'Task 1', 'CLOSED', Priority.HIGH),
      createTask('t2', 'Task 2', 'NEW', Priority.MEDIUM),
      createTask('t3', 'Task 3', 'ACTIVE', Priority.LOW),
    ];

    const rows = buildStatusGroupedRows(tasks, [], new Set(['NEW', 'ACTIVE', 'CLOSED']));

    // Status groups should appear in STATUS_ORDER (with unassigned sub-groups)
    const statusGroupRows = rows.filter((r) => r.type === 'group' && r.depth === 0);
    expect(statusGroupRows.length).toBe(3);
    expect(statusGroupRows[0]?.type === 'group' && statusGroupRows[0].id).toBe('NEW');
    expect(statusGroupRows[1]?.type === 'group' && statusGroupRows[1].id).toBe('ACTIVE');
    expect(statusGroupRows[2]?.type === 'group' && statusGroupRows[2].id).toBe('CLOSED');
  });

  it('should sort tasks by priority within each status group', () => {
    const tasks: Task[] = [
      createTask('t1', 'Low Priority', 'NEW', Priority.LOW),
      createTask('t2', 'High Priority', 'NEW', Priority.HIGH),
      createTask('t3', 'Medium Priority', 'NEW', Priority.MEDIUM),
    ];

    // Need to expand both status and unassigned groups to see tasks
    const rows = buildStatusGroupedRows(tasks, [], new Set(['NEW', 'NEW:unassigned']));

    const taskRows = rows.filter((r) => r.type === 'task');
    expect(taskRows.length).toBe(3);
    expect(taskRows[0]?.type === 'task' && taskRows[0].task.title).toBe('High Priority');
    expect(taskRows[1]?.type === 'task' && taskRows[1].task.title).toBe('Medium Priority');
    expect(taskRows[2]?.type === 'task' && taskRows[2].task.title).toBe('Low Priority');
  });

  it('should sort tasks alphabetically when priorities are equal', () => {
    const tasks: Task[] = [
      createTask('t1', 'Zebra Task', 'NEW', Priority.HIGH),
      createTask('t2', 'Alpha Task', 'NEW', Priority.HIGH),
      createTask('t3', 'Beta Task', 'NEW', Priority.HIGH),
    ];

    // Need to expand both status and unassigned groups to see tasks
    const rows = buildStatusGroupedRows(tasks, [], new Set(['NEW', 'NEW:unassigned']));

    const taskRows = rows.filter((r) => r.type === 'task');
    expect(taskRows.length).toBe(3);
    expect(taskRows[0]?.type === 'task' && taskRows[0].task.title).toBe('Alpha Task');
    expect(taskRows[1]?.type === 'task' && taskRows[1].task.title).toBe('Beta Task');
    expect(taskRows[2]?.type === 'task' && taskRows[2].task.title).toBe('Zebra Task');
  });

  it('should only show task rows when group is expanded', () => {
    const tasks: Task[] = [
      createTask('t1', 'Task 1', 'NEW', Priority.HIGH),
      createTask('t2', 'Task 2', 'NEW', Priority.MEDIUM),
    ];

    // Not expanded - status group collapsed
    const collapsedRows = buildStatusGroupedRows(tasks, [], new Set());
    expect(collapsedRows.length).toBe(1); // Only the status group row
    expect(collapsedRows[0]?.type).toBe('group');

    // Status expanded, but unassigned group collapsed (tasks have no feature)
    const statusExpandedRows = buildStatusGroupedRows(tasks, [], new Set(['NEW']));
    expect(statusExpandedRows.length).toBe(2); // Status group + Unassigned group
    expect(statusExpandedRows[0]?.type).toBe('group');
    expect(statusExpandedRows[0]?.type === 'group' && statusExpandedRows[0].id).toBe('NEW');
    expect(statusExpandedRows[1]?.type).toBe('group');
    expect(statusExpandedRows[1]?.type === 'group' && statusExpandedRows[1].id).toBe('NEW:unassigned');

    // Both status and unassigned group expanded
    const fullyExpandedRows = buildStatusGroupedRows(tasks, [], new Set(['NEW', 'NEW:unassigned']));
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
      createTask('t1', 'Task 1', 'NEW', Priority.HIGH, 'f1'),
      createTask('t2', 'Task 2', 'NEW', Priority.MEDIUM, 'f2'),
      createTask('t3', 'Task 3', 'NEW', Priority.LOW),
    ];

    // Expand status to see feature groups
    const rows = buildStatusGroupedRows(tasks, features, new Set(['NEW']));

    // Should have: Status group + 2 Feature groups + Unassigned group
    const groupRows = rows.filter((r) => r.type === 'group');
    expect(groupRows.length).toBe(4); // NEW, NEW:f1, NEW:f2, NEW:unassigned
    expect(groupRows[0]?.type === 'group' && groupRows[0].id).toBe('NEW');
    expect(groupRows[1]?.type === 'group' && groupRows[1].id).toBe('NEW:f1');
    expect(groupRows[1]?.type === 'group' && groupRows[1].label).toBe('Feature Alpha');
    expect(groupRows[2]?.type === 'group' && groupRows[2].id).toBe('NEW:f2');
    expect(groupRows[2]?.type === 'group' && groupRows[2].label).toBe('Feature Beta');
    expect(groupRows[3]?.type === 'group' && groupRows[3].id).toBe('NEW:unassigned');
    expect(groupRows[3]?.type === 'group' && groupRows[3].label).toBe('Unassigned');

    // No tasks should be visible yet (feature groups not expanded)
    const taskRows = rows.filter((r) => r.type === 'task');
    expect(taskRows.length).toBe(0);

    // Expand a feature group to see its tasks
    const expandedRows = buildStatusGroupedRows(tasks, features, new Set(['NEW', 'NEW:f1']));
    const expandedTaskRows = expandedRows.filter((r) => r.type === 'task');
    expect(expandedTaskRows.length).toBe(1); // Only f1's task
    expect(expandedTaskRows[0]?.type === 'task' && expandedTaskRows[0].task.id).toBe('t1');
    // Tasks nested under features should NOT have featureName
    expect(expandedTaskRows[0]?.type === 'task' && expandedTaskRows[0].featureName).toBeUndefined();
  });

  it('should set isLast correctly for the last task in each feature group', () => {
    const tasks: Task[] = [
      createTask('t1', 'Task 1', 'NEW', Priority.HIGH),
      createTask('t2', 'Task 2', 'NEW', Priority.MEDIUM),
      createTask('t3', 'Task 3', 'ACTIVE', Priority.HIGH),
    ];

    // Expand all groups to see tasks
    const rows = buildStatusGroupedRows(tasks, [], new Set(['NEW', 'NEW:unassigned', 'ACTIVE', 'ACTIVE:unassigned']));

    // Find tasks within NEW:unassigned group
    const newUnassignedIndex = rows.findIndex(r => r.type === 'group' && r.id === 'NEW:unassigned');
    const nextGroupAfterNewUnassigned = rows.findIndex((r, i) => i > newUnassignedIndex && r.type === 'group');
    const newTasks = rows.slice(newUnassignedIndex + 1, nextGroupAfterNewUnassigned === -1 ? rows.length : nextGroupAfterNewUnassigned);

    // Last task in NEW:unassigned should have isLast=true
    const lastNewTask = newTasks[newTasks.length - 1];
    expect(lastNewTask?.type === 'task' && lastNewTask.isLast).toBe(true);

    // First task in NEW:unassigned should have isLast=false
    const firstNewTask = newTasks[0];
    expect(firstNewTask?.type === 'task' && firstNewTask.isLast).toBe(false);

    // Find tasks within ACTIVE:unassigned group
    const activeUnassignedIndex = rows.findIndex(r => r.type === 'group' && r.id === 'ACTIVE:unassigned');
    const activeTasks = rows.slice(activeUnassignedIndex + 1);

    // Last (and only) task in ACTIVE:unassigned should have isLast=true
    const lastActiveTask = activeTasks[0];
    expect(lastActiveTask?.type === 'task' && lastActiveTask.isLast).toBe(true);
  });

  it('should only include status groups that have tasks', () => {
    const tasks: Task[] = [
      createTask('t1', 'Task 1', 'NEW', Priority.HIGH),
      createTask('t2', 'Task 2', 'CLOSED', Priority.MEDIUM),
    ];

    const rows = buildStatusGroupedRows(tasks, [], new Set(['NEW', 'ACTIVE', 'CLOSED']));

    // Should have status groups + unassigned sub-groups
    const statusGroupRows = rows.filter((r) => r.type === 'group' && r.depth === 0);
    expect(statusGroupRows.length).toBe(2); // Only NEW and CLOSED, not ACTIVE
    expect(statusGroupRows[0]?.type === 'group' && statusGroupRows[0].id).toBe('NEW');
    expect(statusGroupRows[1]?.type === 'group' && statusGroupRows[1].id).toBe('CLOSED');
  });

  it('should set correct task count for each group', () => {
    const tasks: Task[] = [
      createTask('t1', 'Task 1', 'NEW', Priority.HIGH),
      createTask('t2', 'Task 2', 'NEW', Priority.MEDIUM),
      createTask('t3', 'Task 3', 'NEW', Priority.LOW),
      createTask('t4', 'Task 4', 'ACTIVE', Priority.HIGH),
    ];

    const rows = buildStatusGroupedRows(tasks, [], new Set(['NEW', 'ACTIVE']));

    // Status groups should show total task count
    const statusGroupRows = rows.filter((r) => r.type === 'group' && r.depth === 0);
    expect(statusGroupRows[0]?.type === 'group' && statusGroupRows[0].taskCount).toBe(3);
    expect(statusGroupRows[1]?.type === 'group' && statusGroupRows[1].taskCount).toBe(1);

    // Unassigned sub-groups should also have correct counts
    const unassignedGroups = rows.filter((r) => r.type === 'group' && r.depth === 1);
    expect(unassignedGroups[0]?.type === 'group' && unassignedGroups[0].taskCount).toBe(3); // NEW:unassigned
    expect(unassignedGroups[1]?.type === 'group' && unassignedGroups[1].taskCount).toBe(1); // ACTIVE:unassigned
  });

  it('should use display names for status labels', () => {
    const tasks: Task[] = [
      createTask('t1', 'Task 1', 'NEW', Priority.HIGH),
      createTask('t2', 'Task 2', 'ACTIVE', Priority.MEDIUM),
    ];

    const rows = buildStatusGroupedRows(tasks, [], new Set(['NEW', 'ACTIVE']));

    // Check status group labels
    const statusGroupRows = rows.filter((r) => r.type === 'group' && r.depth === 0);
    expect(statusGroupRows[0]?.type === 'group' && statusGroupRows[0].label).toBe('New');
    expect(statusGroupRows[1]?.type === 'group' && statusGroupRows[1].label).toBe('Active');
  });

  it('should include empty features in their status bucket', () => {
    const closedFeature: FeatureWithTasks = {
      ...createFeature('f-complete', 'Closed Feature'),
      status: 'CLOSED',
    };

    const rows = buildStatusGroupedRows([], [closedFeature], new Set(['CLOSED']));

    const closedStatus = rows.find((r) => r.type === 'group' && r.depth === 0 && r.id === 'CLOSED');
    expect(closedStatus?.type).toBe('group');
    expect(closedStatus?.type === 'group' && closedStatus.taskCount).toBe(0);
    expect(closedStatus?.type === 'group' && closedStatus.expandable).toBe(true);

    const closedFeatureRow = rows.find((r) => r.type === 'group' && r.depth === 1 && r.id === 'CLOSED:f-complete');
    expect(closedFeatureRow?.type).toBe('group');
    expect(closedFeatureRow?.type === 'group' && closedFeatureRow.taskCount).toBe(0);
    expect(closedFeatureRow?.type === 'group' && closedFeatureRow.expandable).toBe(false);
  });
});

/**
 * Copy of FEATURE_STATUS_ORDER and buildFeatureStatusGroupedRows for testing (v2 pipeline)
 */
const FEATURE_STATUS_ORDER: string[] = [
  'NEW',
  'ACTIVE',
  'READY_TO_PROD',
  'CLOSED',
  'WILL_NOT_IMPLEMENT',
];

const FEATURE_STATUS_DISPLAY_NAMES: Record<string, string> = {
  NEW: 'New',
  ACTIVE: 'Active',
  READY_TO_PROD: 'Ready to Prod',
  CLOSED: 'Closed',
  WILL_NOT_IMPLEMENT: 'Will Not Implement',
};

const PRIORITY_ORDER2: Record<Priority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
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
            const priorityDiff = PRIORITY_ORDER2[b.priority] - PRIORITY_ORDER2[a.priority];
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
    status: string,
    priority: Priority,
    featureId?: string
  ): Task => ({
    id,
    title,
    summary: `Summary for ${title}`,
    status,
    priority,
    complexity: 5,
    blockedBy: [],
    relatedTo: [],
    version: 1,
    createdAt: new Date(),
    modifiedAt: new Date(),
    featureId,
  });

  const createFeature = (
    id: string,
    name: string,
    status: string = 'ACTIVE',
    tasks: Task[] = []
  ): FeatureWithTasks => ({
    id,
    name,
    summary: `Summary for ${name}`,
    status,
    priority: Priority.MEDIUM,
    blockedBy: [],
    relatedTo: [],
    version: 1,
    createdAt: new Date(),
    modifiedAt: new Date(),
    tasks,
  });

  it('should group features by their feature status in the correct order', () => {
    const features: FeatureWithTasks[] = [
      createFeature('f1', 'Feature 1', 'CLOSED'),
      createFeature('f2', 'Feature 2', 'NEW'),
      createFeature('f3', 'Feature 3', 'ACTIVE'),
    ];

    const rows = buildFeatureStatusGroupedRows(features, new Set());

    const statusGroupRows = rows.filter((r) => r.type === 'group' && r.depth === 0);
    expect(statusGroupRows.length).toBe(3);
    expect(statusGroupRows[0]?.type === 'group' && statusGroupRows[0].id).toBe('fs:NEW');
    expect(statusGroupRows[1]?.type === 'group' && statusGroupRows[1].id).toBe('fs:ACTIVE');
    expect(statusGroupRows[2]?.type === 'group' && statusGroupRows[2].id).toBe('fs:CLOSED');
  });

  it('should use display names for feature status labels', () => {
    const features: FeatureWithTasks[] = [
      createFeature('f1', 'Feature 1', 'ACTIVE'),
      createFeature('f2', 'Feature 2', 'READY_TO_PROD'),
    ];

    const rows = buildFeatureStatusGroupedRows(features, new Set());

    const statusGroupRows = rows.filter((r) => r.type === 'group' && r.depth === 0);
    expect(statusGroupRows[0]?.type === 'group' && statusGroupRows[0].label).toBe('Active');
    expect(statusGroupRows[1]?.type === 'group' && statusGroupRows[1].label).toBe('Ready to Prod');
  });

  it('should skip empty status groups', () => {
    const features: FeatureWithTasks[] = [
      createFeature('f1', 'Feature 1', 'NEW'),
    ];

    const rows = buildFeatureStatusGroupedRows(features, new Set());

    const statusGroupRows = rows.filter((r) => r.type === 'group' && r.depth === 0);
    expect(statusGroupRows.length).toBe(1);
    expect(statusGroupRows[0]?.type === 'group' && statusGroupRows[0].id).toBe('fs:NEW');
  });

  it('should show feature count in taskCount field of status group', () => {
    const features: FeatureWithTasks[] = [
      createFeature('f1', 'Feature 1', 'ACTIVE'),
      createFeature('f2', 'Feature 2', 'ACTIVE'),
      createFeature('f3', 'Feature 3', 'CLOSED'),
    ];

    const rows = buildFeatureStatusGroupedRows(features, new Set());

    const statusGroupRows = rows.filter((r) => r.type === 'group' && r.depth === 0);
    expect(statusGroupRows[0]?.type === 'group' && statusGroupRows[0].taskCount).toBe(2); // ACTIVE
    expect(statusGroupRows[1]?.type === 'group' && statusGroupRows[1].taskCount).toBe(1); // CLOSED
  });

  it('should show features when status group is expanded', () => {
    const features: FeatureWithTasks[] = [
      createFeature('f1', 'Feature Alpha', 'ACTIVE'),
      createFeature('f2', 'Feature Beta', 'ACTIVE'),
    ];

    // Collapsed
    const collapsedRows = buildFeatureStatusGroupedRows(features, new Set());
    expect(collapsedRows.length).toBe(1); // Only status group

    // Expanded
    const expandedRows = buildFeatureStatusGroupedRows(features, new Set(['fs:ACTIVE']));
    expect(expandedRows.length).toBe(3); // Status group + 2 features
    expect(expandedRows[1]?.type).toBe('group');
    expect(expandedRows[1]?.type === 'group' && expandedRows[1].depth).toBe(1);
    expect(expandedRows[1]?.type === 'group' && expandedRows[1].featureId).toBe('f1');
    expect(expandedRows[2]?.type === 'group' && expandedRows[2].featureId).toBe('f2');
  });

  it('should show tasks when feature is expanded', () => {
    const tasks = [
      createTask('t1', 'High Task', 'ACTIVE', Priority.HIGH, 'f1'),
      createTask('t2', 'Low Task', 'ACTIVE', Priority.LOW, 'f1'),
    ];
    const features: FeatureWithTasks[] = [
      createFeature('f1', 'Feature 1', 'ACTIVE', tasks),
    ];

    const rows = buildFeatureStatusGroupedRows(
      features,
      new Set(['fs:ACTIVE', 'fs:ACTIVE:f1'])
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
      createFeature('f1', 'Empty Feature', 'NEW', []),
    ];

    const rows = buildFeatureStatusGroupedRows(features, new Set(['fs:NEW']));

    const featureRow = rows.find((r) => r.type === 'group' && r.depth === 1);
    expect(featureRow?.type === 'group' && featureRow.expandable).toBe(false);
  });

  it('should set featureId on feature group rows', () => {
    const features: FeatureWithTasks[] = [
      createFeature('f1', 'Feature 1', 'NEW'),
    ];

    const rows = buildFeatureStatusGroupedRows(features, new Set(['fs:NEW']));

    const featureRow = rows.find((r) => r.type === 'group' && r.depth === 1);
    expect(featureRow?.type === 'group' && featureRow.featureId).toBe('f1');
    expect(featureRow?.type === 'group' && featureRow.id).toBe('fs:NEW:f1');
  });
});
