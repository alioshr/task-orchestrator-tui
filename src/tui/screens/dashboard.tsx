import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useProjects } from '../../ui/hooks/use-data';
import { useAdapter } from '../../ui/context/adapter-context';
import { useTheme } from '../../ui/context/theme-context';
import { EntityTable } from '../components/entity-table';
import { timeAgo } from '../../ui/lib/format';
import type { ProjectWithCounts } from '../../ui/hooks/use-data';
import { ConfirmDialog } from '../components/confirm-dialog';
import { ErrorMessage } from '../components/error-message';
import { EmptyState } from '../components/empty-state';
import { FormDialog } from '../components/form-dialog';

interface DashboardProps {
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  onSelectProject: (projectId: string) => void;
  onViewProject: (projectId: string) => void;
  onBack?: () => void;
}

export function Dashboard({ selectedIndex, onSelectedIndexChange, onSelectProject, onViewProject, onBack }: DashboardProps) {
  const { adapter } = useAdapter();
  const { theme } = useTheme();
  const { projects, loading, error, refresh } = useProjects();
  const [mode, setMode] = useState<'idle' | 'create' | 'edit' | 'delete'>('idle');
  const [localError, setLocalError] = useState<string | null>(null);

  const columns = [
    {
      key: 'name',
      label: 'Name',
      width: 45,
    },
    {
      key: 'features',
      label: 'Features',
      width: 10,
      render: (_value: unknown, row: ProjectWithCounts) =>
        `${row.featureCounts.completed}/${row.featureCounts.total}`,
    },
    {
      key: 'tasks',
      label: 'Tasks',
      width: 10,
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
  const selectedProject = projects[effectiveSelectedIndex];

  useInput((input, key) => {
    if (mode === 'idle') {
      if (input === 'n') {
        setMode('create');
        return;
      }
      if (input === 'e' && selectedProject) {
        setMode('edit');
        return;
      }
      if (input === 'f' && selectedProject) {
        onViewProject(selectedProject.id);
        return;
      }
      if (input === 'd' && selectedProject) {
        setMode('delete');
        return;
      }
      if (input === 'r') {
        refresh();
      }
      if (key.escape && mode !== 'idle') {
        setMode('idle');
      }
    }
  });

  return (
    <Box paddingX={1} paddingY={1} flexDirection="column">
      {loading ? (
        <Text>Loading projects...</Text>
      ) : null}
      {!loading && error && !localError ? (
        <Text color={theme.colors.danger}>Error: {error}</Text>
      ) : null}

      {localError ? (
        <ErrorMessage message={localError} onDismiss={() => setLocalError(null)} />
      ) : null}

      {!loading && (!error || localError) ? (
        projects.length === 0 && mode === 'idle' ? (
          <EmptyState message="No projects found." hint="Press n to create a project." />
        ) : (
          <EntityTable
            columns={columns}
            data={projects}
            selectedIndex={effectiveSelectedIndex}
            onSelectedIndexChange={onSelectedIndexChange}
            onSelect={(project) => onSelectProject(project.id)}
            onBack={onBack}
            isActive={mode === 'idle'}
          />
        )
      ) : null}

      {mode === 'create' ? (
        <FormDialog
          title="Create Project"
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'summary', label: 'Summary', required: true },
            { key: 'description', label: 'Description' },
          ]}
          onCancel={() => setMode('idle')}
          onSubmit={(values) => {
            adapter.createProject({
              name: values.name ?? '',
              summary: values.summary ?? '',
              description: values.description || undefined,
            }).then((result) => {
              if (!result.success) {
                setLocalError(result.error);
              }
              refresh();
              setMode('idle');
            });
          }}
        />
      ) : null}

      {mode === 'edit' && selectedProject ? (
        <FormDialog
          title="Edit Project"
          fields={[
            { key: 'name', label: 'Name', required: true, value: selectedProject.name },
            { key: 'summary', label: 'Summary', required: true, value: selectedProject.summary },
            { key: 'description', label: 'Description', value: selectedProject.description ?? '' },
          ]}
          onCancel={() => setMode('idle')}
          onSubmit={(values) => {
                adapter.updateProject(selectedProject.id, {
              name: values.name ?? '',
              summary: values.summary ?? '',
              description: values.description || undefined,
              version: selectedProject.version,
            }).then((result) => {
              if (!result.success) {
                setLocalError(result.error);
              }
              refresh();
              setMode('idle');
            });
          }}
        />
      ) : null}

      {mode === 'delete' && selectedProject ? (
        <ConfirmDialog
          title="Delete Project"
          message={`Delete "${selectedProject.name}" and all its features/tasks?`}
          onCancel={() => setMode('idle')}
          onConfirm={() => {
            adapter.deleteProject(selectedProject.id, { cascade: true }).then((result) => {
              if (!result.success) {
                setLocalError(result.error);
              }
              refresh();
              setMode('idle');
            });
          }}
        />
      ) : null}

    </Box>
  );
}
