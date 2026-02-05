import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { useProjectTree } from '../../ui/hooks/use-data';
import { TreeView, type TreeRow } from '../components/tree-view';
import { StatusBadge } from '../components/status-badge';

interface ProjectViewProps {
  projectId: string;
  onSelectTask: (taskId: string) => void;
  onBack: () => void;
}

export function ProjectView({ projectId, onSelectTask, onBack }: ProjectViewProps) {
  const { project, features, unassignedTasks, taskCounts, loading, error, refresh } = useProjectTree(projectId);
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Build flat list of rows
  const rows = useMemo(() => {
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
            isLast: i === feature.tasks.length - 1
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
  }, [features, unassignedTasks, expandedFeatures]);

  // Handle keyboard
  useInput((input, key) => {
    if (key.escape) {
      onBack();
    }
    if (input === 'r') {
      refresh();
    }
  });

  // Toggle feature expansion
  const handleToggleFeature = (featureId: string) => {
    setExpandedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
        // Clamp selectedIndex if it was on a child task
        const featureIndex = rows.findIndex(r => r.type === 'feature' && r.feature.id === featureId);
        if (featureIndex >= 0 && selectedIndex > featureIndex) {
          const nextFeatureIndex = rows.findIndex((r, i) => i > featureIndex && r.type === 'feature');
          if (nextFeatureIndex === -1 || selectedIndex < nextFeatureIndex) {
            setSelectedIndex(featureIndex);
          }
        }
      } else {
        next.add(featureId);
      }
      return next;
    });
  };

  if (loading) {
    return <Box padding={1}><Text>Loading project...</Text></Box>;
  }

  if (error) {
    return <Box padding={1}><Text color="red">Error: {error}</Text></Box>;
  }

  if (!project) {
    return <Box padding={1}><Text>Project not found</Text></Box>;
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Project Header */}
      <Box marginBottom={1}>
        <Text bold>{project.name}</Text>
        <Text> </Text>
        <StatusBadge status={project.status} />
        <Text dimColor> — {taskCounts.completed}/{taskCounts.total} tasks completed</Text>
      </Box>

      {rows.length === 0 ? (
        <Text dimColor>No features or tasks yet.</Text>
      ) : (
        <TreeView
          rows={rows}
          selectedIndex={selectedIndex}
          onSelectedIndexChange={setSelectedIndex}
          onToggleFeature={handleToggleFeature}
          onSelectTask={onSelectTask}
        />
      )}
    </Box>
  );
}
