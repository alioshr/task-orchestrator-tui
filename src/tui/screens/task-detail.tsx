import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTask } from '../../ui/hooks/use-data';
import { useAdapter } from '../../ui/context/adapter-context';
import { useTheme } from '../../ui/context/theme-context';
import { StatusBadge } from '../components/status-badge';
import { PriorityBadge } from '../components/priority-badge';
import { SectionList } from '../components/section-list';
import { DependencyList } from '../components/dependency-list';
import { StatusActions } from '../components/status-actions';
import { timeAgo } from '../../ui/lib/format';
import type { Priority } from '@allpepper/task-orchestrator';
import type { WorkflowState } from '../../ui/adapters/types';
import { FormDialog } from '../components/form-dialog';
import { ConfirmDialog } from '../components/confirm-dialog';
import { ErrorMessage } from '../components/error-message';

interface TaskDetailProps {
  taskId: string;
  onSelectTask: (taskId: string) => void;
  onBack: () => void;
}

type ActivePanel = 'sections' | 'dependencies' | 'status';

export function TaskDetail({ taskId, onSelectTask, onBack }: TaskDetailProps) {
  const { task, sections, dependencies, loading, error, refresh } = useTask(taskId);
  const { adapter } = useAdapter();
  const { theme } = useTheme();
  const [activePanel, setActivePanel] = useState<ActivePanel>('sections');
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [mode, setMode] = useState<'idle' | 'edit' | 'delete'>('idle');

  // Fetch workflow state when task loads
  useEffect(() => {
    if (task) {
      adapter.getWorkflowState('task', task.id).then(result => {
        if (result.success) {
          setWorkflowState(result.data);
        }
      });
    }
  }, [adapter, task]);

  // Set initial panel based on available content
  useEffect(() => {
    if (sections.length === 0 && activePanel === 'sections') {
      setActivePanel('dependencies');
    }
  }, [sections, activePanel]);

  // Handle keyboard navigation
  useInput((input, key) => {
    if (mode !== 'idle') return;
    if (key.escape || input === 'h' || key.leftArrow) {
      onBack();
    }
    if (input === 'r') {
      refresh();
    }
    if (key.tab) {
      setActivePanel(current => {
        if (current === 'sections') return 'dependencies';
        if (current === 'dependencies') return 'status';
        return sections.length > 0 ? 'sections' : 'dependencies';
      });
    }
    if (input === 'e' && task) {
      setMode('edit');
    }
    if (input === 'd' && task) {
      setMode('delete');
    }
  });

  // Pipeline operations
  const handleAdvance = async () => {
    if (!task) return;
    setIsUpdatingStatus(true);
    setStatusError(null);
    const result = await adapter.advance('task', taskId, task.version);
    if (!result.success) {
      setStatusError(result.error);
    }
    await refresh();
    setIsUpdatingStatus(false);
  };

  const handleRevert = async () => {
    if (!task) return;
    setIsUpdatingStatus(true);
    setStatusError(null);
    const result = await adapter.revert('task', taskId, task.version);
    if (!result.success) {
      setStatusError(result.error);
    }
    await refresh();
    setIsUpdatingStatus(false);
  };

  const handleTerminate = async () => {
    if (!task) return;
    setIsUpdatingStatus(true);
    setStatusError(null);
    const result = await adapter.terminate('task', taskId, task.version);
    if (!result.success) {
      setStatusError(result.error);
    }
    await refresh();
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
        <Text color={theme.colors.danger}>Error: {error}</Text>
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
        {task.blockedBy.length > 0 && (
          <Text color={theme.colors.blocked}> [BLOCKED]</Text>
        )}
      </Box>

      {/* Divider */}
      <Box marginY={0}>
        <Text dimColor>{'─'.repeat(40)}</Text>
      </Box>

      {/* Task Metadata */}
      <Box marginBottom={1}>
        <Text>Priority: </Text>
        <PriorityBadge priority={task.priority} />
        <Text>  Modified: </Text>
        <Text dimColor>{timeAgo(new Date(task.modifiedAt))}</Text>
        <Text>  ID: </Text>
        <Text dimColor>{task.id}</Text>
      </Box>

      {/* Divider */}
      {task.summary && (
        <Box marginY={0}>
          <Text dimColor>{'─'.repeat(40)}</Text>
        </Box>
      )}

      {/* Task Details (summary) */}
      {task.summary && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Details</Text>
          <Box marginLeft={1}>
            <Text wrap="wrap">{task.summary}</Text>
          </Box>
        </Box>
      )}

      {/* Divider */}
      {task.description && (
        <Box marginY={0}>
          <Text dimColor>{'─'.repeat(40)}</Text>
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

      {/* Divider */}
      <Box marginY={0}>
        <Text dimColor>{'─'.repeat(40)}</Text>
      </Box>

      {/* Sections Panel */}
      {sections.length > 0 && (
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
      )}

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
          nextStatus={workflowState?.nextStatus ?? null}
          prevStatus={workflowState?.prevStatus ?? null}
          isBlocked={task.blockedBy.length > 0}
          isTerminal={workflowState?.isTerminal ?? false}
          isActive={activePanel === 'status'}
          loading={isUpdatingStatus}
          onAdvance={handleAdvance}
          onRevert={handleRevert}
          onTerminate={handleTerminate}
        />
        {statusError && (
          <Box marginTop={1}>
            <Text color={theme.colors.danger}>Error: {statusError}</Text>
          </Box>
        )}
      </Box>

      {/* Help Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          ESC/h: Back | Tab: Switch Panel | r: Refresh | e: Edit | d: Delete
        </Text>
      </Box>

      {statusError ? <ErrorMessage message={statusError} onDismiss={() => setStatusError(null)} /> : null}

      {mode === 'edit' ? (
        <FormDialog
          title="Edit Task"
          fields={[
            { key: 'title', label: 'Title', required: true, value: task.title },
            { key: 'summary', label: 'Summary', required: true, value: task.summary },
            { key: 'description', label: 'Description', value: task.description ?? '' },
            { key: 'priority', label: 'Priority (HIGH/MEDIUM/LOW)', required: true, value: task.priority },
            { key: 'complexity', label: 'Complexity (1-10)', required: true, value: String(task.complexity) },
          ]}
          onCancel={() => setMode('idle')}
          onSubmit={(values) => {
            adapter.updateTask(task.id, {
              title: values.title ?? '',
              summary: values.summary ?? '',
              description: values.description || undefined,
              priority: ((values.priority ?? task.priority) as Priority),
              complexity: Number.parseInt(values.complexity ?? String(task.complexity), 10) || task.complexity,
              version: task.version,
            }).then((result) => {
              if (!result.success) {
                setStatusError(result.error);
              }
              refresh();
              setMode('idle');
            });
          }}
        />
      ) : null}

      {mode === 'delete' ? (
        <ConfirmDialog
          title="Delete Task"
          message={`Delete "${task.title}"?`}
          onCancel={() => setMode('idle')}
          onConfirm={() => {
            adapter.deleteTask(task.id).then((result) => {
              if (!result.success) {
                setStatusError(result.error);
                setMode('idle');
                return;
              }
              onBack();
            });
          }}
        />
      ) : null}
    </Box>
  );
}
