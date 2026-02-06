import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAdapter } from '../../ui/context/adapter-context';
import type { Project, Feature, ProjectStatus } from 'task-orchestrator-bun/src/domain/types';
import { StatusBadge } from '../components/status-badge';
import { timeAgo } from '../../ui/lib/format';
import { FormDialog } from '../components/form-dialog';
import { ErrorMessage } from '../components/error-message';
import { EmptyState } from '../components/empty-state';
import { useTheme } from '../../ui/context/theme-context';

interface ProjectDetailProps {
  projectId: string;
  onSelectFeature: (featureId: string) => void;
  onBack: () => void;
}

export function ProjectDetail({ projectId, onSelectFeature, onBack }: ProjectDetailProps) {
  const { adapter } = useAdapter();
  const { theme } = useTheme();
  const [project, setProject] = useState<Project | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState(0);
  const [mode, setMode] = useState<'idle' | 'edit-project' | 'project-status'>('idle');
  const [localError, setLocalError] = useState<string | null>(null);
  const [transitions, setTransitions] = useState<string[]>([]);
  const [transitionIndex, setTransitionIndex] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [projectResult, featuresResult] = await Promise.all([
      adapter.getProject(projectId),
      adapter.getFeatures({ projectId }),
    ]);
    if (projectResult.success) {
      setProject(projectResult.data);
    } else {
      setError(projectResult.error);
    }
    if (featuresResult.success) {
      setFeatures(featuresResult.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Handle keyboard navigation
  useInput((input, key) => {
    if (mode !== 'idle') return;
    if (key.escape || input === 'h' || key.leftArrow) {
      onBack();
    }
    if (input === 'r') {
      load();
    }
    if (input === 'e' && project) {
      setMode('edit-project');
    }
    if (input === 's' && project) {
      adapter.getAllowedTransitions('PROJECT', project.status).then((result) => {
        if (result.success) {
          setTransitions(result.data);
          setTransitionIndex(0);
          setMode('project-status');
        }
      });
    }
    if (features.length > 0) {
      if (input === 'j' || key.downArrow) {
        setSelectedFeatureIndex((prev) => Math.min(prev + 1, features.length - 1));
      }
      if (input === 'k' || key.upArrow) {
        setSelectedFeatureIndex((prev) => Math.max(prev - 1, 0));
      }
      if (key.return) {
        const selectedFeature = features[selectedFeatureIndex];
        if (selectedFeature) {
          onSelectFeature(selectedFeature.id);
        }
      }
    }
  });

  useInput((input, key) => {
    if (mode !== 'project-status' || !project) return;
    if (input === 'j' || key.downArrow) {
      setTransitionIndex((prev) => (prev + 1) % Math.max(1, transitions.length));
      return;
    }
    if (input === 'k' || key.upArrow) {
      setTransitionIndex((prev) => (prev - 1 + Math.max(1, transitions.length)) % Math.max(1, transitions.length));
      return;
    }
    if (key.escape) {
      setMode('idle');
      return;
    }
    if (key.return) {
      const nextStatus = transitions[transitionIndex] as ProjectStatus | undefined;
      if (!nextStatus) return;
      adapter.setProjectStatus(project.id, nextStatus, project.version).then((result) => {
        if (!result.success) setLocalError(result.error);
        load();
        setMode('idle');
      });
    }
  }, { isActive: mode === 'project-status' });

  if (loading) {
    return (
      <Box padding={1}>
        <Text>Loading project...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={1}>
        <Text color={theme.colors.danger}>Error: {error}</Text>
      </Box>
    );
  }

  if (!project) {
    return (
      <Box padding={1}>
        <Text>Project not found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Project Header */}
      <Box marginBottom={1}>
        <Text bold>{project.name}</Text>
        <Text> </Text>
        <StatusBadge status={project.status} />
      </Box>

      {/* Divider */}
      <Box marginY={0}>
        <Text dimColor>{'─'.repeat(40)}</Text>
      </Box>

      {/* Project Metadata */}
      <Box marginBottom={1}>
        <Text>Modified: </Text>
        <Text dimColor>{timeAgo(new Date(project.modifiedAt))}</Text>
      </Box>

      {/* Divider */}
      <Box marginY={0}>
        <Text dimColor>{'─'.repeat(40)}</Text>
      </Box>

      {/* Project Details (summary) */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Details</Text>
        <Box marginLeft={1}>
          <Text wrap="wrap">{project.summary}</Text>
        </Box>
      </Box>

      {/* Divider */}
      {project.description && (
        <Box marginY={0}>
          <Text dimColor>{'─'.repeat(40)}</Text>
        </Box>
      )}

      {/* Project Description */}
      {project.description && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Description</Text>
          <Box marginLeft={1}>
            <Text wrap="wrap">{project.description}</Text>
          </Box>
        </Box>
      )}

      {/* Divider */}
      <Box marginY={0}>
        <Text dimColor>{'─'.repeat(40)}</Text>
      </Box>

      {/* Features List */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Features ({features.length})</Text>
        {features.length === 0 ? (
          <Box marginLeft={1}><EmptyState message="No features" hint="" /></Box>
        ) : (
          <Box flexDirection="column" marginLeft={1}>
            {features.map((feature, index) => {
              const isSelected = index === selectedFeatureIndex;
              return (
                <Box key={feature.id}>
                  <Text color={isSelected ? theme.colors.highlight : undefined}>
                    {isSelected ? '▎' : '  '}
                  </Text>
                  <Text> </Text>
                  <StatusBadge status={feature.status} />
                  <Text> </Text>
                  <Text bold={isSelected}>
                    {feature.name}
                  </Text>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Help Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          ESC/h: Back | r: Refresh | e: Edit | s: Status{features.length > 0 ? ' | j/k: Navigate | Enter: Select Feature' : ''}
        </Text>
      </Box>

      {localError ? <ErrorMessage message={localError} onDismiss={() => setLocalError(null)} /> : null}

      {mode === 'edit-project' ? (
        <FormDialog
          title="Edit Project"
          fields={[
            { key: 'name', label: 'Name', required: true, value: project.name },
            { key: 'summary', label: 'Summary', required: true, value: project.summary },
            { key: 'description', label: 'Description', value: project.description ?? '' },
          ]}
          onCancel={() => setMode('idle')}
          onSubmit={(values) => {
            adapter.updateProject(project.id, {
              name: values.name ?? '',
              summary: values.summary ?? '',
              description: values.description || undefined,
              version: project.version,
            }).then((result) => {
              if (!result.success) setLocalError(result.error);
              load();
              setMode('idle');
            });
          }}
        />
      ) : null}

      {mode === 'project-status' ? (
        <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.accent} paddingX={1} marginTop={1}>
          <Text bold>Set Project Status</Text>
          {transitions.length === 0 ? (
            <Text dimColor>No transitions available</Text>
          ) : (
            transitions.map((status, idx) => {
              const isSelected = idx === transitionIndex;
              return (
                <Box key={status}>
                  <Text color={isSelected ? theme.colors.highlight : undefined}>
                    {isSelected ? '▎' : '  '}
                  </Text>
                  <Text bold={isSelected}> {status}</Text>
                </Box>
              );
            })
          )}
          <Text dimColor>Enter apply • Esc cancel</Text>
        </Box>
      ) : null}
    </Box>
  );
}
