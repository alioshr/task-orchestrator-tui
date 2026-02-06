import React from 'react';
import { Box, Text } from 'ink';
import type { BoardColumn } from '../../ui/lib/types';
import { KanbanCard } from './kanban-card';
import { getStatusColor } from '../../ui/lib/colors';
import { useTheme } from '../../ui/context/theme-context';

interface KanbanColumnProps {
  column: BoardColumn;
  isActiveColumn: boolean;
  selectedTaskIndex: number;
  availableHeight?: number;
}

/**
 * KanbanColumn Component
 *
 * Displays a single column in the Kanban board with a status header and list of task cards.
 *
 * Example:
 * ┌─ IN_PROGRESS (3) ────┐
 * │                      │
 * │ Task title one...    │
 * │ ●●● HIGH             │
 * │                      │
 * │ Task title two...    │
 * │ ●●○ MEDIUM           │
 * │                      │
 * │ Task three...        │
 * │ ●○○ LOW              │
 * │                      │
 * └──────────────────────┘
 */
export function KanbanColumn({
  column,
  isActiveColumn,
  selectedTaskIndex,
  availableHeight,
}: KanbanColumnProps) {
  const { theme } = useTheme();
  const statusColor = getStatusColor(column.status, theme);
  const taskCount = column.tasks.length;

  // Calculate visible tasks based on available height
  // Each task card takes ~4 lines (border + title + priority + border)
  // Column header takes ~2 lines
  // Column padding and borders take ~4 lines
  // Scroll indicators take ~2 lines each
  const columnChromeLines = 8;
  const linesPerTask = 5; // border-top + title + metadata + border-bottom + gap
  const effectiveHeight = availableHeight ?? 30;
  const maxVisibleTasks = Math.max(1, Math.floor((effectiveHeight - columnChromeLines) / linesPerTask));

  // Implement sliding window to keep selected task visible
  let windowStart = 0;
  let windowEnd = maxVisibleTasks;

  if (taskCount > maxVisibleTasks && selectedTaskIndex >= 0) {
    // Calculate window position to keep selected task centered when possible
    const halfWindow = Math.floor(maxVisibleTasks / 2);
    windowStart = Math.max(0, selectedTaskIndex - halfWindow);
    windowEnd = Math.min(taskCount, windowStart + maxVisibleTasks);

    // Adjust if we're at the end
    if (windowEnd === taskCount) {
      windowStart = Math.max(0, windowEnd - maxVisibleTasks);
    }
  }

  const visibleTasks = column.tasks.slice(windowStart, windowEnd);
  const hasTasksAbove = windowStart > 0;
  const hasTasksBelow = windowEnd < taskCount;
  const tasksAboveCount = windowStart;
  const tasksBelowCount = taskCount - windowEnd;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      width={30}
      height={effectiveHeight}
      paddingX={1}
      paddingY={1}
    >
      {/* Column header with status and count */}
      <Box marginBottom={1}>
        <Text color={statusColor} bold={isActiveColumn}>
          {column.title} ({taskCount})
        </Text>
      </Box>

      {/* Task list */}
      {taskCount === 0 ? (
        <Box justifyContent="center" paddingY={2}>
          <Text dimColor>No tasks</Text>
        </Box>
      ) : (
        <Box flexDirection="column" gap={1}>
          {/* Top scroll indicator */}
          {hasTasksAbove && (
            <Box justifyContent="center">
              <Text dimColor>
                ↑ {tasksAboveCount} more
              </Text>
            </Box>
          )}

          {/* Visible tasks */}
          {visibleTasks.map((task, index) => {
            const actualIndex = windowStart + index;
            return (
              <KanbanCard
                key={task.id}
                task={task}
                isSelected={actualIndex === selectedTaskIndex}
              />
            );
          })}

          {/* Bottom scroll indicator */}
          {hasTasksBelow && (
            <Box justifyContent="center">
              <Text dimColor>
                ↓ {tasksBelowCount} more
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
