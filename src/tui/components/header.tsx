import React from 'react';
import { Box, Text } from 'ink';

export interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Task Orchestrator' }) => {
  return (
    <Box flexDirection="column">
      <Box
        justifyContent="space-between"
        paddingX={1}
      >
        <Text bold color="cyan">
          {title}
        </Text>
        <Text dimColor>
          q:quit
        </Text>
      </Box>
      <Box
        borderStyle="single"
        borderBottom
        borderTop={false}
        borderLeft={false}
        borderRight={false}
      >
        <Text> </Text>
      </Box>
    </Box>
  );
};
