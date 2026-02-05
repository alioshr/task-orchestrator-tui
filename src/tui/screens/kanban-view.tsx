import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useKanban } from '../../ui/hooks/use-kanban';
import { useAdapter } from '../../ui/context/adapter-context';
import { KanbanBoard } from '../components/kanban-board';

interface KanbanViewProps {
  projectId: string;
  onSelectTask: (taskId: string) => void;
  onBack: () => void;
}

export function KanbanView({ projectId, onSelectTask, onBack }: KanbanViewProps) {
  const { adapter } = useAdapter();
  const { columns, loading, error, refresh, moveTask } = useKanban(projectId);
  const [projectName, setProjectName] = useState<string>('');
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);

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
          setSelectedTaskIndex(-1);
        } else if (selectedTaskIndex >= activeColumn.tasks.length) {
          setSelectedTaskIndex(0);
        } else if (selectedTaskIndex < 0 && activeColumn.tasks.length > 0) {
          setSelectedTaskIndex(0);
        }
      }
    }
  }, [activeColumnIndex, columns, selectedTaskIndex]);

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
    setActiveColumnIndex(index);
  };

  // Handle task change
  const handleTaskChange = (index: number) => {
    setSelectedTaskIndex(index);
  };

  // Handle move task
  const handleMoveTask = async (taskId: string, newStatus: string) => {
    await moveTask(taskId, newStatus);
    // After move, stay on same column but adjust index if needed
    if (columns.length > 0 && activeColumnIndex < columns.length) {
      const activeColumn = columns[activeColumnIndex];
      if (activeColumn) {
        if (activeColumn.tasks.length === 0) {
          setSelectedTaskIndex(-1);
        } else if (selectedTaskIndex >= activeColumn.tasks.length) {
          setSelectedTaskIndex(Math.max(0, activeColumn.tasks.length - 1));
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
          activeColumnIndex={activeColumnIndex}
          selectedTaskIndex={selectedTaskIndex}
          onColumnChange={handleColumnChange}
          onTaskChange={handleTaskChange}
          onSelectTask={onSelectTask}
          onMoveTask={handleMoveTask}
          isActive={true}
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
