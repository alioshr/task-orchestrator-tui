import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { useProjectTree } from '../../ui/hooks/use-data';
import { TreeView, type TreeRow } from '../components/tree-view';
import { StatusBadge } from '../components/status-badge';
import { ViewModeChips } from '../components/view-mode-chips';

interface ProjectViewProps {
  projectId: string;
  expandedFeatures: Set<string>;
  onExpandedFeaturesChange: (features: Set<string>) => void;
  expandedGroups: Set<string>;
  onExpandedGroupsChange: (groups: Set<string>) => void;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  viewMode: 'features' | 'status';
  onViewModeChange: (mode: 'features' | 'status') => void;
  onSelectTask: (taskId: string) => void;
  onSelectFeature: (featureId: string) => void;
  onBack: () => void;
}

export function ProjectView({ projectId, expandedFeatures, onExpandedFeaturesChange, expandedGroups, onExpandedGroupsChange, selectedIndex, onSelectedIndexChange, viewMode, onViewModeChange, onSelectTask, onSelectFeature, onBack }: ProjectViewProps) {
  const { project, features, unassignedTasks, taskCounts, statusGroupedRows, loading, error, refresh } = useProjectTree(projectId, expandedGroups);

  // Build flat list of rows - switch based on view mode
  const rows = useMemo(() => {
    if (viewMode === 'status') {
      return statusGroupedRows;
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
  }, [viewMode, statusGroupedRows, features, unassignedTasks, expandedFeatures]);

  // Handle keyboard
  useInput((input, key) => {
    if (key.escape) {
      onBack();
    }
    if (input === 'r') {
      refresh();
    }
    // Toggle view mode with 'v'
    if (input === 'v') {
      onViewModeChange(viewMode === 'features' ? 'status' : 'features');
    }
    // When on a feature row, 'f' opens feature detail
    if (input === 'f') {
      const currentRow = rows[selectedIndex];
      if (currentRow?.type === 'feature') {
        onSelectFeature(currentRow.feature.id);
      } else if (currentRow?.type === 'group' && currentRow.featureId) {
        // Status view feature subgroup row
        onSelectFeature(currentRow.featureId);
      } else if (currentRow?.type === 'task' && currentRow.task.featureId) {
        // If on a task row, open its parent feature detail
        onSelectFeature(currentRow.task.featureId);
      }
    }
  });

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
    return <Box padding={1}><Text color="red">Error: {error}</Text></Box>;
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
          ]}
          activeMode={viewMode}
          onModeChange={(mode) => onViewModeChange(mode as 'features' | 'status')}
        />
      </Box>

      {rows.length === 0 ? (
        <Text dimColor>No features or tasks yet.</Text>
      ) : (
        <TreeView
          rows={rows}
          selectedIndex={effectiveSelectedIndex}
          onSelectedIndexChange={onSelectedIndexChange}
          onToggleFeature={handleToggleFeature}
          onToggleGroup={handleToggleGroup}
          onSelectTask={onSelectTask}
          onSelectFeature={onSelectFeature}
          onBack={onBack}
        />
      )}
    </Box>
  );
}
