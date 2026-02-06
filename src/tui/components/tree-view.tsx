import React from 'react';
import { Box, Text, useInput } from 'ink';
import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';
import { useTheme } from '../../ui/context/theme-context';
import type { Feature, Task } from 'task-orchestrator-bun/src/domain/types';

export type TreeRow =
  | { type: 'feature'; feature: Feature; taskCount: number; expanded: boolean; expandable?: boolean }
  | { type: 'task'; task: Task; isLast: boolean; featureName?: string; depth?: number }
  | { type: 'separator'; label: string }
  | { type: 'group'; id: string; label: string; status: string; taskCount: number; expanded: boolean; depth?: number; expandable?: boolean; featureId?: string };

export interface TreeViewProps {
  rows: TreeRow[];
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  onToggleFeature: (featureId: string) => void;
  onToggleGroup?: (groupId: string) => void;
  onSelectTask: (taskId: string) => void;
  onSelectFeature?: (featureId: string) => void;
  onBack?: () => void;
}

export function TreeView({
  rows,
  selectedIndex,
  onSelectedIndexChange,
  onToggleFeature,
  onToggleGroup,
  onSelectTask,
  onSelectFeature,
  onBack,
}: TreeViewProps) {
  const { theme } = useTheme();
  const getRowDepth = (row: TreeRow): number => {
    if (row.type === 'group') return row.depth ?? 0;
    if (row.type === 'task') return row.depth ?? 1;
    return 0;
  };

  const isRowExpandable = (row: TreeRow): boolean => {
    if (row.type === 'feature') {
      return row.expandable ?? row.taskCount > 0;
    }
    if (row.type === 'group') {
      return row.expandable ?? row.taskCount > 0;
    }
    return false;
  };

  const toggleRow = (row: TreeRow) => {
    if (row.type === 'feature') {
      onToggleFeature(row.feature.id);
    } else if (row.type === 'group' && onToggleGroup) {
      onToggleGroup(row.id);
    }
  };

  const findFirstChildIndex = (index: number): number => {
    const current = rows[index];
    if (!current) return -1;
    const currentDepth = getRowDepth(current);

    for (let i = index + 1; i < rows.length; i++) {
      const nextDepth = getRowDepth(rows[i]!);
      if (nextDepth <= currentDepth) return -1;
      if (nextDepth === currentDepth + 1) return i;
    }

    return -1;
  };

  const findParentIndex = (index: number): number => {
    const current = rows[index];
    if (!current) return -1;
    const currentDepth = getRowDepth(current);
    if (currentDepth <= 0) return -1;

    for (let i = index - 1; i >= 0; i--) {
      if (getRowDepth(rows[i]!) === currentDepth - 1) {
        return i;
      }
    }

    return -1;
  };

  const handleNavigateRight = () => {
    const row = rows[selectedIndex];
    if (!row) return;

    if (row.type === 'task') {
      onSelectTask(row.task.id);
      return;
    }

    if (row.type === 'separator') return;

    const expandable = isRowExpandable(row);
    if (expandable && !row.expanded) {
      toggleRow(row);
      return;
    }

    if (row.type === 'feature') {
      onSelectFeature?.(row.feature.id);
      return;
    }

    const childIndex = findFirstChildIndex(selectedIndex);
    if (childIndex >= 0) {
      onSelectedIndexChange(childIndex);
    }
  };

  const handleNavigateLeft = () => {
    const row = rows[selectedIndex];
    if (!row) return;

    if (row.type === 'task') {
      const parentIndex = findParentIndex(selectedIndex);
      if (parentIndex >= 0) {
        const parentRow = rows[parentIndex];
        if (
          parentRow &&
          (parentRow.type === 'feature' || parentRow.type === 'group') &&
          isRowExpandable(parentRow) &&
          parentRow.expanded
        ) {
          toggleRow(parentRow);
        }
        onSelectedIndexChange(parentIndex);
        return;
      }

      onBack?.();
      return;
    }

    if ((row.type === 'feature' || row.type === 'group') && isRowExpandable(row) && row.expanded) {
      toggleRow(row);
      return;
    }

    const parentIndex = findParentIndex(selectedIndex);
    if (parentIndex >= 0) {
      onSelectedIndexChange(parentIndex);
      return;
    }

    onBack?.();
  };

  useInput((input, key) => {
    if (rows.length === 0) return;

    // Navigation: j/down or k/up
    if (input === 'j' || key.downArrow) {
      const nextIndex = (selectedIndex + 1) % rows.length;
      onSelectedIndexChange(nextIndex);
    } else if (input === 'k' || key.upArrow) {
      const prevIndex = (selectedIndex - 1 + rows.length) % rows.length;
      onSelectedIndexChange(prevIndex);
    } else if (input === 'l' || key.rightArrow) {
      handleNavigateRight();
    } else if (input === 'h' || key.leftArrow) {
      handleNavigateLeft();
    } else if ((key.return || key.tab || input === ' ') && rows[selectedIndex]) {
      // Selection: Enter or Space
      const row = rows[selectedIndex];
      if (row.type === 'feature') {
        if (isRowExpandable(row)) {
          onToggleFeature(row.feature.id);
        }
      } else if (row.type === 'group' && onToggleGroup) {
        if (isRowExpandable(row)) {
          onToggleGroup(row.id);
        }
      } else if (row.type === 'task') {
        onSelectTask(row.task.id);
      }
      // Separator rows do nothing on selection
    }
  });

  const renderRow = (row: TreeRow, index: number) => {
    const isSelected = index === selectedIndex;
    const rowBackgroundColor = isSelected ? theme.colors.selection : undefined;
    const rowTextColor = isSelected ? theme.colors.foreground : undefined;

    if (row.type === 'separator') {
      return (
        <Box key={`separator-${index}`} width="100%" backgroundColor={rowBackgroundColor}>
          <Text dimColor={!isSelected} color={rowTextColor} bold={isSelected}>
            ─────────── {row.label} ───────────
          </Text>
        </Box>
      );
    }

    if (row.type === 'group') {
      const expandable = isRowExpandable(row);
      const expandIcon = row.expanded ? '▼' : '▶';
      const indent = row.depth ? '  '.repeat(row.depth) : '';
      return (
        <Box key={row.id} width="100%" backgroundColor={rowBackgroundColor}>
          <Text color={rowTextColor} bold={isSelected}>
            {indent}{expandable ? `${expandIcon} ` : ''}{row.label}
            {'  '}
          </Text>
          <StatusBadge status={row.status} isSelected={isSelected} />
          <Text color={rowTextColor} bold={isSelected}>
            {'  '}
            ({row.taskCount})
          </Text>
        </Box>
      );
    }

    if (row.type === 'feature') {
      const expandable = isRowExpandable(row);
      const expandIcon = row.expanded ? '▼' : '▶';
      return (
        <Box key={row.feature.id} width="100%" backgroundColor={rowBackgroundColor}>
          <Text color={rowTextColor} bold={isSelected}>
            {expandable ? `${expandIcon} ` : ''}{row.feature.name}
            {'  '}
          </Text>
          <StatusBadge status={row.feature.status} isSelected={isSelected} />
          <Text color={rowTextColor} bold={isSelected}>
            {'  '}
            {row.taskCount} tasks
          </Text>
        </Box>
      );
    }

    if (row.type === 'task') {
      const indent = row.depth ? '  '.repeat(row.depth) : '';
      const treePrefix = row.isLast ? '└─ ' : '├─ ';
      return (
        <Box key={row.task.id} width="100%" backgroundColor={rowBackgroundColor}>
          <Text color={rowTextColor} bold={isSelected}>
            {indent}  {treePrefix}
            {row.task.title}
            {row.featureName !== undefined && (row.featureName ? `  [${row.featureName}]` : '  [unassigned]')}
            {'  '}
          </Text>
          <PriorityBadge priority={row.task.priority} isSelected={isSelected} />
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
