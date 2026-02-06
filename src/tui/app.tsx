import React, { useState, useMemo } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { ThemeProvider } from '../ui/context/theme-context';
import { AdapterProvider } from '../ui/context/adapter-context';
import { DirectAdapter } from '../ui/adapters/direct';
import { Header } from './components/header';
import { Footer } from './components/footer';
import { Dashboard } from './screens/dashboard';
import { ProjectView } from './screens/project-view';
import { TaskDetail } from './screens/task-detail';
import { KanbanView } from './screens/kanban-view';
import { FeatureDetail } from './screens/feature-detail';

export function App() {
  // Setup
  const { exit } = useApp();
  const adapter = useMemo(() => new DirectAdapter(), []);

  // Navigation state (simple for now - just track current screen)
  const [screen, setScreen] = useState<'dashboard' | 'project' | 'task' | 'kanban' | 'feature'>('dashboard');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [featureId, setFeatureId] = useState<string | null>(null);

  // View state persistence
  // Dashboard state
  const [dashboardSelectedIndex, setDashboardSelectedIndex] = useState(0);

  // ProjectView state
  const [projectExpandedFeatures, setProjectExpandedFeatures] = useState<Set<string>>(new Set());
  const [projectExpandedGroups, setProjectExpandedGroups] = useState<Set<string>>(new Set());
  const [projectSelectedIndex, setProjectSelectedIndex] = useState(0);
  const [projectViewMode, setProjectViewMode] = useState<'features' | 'status'>('status');

  // KanbanView state
  const [kanbanActiveColumnIndex, setKanbanActiveColumnIndex] = useState(0);
  const [kanbanSelectedTaskIndex, setKanbanSelectedTaskIndex] = useState(0);

  // Global keyboard handling
  useInput((input, key) => {
    if (input === 'q') {
      exit();
    }
    // Toggle between project tree view and kanban board
    if (input === 'b' && (screen === 'project' || screen === 'kanban')) {
      setScreen(screen === 'project' ? 'kanban' : 'project');
    }
    // Escape key to go back
    if (key.escape) {
      if (screen === 'feature') {
        setScreen('project');
        setFeatureId(null);
      } else if (screen === 'task') {
        // Go back to project view (default for simplicity)
        setScreen('project');
        setTaskId(null);
      } else if (screen === 'kanban') {
        setScreen('dashboard');
        setProjectId(null);
      } else if (screen === 'project') {
        setScreen('dashboard');
        setProjectId(null);
      }
    }
  });

  // Shortcuts for footer
  const shortcuts = screen === 'feature' ? [
    // Feature screen has specific shortcuts, no need for global ones
    { key: 'j/k', label: 'Navigate' },
    { key: 'Enter', label: 'Open Task' },
    { key: 'q', label: 'Quit' },
    { key: 'r', label: 'Refresh' },
    { key: 'Esc', label: 'Back' }
  ] : [
    // Default global shortcuts
    { key: 'j/k', label: 'Navigate' },
    { key: 'Enter/l', label: 'Select' },
    { key: 'q', label: 'Quit' },
    ...(screen === 'dashboard' ? [
      { key: 'h', label: 'Back' },
    ] : []),
    ...(screen === 'project' ? [
      { key: 'f', label: 'Feature Info' },
      { key: 'v', label: 'Toggle View' },
      { key: 'b', label: 'Board View' },
      { key: 'r', label: 'Refresh' },
      { key: 'Esc', label: 'Back' }
    ] : []),
    ...(screen === 'kanban' ? [
      { key: 'h/l', label: 'Columns' },
      { key: 'b', label: 'Tree View' },
      { key: 'm', label: 'Move Task' },
      { key: 'Esc', label: 'Back' }
    ] : []),
    ...(screen === 'task' ? [
      { key: 'Tab', label: 'Switch Panel' },
      { key: 'r', label: 'Refresh' },
      { key: 'Esc', label: 'Back' }
    ] : []),
  ];

  return (
    <ThemeProvider>
      <AdapterProvider adapter={adapter}>
        <Box flexDirection="column" width="100%">
          <Header />
          <Box flexGrow={1} flexDirection="column">
            {screen === 'dashboard' && (
              <Dashboard
                selectedIndex={dashboardSelectedIndex}
                onSelectedIndexChange={setDashboardSelectedIndex}
                onSelectProject={(id) => {
                  setProjectId(id);
                  setScreen('project');
                }}
                onBack={() => {
                  setScreen('dashboard');
                  setProjectId(null);
                  setTaskId(null);
                  setFeatureId(null);
                }}
              />
            )}
            {screen === 'project' && projectId && (
              <ProjectView
                projectId={projectId}
                expandedFeatures={projectExpandedFeatures}
                onExpandedFeaturesChange={setProjectExpandedFeatures}
                expandedGroups={projectExpandedGroups}
                onExpandedGroupsChange={setProjectExpandedGroups}
                selectedIndex={projectSelectedIndex}
                onSelectedIndexChange={setProjectSelectedIndex}
                viewMode={projectViewMode}
                onViewModeChange={setProjectViewMode}
                onSelectTask={(id) => {
                  setTaskId(id);
                  setScreen('task');
                }}
                onSelectFeature={(id) => {
                  setFeatureId(id);
                  setScreen('feature');
                }}
                onBack={() => {
                  setScreen('dashboard');
                  setProjectId(null);
                }}
              />
            )}
            {screen === 'kanban' && projectId && (
              <KanbanView
                projectId={projectId}
                activeColumnIndex={kanbanActiveColumnIndex}
                onActiveColumnIndexChange={setKanbanActiveColumnIndex}
                selectedTaskIndex={kanbanSelectedTaskIndex}
                onSelectedTaskIndexChange={setKanbanSelectedTaskIndex}
                onSelectTask={(id) => {
                  setTaskId(id);
                  setScreen('task');
                }}
                onBack={() => {
                  setScreen('dashboard');
                  setProjectId(null);
                }}
              />
            )}
            {screen === 'task' && taskId && (
              <TaskDetail
                taskId={taskId}
                onSelectTask={(id) => {
                  setTaskId(id);
                  // Stay on task screen, just change taskId
                }}
                onBack={() => {
                  setScreen('project');
                  setTaskId(null);
                }}
              />
            )}
            {screen === 'feature' && featureId && (
              <FeatureDetail
                featureId={featureId}
                onSelectTask={(id) => {
                  setTaskId(id);
                  setScreen('task');
                }}
                onBack={() => {
                  setScreen('project');
                  setFeatureId(null);
                }}
              />
            )}
          </Box>
          <Footer shortcuts={shortcuts} />
        </Box>
      </AdapterProvider>
    </ThemeProvider>
  );
}
