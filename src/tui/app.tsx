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
  const [projectViewMode, setProjectViewMode] = useState<'features' | 'status'>('status');

  // KanbanView state
  const [kanbanActiveColumnIndex, setKanbanActiveColumnIndex] = useState(0);
  const [kanbanSelectedTaskIndex, setKanbanSelectedTaskIndex] = useState(0);

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
            ? [
              { key: 'h/l', label: 'Columns' },
              { key: 'b', label: 'Tree View' },
              { key: 'm', label: 'Move Task' },
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
                selectedTaskIndex={kanbanSelectedTaskIndex}
                onSelectedTaskIndexChange={setKanbanSelectedTaskIndex}
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
