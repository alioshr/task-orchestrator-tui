import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import { Header } from '../header';
import { ThemeProvider } from '../../../ui/context/theme-context';

function renderWithTheme(props = {}) {
  return render(
    <ThemeProvider>
      <Header {...props} />
    </ThemeProvider>
  );
}

describe('Header', () => {
  test('should render default title', () => {
    const { lastFrame } = renderWithTheme();
    const output = lastFrame();
    expect(output).toContain('Task Orchestrator');
    expect(output).toContain('q:quit');
  });

  test('should render custom title', () => {
    const { lastFrame } = renderWithTheme({ title: 'Custom Title' });
    const output = lastFrame();
    expect(output).toContain('Custom Title');
  });

  test('should render without breadcrumbs when not provided', () => {
    const { lastFrame } = renderWithTheme();
    const output = lastFrame();
    expect(output).not.toContain('›');
  });

  test('should render single breadcrumb', () => {
    const { lastFrame } = renderWithTheme({ breadcrumbs: ['Dashboard'] });
    const output = lastFrame();
    expect(output).toContain('Dashboard');
  });

  test('should render multiple breadcrumbs with separator', () => {
    const { lastFrame } = renderWithTheme({
      breadcrumbs: ['Dashboard', 'Project', 'Feature']
    });
    const output = lastFrame();
    expect(output).toContain('Dashboard');
    expect(output).toContain('Project');
    expect(output).toContain('Feature');
    expect(output).toContain('›');
  });

  test('should render empty breadcrumbs array without separator', () => {
    const { lastFrame } = renderWithTheme({ breadcrumbs: [] });
    const output = lastFrame();
    expect(output).not.toContain('›');
  });

  test('should be backwards compatible when breadcrumbs not provided', () => {
    const { lastFrame } = renderWithTheme({ title: 'Test' });
    const output = lastFrame();
    expect(output).toContain('Test');
    expect(output).toContain('q:quit');
  });
});
