import React from 'react';
import { Text } from 'ink';
import { getPriorityColor, getPriorityDots } from '../../ui/lib/colors';
import { useTheme } from '../../ui/context/theme-context';

interface PriorityBadgeProps {
  priority: string;
  isSelected?: boolean;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const { theme } = useTheme();
  const color = getPriorityColor(priority as any, theme);
  const dots = getPriorityDots(priority as any);
  return <Text color={color}>{dots}</Text>;
}
