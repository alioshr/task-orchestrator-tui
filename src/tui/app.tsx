import React, { useState, useMemo } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { ThemeProvider } from '../ui/context/theme-context';
import { AdapterProvider } from '../ui/context/adapter-context';
import { DirectAdapter } from '../ui/adapters/direct';
import { Header } from './components/header';
import { Footer } from './components/footer';
import { Dashboard } from './screens/dashboard';
import { ProjectView } from './screens/project-view';

export function App() {
  // Setup
  const { exit } = useApp();
  const adapter = useMemo(() => new DirectAdapter(), []);

  // Navigation state (simple for now - just track current screen)
  const [screen, setScreen] = useState<'dashboard' | 'project'>('dashboard');
  const [projectId, setProjectId] = useState<string | null>(null);

  // Global keyboard handling
  useInput((input, key) => {
    if (input === 'q') {
      exit();
    }
    // Escape key to go back
    if (key.escape && screen === 'project') {
      setScreen('dashboard');
      setProjectId(null);
    }
  });

  // Shortcuts for footer
  const shortcuts = [
    { key: 'j/k', label: 'Navigate' },
    { key: 'Enter', label: 'Select' },
    { key: 'q', label: 'Quit' },
    ...(screen === 'project' ? [{ key: 'r', label: 'Refresh' }, { key: 'Esc', label: 'Back' }] : []),
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
                onSelectTask={(taskId) => {
                  // Will navigate to task detail in Wave 4
                  console.log('Task selected:', taskId);
                }}
                onBack={() => {
                  setScreen('dashboard');
                  setProjectId(null);
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
