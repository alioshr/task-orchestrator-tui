import React from 'react';
import { Box, Text } from 'ink';
import type { FeatureBoardColumn } from '../../ui/lib/types';
import { FeatureKanbanCard, getFeatureCardHeight } from './feature-kanban-card';
import { getStatusColor } from '../../ui/lib/colors';
import { useTheme } from '../../ui/context/theme-context';

interface KanbanColumnProps {
  column: FeatureBoardColumn;
  isActiveColumn: boolean;
  selectedFeatureIndex: number;
  expandedFeatureId: string | null;
  selectedTaskIndex: number;
  availableHeight?: number;
  columnWidth?: number;
}

/**
 * KanbanColumn Component
 *
 * Displays a single column in the feature-based Kanban board.
 * Uses variable-height scrolling based on actual card line counts.
 */
export function KanbanColumn({
  column,
  isActiveColumn,
  selectedFeatureIndex,
  expandedFeatureId,
  selectedTaskIndex,
  availableHeight,
  columnWidth: columnWidthProp,
}: KanbanColumnProps) {
  const { theme } = useTheme();
  const statusColor = getStatusColor(column.status, theme);
  const featureCount = column.features.length;
  const effectiveHeight = availableHeight ?? 30;
  const COLUMN_WIDTH = columnWidthProp ?? 40;

  // Chrome overhead: column border (2) + padding (2) + header (2) + gap (1) = ~7
  const columnChromeLines = 7;
  const maxContentLines = effectiveHeight - columnChromeLines;
  const maxTaskHeight = Math.max(2, Math.floor((effectiveHeight - columnChromeLines) / 2));

  // Compute heights for all cards
  const cardHeights = column.features.map((feature) =>
    getFeatureCardHeight(
      feature,
      feature.id === expandedFeatureId,
      maxTaskHeight,
      COLUMN_WIDTH - 4 // inner content width (column border + padding)
    ) + 1 // +1 for gap between cards
  );

  // Variable-height sliding window
  let windowStart = 0;
  let windowEnd = featureCount;

  if (featureCount > 0 && selectedFeatureIndex >= 0) {
    // Try to fit as many cards as possible around the selected one
    // First, find a window that includes the selected feature
    let totalLines = 0;

    // Start from selected and expand outward
    windowStart = selectedFeatureIndex;
    windowEnd = selectedFeatureIndex + 1;
    totalLines = cardHeights[selectedFeatureIndex] ?? 0;

    // Expand upward and downward alternately
    let expandUp = true;
    while (true) {
      if (expandUp && windowStart > 0) {
        const nextHeight = cardHeights[windowStart - 1] ?? 0;
        if (totalLines + nextHeight <= maxContentLines) {
          windowStart--;
          totalLines += nextHeight;
          expandUp = false;
          continue;
        }
      }
      if (!expandUp && windowEnd < featureCount) {
        const nextHeight = cardHeights[windowEnd] ?? 0;
        if (totalLines + nextHeight <= maxContentLines) {
          windowEnd++;
          totalLines += nextHeight;
          expandUp = true;
          continue;
        }
      }
      // Try the other direction if current didn't work
      if (expandUp && windowEnd < featureCount) {
        const nextHeight = cardHeights[windowEnd] ?? 0;
        if (totalLines + nextHeight <= maxContentLines) {
          windowEnd++;
          totalLines += nextHeight;
          continue;
        }
      }
      if (!expandUp && windowStart > 0) {
        const nextHeight = cardHeights[windowStart - 1] ?? 0;
        if (totalLines + nextHeight <= maxContentLines) {
          windowStart--;
          totalLines += nextHeight;
          continue;
        }
      }
      break;
    }
  }

  const visibleFeatures = column.features.slice(windowStart, windowEnd);
  const hasFeaturesAbove = windowStart > 0;
  const hasFeaturesBelow = windowEnd < featureCount;

  return (
    <Box
      flexDirection="column"
      borderStyle={isActiveColumn ? 'bold' : 'round'}
      borderColor={isActiveColumn ? theme.colors.accent : theme.colors.border}
      width={COLUMN_WIDTH}
      height={effectiveHeight}
      paddingX={1}
      paddingY={1}
    >
      {/* Column header */}
      <Box marginBottom={1}>
        <Text color={statusColor} bold={isActiveColumn}>
          {column.title} ({featureCount})
        </Text>
      </Box>

      {/* Feature list */}
      {featureCount === 0 ? (
        <Box justifyContent="center" paddingY={2}>
          <Text dimColor>No features</Text>
        </Box>
      ) : (
        <Box flexDirection="column" gap={1}>
          {/* Top scroll indicator */}
          {hasFeaturesAbove && (
            <Box justifyContent="center">
              <Text dimColor>↑ {windowStart} more</Text>
            </Box>
          )}

          {/* Visible features */}
          {visibleFeatures.map((feature, index) => {
            const actualIndex = windowStart + index;
            const isFeatureSelected = isActiveColumn && actualIndex === selectedFeatureIndex;

            return (
              <FeatureKanbanCard
                key={feature.id}
                feature={feature}
                isSelected={isFeatureSelected}
                isExpanded={feature.id === expandedFeatureId}
                selectedTaskIndex={isFeatureSelected ? selectedTaskIndex : -1}
                maxTaskHeight={maxTaskHeight}
                columnWidth={COLUMN_WIDTH - 4}
              />
            );
          })}

          {/* Bottom scroll indicator */}
          {hasFeaturesBelow && (
            <Box justifyContent="center">
              <Text dimColor>↓ {featureCount - windowEnd} more</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
