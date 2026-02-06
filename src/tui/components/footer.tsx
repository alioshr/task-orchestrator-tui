import React from 'react';
import { Box, Text } from 'ink';

export interface FooterProps {
  shortcuts: Array<{ key: string; label: string }>;
}

export const Footer: React.FC<FooterProps> = ({ shortcuts }) => {
  return (
    <Box flexDirection="column">
      <Box
        borderStyle="single"
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
      >
        <Text> </Text>
      </Box>
      <Box paddingX={3} gap={2}>
        {shortcuts.map((shortcut) => (
          <Text key={`${shortcut.key}-${shortcut.label}`}>
            <Text dimColor>[{shortcut.key}]</Text> {shortcut.label}
          </Text>
        ))}
      </Box>
    </Box>
  );
};
