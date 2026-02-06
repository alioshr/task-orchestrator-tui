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
      <Box paddingX={1} flexWrap="wrap">
        {shortcuts.map((shortcut, i) => (
          <Box key={`${shortcut.key}-${shortcut.label}`}>
            {i > 0 ? <Text dimColor> · </Text> : null}
            <Text color="cyan" bold>{shortcut.key}</Text>
            <Text> {shortcut.label}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
