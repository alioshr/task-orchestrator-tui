import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Section } from 'task-orchestrator-bun/src/domain/types';

export interface SectionListProps {
  sections: Section[];
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  isActive?: boolean;
}

export function SectionList({
  sections,
  selectedIndex,
  onSelectedIndexChange,
  isActive = true,
}: SectionListProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map(s => s.id))
  );

  useInput((input, key) => {
    if (!isActive || sections.length === 0) return;

    // Navigation: j/down or k/up
    if (input === 'j' || key.downArrow) {
      const nextIndex = (selectedIndex + 1) % sections.length;
      onSelectedIndexChange(nextIndex);
    } else if (input === 'k' || key.upArrow) {
      const prevIndex = (selectedIndex - 1 + sections.length) % sections.length;
      onSelectedIndexChange(prevIndex);
    } else if ((key.return || input === ' ') && sections[selectedIndex]) {
      // Toggle expansion: Enter or Space
      const section = sections[selectedIndex];
      setExpandedSections(prev => {
        const next = new Set(prev);
        if (next.has(section.id)) {
          next.delete(section.id);
        } else {
          next.add(section.id);
        }
        return next;
      });
    }
  });

  if (sections.length === 0) {
    return (
      <Box>
        <Text dimColor>No sections available</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {sections.map((section, index) => {
        const isSelected = index === selectedIndex;
        const isExpanded = expandedSections.has(section.id);
        const expandIcon = isExpanded ? '▼' : '▶';

        return (
          <Box key={section.id} flexDirection="column">
            {/* Section Header */}
            <Box>
              <Text inverse={isSelected} bold dimColor={!isExpanded}>
                {expandIcon} {section.title}
              </Text>
            </Box>

            {/* Section Content (when expanded) */}
            {isExpanded && (
              <Box marginLeft={2} flexDirection="column">
                {section.usageDescription && (
                  <Box marginBottom={1}>
                    <Text italic dimColor>
                      {section.usageDescription}
                    </Text>
                  </Box>
                )}
                <Box>
                  <Text>{section.content}</Text>
                </Box>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
