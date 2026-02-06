import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAdapter } from '../../ui/context/adapter-context';
import type { Feature, Task } from 'task-orchestrator-bun/src/domain/types';
import { StatusBadge } from '../components/status-badge';
import { PriorityBadge } from '../components/priority-badge';
import { timeAgo } from '../../ui/lib/format';

interface FeatureDetailProps {
  featureId: string;
  onSelectTask: (taskId: string) => void;
  onBack: () => void;
}

export function FeatureDetail({ featureId, onSelectTask, onBack }: FeatureDetailProps) {
  const { adapter } = useAdapter();
  const [feature, setFeature] = useState<Feature | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [featureResult, tasksResult] = await Promise.all([
      adapter.getFeature(featureId),
      adapter.getTasks({ featureId }),
    ]);
    if (featureResult.success) {
      setFeature(featureResult.data);
    } else {
      setError(featureResult.error);
    }
    if (tasksResult.success) {
      setTasks(tasksResult.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureId]);

  // Handle keyboard navigation
  useInput((input, key) => {
    if (key.escape || input === 'h' || key.leftArrow) {
      onBack();
    }
    if (input === 'r') {
      load();
    }
    if (tasks.length > 0) {
      if (input === 'j' || key.downArrow) {
        setSelectedTaskIndex((prev) => Math.min(prev + 1, tasks.length - 1));
      }
      if (input === 'k' || key.upArrow) {
        setSelectedTaskIndex((prev) => Math.max(prev - 1, 0));
      }
      if (key.return) {
        const selectedTask = tasks[selectedTaskIndex];
        if (selectedTask) {
          onSelectTask(selectedTask.id);
        }
      }
    }
  });

  if (loading) {
    return (
      <Box padding={1}>
        <Text>Loading feature...</Text>
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

  if (!feature) {
    return (
      <Box padding={1}>
        <Text>Feature not found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Feature Header */}
      <Box marginBottom={1}>
        <Text bold>{feature.name}</Text>
        <Text> </Text>
        <StatusBadge status={feature.status} />
      </Box>

      {/* Feature Metadata */}
      <Box marginBottom={1}>
        <Text>Priority: </Text>
        <PriorityBadge priority={feature.priority} />
        <Text>  Modified: </Text>
        <Text dimColor>{timeAgo(new Date(feature.modifiedAt))}</Text>
      </Box>

      {/* Feature Details (summary) */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Details</Text>
        <Box marginLeft={1}>
          <Text wrap="wrap">{feature.summary}</Text>
        </Box>
      </Box>

      {/* Feature Description */}
      {feature.description && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Description</Text>
          <Box marginLeft={1}>
            <Text wrap="wrap">{feature.description}</Text>
          </Box>
        </Box>
      )}

      {/* Tasks List */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Tasks ({tasks.length})</Text>
        {tasks.length === 0 ? (
          <Box marginLeft={1}>
            <Text dimColor>No tasks</Text>
          </Box>
        ) : (
          <Box flexDirection="column" marginLeft={1}>
            {tasks.map((task, index) => (
              <Box key={task.id}>
                <Text color={index === selectedTaskIndex ? 'cyan' : undefined}>
                  {index === selectedTaskIndex ? '>' : ' '}
                </Text>
                <Text> </Text>
                <StatusBadge status={task.status} />
                <Text> </Text>
                <Text color={index === selectedTaskIndex ? 'cyan' : undefined}>
                  {task.title}
                </Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Help Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          ESC/h: Back | r: Refresh{tasks.length > 0 ? ' | j/k: Navigate | Enter: Select Task' : ''}
        </Text>
      </Box>
    </Box>
  );
}
