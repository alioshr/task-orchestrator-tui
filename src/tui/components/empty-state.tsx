import React from 'react';
import { Box, Text } from 'ink';

interface EmptyStateProps {
  message: string;
  hint?: string;
}

export function EmptyState({ message, hint }: EmptyStateProps) {
  return (
    <Box flexDirection="column" paddingY={1}>
      <Text dimColor>{message}</Text>
      {hint ? <Text dimColor>{hint}</Text> : null}
    </Box>
  );
}

