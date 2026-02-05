import React from 'react';
import { describe, test, expect, mock } from 'bun:test';
import { render } from 'ink-testing-library';
import { StatusActions, type StatusActionsProps } from '../status-actions';
import { ThemeProvider } from '../../../ui/context/theme-context';

// Helper to render with ThemeProvider
function renderWithTheme(props: StatusActionsProps) {
  return render(
    <ThemeProvider>
      <StatusActions {...props} />
    </ThemeProvider>
  );
}

describe('StatusActions', () => {
  test('should render current status with StatusBadge', () => {
    const onTransition = mock(() => {});
    const { lastFrame } = renderWithTheme({
      currentStatus: 'IN_PROGRESS',
      allowedTransitions: ['COMPLETED', 'BLOCKED'],
      onTransition,
    });

    const output = lastFrame();
    expect(output).toContain('Status:');
    expect(output).toContain('In Progress'); // StatusBadge should format it
  });

  test('should display "No transitions available" when no transitions', () => {
    const onTransition = mock(() => {});
    const { lastFrame } = renderWithTheme({
      currentStatus: 'COMPLETED',
      allowedTransitions: [],
      onTransition,
    });

    const output = lastFrame();
    expect(output).toContain('No transitions available');
  });

  test('should display available transitions', () => {
    const onTransition = mock(() => {});
    const { lastFrame } = renderWithTheme({
      currentStatus: 'IN_PROGRESS',
      allowedTransitions: ['COMPLETED', 'BLOCKED', 'ON_HOLD'],
      onTransition,
    });

    const output = lastFrame();
    expect(output).toContain('Change to:');
    expect(output).toContain('COMPLETED');
    expect(output).toContain('BLOCKED');
    expect(output).toContain('ON_HOLD');
  });

  test('should show arrow prefix for first transition option', () => {
    const onTransition = mock(() => {});
    const { lastFrame } = renderWithTheme({
      currentStatus: 'IN_PROGRESS',
      allowedTransitions: ['COMPLETED', 'BLOCKED'],
      onTransition,
    });

    const output = lastFrame();
    expect(output).toContain('→ COMPLETED'); // First item should have arrow
  });

  test('should show loading indicator when loading=true', () => {
    const onTransition = mock(() => {});
    const { lastFrame } = renderWithTheme({
      currentStatus: 'IN_PROGRESS',
      allowedTransitions: ['COMPLETED'],
      onTransition,
      loading: true,
    });

    const output = lastFrame();
    expect(output).toContain('Loading...');
    expect(output).not.toContain('Change to:');
  });

  test('should show first transition with arrow by default', () => {
    const onTransition = mock(() => {});
    const { lastFrame } = renderWithTheme({
      currentStatus: 'IN_PROGRESS',
      allowedTransitions: ['COMPLETED', 'BLOCKED', 'ON_HOLD'],
      onTransition,
    });

    // Initially first item is selected
    const output = lastFrame();
    expect(output).toContain('→ COMPLETED');
  });

  test('should call onTransition with first item when Enter pressed without navigation', () => {
    const onTransition = mock(() => {});
    const { stdin } = renderWithTheme({
      currentStatus: 'IN_PROGRESS',
      allowedTransitions: ['COMPLETED', 'BLOCKED', 'ON_HOLD'],
      onTransition,
    });

    // Press Enter without navigating (should select first item)
    stdin.write('\r');
    expect(onTransition).toHaveBeenCalledWith('COMPLETED');
  });

  test('should handle Enter key to trigger transition', () => {
    const onTransition = mock(() => {});
    const { stdin } = renderWithTheme({
      currentStatus: 'IN_PROGRESS',
      allowedTransitions: ['COMPLETED', 'BLOCKED'],
      onTransition,
    });

    // Press Enter to trigger transition
    stdin.write('\r');
    expect(onTransition).toHaveBeenCalledTimes(1);
  });

  test('should call onTransition with correct default status', () => {
    const onTransition = mock(() => {});
    const { stdin } = renderWithTheme({
      currentStatus: 'IN_PROGRESS',
      allowedTransitions: ['COMPLETED', 'BLOCKED'],
      onTransition,
    });

    // Press Enter (should select first item by default)
    stdin.write('\r');
    expect(onTransition).toHaveBeenCalledWith('COMPLETED');
  });

  test('should accept keyboard input when active', () => {
    const onTransition = mock(() => {});
    const { stdin } = renderWithTheme({
      currentStatus: 'IN_PROGRESS',
      allowedTransitions: ['COMPLETED', 'BLOCKED'],
      onTransition,
      isActive: true,
    });

    // Should respond to Enter
    stdin.write('\r');
    expect(onTransition).toHaveBeenCalled();
  });

  test('should not respond to input when isActive=false', () => {
    const onTransition = mock(() => {});
    const { stdin } = renderWithTheme({
      currentStatus: 'IN_PROGRESS',
      allowedTransitions: ['COMPLETED', 'BLOCKED'],
      onTransition,
      isActive: false,
    });

    // Try to select with Enter
    stdin.write('\r');
    expect(onTransition).not.toHaveBeenCalled();
  });

  test('should not respond to input when loading=true', () => {
    const onTransition = mock(() => {});
    const { stdin } = renderWithTheme({
      currentStatus: 'IN_PROGRESS',
      allowedTransitions: ['COMPLETED', 'BLOCKED'],
      onTransition,
      loading: true,
    });

    // Try to select with Enter
    stdin.write('\r');
    expect(onTransition).not.toHaveBeenCalled();
  });

  test('should not respond to input when no transitions available', () => {
    const onTransition = mock(() => {});
    const { stdin } = renderWithTheme({
      currentStatus: 'COMPLETED',
      allowedTransitions: [],
      onTransition,
    });

    // Try to select
    stdin.write('\r');

    expect(onTransition).not.toHaveBeenCalled();
  });

  test('should display all transitions in list format', () => {
    const onTransition = mock(() => {});
    const { lastFrame } = renderWithTheme({
      currentStatus: 'IN_PROGRESS',
      allowedTransitions: ['COMPLETED', 'BLOCKED'],
      onTransition,
    });

    const output = lastFrame();
    // Both transitions should be visible
    expect(output).toContain('COMPLETED');
    expect(output).toContain('BLOCKED');
  });
});
