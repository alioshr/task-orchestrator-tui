import React from 'react';
import { Box, Text } from 'ink';
import type { Task } from 'task-orchestrator-bun/src/domain/types';
import { PriorityBadge } from './priority-badge';

export interface KanbanCardProps {
  task: Task;
  isSelected: boolean;
  compact?: boolean;
}

/**
 * KanbanCard Component
 *
 * Displays a single task as a card in the Kanban board.
 *
 * Normal mode:
 * ┌──────────────────────┐
 * │ Task title here...   │
 * │ ●●○ HIGH  #tag1      │
 * └──────────────────────┘
 *
 * Compact mode:
 * │ Task title...  ●●○   │
 */
export function KanbanCard({ task, isSelected, compact = false }: KanbanCardProps) {
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  };

  const firstTag = task.tags && task.tags.length > 0 ? task.tags[0] : null;

  if (compact) {
    // Compact mode: single line with title and priority dots
    const title = truncateText(task.title, 30);
    return (
      <Box paddingX={1}>
        <Text inverse={isSelected}>
          {title}  <PriorityBadge priority={task.priority} />
        </Text>
      </Box>
    );
  }

  // Normal mode: bordered card with title, priority, and tag
  const title = truncateText(task.title, 40);

  return (
    <Box
      borderStyle="single"
      paddingX={1}
      flexDirection="column"
      width={24}
    >
      <Text inverse={isSelected} bold>
        {title}
      </Text>
      <Box gap={1}>
        <PriorityBadge priority={task.priority} />
        <Text inverse={isSelected} dimColor>
          {task.priority}
        </Text>
        {firstTag && (
          <Text inverse={isSelected} color="cyan">
            #{firstTag}
          </Text>
        )}
      </Box>
    </Box>
  );
}
