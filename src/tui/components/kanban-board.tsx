import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { BoardColumn } from '../../ui/lib/types';
import { KanbanColumn } from './kanban-column';

interface KanbanBoardProps {
  columns: BoardColumn[];
  activeColumnIndex: number;
  selectedTaskIndex: number; // Index within active column, -1 if none
  onColumnChange: (index: number) => void;
  onTaskChange: (index: number) => void;
  onSelectTask: (taskId: string) => void;
  onMoveTask?: (taskId: string, newStatus: string) => void;
  isActive?: boolean;
  availableHeight?: number;
}

export function KanbanBoard({
  columns,
  activeColumnIndex,
  selectedTaskIndex,
  onColumnChange,
  onTaskChange,
  onSelectTask,
  onMoveTask,
  isActive = true,
  availableHeight,
}: KanbanBoardProps) {
  const [isMoveMode, setIsMoveMode] = useState(false);

  useInput(
    (input, key) => {
      if (!isActive || columns.length === 0) return;

      // Move mode handling
      if (isMoveMode) {
        const activeColumn = columns[activeColumnIndex];
        const activeTask = activeColumn?.tasks[selectedTaskIndex];

        if (key.escape) {
          setIsMoveMode(false);
          return;
        }

        if (!onMoveTask || !activeTask) {
          setIsMoveMode(false);
          return;
        }

        // Move task left
        if (input === 'h' || key.leftArrow) {
          if (activeColumnIndex > 0) {
            const targetColumn = columns[activeColumnIndex - 1];
            if (targetColumn) {
              onMoveTask(activeTask.id, targetColumn.status);
              setIsMoveMode(false);
            }
          }
          return;
        }

        // Move task right
        if (input === 'l' || key.rightArrow) {
          if (activeColumnIndex < columns.length - 1) {
            const targetColumn = columns[activeColumnIndex + 1];
            if (targetColumn) {
              onMoveTask(activeTask.id, targetColumn.status);
              setIsMoveMode(false);
            }
          }
          return;
        }

        return;
      }

      // Normal mode handling
      // Enter move mode
      if (input === 'm') {
        const activeColumn = columns[activeColumnIndex];
        if (activeColumn && activeColumn.tasks.length > 0 && selectedTaskIndex >= 0) {
          setIsMoveMode(true);
        }
        return;
      }

      // Column navigation
      if (input === 'h' || key.leftArrow) {
        const newIndex = (activeColumnIndex - 1 + columns.length) % columns.length;
        onColumnChange(newIndex);
        // Reset task selection to first task in new column
        const newColumn = columns[newIndex];
        if (newColumn && newColumn.tasks.length > 0) {
          onTaskChange(0);
        } else {
          onTaskChange(-1);
        }
        return;
      }

      if (input === 'l' || key.rightArrow) {
        const newIndex = (activeColumnIndex + 1) % columns.length;
        onColumnChange(newIndex);
        // Reset task selection to first task in new column
        const newColumn = columns[newIndex];
        if (newColumn && newColumn.tasks.length > 0) {
          onTaskChange(0);
        } else {
          onTaskChange(-1);
        }
        return;
      }

      // Task navigation within column
      const activeColumn = columns[activeColumnIndex];
      if (!activeColumn || activeColumn.tasks.length === 0) return;

      if (input === 'j' || key.downArrow) {
        const maxIndex = activeColumn.tasks.length - 1;
        const newIndex = selectedTaskIndex >= maxIndex ? 0 : selectedTaskIndex + 1;
        onTaskChange(newIndex);
        return;
      }

      if (input === 'k' || key.upArrow) {
        const maxIndex = activeColumn.tasks.length - 1;
        const newIndex = selectedTaskIndex <= 0 ? maxIndex : selectedTaskIndex - 1;
        onTaskChange(newIndex);
        return;
      }

      // Select task
      if (key.return) {
        const task = activeColumn.tasks[selectedTaskIndex];
        if (task) {
          onSelectTask(task.id);
        }
        return;
      }
    },
    { isActive }
  );

  return (
    <Box flexDirection="column">
      {/* Columns */}
      <Box flexDirection="row">
        {columns.map((column, index) => {
          const isColumnActive = isActive && index === activeColumnIndex;
          const taskIndex = isColumnActive ? selectedTaskIndex : -1;

          return (
            <KanbanColumn
              key={column.id}
              column={column}
              isActiveColumn={isColumnActive}
              selectedTaskIndex={taskIndex}
              availableHeight={availableHeight}
            />
          );
        })}
      </Box>

      {/* Move mode indicator */}
      {isMoveMode && (
        <Box marginTop={1} borderStyle="round" borderColor="yellow" paddingX={1}>
          <Text color="yellow" bold>
            MOVE: ←/→ to move, Esc cancel
          </Text>
        </Box>
      )}
    </Box>
  );
}
