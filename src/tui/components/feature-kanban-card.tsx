import React from 'react';
import { Box, Text } from 'ink';
import type { BoardFeature } from '../../ui/lib/types';
import type { Task } from '@allpepper/task-orchestrator';
import { PriorityBadge } from './priority-badge';
import { StatusBadge } from './status-badge';
import { useTheme } from '../../ui/context/theme-context';

export interface FeatureKanbanCardProps {
  feature: BoardFeature;
  isSelected: boolean;
  isExpanded: boolean;
  selectedTaskIndex: number;
  maxTaskHeight: number;
  columnWidth: number;
}

/**
 * Calculate the rendered line count for a feature card.
 * Used by the column to compute variable-height scroll windows.
 */
export function getFeatureCardHeight(
  feature: BoardFeature,
  isExpanded: boolean,
  maxTaskHeight: number,
  columnWidth: number
): number {
  // Content width inside the card border (border 2 + padding 2 = 4)
  const contentWidth = columnWidth - 4;

  // Collapsed: border-top + name lines + status line + border-bottom
  const nameLines = Math.ceil(feature.name.length / contentWidth) || 1;
  const collapsedHeight = 2 + nameLines + 1; // borders + name + status row

  if (!isExpanded) return collapsedHeight;

  // Expanded: collapsed chrome + separator + task rows
  const tasks = feature.tasks;
  if (tasks.length === 0) return collapsedHeight;

  let taskLines = 1; // separator line
  const visibleCount = Math.min(tasks.length, maxTaskHeight);
  const hasAbove = false; // initially scroll starts at 0
  const hasBelow = tasks.length > visibleCount;

  if (hasAbove) taskLines += 1;
  if (hasBelow) taskLines += 1;

  for (let i = 0; i < visibleCount; i++) {
    const task = tasks[i]!;
    const taskTitleLines = Math.ceil(task.title.length / (contentWidth - 4)) || 1; // indent for tree chrome
    taskLines += taskTitleLines + 1; // title lines + status line
  }

  // Account for gap={1} between task rows
  if (visibleCount > 1) {
    taskLines += visibleCount - 1;
  }

  return collapsedHeight + taskLines;
}

/**
 * FeatureKanbanCard Component
 *
 * Collapsed:
 * ┌──────────────────────────────────┐
 * │ Feature Name Wraps If Needed     │
 * │ ● In Development  ●●●  3/8      │
 * └──────────────────────────────────┘
 *
 * Expanded (tasks visible, internal scroll):
 * ┌──────────────────────────────────┐
 * │ Feature Name                     │
 * │ ● In Development  ●●●  3/8      │
 * │ ─────────────────────────────    │
 * │   ↑ 2 more                      │
 * │ ▎├─ Selected task title wraps    │
 * │    ● Pending  ●●○               │
 * │  └─ Another task                 │
 * │    ● Blocked  ●○○               │
 * │   ↓ 3 more                      │
 * └──────────────────────────────────┘
 */
export function FeatureKanbanCard({
  feature,
  isSelected,
  isExpanded,
  selectedTaskIndex,
  maxTaskHeight,
  columnWidth,
}: FeatureKanbanCardProps) {
  const { theme } = useTheme();
  const contentWidth = columnWidth - 4; // border + padding
  const { total, completed } = feature.taskCounts;

  // Task internal scroll
  const tasks = feature.tasks;
  const taskCount = tasks.length;

  let windowStart = 0;
  let windowEnd = Math.min(taskCount, maxTaskHeight);

  if (isExpanded && taskCount > maxTaskHeight && selectedTaskIndex >= 0) {
    const halfWindow = Math.floor(maxTaskHeight / 2);
    windowStart = Math.max(0, selectedTaskIndex - halfWindow);
    windowEnd = Math.min(taskCount, windowStart + maxTaskHeight);
    if (windowEnd === taskCount) {
      windowStart = Math.max(0, windowEnd - maxTaskHeight);
    }
  }

  const visibleTasks = isExpanded ? tasks.slice(windowStart, windowEnd) : [];
  const hasTasksAbove = windowStart > 0;
  const hasTasksBelow = windowEnd < taskCount;

  return (
    <Box
      borderStyle={isSelected ? 'double' : 'single'}
      borderColor={isSelected ? theme.colors.accent : theme.colors.border}
      flexDirection="column"
      paddingX={1}
      width={columnWidth}
    >
      {/* Feature name - full wrap, no truncation */}
      <Text bold={isSelected} wrap="wrap">
        {feature.name}
      </Text>

      {/* Status + priority + task count */}
      <Box gap={1}>
        <StatusBadge status={feature.status} />
        <PriorityBadge priority={feature.priority} />
        <Text dimColor>{completed}/{total}</Text>
      </Box>

      {/* Expanded: show tasks */}
      {isExpanded && taskCount > 0 && (
        <Box flexDirection="column">
          {/* Separator */}
          <Text dimColor>{'─'.repeat(Math.max(1, contentWidth - 2))}</Text>

          {/* Scroll-up indicator */}
          {hasTasksAbove && (
            <Text dimColor>  ↑ {windowStart} more</Text>
          )}

          {/* Visible tasks */}
          <Box flexDirection="column" gap={1}>
            {visibleTasks.map((task, index) => {
              const actualIndex = windowStart + index;
              const isTaskSelected = actualIndex === selectedTaskIndex;
              const isLast = actualIndex === taskCount - 1;
              const treeChar = isLast ? '└─' : '├─';

              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  isSelected={isTaskSelected}
                  treeChar={treeChar}
                  accentColor={theme.colors.accent}
                  mutedColor={theme.colors.muted}
                />
              );
            })}
          </Box>

          {/* Scroll-down indicator */}
          {hasTasksBelow && (
            <Text dimColor>  ↓ {taskCount - windowEnd} more</Text>
          )}
        </Box>
      )}

      {/* Expanded with no tasks */}
      {isExpanded && taskCount === 0 && (
        <Box flexDirection="column">
          <Text dimColor>{'─'.repeat(Math.max(1, contentWidth - 2))}</Text>
          <Text dimColor>  No tasks</Text>
        </Box>
      )}
    </Box>
  );
}

function TaskRow({
  task,
  isSelected,
  treeChar,
  accentColor,
  mutedColor,
}: {
  task: Task;
  isSelected: boolean;
  treeChar: string;
  accentColor: string;
  mutedColor: string;
}) {
  return (
    <Box flexDirection="column">
      <Box>
        {isSelected && <Text color={accentColor}>▎</Text>}
        <Text color={mutedColor}>{treeChar} </Text>
        <Text bold={isSelected} wrap="wrap">
          {task.title}
        </Text>
      </Box>
      <Box paddingLeft={isSelected ? 4 : 3}>
        <StatusBadge status={task.status} />
        <Text> </Text>
        <PriorityBadge priority={task.priority} />
      </Box>
    </Box>
  );
}
