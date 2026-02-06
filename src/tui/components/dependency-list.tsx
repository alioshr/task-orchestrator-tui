import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Task } from 'task-orchestrator-bun/src/domain/types';
import type { DependencyInfo } from '../../ui/lib/types';
import { StatusBadge } from './status-badge';

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
          <Text bold color="yellow">
            Blocked By:
          </Text>
          {dependencies.blockedBy.map((task) => {
            const isSelected = currentIndex === selectedIndex;
            currentIndex++;

            return (
              <Box key={task.id} marginLeft={2}>
                <Text inverse={isSelected} bold={isSelected}>
                  ○{' '}
                </Text>
                <Text inverse={isSelected} bold={isSelected}>
                  <StatusBadge status={task.status} isSelected={isSelected} />{' '}
                </Text>
                <Text inverse={isSelected} bold={isSelected}>
                  {task.title}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {hasBlocks && (
        <Box flexDirection="column">
          <Text bold color="cyan">
            Blocks:
          </Text>
          {dependencies.blocks.map((task) => {
            const isSelected = currentIndex === selectedIndex;
            currentIndex++;

            return (
              <Box key={task.id} marginLeft={2}>
                <Text inverse={isSelected} bold={isSelected}>
                  ○{' '}
                </Text>
                <Text inverse={isSelected} bold={isSelected}>
                  <StatusBadge status={task.status} isSelected={isSelected} />{' '}
                </Text>
                <Text inverse={isSelected} bold={isSelected}>
                  {task.title}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
