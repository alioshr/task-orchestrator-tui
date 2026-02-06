import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { useFeatureKanban } from '../../ui/hooks/use-feature-kanban';
import { useAdapter } from '../../ui/context/adapter-context';
import { KanbanBoard } from '../components/kanban-board';

interface KanbanViewProps {
  projectId: string;
  activeColumnIndex: number;
  onActiveColumnIndexChange: (index: number) => void;
  selectedFeatureIndex: number;
  onSelectedFeatureIndexChange: (index: number) => void;
  expandedFeatureId: string | null;
  onExpandedFeatureIdChange: (id: string | null) => void;
  selectedTaskIndex: number;
  onSelectedTaskIndexChange: (index: number) => void;
  onSelectTask: (taskId: string) => void;
  onBack: () => void;
  // Filter state (lifted to App for persistence)
  activeStatuses: Set<string>;
  onActiveStatusesChange: (statuses: Set<string>) => void;
}

export function KanbanView({
  projectId,
  activeColumnIndex,
  onActiveColumnIndexChange,
  selectedFeatureIndex,
  onSelectedFeatureIndexChange,
  expandedFeatureId,
  onExpandedFeatureIdChange,
  selectedTaskIndex,
  onSelectedTaskIndexChange,
  onSelectTask,
  onBack,
  activeStatuses,
  onActiveStatusesChange,
}: KanbanViewProps) {
  const { adapter } = useAdapter();
  const { columns, loading, error, refresh, moveFeature } = useFeatureKanban(projectId);
  const [projectName, setProjectName] = useState<string>('');
  const { stdout } = useStdout();

  const terminalRows = stdout?.rows ?? 24;
  const terminalCols = stdout?.columns ?? 120;
  const availableHeight = Math.max(10, terminalRows - 6);

  // Filter mode state (local — only active while interacting with chips)
  const [isFilterMode, setIsFilterMode] = useState(false);
  const [filterCursorIndex, setFilterCursorIndex] = useState(0);

  // Auto-populate activeStatuses from data on first load (only if empty)
  useEffect(() => {
    if (activeStatuses.size === 0 && columns.length > 0) {
      const populated = new Set<string>();
      for (const col of columns) {
        if (col.features.length > 0) {
          populated.add(col.status);
        }
      }
      // If nothing has features, show all columns
      if (populated.size === 0) {
        for (const col of columns) {
          populated.add(col.status);
        }
      }
      onActiveStatusesChange(populated);
    }
  }, [columns, activeStatuses.size, onActiveStatusesChange]);

  // Compute filtered columns
  const filteredColumns = useMemo(() => {
    if (activeStatuses.size === 0) return columns;
    return columns.filter((c) => activeStatuses.has(c.status));
  }, [columns, activeStatuses]);

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

  // Reset selectedFeatureIndex when activeColumnIndex changes
  useEffect(() => {
    if (filteredColumns.length > 0 && activeColumnIndex < filteredColumns.length) {
      const activeColumn = filteredColumns[activeColumnIndex];
      if (activeColumn) {
        if (activeColumn.features.length === 0) {
          onSelectedFeatureIndexChange(-1);
        } else if (selectedFeatureIndex >= activeColumn.features.length) {
          onSelectedFeatureIndexChange(0);
        } else if (selectedFeatureIndex < 0 && activeColumn.features.length > 0) {
          onSelectedFeatureIndexChange(0);
        }
      }
    }
  }, [activeColumnIndex, filteredColumns, selectedFeatureIndex, onSelectedFeatureIndexChange]);

  // Collapse expanded feature if it no longer exists in the active column
  useEffect(() => {
    if (expandedFeatureId && filteredColumns.length > 0 && activeColumnIndex < filteredColumns.length) {
      const activeColumn = filteredColumns[activeColumnIndex];
      if (activeColumn && !activeColumn.features.some((f) => f.id === expandedFeatureId)) {
        onExpandedFeatureIdChange(null);
        onSelectedTaskIndexChange(-1);
      }
    }
  }, [filteredColumns, activeColumnIndex, expandedFeatureId, onExpandedFeatureIdChange, onSelectedTaskIndexChange]);

  // Clamp activeColumnIndex when filtered columns change
  useEffect(() => {
    if (filteredColumns.length > 0 && activeColumnIndex >= filteredColumns.length) {
      onActiveColumnIndexChange(Math.max(0, filteredColumns.length - 1));
    }
  }, [filteredColumns.length, activeColumnIndex, onActiveColumnIndexChange]);

  // Handle toggle status
  const handleToggleStatus = (status: string) => {
    const next = new Set(activeStatuses);
    if (next.has(status)) {
      // Don't allow removing the last status
      if (next.size > 1) {
        next.delete(status);
      }
    } else {
      next.add(status);
    }
    onActiveStatusesChange(next);
  };

  // Handle keyboard
  useInput((input, key) => {
    // Don't handle keys in filter mode — board handles them
    if (isFilterMode) return;

    if (key.escape) {
      if (expandedFeatureId) {
        // Let KanbanBoard handle Esc in task mode
        return;
      }
      onBack();
      return;
    }
    if (input === 'b' && !expandedFeatureId) {
      onBack();
      return;
    }
    if (input === 'r') {
      refresh();
      return;
    }
  });

  // Handle move feature
  const handleMoveFeature = async (featureId: string, newStatus: string) => {
    await moveFeature(featureId, newStatus);
    // After move, adjust indices if needed
    if (filteredColumns.length > 0 && activeColumnIndex < filteredColumns.length) {
      const activeColumn = filteredColumns[activeColumnIndex];
      if (activeColumn) {
        if (activeColumn.features.length === 0) {
          onSelectedFeatureIndexChange(-1);
        } else if (selectedFeatureIndex >= activeColumn.features.length) {
          onSelectedFeatureIndexChange(Math.max(0, activeColumn.features.length - 1));
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

  // Clamp indices
  const clampedActiveColumnIndex = Math.min(activeColumnIndex, Math.max(0, filteredColumns.length - 1));
  const effectiveActiveColumnIndex = filteredColumns.length > 0 ? clampedActiveColumnIndex : 0;

  const activeColumn = filteredColumns[effectiveActiveColumnIndex];
  const maxFeatureIndex = activeColumn ? Math.max(0, activeColumn.features.length - 1) : 0;
  const clampedFeatureIndex = activeColumn && activeColumn.features.length > 0
    ? Math.min(selectedFeatureIndex, maxFeatureIndex)
    : -1;

  const isTaskMode = expandedFeatureId !== null;
  const footerHint = isFilterMode
    ? 'h/l: navigate chips  Space: toggle  Esc: exit filter'
    : isTaskMode
      ? 'j/k: tasks  Enter: open task  Esc/h: collapse  r: refresh'
      : 'h/l: columns  j/k: features  Enter: expand  m: move  f: filter  r: refresh  Esc: back';

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>{projectName}</Text>
        <Text> - </Text>
        <Text>Feature Board</Text>
      </Box>

      {/* Kanban Board */}
      {filteredColumns.length === 0 ? (
        <Text dimColor>No features in this project yet.</Text>
      ) : (
        <KanbanBoard
          columns={filteredColumns}
          activeColumnIndex={effectiveActiveColumnIndex}
          selectedFeatureIndex={clampedFeatureIndex}
          expandedFeatureId={expandedFeatureId}
          selectedTaskIndex={selectedTaskIndex}
          onColumnChange={onActiveColumnIndexChange}
          onFeatureChange={onSelectedFeatureIndexChange}
          onExpandFeature={onExpandedFeatureIdChange}
          onTaskChange={onSelectedTaskIndexChange}
          onSelectTask={onSelectTask}
          onMoveFeature={handleMoveFeature}
          isActive={true}
          availableHeight={availableHeight}
          availableWidth={terminalCols}
          activeStatuses={activeStatuses}
          isFilterMode={isFilterMode}
          filterCursorIndex={filterCursorIndex}
          onToggleStatus={handleToggleStatus}
          onFilterCursorChange={setFilterCursorIndex}
          onFilterModeChange={setIsFilterMode}
        />
      )}

      {/* Footer hints */}
      <Box marginTop={1}>
        <Text dimColor>{footerHint}</Text>
      </Box>
    </Box>
  );
}
