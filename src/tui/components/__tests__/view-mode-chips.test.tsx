import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import { ViewModeChips } from '../view-mode-chips';

describe('ViewModeChips', () => {
  test('should render active mode with inverse style', () => {
    const modes = [
      { key: 'features', label: 'Features' },
      { key: 'status', label: 'Status' },
    ];
    const { lastFrame } = render(
      <ViewModeChips
        modes={modes}
        activeMode="features"
        onModeChange={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('[Features]');
    expect(output).toContain('Status');
  });

  test('should render inactive modes dimmed', () => {
    const modes = [
      { key: 'features', label: 'Features' },
      { key: 'status', label: 'Status' },
    ];
    const { lastFrame } = render(
      <ViewModeChips
        modes={modes}
        activeMode="status"
        onModeChange={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Features');
    expect(output).toContain('[Status]');
  });

  test('should render with 2 modes', () => {
    const modes = [
      { key: 'features', label: 'Features' },
      { key: 'status', label: 'Status' },
    ];
    const { lastFrame } = render(
      <ViewModeChips
        modes={modes}
        activeMode="features"
        onModeChange={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('[Features]');
    expect(output).toContain('Status');
    expect(output).toBeTruthy();
  });

  test('should render with 3 modes', () => {
    const modes = [
      { key: 'features', label: 'Features' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
    ];
    const { lastFrame } = render(
      <ViewModeChips
        modes={modes}
        activeMode="status"
        onModeChange={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Features');
    expect(output).toContain('[Status]');
    expect(output).toContain('Priority');
  });

  test('should highlight only the active mode', () => {
    const modes = [
      { key: 'features', label: 'Features' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
    ];
    const { lastFrame } = render(
      <ViewModeChips
        modes={modes}
        activeMode="priority"
        onModeChange={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('Features');
    expect(output).toContain('Status');
    expect(output).toContain('[Priority]');
  });

  test('should handle single mode', () => {
    const modes = [{ key: 'features', label: 'Features' }];
    const { lastFrame } = render(
      <ViewModeChips
        modes={modes}
        activeMode="features"
        onModeChange={() => {}}
      />
    );

    const output = lastFrame();
    expect(output).toContain('[Features]');
  });

  test('should render all modes in order', () => {
    const modes = [
      { key: 'a', label: 'First' },
      { key: 'b', label: 'Second' },
      { key: 'c', label: 'Third' },
    ];
    const { lastFrame } = render(
      <ViewModeChips
        modes={modes}
        activeMode="b"
        onModeChange={() => {}}
      />
    );

    const output = lastFrame() || '';
    const firstIndex = output.indexOf('First');
    const secondIndex = output.indexOf('[Second]');
    const thirdIndex = output.indexOf('Third');

    expect(firstIndex).toBeLessThan(secondIndex);
    expect(secondIndex).toBeLessThan(thirdIndex);
  });
});
