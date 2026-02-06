import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../ui/context/theme-context';

interface EmptyStateProps {
  message: string;
  hint?: string;
}

export function EmptyState({ message, hint }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <Box flexDirection="column" alignItems="center" paddingY={2}>
      <Box>
        <Text color={theme.colors.muted}>◇ </Text>
        <Text color={theme.colors.muted}>{message}</Text>
        {hint && (
          <>
            <Text color={theme.colors.muted}> · </Text>
            <Text color={theme.colors.foreground}>{hint}</Text>
          </>
        )}
      </Box>
    </Box>
  );
}

