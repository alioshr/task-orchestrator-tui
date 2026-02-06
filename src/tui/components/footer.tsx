import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../ui/context/theme-context';

export interface FooterProps {
  shortcuts: Array<{ key: string; label: string }>;
}

export const Footer: React.FC<FooterProps> = ({ shortcuts }) => {
  const { theme } = useTheme();

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
            <Text color={theme.colors.accent} bold>{shortcut.key}</Text>
            <Text> {shortcut.label}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
