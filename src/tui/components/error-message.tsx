import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../ui/context/theme-context';

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
  const { theme } = useTheme();

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
    <Box borderStyle="round" borderColor={theme.colors.danger} paddingX={1} marginY={1}>
      <Text color={theme.colors.danger}>
        ! {message}
      </Text>
    </Box>
  );
}

