import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../ui/context/theme-context';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  width?: number;
  render?: (value: unknown, row: T, context?: { isSelected: boolean }) => React.ReactNode;
}

export interface EntityTableProps<T> {
  columns: Column<T>[];
  data: T[];
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  onSelect?: (row: T) => void;
  onBack?: () => void;
  isActive?: boolean;
  getRowKey?: (row: T, index: number) => string;
}

export function EntityTable<T>({
  columns,
  data,
  selectedIndex,
  onSelectedIndexChange,
  onSelect,
  onBack,
  isActive = true,
  getRowKey,
}: EntityTableProps<T>) {
  const { theme } = useTheme();

  useInput((input, key) => {
    if (!isActive || data.length === 0) return;

    if (input === 'j' || key.downArrow) {
      const nextIndex = (selectedIndex + 1) % data.length;
      onSelectedIndexChange(nextIndex);
    } else if (input === 'k' || key.upArrow) {
      const prevIndex = (selectedIndex - 1 + data.length) % data.length;
      onSelectedIndexChange(prevIndex);
    } else if ((key.return || input === 'l' || key.rightArrow) && onSelect) {
      const row = data[selectedIndex];
      if (row !== undefined) {
        onSelect(row);
      }
    } else if (input === 'h' || key.leftArrow) {
      onBack?.();
    }
  }, { isActive });

  const renderCellValue = (column: Column<T>, row: T, isSelected: boolean): React.ReactNode => {
    const value = row[column.key as keyof T];

    if (column.render) {
      return column.render(value, row, { isSelected });
    }

    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  };

  const getDefaultRowKey = (row: T, index: number): string => {
    // Try to use 'id' field if available
    if (row && typeof row === 'object' && 'id' in row) {
      return String(row.id);
    }
    return `row-${index}`;
  };

  const rowKeyFn = getRowKey || getDefaultRowKey;

  return (
    <Box flexDirection="column">
      {/* Header Row */}
      <Box>
        {/* Gutter space for selection indicator */}
        <Box width={2} marginRight={1}>
          <Text> </Text>
        </Box>
        {columns.map((column) => (
          <Box key={String(column.key)} width={column.width} marginRight={1}>
            <Text bold dimColor>
              {column.label}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Data Rows */}
      {data.map((row, rowIndex) => {
        const isSelected = rowIndex === selectedIndex;
        const rowKey = rowKeyFn(row, rowIndex);

        return (
          <Box key={rowKey}>
            {/* Selection gutter */}
            <Box width={2} marginRight={1}>
              <Text color={isSelected ? theme.colors.highlight : undefined}>
                {isSelected ? '▎' : '  '}
              </Text>
            </Box>
            {columns.map((column) => (
              <Box key={`${rowKey}-${String(column.key)}`} width={column.width} marginRight={1}>
                <Text bold={isSelected}>
                  {renderCellValue(column, row, isSelected)}
                </Text>
              </Box>
            ))}
          </Box>
        );
      })}
    </Box>
  );
}
