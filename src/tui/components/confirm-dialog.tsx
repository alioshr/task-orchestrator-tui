import React from 'react';
import { Box, Text, useInput } from 'ink';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isActive?: boolean;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
  isActive = true,
}: ConfirmDialogProps) {
  useInput((input, key) => {
    if (!isActive) return;
    if (key.return || input.toLowerCase() === 'y') {
      onConfirm();
      return;
    }
    if (key.escape || input.toLowerCase() === 'n') {
      onCancel();
    }
  }, { isActive });

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="yellow" paddingX={1} paddingY={0} marginY={1}>
      <Text bold>{title}</Text>
      <Text>{message}</Text>
      <Text dimColor>[Enter/Y] {confirmLabel}  [Esc/N] {cancelLabel}</Text>
    </Box>
  );
}

