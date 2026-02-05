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

export function App() {
  // Setup
  const { exit } = useApp();
  const adapter = useMemo(() => new DirectAdapter(), []);

  // Navigation state (simple for now - just track current screen)
  const [screen, setScreen] = useState<'dashboard' | 'project' | 'task' | 'kanban'>('dashboard');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

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
      if (screen === 'task') {
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
  const shortcuts = [
    { key: 'j/k', label: 'Navigate' },
    { key: 'Enter', label: 'Select' },
    { key: 'q', label: 'Quit' },
    ...(screen === 'project' ? [
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
                onSelectProject={(id) => {
                  setProjectId(id);
                  setScreen('project');
                }}
              />
            )}
            {screen === 'project' && projectId && (
              <ProjectView
                projectId={projectId}
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
            {screen === 'kanban' && projectId && (
              <KanbanView
                projectId={projectId}
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
          </Box>
          <Footer shortcuts={shortcuts} />
        </Box>
      </AdapterProvider>
    </ThemeProvider>
  );
}
