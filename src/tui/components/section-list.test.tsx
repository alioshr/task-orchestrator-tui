import { describe, test, expect } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { SectionList } from './section-list';
import type { Section } from '@allpepper/task-orchestrator';
import { EntityType, ContentFormat } from '@allpepper/task-orchestrator';
import { ThemeProvider } from '../../ui/context/theme-context';

describe('SectionList', () => {
  const mockSections: Section[] = [
    {
      id: 'section-1',
      entityType: EntityType.TASK,
      entityId: 'task-1',
      title: 'Implementation Details',
      usageDescription: 'Technical specifications for the task',
      content: 'This section contains the implementation details...',
      contentFormat: ContentFormat.MARKDOWN,
      ordinal: 1,
      tags: 'tech,implementation',
      version: 1,
      createdAt: new Date('2024-01-01'),
      modifiedAt: new Date('2024-01-01'),
    },
    {
      id: 'section-2',
      entityType: EntityType.TASK,
      entityId: 'task-1',
      title: 'Testing Strategy',
      usageDescription: 'How to test this feature',
      content: 'Write unit tests for all new functionality...',
      contentFormat: ContentFormat.MARKDOWN,
      ordinal: 2,
      tags: 'testing',
      version: 1,
      createdAt: new Date('2024-01-01'),
      modifiedAt: new Date('2024-01-01'),
    },
  ];

  test('should render with default props', () => {
    const { lastFrame } = render(
      <ThemeProvider>
        <SectionList
          sections={mockSections}
          selectedIndex={0}
          onSelectedIndexChange={() => {}}
        />
      </ThemeProvider>
    );

    const output = lastFrame();
    expect(output).toBeDefined();
    expect(output).toContain('Implementation Details');
    expect(output).toContain('Testing Strategy');
  });

  test('should display expanded sections by default', () => {
    const { lastFrame } = render(
      <ThemeProvider>
        <SectionList
          sections={mockSections}
          selectedIndex={0}
          onSelectedIndexChange={() => {}}
        />
      </ThemeProvider>
    );

    const output = lastFrame();
    expect(output).toContain('▼'); // Expanded indicator
    expect(output).toContain('This section contains the implementation details...');
  });

  test('should show usage description when expanded', () => {
    const { lastFrame } = render(
      <ThemeProvider>
        <SectionList
          sections={mockSections}
          selectedIndex={0}
          onSelectedIndexChange={() => {}}
        />
      </ThemeProvider>
    );

    const output = lastFrame();
    expect(output).toContain('Technical specifications for the task');
  });

  test('should handle empty sections array', () => {
    const { lastFrame } = render(
      <ThemeProvider>
        <SectionList
          sections={[]}
          selectedIndex={0}
          onSelectedIndexChange={() => {}}
        />
      </ThemeProvider>
    );

    const output = lastFrame();
    expect(output).toContain('No sections available');
  });

  test('should show expand/collapse indicators', () => {
    const { lastFrame } = render(
      <ThemeProvider>
        <SectionList
          sections={mockSections}
          selectedIndex={0}
          onSelectedIndexChange={() => {}}
        />
      </ThemeProvider>
    );

    const output = lastFrame();
    // Should show expanded indicator by default
    expect(output).toContain('▼');
    // Should show content when expanded
    expect(output).toContain('This section contains the implementation details...');
  });

  test('should navigate with j key', () => {
    const indices: number[] = [];
    const { stdin } = render(
      <ThemeProvider>
        <SectionList
          sections={mockSections}
          selectedIndex={0}
          onSelectedIndexChange={(index) => {
            indices.push(index);
          }}
        />
      </ThemeProvider>
    );

    // Press j to move down
    stdin.write('j');
    expect(indices).toContain(1);
  });

  test('should navigate with arrow keys', () => {
    const indices: number[] = [];
    const { stdin } = render(
      <ThemeProvider>
        <SectionList
          sections={mockSections}
          selectedIndex={0}
          onSelectedIndexChange={(index) => {
            indices.push(index);
          }}
        />
      </ThemeProvider>
    );

    // Press down arrow
    stdin.write('\x1B[B');
    expect(indices).toContain(1);
  });

  test('should wrap navigation at boundaries', () => {
    const indices: number[] = [];
    const { stdin } = render(
      <ThemeProvider>
        <SectionList
          sections={mockSections}
          selectedIndex={0}
          onSelectedIndexChange={(index) => {
            indices.push(index);
          }}
        />
      </ThemeProvider>
    );

    // Press k from first item (should wrap to last)
    stdin.write('k');
    expect(indices).toContain(1); // Wrapped to last item
  });

  test('should respect isActive prop', () => {
    const indices: number[] = [];
    const { stdin } = render(
      <ThemeProvider>
        <SectionList
          sections={mockSections}
          selectedIndex={0}
          onSelectedIndexChange={(index) => {
            indices.push(index);
          }}
          isActive={false}
        />
      </ThemeProvider>
    );

    // Press j - should not navigate when inactive
    stdin.write('j');
    expect(indices.length).toBe(0);
  });

  test('should handle sections without usage description', () => {
    const sectionsNoDesc: Section[] = [
      {
        ...mockSections[0]!,
        usageDescription: '',
      },
    ];

    const { lastFrame } = render(
      <ThemeProvider>
        <SectionList
          sections={sectionsNoDesc}
          selectedIndex={0}
          onSelectedIndexChange={() => {}}
        />
      </ThemeProvider>
    );

    const output = lastFrame();
    expect(output).toContain('Implementation Details');
    expect(output).toContain('This section contains the implementation details...');
  });
});
