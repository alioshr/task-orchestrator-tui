import React from 'react';
import { Box, Text, useInput } from 'ink';
import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';
import type { Feature, Task } from 'task-orchestrator-bun/src/domain/types';

export type TreeRow =
  | { type: 'feature'; feature: Feature; taskCount: number; expanded: boolean }
  | { type: 'task'; task: Task; isLast: boolean }
  | { type: 'separator'; label: string };

export interface TreeViewProps {
  rows: TreeRow[];
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  onToggleFeature: (featureId: string) => void;
  onSelectTask: (taskId: string) => void;
}

export function TreeView({
  rows,
  selectedIndex,
  onSelectedIndexChange,
  onToggleFeature,
  onSelectTask,
}: TreeViewProps) {
  useInput((input, key) => {
    if (rows.length === 0) return;

    // Navigation: j/down or k/up
    if (input === 'j' || key.downArrow) {
      const nextIndex = (selectedIndex + 1) % rows.length;
      onSelectedIndexChange(nextIndex);
    } else if (input === 'k' || key.upArrow) {
      const prevIndex = (selectedIndex - 1 + rows.length) % rows.length;
      onSelectedIndexChange(prevIndex);
    } else if ((key.return || input === ' ') && rows[selectedIndex]) {
      // Selection: Enter or Space
      const row = rows[selectedIndex];
      if (row.type === 'feature') {
        onToggleFeature(row.feature.id);
      } else if (row.type === 'task') {
        onSelectTask(row.task.id);
      }
      // Separator rows do nothing on selection
    }
  });

  const renderRow = (row: TreeRow, index: number) => {
    const isSelected = index === selectedIndex;

    if (row.type === 'separator') {
      return (
        <Box key={`separator-${index}`}>
          <Text dimColor inverse={isSelected} bold={isSelected}>
            ─────────── {row.label} ───────────
          </Text>
        </Box>
      );
    }

    if (row.type === 'feature') {
      const expandIcon = row.expanded ? '▼' : '▶';
      return (
        <Box key={row.feature.id}>
          <Text inverse={isSelected} bold={isSelected}>
            {expandIcon} {row.feature.name}
            {'  '}
          </Text>
          <StatusBadge status={row.feature.status} />
          <Text inverse={isSelected} bold={isSelected}>
            {'  '}
            {row.taskCount} tasks
          </Text>
        </Box>
      );
    }

    if (row.type === 'task') {
      const treePrefix = row.isLast ? '  └─ ' : '  ├─ ';
      return (
        <Box key={row.task.id}>
          <Text inverse={isSelected} bold={isSelected}>
            {treePrefix}
            {row.task.title}
            {'  '}
          </Text>
          <StatusBadge status={row.task.status} />
          <Text inverse={isSelected} bold={isSelected}>
            {'  '}
          </Text>
          <PriorityBadge priority={row.task.priority} />
        </Box>
      );
    }

    return null;
  };

  return (
    <Box flexDirection="column">
      {rows.map((row, index) => renderRow(row, index))}
    </Box>
  );
}
