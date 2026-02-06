import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../ui/context/theme-context';

export interface HeaderProps {
  title?: string;
  breadcrumbs?: string[];
}

export const Header: React.FC<HeaderProps> = ({ title = 'Task Orchestrator', breadcrumbs }) => {
  const { theme } = useTheme();

  return (
    <Box flexDirection="column">
      <Box
        justifyContent="space-between"
        paddingX={1}
      >
        <Box gap={1}>
          <Text bold color={theme.colors.accent}>
            {title}
          </Text>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Text>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={index}>
                    {index > 0 && <Text dimColor> › </Text>}
                    <Text bold={isLast} dimColor={!isLast}>
                      {crumb}
                    </Text>
                  </React.Fragment>
                );
              })}
            </Text>
          )}
        </Box>
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
