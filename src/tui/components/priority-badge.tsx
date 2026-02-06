import React from 'react';
import { Text } from 'ink';
import { getPriorityColor, getPriorityDots } from '../../ui/lib/colors';
import { useTheme } from '../../ui/context/theme-context';

interface PriorityBadgeProps {
  priority: string;
  isSelected?: boolean;
}

export function PriorityBadge({ priority, isSelected = false }: PriorityBadgeProps) {
  const { theme } = useTheme();
  const color = isSelected ? theme.colors.foreground : getPriorityColor(priority as any, theme);
  const dots = getPriorityDots(priority as any);
  return <Text color={color}>{dots}</Text>;
}
