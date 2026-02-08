import React from 'react';
import { describe, test, expect, mock } from 'bun:test';
import { render } from 'ink-testing-library';
import { StatusActions, type StatusActionsProps } from '../status-actions';
import { ThemeProvider } from '../../../ui/context/theme-context';

function renderWithTheme(props: StatusActionsProps) {
  return render(
    <ThemeProvider>
      <StatusActions {...props} />
    </ThemeProvider>
  );
}

describe('StatusActions', () => {
  test('should render current status', () => {
    const { lastFrame } = renderWithTheme({
      currentStatus: 'ACTIVE',
      nextStatus: 'TO_BE_TESTED',
      prevStatus: 'NEW',
      onAdvance: mock(() => {}),
      onRevert: mock(() => {}),
      onTerminate: mock(() => {}),
    });

    const output = lastFrame();
    expect(output).toContain('Status:');
  });

  test('should show advance and revert actions when available', () => {
    const { lastFrame } = renderWithTheme({
      currentStatus: 'ACTIVE',
      nextStatus: 'TO_BE_TESTED',
      prevStatus: 'NEW',
      onAdvance: mock(() => {}),
      onRevert: mock(() => {}),
      onTerminate: mock(() => {}),
    });

    const output = lastFrame();
    expect(output).toContain('Advance to TO_BE_TESTED');
    expect(output).toContain('Revert to NEW');
    expect(output).toContain('Will Not Implement');
  });

  test('should show no actions when terminal', () => {
    const { lastFrame } = renderWithTheme({
      currentStatus: 'CLOSED',
      nextStatus: null,
      prevStatus: null,
      isTerminal: true,
      onAdvance: mock(() => {}),
      onRevert: mock(() => {}),
      onTerminate: mock(() => {}),
    });

    const output = lastFrame();
    expect(output).toContain('No actions available');
  });

  test('should not show advance when blocked', () => {
    const { lastFrame } = renderWithTheme({
      currentStatus: 'ACTIVE',
      nextStatus: 'TO_BE_TESTED',
      prevStatus: 'NEW',
      isBlocked: true,
      onAdvance: mock(() => {}),
      onRevert: mock(() => {}),
      onTerminate: mock(() => {}),
    });

    const output = lastFrame();
    expect(output).not.toContain('Advance');
    expect(output).toContain('[BLOCKED]');
    expect(output).toContain('Revert to NEW');
  });

  test('should show loading indicator when loading=true', () => {
    const { lastFrame } = renderWithTheme({
      currentStatus: 'ACTIVE',
      nextStatus: 'TO_BE_TESTED',
      prevStatus: 'NEW',
      onAdvance: mock(() => {}),
      onRevert: mock(() => {}),
      onTerminate: mock(() => {}),
      loading: true,
    });

    const output = lastFrame();
    expect(output).toContain('Loading...');
  });

  test('should call onAdvance when advance action is triggered', () => {
    const onAdvance = mock(() => {});
    const { stdin } = renderWithTheme({
      currentStatus: 'ACTIVE',
      nextStatus: 'TO_BE_TESTED',
      prevStatus: null,
      onAdvance,
      onRevert: mock(() => {}),
      onTerminate: mock(() => {}),
    });

    // Press Enter (advance is first action)
    stdin.write('\r');
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  test('should not respond to input when isActive=false', () => {
    const onAdvance = mock(() => {});
    const { stdin } = renderWithTheme({
      currentStatus: 'ACTIVE',
      nextStatus: 'TO_BE_TESTED',
      prevStatus: null,
      onAdvance,
      onRevert: mock(() => {}),
      onTerminate: mock(() => {}),
      isActive: false,
    });

    stdin.write('\r');
    expect(onAdvance).not.toHaveBeenCalled();
  });

  test('should not respond to input when loading=true', () => {
    const onAdvance = mock(() => {});
    const { stdin } = renderWithTheme({
      currentStatus: 'ACTIVE',
      nextStatus: 'TO_BE_TESTED',
      prevStatus: null,
      onAdvance,
      onRevert: mock(() => {}),
      onTerminate: mock(() => {}),
      loading: true,
    });

    stdin.write('\r');
    expect(onAdvance).not.toHaveBeenCalled();
  });
});
