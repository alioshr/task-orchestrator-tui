import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { useProjectTree } from '../../ui/hooks/use-data';
import { useAdapter } from '../../ui/context/adapter-context';
import { useTheme } from '../../ui/context/theme-context';
import { TreeView, type TreeRow } from '../components/tree-view';
import { StatusBadge } from '../components/status-badge';
import { ViewModeChips } from '../components/view-mode-chips';
import { ConfirmDialog } from '../components/confirm-dialog';
import { FormDialog } from '../components/form-dialog';
import { ErrorMessage } from '../components/error-message';
import { EmptyState } from '../components/empty-state';
import type { FeatureStatus, Priority } from '@allpepper/task-orchestrator';

interface ProjectViewProps {
  projectId: string;
  expandedFeatures: Set<string>;
  onExpandedFeaturesChange: (features: Set<string>) => void;
  expandedGroups: Set<string>;
  onExpandedGroupsChange: (groups: Set<string>) => void;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  viewMode: 'features' | 'status' | 'feature-status';
  onViewModeChange: (mode: 'features' | 'status' | 'feature-status') => void;
  onSelectTask: (taskId: string) => void;
  onSelectFeature: (featureId: string) => void;
  onToggleBoard: () => void;
  onBack: () => void;
}

export function ProjectView({ projectId, expandedFeatures, onExpandedFeaturesChange, expandedGroups, onExpandedGroupsChange, selectedIndex, onSelectedIndexChange, viewMode, onViewModeChange, onSelectTask, onSelectFeature, onToggleBoard, onBack }: ProjectViewProps) {
  const { adapter } = useAdapter();
  const { theme } = useTheme();
  const { project, features, unassignedTasks, taskCounts, statusGroupedRows, featureStatusGroupedRows, loading, error, refresh } = useProjectTree(projectId, expandedGroups);
  const [mode, setMode] = useState<'idle' | 'create-feature' | 'edit-feature' | 'delete-feature' | 'create-task' | 'edit-task' | 'delete-task' | 'feature-status'>('idle');
  const [localError, setLocalError] = useState<string | null>(null);
  const [featureTransitions, setFeatureTransitions] = useState<string[]>([]);
  const [featureTransitionIndex, setFeatureTransitionIndex] = useState(0);

  // Build flat list of rows - switch based on view mode
  const rows = useMemo(() => {
    if (viewMode === 'status') {
      return statusGroupedRows;
    } else if (viewMode === 'feature-status') {
      return featureStatusGroupedRows;
    }

    // Feature-grouped view (original logic)
    const result: TreeRow[] = [];

    for (const feature of features) {
      const isExpanded = expandedFeatures.has(feature.id);
      result.push({
        type: 'feature',
        feature,
        taskCount: feature.tasks.length,
        expanded: isExpanded
      });

      if (isExpanded) {
        feature.tasks.forEach((task, i) => {
          result.push({
            type: 'task',
            task,
            isLast: i === feature.tasks.length - 1,
            depth: 1,
          });
        });
      }
    }

    if (unassignedTasks.length > 0) {
      result.push({ type: 'separator', label: 'Unassigned Tasks' });
      unassignedTasks.forEach((task, i) => {
        result.push({
          type: 'task',
          task,
          isLast: i === unassignedTasks.length - 1
        });
      });
    }

    return result;
  }, [viewMode, statusGroupedRows, featureStatusGroupedRows, features, unassignedTasks, expandedFeatures]);

  // Handle keyboard
  useInput((input, key) => {
    if (mode !== 'idle') return;
    if (key.escape) {
      onBack();
    }
    if (input === 'r') {
      refresh();
    }
    // Cycle view mode with 'v': features → status → feature-status → features
    if (input === 'v') {
      const next = viewMode === 'features' ? 'status' : viewMode === 'status' ? 'feature-status' : 'features';
      onViewModeChange(next);
    }
    if (input === 'b') {
      onToggleBoard();
    }
    if (input === 'n') {
      setMode('create-feature');
    }
    if (input === 't') {
      setMode('create-task');
    }
    // Navigate to feature detail screen
    if (input === 'f') {
      const currentRow = rows[selectedIndex];
      const featureId =
        currentRow?.type === 'feature'
          ? currentRow.feature.id
          : currentRow?.type === 'group'
            ? currentRow.featureId
            : currentRow?.type === 'task'
              ? currentRow.task.featureId
              : undefined;
      if (featureId) onSelectFeature(featureId);
      return;
    }
    if (input === 'e') {
      const currentRow = rows[selectedIndex];
      if (currentRow?.type === 'feature' || (currentRow?.type === 'group' && currentRow.featureId)) {
        setMode('edit-feature');
      } else if (currentRow?.type === 'task') {
        setMode('edit-task');
      }
    }
    if (input === 'd') {
      const currentRow = rows[selectedIndex];
      if (currentRow?.type === 'feature' || (currentRow?.type === 'group' && currentRow.featureId)) {
        setMode('delete-feature');
      } else if (currentRow?.type === 'task') {
        setMode('delete-task');
      }
    }
    if (input === 's') {
      const currentRow = rows[selectedIndex];
      const featureId =
        currentRow?.type === 'feature'
          ? currentRow.feature.id
          : currentRow?.type === 'group'
            ? currentRow.featureId
            : currentRow?.type === 'task'
              ? currentRow.task.featureId
              : undefined;
      const feature = featureId ? features.find((f) => f.id === featureId) : undefined;
      if (feature) {
        adapter.getAllowedTransitions('FEATURE', feature.status).then((result) => {
          if (result.success) {
            setFeatureTransitions(result.data);
            setFeatureTransitionIndex(0);
            setMode('feature-status');
          }
        });
      }
    }
  });

  useInput((input, key) => {
    if (mode !== 'feature-status') return;
    if (input === 'j' || key.downArrow) {
      setFeatureTransitionIndex((prev) => (prev + 1) % Math.max(1, featureTransitions.length));
      return;
    }
    if (input === 'k' || key.upArrow) {
      setFeatureTransitionIndex((prev) => (prev - 1 + Math.max(1, featureTransitions.length)) % Math.max(1, featureTransitions.length));
      return;
    }
    if (key.escape) {
      setMode('idle');
      return;
    }
    if (key.return) {
      const currentRow = rows[selectedIndex];
      const featureId =
        currentRow?.type === 'feature'
          ? currentRow.feature.id
          : currentRow?.type === 'group'
            ? currentRow.featureId
            : currentRow?.type === 'task'
              ? currentRow.task.featureId
              : undefined;
      const feature = featureId ? features.find((f) => f.id === featureId) : undefined;
      const nextStatus = featureTransitions[featureTransitionIndex] as FeatureStatus | undefined;
      if (feature && nextStatus) {
        adapter.setFeatureStatus(feature.id, nextStatus, feature.version).then((result) => {
          if (!result.success) setLocalError(result.error);
          refresh();
          setMode('idle');
        });
      }
    }
  }, { isActive: mode === 'feature-status' });

  // Toggle feature expansion
  const handleToggleFeature = (featureId: string) => {
    const next = new Set(expandedFeatures);
    if (next.has(featureId)) {
      next.delete(featureId);
      // Clamp selectedIndex if it was on a child task
      const featureIndex = rows.findIndex(r => r.type === 'feature' && r.feature.id === featureId);
      if (featureIndex >= 0 && selectedIndex > featureIndex) {
        const nextFeatureIndex = rows.findIndex((r, i) => i > featureIndex && r.type === 'feature');
        if (nextFeatureIndex === -1 || selectedIndex < nextFeatureIndex) {
          onSelectedIndexChange(featureIndex);
        }
      }
    } else {
      next.add(featureId);
    }
    onExpandedFeaturesChange(next);
  };

  // Toggle group expansion (for status groups)
  const handleToggleGroup = (groupId: string) => {
    const next = new Set(expandedGroups);
    if (next.has(groupId)) {
      next.delete(groupId);
    } else {
      next.add(groupId);
    }
    onExpandedGroupsChange(next);
  };

  // Reset selectedIndex to 0 only when viewMode actually changes (not on mount)
  const prevViewMode = useRef(viewMode);
  useEffect(() => {
    if (prevViewMode.current !== viewMode) {
      onSelectedIndexChange(0);
      prevViewMode.current = viewMode;
    }
  }, [viewMode, onSelectedIndexChange]);

  if (loading) {
    return <Box padding={1}><Text>Loading project...</Text></Box>;
  }

  if (error) {
    return <Box padding={1}><Text color={theme.colors.danger}>Error: {error}</Text></Box>;
  }

  if (!project) {
    return <Box padding={1}><Text>Project not found</Text></Box>;
  }

  // Clamp selectedIndex if data changed
  const clampedSelectedIndex = Math.min(selectedIndex, Math.max(0, rows.length - 1));
  const effectiveSelectedIndex = rows.length > 0 ? clampedSelectedIndex : 0;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Project Header */}
      <Box marginBottom={1}>
        <Text bold>{project.name}</Text>
        <Text> </Text>
        <StatusBadge status={project.status} />
        <Text dimColor> — {taskCounts.completed}/{taskCounts.total} tasks completed</Text>
      </Box>

      {/* View Mode Chips */}
      <Box marginBottom={1}>
        <ViewModeChips
          modes={[
            { key: 'features', label: 'Features' },
            { key: 'status', label: 'Status' },
            { key: 'feature-status', label: 'Feature Status' },
          ]}
          activeMode={viewMode}
          onModeChange={(mode) => onViewModeChange(mode as 'features' | 'status' | 'feature-status')}
        />
      </Box>

      {rows.length === 0 ? (
        <EmptyState message="No features or tasks yet." hint="Press n to create a feature." />
      ) : (
        <TreeView
          rows={rows}
          selectedIndex={effectiveSelectedIndex}
          onSelectedIndexChange={onSelectedIndexChange}
          onToggleFeature={handleToggleFeature}
          onToggleGroup={handleToggleGroup}
          onSelectTask={onSelectTask}
          onBack={onBack}
          isActive={mode === 'idle'}
        />
      )}

      {localError ? <ErrorMessage message={localError} onDismiss={() => setLocalError(null)} /> : null}

      {mode === 'create-feature' ? (
        <FormDialog
          title="Create Feature"
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'summary', label: 'Summary', required: true },
            { key: 'description', label: 'Description' },
            { key: 'priority', label: 'Priority (HIGH/MEDIUM/LOW)', value: 'MEDIUM', required: true },
          ]}
          onCancel={() => setMode('idle')}
          onSubmit={(values) => {
            adapter.createFeature({
              projectId,
              name: values.name ?? '',
              summary: values.summary ?? '',
              description: values.description || undefined,
              priority: ((values.priority ?? 'MEDIUM') as Priority),
            }).then((result) => {
              if (!result.success) setLocalError(result.error);
              refresh();
              setMode('idle');
            });
          }}
        />
      ) : null}

      {mode === 'edit-feature' ? (
        (() => {
          const currentRow = rows[selectedIndex];
          const featureId =
            currentRow?.type === 'feature'
              ? currentRow.feature.id
              : currentRow?.type === 'group'
                ? currentRow.featureId
                : undefined;
          const feature = featureId ? features.find((f) => f.id === featureId) : undefined;
          if (!feature) return null;
          return (
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
          );
        })()
      ) : null}

      {mode === 'delete-feature' ? (
        (() => {
          const currentRow = rows[selectedIndex];
          const featureId =
            currentRow?.type === 'feature'
              ? currentRow.feature.id
              : currentRow?.type === 'group'
                ? currentRow.featureId
                : undefined;
          const feature = featureId ? features.find((f) => f.id === featureId) : undefined;
          if (!feature) return null;
          return (
            <ConfirmDialog
              title="Delete Feature"
              message={`Delete "${feature.name}" and all its tasks?`}
              onCancel={() => setMode('idle')}
              onConfirm={() => {
                adapter.deleteFeature(feature.id, { cascade: true }).then((result) => {
                  if (!result.success) setLocalError(result.error);
                  refresh();
                  setMode('idle');
                });
              }}
            />
          );
        })()
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
            const currentRow = rows[selectedIndex];
            const featureId =
              currentRow?.type === 'feature'
                ? currentRow.feature.id
                : currentRow?.type === 'group'
                  ? currentRow.featureId
                  : currentRow?.type === 'task'
                    ? currentRow.task.featureId
                    : undefined;
            adapter.createTask({
              projectId,
              featureId,
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

      {mode === 'edit-task' ? (
        (() => {
          const currentRow = rows[selectedIndex];
          if (!currentRow || currentRow.type !== 'task') return null;
          const task = currentRow.task;
          return (
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
                  if (!result.success) setLocalError(result.error);
                  refresh();
                  setMode('idle');
                });
              }}
            />
          );
        })()
      ) : null}

      {mode === 'delete-task' ? (
        (() => {
          const currentRow = rows[selectedIndex];
          if (!currentRow || currentRow.type !== 'task') return null;
          const task = currentRow.task;
          return (
            <ConfirmDialog
              title="Delete Task"
              message={`Delete "${task.title}"?`}
              onCancel={() => setMode('idle')}
              onConfirm={() => {
                adapter.deleteTask(task.id).then((result) => {
                  if (!result.success) setLocalError(result.error);
                  refresh();
                  setMode('idle');
                });
              }}
            />
          );
        })()
      ) : null}

      {mode === 'feature-status' ? (
        <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.highlight} paddingX={1} marginTop={1}>
          <Text bold>Set Feature Status</Text>
          {featureTransitions.length === 0 ? (
            <Text dimColor>No transitions available</Text>
          ) : (
            featureTransitions.map((status, idx) => (
              <Text key={status} inverse={idx === featureTransitionIndex}>
                {idx === featureTransitionIndex ? '>' : ' '} {status}
              </Text>
            ))
          )}
          <Text dimColor>Enter apply • Esc cancel</Text>
        </Box>
      ) : null}
    </Box>
  );
}
