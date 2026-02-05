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
  maxVisibleTasks?: number;
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
  maxVisibleTasks = 10,
}: KanbanColumnProps) {
  const { theme } = useTheme();
  const statusColor = getStatusColor(column.status, theme);
  const taskCount = column.tasks.length;
  const hasMoreTasks = taskCount > maxVisibleTasks;
  const visibleTasks = hasMoreTasks ? column.tasks.slice(0, maxVisibleTasks) : column.tasks;
  const remainingCount = taskCount - maxVisibleTasks;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      width={30}
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
          {visibleTasks.map((task, index) => (
            <KanbanCard
              key={task.id}
              task={task}
              isSelected={index === selectedTaskIndex}
            />
          ))}

          {/* Scroll indicator */}
          {hasMoreTasks && (
            <Box justifyContent="center" paddingTop={1}>
              <Text dimColor>
                ↓ {remainingCount} more
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
