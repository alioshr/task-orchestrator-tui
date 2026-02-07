import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useProjects } from '../../ui/hooks/use-data';
import { useAdapter } from '../../ui/context/adapter-context';
import { useTheme } from '../../ui/context/theme-context';
import { EntityTable } from '../components/entity-table';
import { StatusBadge } from '../components/status-badge';
import { timeAgo } from '../../ui/lib/format';
import type { ProjectWithCounts } from '../../ui/hooks/use-data';
import { ConfirmDialog } from '../components/confirm-dialog';
import { ErrorMessage } from '../components/error-message';
import { EmptyState } from '../components/empty-state';
import { FormDialog } from '../components/form-dialog';
import type { ProjectStatus } from '@allpepper/task-orchestrator';

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
  const [mode, setMode] = useState<'idle' | 'create' | 'edit' | 'delete' | 'status'>('idle');
  const [localError, setLocalError] = useState<string | null>(null);
  const [allowedTransitions, setAllowedTransitions] = useState<string[]>([]);
  const [statusIndex, setStatusIndex] = useState(0);

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
  const selectedProject = projects[effectiveSelectedIndex];

  const statusTargets = useMemo(() => allowedTransitions as ProjectStatus[], [allowedTransitions]);

  useInput((input, key) => {
    // Handle status mode
    if (mode === 'status') {
      if (input === 'j' || key.downArrow) {
        setStatusIndex((prev) => (prev + 1) % Math.max(1, statusTargets.length));
        return;
      }
      if (input === 'k' || key.upArrow) {
        setStatusIndex((prev) => (prev - 1 + Math.max(1, statusTargets.length)) % Math.max(1, statusTargets.length));
        return;
      }
      if (key.escape) {
        setMode('idle');
        return;
      }
      if (key.return && selectedProject && statusTargets[statusIndex]) {
        const next = statusTargets[statusIndex];
        adapter.setProjectStatus(selectedProject.id, next, selectedProject.version).then((result) => {
          if (!result.success) {
            setLocalError(result.error);
          }
          refresh();
          setMode('idle');
        });
      }
      return;
    }

    // Handle idle mode
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
      if (input === 's' && selectedProject) {
        adapter.getAllowedTransitions('PROJECT', selectedProject.status).then((result) => {
          if (result.success) {
            setAllowedTransitions(result.data);
            setMode('status');
          }
        });
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
          message={`Delete "${selectedProject.name}"?`}
          onCancel={() => setMode('idle')}
          onConfirm={() => {
            adapter.deleteProject(selectedProject.id).then((result) => {
              if (!result.success) {
                setLocalError(result.error);
              }
              refresh();
              setMode('idle');
            });
          }}
        />
      ) : null}

      {mode === 'status' && selectedProject ? (
        <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.highlight} paddingX={1} marginTop={1}>
          <Text bold>Set Project Status</Text>
          {statusTargets.length === 0 ? (
            <Text dimColor>No transitions available</Text>
          ) : (
            statusTargets.map((status, idx) => (
              <Text key={status} inverse={idx === statusIndex}>
                {idx === statusIndex ? '>' : ' '} {status}
              </Text>
            ))
          )}
          <Text dimColor>Enter apply • Esc cancel</Text>
        </Box>
      ) : null}

    </Box>
  );
}
