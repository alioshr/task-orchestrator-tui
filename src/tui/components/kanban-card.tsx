import React from 'react';
import { Box, Text } from 'ink';
import type { BoardTask } from '../../ui/lib/types';
import { PriorityBadge } from './priority-badge';

export interface KanbanCardProps {
  task: BoardTask;
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

  const featureLabel = task.featureName ?? '—';

  if (compact) {
    // Compact mode: single line with title and priority dots
    const title = truncateText(task.title, 30);
    return (
      <Box paddingX={1}>
        <Text bold={isSelected}>
          {title}  <PriorityBadge priority={task.priority} />
        </Text>
      </Box>
    );
  }

  // Normal mode: bordered card with title, priority, and tag
  // Card fills column width; content area = column content (26) - card borders (2) - card padding (2) = 22
  const title = truncateText(task.title, 22);

  return (
    <Box
      borderStyle="single"
      paddingX={1}
      flexDirection="column"
    >
      <Text bold={isSelected}>
        {title}
      </Text>
      <Box gap={1}>
        <PriorityBadge priority={task.priority} />
        <Text bold={isSelected} dimColor>
          {task.priority}
        </Text>
        <Text bold={isSelected} dimColor>
          [{featureLabel}]
        </Text>
      </Box>
    </Box>
  );
}
