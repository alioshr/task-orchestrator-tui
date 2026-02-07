import React, { useState, useMemo, useCallback } from 'react';
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
import { ProjectDetail } from './screens/project-detail';
import { SearchScreen } from './screens/search';

export function App() {
  // Setup
  const { exit } = useApp();
  const adapter = useMemo(() => new DirectAdapter(), []);

  // Navigation state (simple for now - just track current screen)
  const [screen, setScreen] = useState<'dashboard' | 'project' | 'project-detail' | 'task' | 'kanban' | 'feature' | 'search'>('dashboard');
  const [searchReturnScreen, setSearchReturnScreen] = useState<'dashboard' | 'project' | 'project-detail' | 'task' | 'kanban' | 'feature'>('dashboard');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [featureId, setFeatureId] = useState<string | null>(null);
  const [taskOriginScreen, setTaskOriginScreen] = useState<'project' | 'kanban' | 'feature'>('project');

  // View state persistence
  // Dashboard state
  const [dashboardSelectedIndex, setDashboardSelectedIndex] = useState(0);

  // ProjectView state
  const [projectExpandedFeatures, setProjectExpandedFeatures] = useState<Set<string>>(new Set());
  const [projectExpandedGroups, setProjectExpandedGroups] = useState<Set<string>>(new Set());
  const [projectSelectedIndex, setProjectSelectedIndex] = useState(0);
  const [projectViewMode, setProjectViewMode] = useState<'features' | 'status' | 'feature-status'>('status');

  // KanbanView state
  const [kanbanActiveColumnIndex, setKanbanActiveColumnIndex] = useState(0);
  const [kanbanSelectedFeatureIndex, setKanbanSelectedFeatureIndex] = useState(0);
  const [kanbanExpandedFeatureId, setKanbanExpandedFeatureId] = useState<string | null>(null);
  const [kanbanSelectedTaskIndex, setKanbanSelectedTaskIndex] = useState(-1);
  const [kanbanActiveStatuses, setKanbanActiveStatuses] = useState<Set<string>>(new Set());
  const handleKanbanActiveStatusesChange = useCallback((statuses: Set<string>) => {
    setKanbanActiveStatuses(statuses);
  }, []);

  // Global keyboard handling
  useInput((input, key) => {
    if (input === 'q') {
      exit();
    }
    if (input === '/') {
      if (screen !== 'search') {
        setSearchReturnScreen(screen as 'dashboard' | 'project' | 'task' | 'kanban' | 'feature');
        setScreen('search');
      }
      return;
    }
  });

  // Compute breadcrumbs based on current screen
  const breadcrumbs = useMemo(() => {
    switch (screen) {
      case 'dashboard':
        return ['Dashboard'];
      case 'project-detail':
        return ['Dashboard', 'Project'];
      case 'project':
        return ['Dashboard', 'Project'];
      case 'feature':
        return ['Dashboard', 'Project', 'Feature'];
      case 'task':
        return ['Dashboard', 'Project', 'Task'];
      case 'kanban':
        return ['Dashboard', 'Project', 'Board'];
      case 'search':
        return ['Search'];
      default:
        return ['Dashboard'];
    }
  }, [screen]);

  // Shortcuts for footer
  const shortcuts =
    screen === 'search'
      ? [
        { key: '↑/↓', label: 'Navigate' },
        { key: 'Enter/→', label: 'Open' },
        { key: 'Esc/←', label: 'Back' },
        { key: 'q', label: 'Quit' },
      ]
      : screen === 'feature'
        ? [
          { key: 'j/k', label: 'Navigate' },
          { key: 'Enter', label: 'Open Task' },
          { key: 'n', label: 'New Task' },
          { key: 'q', label: 'Quit' },
          { key: 'r', label: 'Refresh' },
          { key: 'Esc', label: 'Back' },
        ]
        : [
          { key: 'j/k', label: 'Navigate' },
          { key: 'Enter/l', label: 'Select' },
          { key: '/', label: 'Search' },
          { key: 'q', label: 'Quit' },
          ...(screen === 'dashboard'
            ? [
              { key: 'n', label: 'New Project' },
              { key: 'f', label: 'Project Info' },
              { key: 'e', label: 'Edit Project' },
              { key: 'd', label: 'Delete Project' },
              { key: 'r', label: 'Refresh' },
              { key: 'h', label: 'Back' },
            ]
            : []),
          ...(screen === 'project-detail'
            ? [
              { key: 'e', label: 'Edit' },
              { key: 's', label: 'Status' },
              { key: 'r', label: 'Refresh' },
              { key: 'Esc/h', label: 'Back' },
            ]
            : []),
          ...(screen === 'project'
            ? [
              { key: 'n', label: 'New Feature' },
              { key: 't', label: 'New Task' },
              { key: 'f', label: 'Feature Detail' },
              { key: 'v', label: 'Toggle View' },
              { key: 'b', label: 'Board View' },
              { key: 'r', label: 'Refresh' },
              { key: 'h/Esc', label: 'Back' },
            ]
            : []),
          ...(screen === 'kanban'
            ? kanbanExpandedFeatureId
              ? [
                { key: 'j/k', label: 'Tasks' },
                { key: 'Enter', label: 'Open Task' },
                { key: 'Esc/h', label: 'Collapse' },
                { key: 'r', label: 'Refresh' },
              ]
              : [
                { key: 'h/l', label: 'Columns' },
                { key: 'j/k', label: 'Features' },
                { key: 'Enter', label: 'Expand' },
                { key: 'm', label: 'Move Feature' },
                { key: 'f', label: 'Filter' },
                { key: 'b', label: 'Tree View' },
                { key: 'Esc', label: 'Back' },
              ]
            : []),
          ...(screen === 'task'
            ? [
              { key: 'Tab', label: 'Switch Panel' },
              { key: 'r', label: 'Refresh' },
              { key: 'Esc', label: 'Back' },
            ]
            : []),
        ];

  return (
    <ThemeProvider>
      <AdapterProvider adapter={adapter}>
        <Box flexDirection="column" width="100%">
          <Header breadcrumbs={breadcrumbs} />
          <Box flexGrow={1} flexDirection="column">
            {screen === 'dashboard' && (
              <Dashboard
                selectedIndex={dashboardSelectedIndex}
                onSelectedIndexChange={setDashboardSelectedIndex}
                onSelectProject={(id) => {
                  setProjectId(id);
                  setScreen('project');
                }}
                onViewProject={(id) => {
                  setProjectId(id);
                  setScreen('project-detail');
                }}
                onBack={() => {
                  setScreen('dashboard');
                  setProjectId(null);
                  setTaskId(null);
                  setFeatureId(null);
                }}
              />
            )}
            {screen === 'project-detail' && projectId && (
              <ProjectDetail
                projectId={projectId}
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
                  setTaskOriginScreen('project');
                  setTaskId(id);
                  setScreen('task');
                }}
                onSelectFeature={(id) => {
                  setFeatureId(id);
                  setScreen('feature');
                }}
                onToggleBoard={() => {
                  setScreen('kanban');
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
                selectedFeatureIndex={kanbanSelectedFeatureIndex}
                onSelectedFeatureIndexChange={setKanbanSelectedFeatureIndex}
                expandedFeatureId={kanbanExpandedFeatureId}
                onExpandedFeatureIdChange={setKanbanExpandedFeatureId}
                selectedTaskIndex={kanbanSelectedTaskIndex}
                onSelectedTaskIndexChange={setKanbanSelectedTaskIndex}
                activeStatuses={kanbanActiveStatuses}
                onActiveStatusesChange={handleKanbanActiveStatusesChange}
                onSelectTask={(id) => {
                  setTaskOriginScreen('kanban');
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
                  setScreen(taskOriginScreen === 'kanban' ? 'kanban' : taskOriginScreen === 'feature' ? 'feature' : 'project');
                  setTaskId(null);
                }}
              />
            )}
            {screen === 'feature' && featureId && (
              <FeatureDetail
                featureId={featureId}
                onSelectTask={(id) => {
                  setTaskOriginScreen('feature');
                  setTaskId(id);
                  setScreen('task');
                }}
                onBack={() => {
                  setScreen('project');
                  setFeatureId(null);
                }}
              />
            )}
            {screen === 'search' && (
              <SearchScreen
                onOpenProject={(id) => {
                  setProjectId(id);
                  setScreen('project');
                }}
                onOpenFeature={(id) => {
                  setFeatureId(id);
                  setScreen('feature');
                }}
                onOpenTask={(id) => {
                  setTaskOriginScreen('project');
                  setTaskId(id);
                  setScreen('task');
                }}
                onBack={() => {
                  setScreen(searchReturnScreen);
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
