import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTask } from '../../ui/hooks/use-data';
import { useAdapter } from '../../ui/context/adapter-context';
import { StatusBadge } from '../components/status-badge';
import { PriorityBadge } from '../components/priority-badge';
import { SectionList } from '../components/section-list';
import { DependencyList } from '../components/dependency-list';
import { StatusActions } from '../components/status-actions';
import { timeAgo } from '../../ui/lib/format';
import type { TaskStatus } from 'task-orchestrator-bun/src/domain/types';

interface TaskDetailProps {
  taskId: string;
  onSelectTask: (taskId: string) => void;
  onBack: () => void;
}

type ActivePanel = 'sections' | 'dependencies' | 'status';

export function TaskDetail({ taskId, onSelectTask, onBack }: TaskDetailProps) {
  const { task, sections, dependencies, loading, error, refresh } = useTask(taskId);
  const { adapter } = useAdapter();
  const [activePanel, setActivePanel] = useState<ActivePanel>('sections');
  const [allowedTransitions, setAllowedTransitions] = useState<string[]>([]);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);

  // Fetch allowed transitions when task loads
  useEffect(() => {
    if (task) {
      adapter.getAllowedTransitions('TASK', task.status).then(result => {
        if (result.success) {
          setAllowedTransitions(result.data);
        }
      });
    }
  }, [adapter, task]);

  // Handle keyboard navigation
  useInput((input, key) => {
    if (key.escape) {
      onBack();
    }
    if (input === 'r') {
      refresh();
    }
    if (key.tab) {
      // Cycle through panels
      setActivePanel(current => {
        if (current === 'sections') return 'dependencies';
        if (current === 'dependencies') return 'status';
        return 'sections';
      });
    }
  });

  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;

    setIsUpdatingStatus(true);
    setStatusError(null);

    const result = await adapter.setTaskStatus(taskId, newStatus as TaskStatus, task.version);

    if (result.success) {
      // Refresh task data to get updated version
      await refresh();
    } else {
      setStatusError(result.error);
    }

    setIsUpdatingStatus(false);
  };

  if (loading) {
    return (
      <Box padding={1}>
        <Text>Loading task...</Text>
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

  if (!task) {
    return (
      <Box padding={1}>
        <Text>Task not found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Task Header */}
      <Box marginBottom={1}>
        <Text bold>{task.title}</Text>
        <Text> </Text>
        <StatusBadge status={task.status} />
      </Box>

      {/* Task Metadata */}
      <Box marginBottom={1}>
        <Text>Priority: </Text>
        <PriorityBadge priority={task.priority} />
        <Text>  Modified: </Text>
        <Text dimColor>{timeAgo(new Date(task.modifiedAt))}</Text>
      </Box>

      {/* Task Summary */}
      {task.summary && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Summary</Text>
          <Box marginLeft={1}>
            <Text>{task.summary}</Text>
          </Box>
        </Box>
      )}

      {/* Task Description */}
      {task.description && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Description</Text>
          <Box marginLeft={1}>
            <Text wrap="wrap">{task.description}</Text>
          </Box>
        </Box>
      )}

      {/* Sections Panel */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={0}>
          <Text bold={activePanel === 'sections'} dimColor={activePanel !== 'sections'}>
            Sections
          </Text>
        </Box>
        <SectionList
          sections={sections}
          selectedIndex={selectedSectionIndex}
          onSelectedIndexChange={setSelectedSectionIndex}
          isActive={activePanel === 'sections'}
        />
      </Box>

      {/* Dependencies Panel */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={0}>
          <Text bold={activePanel === 'dependencies'} dimColor={activePanel !== 'dependencies'}>
            Dependencies
          </Text>
        </Box>
        <DependencyList
          dependencies={dependencies}
          isActive={activePanel === 'dependencies'}
          onSelectTask={onSelectTask}
        />
      </Box>

      {/* Status Panel */}
      <Box flexDirection="column">
        <Box marginBottom={0}>
          <Text bold={activePanel === 'status'} dimColor={activePanel !== 'status'}>
            Status
          </Text>
        </Box>
        <StatusActions
          currentStatus={task.status}
          allowedTransitions={allowedTransitions}
          isActive={activePanel === 'status'}
          loading={isUpdatingStatus}
          onTransition={handleStatusChange}
        />
        {statusError && (
          <Box marginTop={1}>
            <Text color="red">Error: {statusError}</Text>
          </Box>
        )}
      </Box>

      {/* Help Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          ESC: Back | Tab: Switch Panel | r: Refresh
        </Text>
      </Box>
    </Box>
  );
}
