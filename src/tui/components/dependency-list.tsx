import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Task } from '@allpepper/task-orchestrator';
import type { DependencyInfo } from '../../ui/lib/types';
import { StatusBadge } from './status-badge';
import { useTheme } from '../../ui/context/theme-context';

interface DependencyListProps {
  dependencies: DependencyInfo | null;
  onSelectTask?: (taskId: string) => void;
  isActive?: boolean;
}

export function DependencyList({
  dependencies,
  onSelectTask,
  isActive = true,
}: DependencyListProps) {
  const { theme } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const allTasks: Task[] = [
    ...(dependencies?.blockedBy || []),
    ...(dependencies?.blocks || []),
  ];

  const totalTasks = allTasks.length;
  const hasBlockedBy = (dependencies?.blockedBy?.length || 0) > 0;
  const hasBlocks = (dependencies?.blocks?.length || 0) > 0;

  useInput((input, key) => {
    if (!isActive || totalTasks === 0) return;

    if (input === 'j' || key.downArrow) {
      const nextIndex = (selectedIndex + 1) % totalTasks;
      setSelectedIndex(nextIndex);
    } else if (input === 'k' || key.upArrow) {
      const prevIndex = (selectedIndex - 1 + totalTasks) % totalTasks;
      setSelectedIndex(prevIndex);
    } else if (key.return && onSelectTask) {
      const selectedTask = allTasks[selectedIndex];
      if (selectedTask) {
        onSelectTask(selectedTask.id);
      }
    }
  }, { isActive });

  if (!dependencies || totalTasks === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor>No dependencies</Text>
      </Box>
    );
  }

  let currentIndex = 0;

  return (
    <Box flexDirection="column">
      {hasBlockedBy && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={theme.colors.warning}>
            Blocked By:
          </Text>
          {dependencies.blockedBy.map((task) => {
            const isSelected = currentIndex === selectedIndex;
            currentIndex++;

            return (
              <Box key={task.id} marginLeft={2}>
                <Text color={isSelected ? theme.colors.highlight : undefined}>
                  {isSelected ? '▎' : '  '}
                </Text>
                <Text bold={isSelected}>
                  ○{' '}
                </Text>
                <StatusBadge status={task.status} />
                <Text bold={isSelected}>
                  {' '}{task.title}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {hasBlocks && (
        <Box flexDirection="column">
          <Text bold color={theme.colors.accent}>
            Blocks:
          </Text>
          {dependencies.blocks.map((task) => {
            const isSelected = currentIndex === selectedIndex;
            currentIndex++;

            return (
              <Box key={task.id} marginLeft={2}>
                <Text color={isSelected ? theme.colors.highlight : undefined}>
                  {isSelected ? '▎' : '  '}
                </Text>
                <Text bold={isSelected}>
                  ○{' '}
                </Text>
                <StatusBadge status={task.status} />
                <Text bold={isSelected}>
                  {' '}{task.title}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
