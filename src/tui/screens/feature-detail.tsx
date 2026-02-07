import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAdapter } from '../../ui/context/adapter-context';
import { useFeature } from '../../ui/hooks/use-data';
import type { FeatureStatus, Priority } from '@allpepper/task-orchestrator';
import { StatusBadge } from '../components/status-badge';
import { PriorityBadge } from '../components/priority-badge';
import { SectionList } from '../components/section-list';
import { timeAgo } from '../../ui/lib/format';
import { FormDialog } from '../components/form-dialog';
import { ErrorMessage } from '../components/error-message';
import { EmptyState } from '../components/empty-state';
import { useTheme } from '../../ui/context/theme-context';

interface FeatureDetailProps {
  featureId: string;
  onSelectTask: (taskId: string) => void;
  onBack: () => void;
}

export function FeatureDetail({ featureId, onSelectTask, onBack }: FeatureDetailProps) {
  const { adapter } = useAdapter();
  const { theme } = useTheme();
  const { feature, tasks, sections, loading, error, refresh } = useFeature(featureId);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [mode, setMode] = useState<'idle' | 'edit-feature' | 'create-task' | 'feature-status'>('idle');
  const [localError, setLocalError] = useState<string | null>(null);
  const [transitions, setTransitions] = useState<string[]>([]);
  const [transitionIndex, setTransitionIndex] = useState(0);

  // Handle keyboard navigation
  useInput((input, key) => {
    if (mode !== 'idle') return;
    if (key.escape || input === 'h' || key.leftArrow) {
      onBack();
    }
    if (input === 'r') {
      refresh();
    }
    if (input === 'e' && feature) {
      setMode('edit-feature');
    }
    if (input === 'n' && feature) {
      setMode('create-task');
    }
    if (input === 's' && feature) {
      adapter.getAllowedTransitions('FEATURE', feature.status).then((result) => {
        if (result.success) {
          setTransitions(result.data);
          setTransitionIndex(0);
          setMode('feature-status');
        }
      });
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

  useInput((input, key) => {
    if (mode !== 'feature-status' || !feature) return;
    if (input === 'j' || key.downArrow) {
      setTransitionIndex((prev) => (prev + 1) % Math.max(1, transitions.length));
      return;
    }
    if (input === 'k' || key.upArrow) {
      setTransitionIndex((prev) => (prev - 1 + Math.max(1, transitions.length)) % Math.max(1, transitions.length));
      return;
    }
    if (key.escape) {
      setMode('idle');
      return;
    }
    if (key.return) {
      const nextStatus = transitions[transitionIndex] as FeatureStatus | undefined;
      if (!nextStatus) return;
      adapter.setFeatureStatus(feature.id, nextStatus, feature.version).then((result) => {
        if (!result.success) setLocalError(result.error);
        refresh();
        setMode('idle');
      });
    }
  }, { isActive: mode === 'feature-status' });

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
        <Text color={theme.colors.danger}>Error: {error}</Text>
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

      {/* Divider */}
      <Box marginY={0}>
        <Text dimColor>{'─'.repeat(40)}</Text>
      </Box>

      {/* Feature Metadata */}
      <Box marginBottom={1}>
        <Text>Priority: </Text>
        <PriorityBadge priority={feature.priority} />
        <Text>  Modified: </Text>
        <Text dimColor>{timeAgo(new Date(feature.modifiedAt))}</Text>
      </Box>

      {/* Divider */}
      <Box marginY={0}>
        <Text dimColor>{'─'.repeat(40)}</Text>
      </Box>

      {/* Feature Details (summary) */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Details</Text>
        <Box marginLeft={1}>
          <Text wrap="wrap">{feature.summary}</Text>
        </Box>
      </Box>

      {/* Divider */}
      {feature.description && (
        <Box marginY={0}>
          <Text dimColor>{'─'.repeat(40)}</Text>
        </Box>
      )}

      {/* Feature Description */}
      {feature.description && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Description</Text>
          <Box marginLeft={1}>
            <Text wrap="wrap">{feature.description}</Text>
          </Box>
        </Box>
      )}

      {/* Divider */}
      <Box marginY={0}>
        <Text dimColor>{'─'.repeat(40)}</Text>
      </Box>

      {/* Tasks List */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Tasks ({tasks.length})</Text>
        {tasks.length === 0 ? (
          <Box marginLeft={1}><EmptyState message="No tasks" hint="Press n to create one." /></Box>
        ) : (
          <Box flexDirection="column" marginLeft={1}>
            {tasks.map((task, index) => {
              const isSelected = index === selectedTaskIndex;
              return (
                <Box key={task.id}>
                  <Text color={isSelected ? theme.colors.highlight : undefined}>
                    {isSelected ? '▎' : '  '}
                  </Text>
                  <Text> </Text>
                  <StatusBadge status={task.status} />
                  <Text> </Text>
                  <Text bold={isSelected}>
                    {task.title}
                  </Text>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Divider */}
      {sections.length > 0 && (
        <Box marginY={0}>
          <Text dimColor>{'─'.repeat(40)}</Text>
        </Box>
      )}

      {/* Sections Panel - only show if there are sections */}
      {sections.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Sections</Text>
          <SectionList
            sections={sections}
            selectedIndex={selectedSectionIndex}
            onSelectedIndexChange={setSelectedSectionIndex}
            isActive={true}
          />
        </Box>
      )}

      {/* Help Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          ESC/h: Back | r: Refresh | n: New Task | e: Edit Feature | s: Feature Status{tasks.length > 0 ? ' | j/k: Navigate | Enter: Select Task' : ''}
        </Text>
      </Box>

      {localError ? <ErrorMessage message={localError} onDismiss={() => setLocalError(null)} /> : null}

      {mode === 'edit-feature' ? (
        <FormDialog
          title="Edit Feature"
          fields={[
            { key: 'name', label: 'Name', required: true, value: feature.name },
            { key: 'summary', label: 'Summary', required: true, value: feature.summary },
            { key: 'description', label: 'Description', value: feature.description ?? '' },
            { key: 'priority', label: 'Priority (HIGH/MEDIUM/LOW)', required: true, value: feature.priority },
          ]}
          onCancel={() => setMode('idle')}
          onSubmit={(values) => {
            adapter.updateFeature(feature.id, {
              name: values.name ?? '',
              summary: values.summary ?? '',
              description: values.description || undefined,
              priority: ((values.priority ?? feature.priority) as Priority),
              version: feature.version,
            }).then((result) => {
              if (!result.success) setLocalError(result.error);
              refresh();
              setMode('idle');
            });
          }}
        />
      ) : null}

      {mode === 'create-task' ? (
        <FormDialog
          title="Create Task"
          fields={[
            { key: 'title', label: 'Title', required: true },
            { key: 'summary', label: 'Summary', required: true },
            { key: 'description', label: 'Description' },
            { key: 'priority', label: 'Priority (HIGH/MEDIUM/LOW)', required: true, value: 'MEDIUM' },
            { key: 'complexity', label: 'Complexity (1-10)', required: true, value: '3' },
          ]}
          onCancel={() => setMode('idle')}
          onSubmit={(values) => {
            adapter.createTask({
              featureId: feature.id,
              title: values.title ?? '',
              summary: values.summary ?? '',
              description: values.description || undefined,
              priority: ((values.priority ?? 'MEDIUM') as Priority),
              complexity: Number.parseInt(values.complexity ?? '3', 10) || 3,
            }).then((result) => {
              if (!result.success) setLocalError(result.error);
              refresh();
              setMode('idle');
            });
          }}
        />
      ) : null}

      {mode === 'feature-status' ? (
        <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.accent} paddingX={1} marginTop={1}>
          <Text bold>Set Feature Status</Text>
          {transitions.length === 0 ? (
            <Text dimColor>No transitions available</Text>
          ) : (
            transitions.map((status, idx) => {
              const isSelected = idx === transitionIndex;
              return (
                <Box key={status}>
                  <Text color={isSelected ? theme.colors.highlight : undefined}>
                    {isSelected ? '▎' : '  '}
                  </Text>
                  <Text bold={isSelected}> {status}</Text>
                </Box>
              );
            })
          )}
          <Text dimColor>Enter apply • Esc cancel</Text>
        </Box>
      ) : null}
    </Box>
  );
}
