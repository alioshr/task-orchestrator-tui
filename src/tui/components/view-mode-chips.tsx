import React from 'react';
import { Box, Text } from 'ink';

interface ViewModeChipsProps {
  modes: Array<{ key: string; label: string }>;
  activeMode: string;
  onModeChange: (mode: string) => void;
}

export function ViewModeChips({ modes, activeMode }: ViewModeChipsProps) {
  return (
    <Box flexDirection="row" gap={1}>
      {modes.map((mode) => {
        const isActive = mode.key === activeMode;
        return (
          <Text key={mode.key} inverse={isActive} dimColor={!isActive}>
            {isActive ? `[${mode.label}]` : ` ${mode.label} `}
          </Text>
        );
      })}
    </Box>
  );
}
