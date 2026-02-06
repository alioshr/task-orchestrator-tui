import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../ui/context/theme-context';
import { getStatusColor } from '../../ui/lib/colors';

interface ColumnFilterBarProps {
  allStatuses: ReadonlyArray<{ id: string; title: string; status: string }>;
  activeStatuses: Set<string>;
  isFilterMode: boolean;
  filterCursorIndex: number;
}

export function ColumnFilterBar({
  allStatuses,
  activeStatuses,
  isFilterMode,
  filterCursorIndex,
}: ColumnFilterBarProps) {
  const { theme } = useTheme();

  return (
    <Box marginBottom={1} flexWrap="wrap">
      {isFilterMode && (
        <Text color={theme.colors.accent} bold>
          {'FILTER: '}
        </Text>
      )}
      {allStatuses.map((s, i) => {
        const isActive = activeStatuses.has(s.status);
        const isCursor = isFilterMode && i === filterCursorIndex;
        const statusColor = getStatusColor(s.status, theme);

        const label = isActive ? `[${s.title}]` : s.title;
        const separator = i < allStatuses.length - 1 ? ' · ' : '';

        return (
          <Text key={s.id}>
            <Text
              color={isActive ? statusColor : theme.colors.muted}
              bold={isCursor}
              underline={isCursor}
              dimColor={!isActive && !isCursor}
            >
              {label}
            </Text>
            {separator && <Text dimColor>{separator}</Text>}
          </Text>
        );
      })}
    </Box>
  );
}
