import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { useKanban } from '../../ui/hooks/use-kanban';
import { useAdapter } from '../../ui/context/adapter-context';
import { KanbanBoard } from '../components/kanban-board';

interface KanbanViewProps {
  projectId: string;
  activeColumnIndex: number;
  onActiveColumnIndexChange: (index: number) => void;
  selectedTaskIndex: number;
  onSelectedTaskIndexChange: (index: number) => void;
  onSelectTask: (taskId: string) => void;
  onBack: () => void;
}

export function KanbanView({ projectId, activeColumnIndex, onActiveColumnIndexChange, selectedTaskIndex, onSelectedTaskIndexChange, onSelectTask, onBack }: KanbanViewProps) {
  const { adapter } = useAdapter();
  const { columns, loading, error, refresh, moveTask } = useKanban(projectId);
  const [projectName, setProjectName] = useState<string>('');
  const { stdout } = useStdout();

  // Calculate available height for columns
  // Total terminal rows - header (2 lines) - footer (2 lines) - padding (2 lines)
  const terminalRows = stdout?.rows ?? 24;
  const availableHeight = Math.max(10, terminalRows - 6);

  // Fetch project name
  useEffect(() => {
    const fetchProject = async () => {
      const result = await adapter.getProject(projectId);
      if (result.success) {
        setProjectName(result.data.name);
      }
    };
    fetchProject();
  }, [adapter, projectId]);

  // Reset selectedTaskIndex when activeColumnIndex changes
  useEffect(() => {
    if (columns.length > 0 && activeColumnIndex < columns.length) {
      const activeColumn = columns[activeColumnIndex];
      if (activeColumn) {
        if (activeColumn.tasks.length === 0) {
          onSelectedTaskIndexChange(-1);
        } else if (selectedTaskIndex >= activeColumn.tasks.length) {
          onSelectedTaskIndexChange(0);
        } else if (selectedTaskIndex < 0 && activeColumn.tasks.length > 0) {
          onSelectedTaskIndexChange(0);
        }
      }
    }
  }, [activeColumnIndex, columns, selectedTaskIndex, onSelectedTaskIndexChange]);

  // Handle keyboard
  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (input === 'r') {
      refresh();
      return;
    }
  });

  // Handle column change
  const handleColumnChange = (index: number) => {
    onActiveColumnIndexChange(index);
  };

  // Handle task change
  const handleTaskChange = (index: number) => {
    onSelectedTaskIndexChange(index);
  };

  // Handle move task
  const handleMoveTask = async (taskId: string, newStatus: string) => {
    await moveTask(taskId, newStatus);
    // After move, stay on same column but adjust index if needed
    if (columns.length > 0 && activeColumnIndex < columns.length) {
      const activeColumn = columns[activeColumnIndex];
      if (activeColumn) {
        if (activeColumn.tasks.length === 0) {
          onSelectedTaskIndexChange(-1);
        } else if (selectedTaskIndex >= activeColumn.tasks.length) {
          onSelectedTaskIndexChange(Math.max(0, activeColumn.tasks.length - 1));
        }
      }
    }
  };

  if (loading) {
    return (
      <Box padding={1}>
        <Text>Loading kanban board...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  // Clamp activeColumnIndex and selectedTaskIndex if data changed
  const clampedActiveColumnIndex = Math.min(activeColumnIndex, Math.max(0, columns.length - 1));
  const effectiveActiveColumnIndex = columns.length > 0 ? clampedActiveColumnIndex : 0;

  const activeColumn = columns[effectiveActiveColumnIndex];
  const maxTaskIndex = activeColumn ? Math.max(0, activeColumn.tasks.length - 1) : 0;
  const clampedSelectedTaskIndex = activeColumn && activeColumn.tasks.length > 0
    ? Math.min(selectedTaskIndex, maxTaskIndex)
    : -1;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>{projectName}</Text>
        <Text> - </Text>
        <Text>Kanban Board</Text>
      </Box>

      {/* Kanban Board */}
      {columns.length === 0 ? (
        <Text dimColor>No tasks in this project yet.</Text>
      ) : (
        <KanbanBoard
          columns={columns}
          activeColumnIndex={effectiveActiveColumnIndex}
          selectedTaskIndex={clampedSelectedTaskIndex}
          onColumnChange={handleColumnChange}
          onTaskChange={handleTaskChange}
          onSelectTask={onSelectTask}
          onMoveTask={handleMoveTask}
          isActive={true}
          availableHeight={availableHeight}
        />
      )}

      {/* Footer hints */}
      <Box marginTop={1}>
        <Text dimColor>
          h/l: columns  j/k: tasks  Enter: open  m: move  r: refresh  Esc: back
        </Text>
      </Box>
    </Box>
  );
}
