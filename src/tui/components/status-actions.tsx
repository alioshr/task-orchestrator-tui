import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { StatusBadge } from './status-badge';
import { useTheme } from '../../ui/context/theme-context';

/**
 * v2 pipeline actions instead of free-form status picker
 */
interface PipelineAction {
  id: string;
  label: string;
  description: string;
}

export interface StatusActionsProps {
  currentStatus: string;
  /** Next status in the pipeline (null if at end) */
  nextStatus: string | null;
  /** Previous status in the pipeline (null if at start) */
  prevStatus: string | null;
  /** Whether the entity is blocked */
  isBlocked?: boolean;
  /** Whether the entity is in a terminal state */
  isTerminal?: boolean;
  onAdvance: () => void;
  onRevert: () => void;
  onTerminate: () => void;
  isActive?: boolean;
  loading?: boolean;
}

export function StatusActions({
  currentStatus,
  nextStatus,
  prevStatus,
  isBlocked = false,
  isTerminal = false,
  onAdvance,
  onRevert,
  onTerminate,
  isActive = true,
  loading = false,
}: StatusActionsProps) {
  const { theme } = useTheme();

  // Build available actions
  const actions: PipelineAction[] = [];
  if (nextStatus && !isBlocked && !isTerminal) {
    actions.push({ id: 'advance', label: `Advance to ${nextStatus}`, description: 'Move forward in pipeline' });
  }
  if (prevStatus && !isTerminal) {
    actions.push({ id: 'revert', label: `Revert to ${prevStatus}`, description: 'Move backward in pipeline' });
  }
  if (!isTerminal) {
    actions.push({ id: 'terminate', label: 'Will Not Implement', description: 'Close without completing' });
  }

  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (!isActive || loading || actions.length === 0) return;

    if (input === 'j' || key.downArrow) {
      setSelectedIndex((selectedIndex + 1) % actions.length);
    } else if (input === 'k' || key.upArrow) {
      setSelectedIndex((selectedIndex - 1 + actions.length) % actions.length);
    } else if (key.return) {
      const action = actions[selectedIndex];
      if (action) {
        switch (action.id) {
          case 'advance': onAdvance(); break;
          case 'revert': onRevert(); break;
          case 'terminate': onTerminate(); break;
        }
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>Status: </Text>
        <StatusBadge status={currentStatus} />
        {isBlocked && (
          <Text color={theme.colors.blocked}> [BLOCKED]</Text>
        )}
      </Box>

      {loading && (
        <Box>
          <Text dimColor>Loading...</Text>
        </Box>
      )}

      {!loading && (
        <>
          {actions.length === 0 ? (
            <Box>
              <Text dimColor>No actions available (terminal state)</Text>
            </Box>
          ) : (
            <Box flexDirection="column">
              <Box marginBottom={1}>
                <Text>Actions:</Text>
              </Box>
              {actions.map((action, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <Box key={action.id} marginLeft={2}>
                    <Text color={isSelected ? theme.colors.highlight : undefined}>
                      {isSelected ? '▎' : '  '}
                    </Text>
                    <Text bold={isSelected}>
                      {' '}{action.label}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
