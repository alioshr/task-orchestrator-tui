import React from 'react';
import { Text } from 'ink';
import { getStatusColor } from '../../ui/lib/colors';
import { useTheme } from '../../ui/context/theme-context';
import { formatStatus } from '../../ui/lib/format';

interface StatusBadgeProps {
  status: string;
  isSelected?: boolean;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { theme } = useTheme();
  const color = getStatusColor(status, theme);
  const formattedStatus = formatStatus(status);

  return (
    <Text color={color}>
      ● {formattedStatus}
    </Text>
  );
}
