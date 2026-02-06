import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  timeoutMs?: number;
  isActive?: boolean;
}

export function ErrorMessage({
  message,
  onDismiss,
  timeoutMs = 4000,
  isActive = true,
}: ErrorMessageProps) {
  useEffect(() => {
    if (!onDismiss || timeoutMs <= 0) return;
    const timer = setTimeout(onDismiss, timeoutMs);
    return () => clearTimeout(timer);
  }, [onDismiss, timeoutMs, message]);

  useInput((input, key) => {
    if (!isActive) return;
    if (key.escape || input === 'x') {
      onDismiss?.();
    }
  }, { isActive });

  return (
    <Box borderStyle="round" borderColor="red" paddingX={1} marginY={1}>
      <Text color="red">
        ! {message}
      </Text>
    </Box>
  );
}

