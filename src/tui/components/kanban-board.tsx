import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { FeatureBoardColumn } from '../../ui/lib/types';
import { KanbanColumn } from './kanban-column';
import { ColumnFilterBar } from './column-filter-bar';
import { FEATURE_KANBAN_STATUSES } from '../../ui/hooks/use-feature-kanban';
import { useTheme } from '../../ui/context/theme-context';

const MAX_VISIBLE_COLUMNS = 3;

interface KanbanBoardProps {
  columns: FeatureBoardColumn[];
  activeColumnIndex: number;
  selectedFeatureIndex: number;
  expandedFeatureId: string | null;
  selectedTaskIndex: number;
  onColumnChange: (index: number) => void;
  onFeatureChange: (index: number) => void;
  onExpandFeature: (featureId: string | null) => void;
  onTaskChange: (index: number) => void;
  onSelectTask: (taskId: string) => void;
  onMoveFeature?: (featureId: string, newStatus: string) => void;
  isActive?: boolean;
  availableHeight?: number;
  availableWidth?: number;
  // Filter props
  activeStatuses: Set<string>;
  isFilterMode: boolean;
  filterCursorIndex: number;
  onToggleStatus: (status: string) => void;
  onFilterCursorChange: (index: number) => void;
  onFilterModeChange: (isFilterMode: boolean) => void;
}

export function KanbanBoard({
  columns,
  activeColumnIndex,
  selectedFeatureIndex,
  expandedFeatureId,
  selectedTaskIndex,
  onColumnChange,
  onFeatureChange,
  onExpandFeature,
  onTaskChange,
  onSelectTask,
  onMoveFeature,
  isActive = true,
  availableHeight,
  availableWidth,
  activeStatuses,
  isFilterMode,
  filterCursorIndex,
  onToggleStatus,
  onFilterCursorChange,
  onFilterModeChange,
}: KanbanBoardProps) {
  const [isMoveMode, setIsMoveMode] = useState(false);
  const { theme } = useTheme();

  const isTaskMode = expandedFeatureId !== null;

  // Compute viewport window (3 columns max)
  const totalCols = columns.length;
  const visibleCount = Math.min(MAX_VISIBLE_COLUMNS, totalCols);

  let viewportStart = 0;
  if (totalCols > MAX_VISIBLE_COLUMNS) {
    // Center activeColumnIndex in viewport when possible
    viewportStart = Math.max(0, activeColumnIndex - Math.floor(visibleCount / 2));
    viewportStart = Math.min(viewportStart, totalCols - visibleCount);
  }
  const viewportEnd = viewportStart + visibleCount;

  const hiddenLeft = viewportStart;
  const hiddenRight = totalCols - viewportEnd;

  // Dynamic column width
  const termWidth = availableWidth ?? 120;
  const columnWidth = Math.floor((termWidth - 4) / Math.min(MAX_VISIBLE_COLUMNS, Math.max(1, totalCols)));

  useInput(
    (input, key) => {
      if (!isActive || columns.length === 0) return;

      // Filter mode handling
      if (isFilterMode) {
        if (key.escape) {
          onFilterModeChange(false);
          return;
        }
        if (input === 'h' || key.leftArrow) {
          const newIdx = (filterCursorIndex - 1 + FEATURE_KANBAN_STATUSES.length) % FEATURE_KANBAN_STATUSES.length;
          onFilterCursorChange(newIdx);
          return;
        }
        if (input === 'l' || key.rightArrow) {
          const newIdx = (filterCursorIndex + 1) % FEATURE_KANBAN_STATUSES.length;
          onFilterCursorChange(newIdx);
          return;
        }
        if (input === ' ') {
          const status = FEATURE_KANBAN_STATUSES[filterCursorIndex];
          if (status) {
            onToggleStatus(status.status);
          }
          return;
        }
        return; // Absorb all other keys while in filter mode
      }

      const activeColumn = columns[activeColumnIndex];

      // Move mode handling
      if (isMoveMode) {
        const activeFeature = activeColumn?.features[selectedFeatureIndex];

        if (key.escape) {
          setIsMoveMode(false);
          return;
        }

        if (!onMoveFeature || !activeFeature) {
          setIsMoveMode(false);
          return;
        }

        // Move feature left
        if (input === 'h' || key.leftArrow) {
          if (activeColumnIndex > 0) {
            const targetColumn = columns[activeColumnIndex - 1];
            if (targetColumn) {
              onMoveFeature(activeFeature.id, targetColumn.status);
              setIsMoveMode(false);
            }
          }
          return;
        }

        // Move feature right
        if (input === 'l' || key.rightArrow) {
          if (activeColumnIndex < columns.length - 1) {
            const targetColumn = columns[activeColumnIndex + 1];
            if (targetColumn) {
              onMoveFeature(activeFeature.id, targetColumn.status);
              setIsMoveMode(false);
            }
          }
          return;
        }

        return;
      }

      // ---- Task mode (expanded feature) ----
      if (isTaskMode) {
        const expandedFeature = activeColumn?.features.find(
          (f) => f.id === expandedFeatureId
        );
        if (!expandedFeature) return;

        const taskCount = expandedFeature.tasks.length;

        // Collapse back to feature mode
        if (key.escape || (input === 'h' && !key.leftArrow)) {
          onExpandFeature(null);
          onTaskChange(-1);
          return;
        }

        // Navigate tasks
        if (input === 'j' || key.downArrow) {
          if (taskCount > 0) {
            const newIndex = selectedTaskIndex >= taskCount - 1 ? 0 : selectedTaskIndex + 1;
            onTaskChange(newIndex);
          }
          return;
        }

        if (input === 'k' || key.upArrow) {
          if (taskCount > 0) {
            const newIndex = selectedTaskIndex <= 0 ? taskCount - 1 : selectedTaskIndex - 1;
            onTaskChange(newIndex);
          }
          return;
        }

        // Select task → open TaskDetail
        if (key.return) {
          const task = expandedFeature.tasks[selectedTaskIndex];
          if (task) {
            onSelectTask(task.id);
          }
          return;
        }

        return;
      }

      // ---- Feature mode (default) ----
      if (!activeColumn) return;

      // Enter filter mode
      if (input === 'f') {
        onFilterModeChange(true);
        return;
      }

      // Enter move mode
      if (input === 'm') {
        if (activeColumn.features.length > 0 && selectedFeatureIndex >= 0) {
          setIsMoveMode(true);
        }
        return;
      }

      // Column navigation
      if (input === 'h' || key.leftArrow) {
        const newIndex = (activeColumnIndex - 1 + columns.length) % columns.length;
        onColumnChange(newIndex);
        const newColumn = columns[newIndex];
        if (newColumn && newColumn.features.length > 0) {
          onFeatureChange(0);
        } else {
          onFeatureChange(-1);
        }
        return;
      }

      if (input === 'l' || key.rightArrow) {
        const newIndex = (activeColumnIndex + 1) % columns.length;
        onColumnChange(newIndex);
        const newColumn = columns[newIndex];
        if (newColumn && newColumn.features.length > 0) {
          onFeatureChange(0);
        } else {
          onFeatureChange(-1);
        }
        return;
      }

      // Feature navigation within column
      if (activeColumn.features.length === 0) return;

      if (input === 'j' || key.downArrow) {
        const maxIndex = activeColumn.features.length - 1;
        const newIndex = selectedFeatureIndex >= maxIndex ? 0 : selectedFeatureIndex + 1;
        onFeatureChange(newIndex);
        return;
      }

      if (input === 'k' || key.upArrow) {
        const maxIndex = activeColumn.features.length - 1;
        const newIndex = selectedFeatureIndex <= 0 ? maxIndex : selectedFeatureIndex - 1;
        onFeatureChange(newIndex);
        return;
      }

      // Expand feature (Enter)
      if (key.return) {
        const feature = activeColumn.features[selectedFeatureIndex];
        if (feature) {
          onExpandFeature(feature.id);
          onTaskChange(feature.tasks.length > 0 ? 0 : -1);
        }
        return;
      }
    },
    { isActive }
  );

  const visibleColumns = columns.slice(viewportStart, viewportEnd);

  return (
    <Box flexDirection="column">
      {/* Filter chip bar */}
      {isFilterMode && (
        <ColumnFilterBar
          allStatuses={FEATURE_KANBAN_STATUSES}
          activeStatuses={activeStatuses}
          isFilterMode={isFilterMode}
          filterCursorIndex={filterCursorIndex}
        />
      )}

      {/* Scroll indicators + Columns */}
      <Box flexDirection="row" alignItems="center">
        {/* Left scroll indicator */}
        {hiddenLeft > 0 ? (
          <Box width={3} justifyContent="center">
            <Text color={theme.colors.muted}>{'← '}{hiddenLeft}</Text>
          </Box>
        ) : totalCols > MAX_VISIBLE_COLUMNS ? (
          <Box width={3} />
        ) : null}

        {/* Visible columns */}
        {visibleColumns.map((column, index) => {
          const actualIndex = viewportStart + index;
          const isColumnActive = isActive && actualIndex === activeColumnIndex;

          return (
            <KanbanColumn
              key={column.id}
              column={column}
              isActiveColumn={isColumnActive}
              selectedFeatureIndex={isColumnActive ? selectedFeatureIndex : -1}
              expandedFeatureId={isColumnActive ? expandedFeatureId : null}
              selectedTaskIndex={isColumnActive ? selectedTaskIndex : -1}
              availableHeight={availableHeight}
              columnWidth={columnWidth}
            />
          );
        })}

        {/* Right scroll indicator */}
        {hiddenRight > 0 ? (
          <Box width={3} justifyContent="center">
            <Text color={theme.colors.muted}>{hiddenRight}{' →'}</Text>
          </Box>
        ) : totalCols > MAX_VISIBLE_COLUMNS ? (
          <Box width={3} />
        ) : null}
      </Box>

      {/* Move mode indicator */}
      {isMoveMode && (
        <Box marginTop={1} borderStyle="round" borderColor="yellow" paddingX={1}>
          <Text color="yellow" bold>
            MOVE: ←/→ to move, Esc cancel
          </Text>
        </Box>
      )}
    </Box>
  );
}
