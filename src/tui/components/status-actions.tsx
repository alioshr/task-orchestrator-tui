import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { StatusBadge } from './status-badge';

export interface StatusActionsProps {
  currentStatus: string;
  allowedTransitions: string[];
  onTransition: (newStatus: string) => void;
  isActive?: boolean;
  loading?: boolean;
}

export function StatusActions({
  currentStatus,
  allowedTransitions,
  onTransition,
  isActive = true,
  loading = false,
}: StatusActionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (!isActive || loading || allowedTransitions.length === 0) return;

    if (input === 'j' || key.downArrow) {
      const nextIndex = (selectedIndex + 1) % allowedTransitions.length;
      setSelectedIndex(nextIndex);
    } else if (input === 'k' || key.upArrow) {
      const prevIndex = (selectedIndex - 1 + allowedTransitions.length) % allowedTransitions.length;
      setSelectedIndex(prevIndex);
    } else if (key.return) {
      const selectedStatus = allowedTransitions[selectedIndex];
      if (selectedStatus !== undefined) {
        onTransition(selectedStatus);
      }
    }
  });

  return (
    <Box flexDirection="column">
      {/* Current Status */}
      <Box marginBottom={1}>
        <Text>Status: </Text>
        <StatusBadge status={currentStatus} />
      </Box>

      {/* Loading Indicator */}
      {loading && (
        <Box>
          <Text dimColor>Loading...</Text>
        </Box>
      )}

      {/* Transitions Section */}
      {!loading && (
        <>
          {allowedTransitions.length === 0 ? (
            <Box>
              <Text dimColor>No transitions available</Text>
            </Box>
          ) : (
            <Box flexDirection="column">
              <Box marginBottom={1}>
                <Text>Change to:</Text>
              </Box>
              {allowedTransitions.map((status, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <Box key={status} marginLeft={2}>
                    <Text inverse={isSelected} bold={isSelected}>
                      {isSelected ? '→ ' : '  '}
                      {status}
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
