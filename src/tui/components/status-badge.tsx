import React from 'react';
import { Text } from 'ink';
import { getStatusColor } from '../../ui/lib/colors';
import { useTheme } from '../../ui/context/theme-context';
import { formatStatus } from '../../ui/lib/format';

interface StatusBadgeProps {
  status: string;
  isSelected?: boolean;
}

export function StatusBadge({ status, isSelected = false }: StatusBadgeProps) {
  const { theme } = useTheme();
  const color = isSelected ? theme.colors.foreground : getStatusColor(status, theme);
  const formattedStatus = formatStatus(status);

  return (
    <Text color={color} bold>
      [{formattedStatus}]
    </Text>
  );
}
