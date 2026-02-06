import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { useProjects } from '../../ui/hooks/use-data';
import { EntityTable } from '../components/entity-table';
import { StatusBadge } from '../components/status-badge';
import { timeAgo } from '../../ui/lib/format';
import type { ProjectWithCounts } from '../../ui/hooks/use-data';

interface DashboardProps {
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  onSelectProject: (projectId: string) => void;
  onBack?: () => void;
}

export function Dashboard({ selectedIndex, onSelectedIndexChange, onSelectProject, onBack }: DashboardProps) {
  const { projects, loading, error } = useProjects();

  if (loading) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text>Loading projects...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (projects.length === 0) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text dimColor>No projects found. Create one to get started.</Text>
      </Box>
    );
  }

  const columns = [
    {
      key: 'name',
      label: 'Name',
      width: 50,
    },
    {
      key: 'status',
      label: 'Status',
      width: 20,
      render: (_value: unknown, row: ProjectWithCounts, context?: { isSelected: boolean }) => (
        <StatusBadge status={row.status} isSelected={context?.isSelected} />
      ),
    },
    {
      key: 'tasks',
      label: 'Tasks',
      width: 15,
      render: (_value: unknown, row: ProjectWithCounts) =>
        `${row.taskCounts.completed}/${row.taskCounts.total}`,
    },
    {
      key: 'modifiedAt',
      label: 'Modified',
      width: 15,
      render: (_value: unknown, row: ProjectWithCounts) => timeAgo(row.modifiedAt),
    },
  ];

  // Clamp selectedIndex if data changed
  const clampedSelectedIndex = Math.min(selectedIndex, Math.max(0, projects.length - 1));
  const effectiveSelectedIndex = projects.length > 0 ? clampedSelectedIndex : 0;

  return (
    <Box paddingX={1} paddingY={1} flexDirection="column">
      <EntityTable
        columns={columns}
        data={projects}
        selectedIndex={effectiveSelectedIndex}
        onSelectedIndexChange={onSelectedIndexChange}
        onSelect={(project) => onSelectProject(project.id)}
        onBack={onBack}
      />
    </Box>
  );
}
