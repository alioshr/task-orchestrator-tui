import React, { useMemo, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { useSearch } from '../../ui/hooks/use-data';
import { useDebounce } from '../../ui/hooks/use-debounce';
import { EmptyState } from '../components/empty-state';
import { ErrorMessage } from '../components/error-message';
import { useTheme } from '../../ui/context/theme-context';

interface SearchScreenProps {
  onOpenProject: (projectId: string) => void;
  onOpenFeature: (featureId: string) => void;
  onOpenTask: (taskId: string) => void;
  onBack: () => void;
}

type SearchItem =
  | { kind: 'project'; id: string; title: string; subtitle: string }
  | { kind: 'feature'; id: string; title: string; subtitle: string }
  | { kind: 'task'; id: string; title: string; subtitle: string };

function countWrappedLines(text: string, width: number): number {
  const safeWidth = Math.max(1, width);
  return text.split('\n').reduce((sum, line) => {
    const len = Array.from(line).length;
    return sum + Math.max(1, Math.ceil(len / safeWidth));
  }, 0);
}

export function SearchScreen({
  onOpenProject,
  onOpenFeature,
  onOpenTask,
  onBack,
}: SearchScreenProps) {
  const { stdout } = useStdout();
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debouncedQuery = useDebounce(query, 300);
  const { results, loading, error } = useSearch(debouncedQuery);
  const [dismissedError, setDismissedError] = useState(false);

  const items = useMemo<SearchItem[]>(() => {
    if (!results) return [];
    return [
      ...results.projects.map((p) => ({
        kind: 'project' as const,
        id: p.id,
        title: p.name,
        subtitle: p.summary,
      })),
      ...results.features.map((f) => ({
        kind: 'feature' as const,
        id: f.id,
        title: f.name,
        subtitle: f.summary,
      })),
      ...results.tasks.map((t) => ({
        kind: 'task' as const,
        id: t.id,
        title: t.title,
        subtitle: t.summary,
      })),
    ];
  }, [results]);

  useInput((input, key) => {
    if (key.escape || key.leftArrow) {
      onBack();
      return;
    }

    if (key.backspace || key.delete) {
      setQuery((prev) => prev.slice(0, -1));
      setSelectedIndex(0);
      return;
    }

    if (key.downArrow) {
      if (items.length > 0) setSelectedIndex((prev) => (prev + 1) % items.length);
      return;
    }

    if (key.upArrow) {
      if (items.length > 0) setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      return;
    }

    if ((key.return || key.rightArrow) && items[selectedIndex]) {
      const selected = items[selectedIndex];
      if (!selected) return;
      if (selected.kind === 'project') onOpenProject(selected.id);
      if (selected.kind === 'feature') onOpenFeature(selected.id);
      if (selected.kind === 'task') onOpenTask(selected.id);
      return;
    }

    if (input && input.length === 1 && !key.ctrl && !key.meta) {
      setQuery((prev) => `${prev}${input}`);
      setSelectedIndex(0);
    }
  });

  const clampedIndex = Math.min(selectedIndex, Math.max(0, items.length - 1));
  const terminalRows = stdout?.rows ?? 24;
  const terminalCols = stdout?.columns ?? 80;
  const contentWidth = Math.max(20, terminalCols - 4);
  const markerWidth = 2;
  const cardWidth = Math.max(16, contentWidth - markerWidth);
  const cardInnerWidth = Math.max(8, cardWidth - 4); // border + paddingX
  const isQueryEmpty = debouncedQuery.trim().length === 0;
  const hasNoResults = !loading && !isQueryEmpty && items.length === 0;
  const shouldShowResults = !isQueryEmpty && items.length > 0;

  const queryLabel = `Query: ${query || ' '}`;
  const hintLabel = 'Type to search • ↑/↓ move • Enter open • Esc/← back';

  // Sticky top area rows with dynamic wrapping.
  const titleRows = 1;
  const queryRows = countWrappedLines(queryLabel, contentWidth);
  const hintRows = countWrappedLines(hintLabel, contentWidth);
  const loadingRows = loading ? 1 : 0;
  const errorRows = !dismissedError && error
    ? (
      2 + // border top + bottom
      2 + // marginY = 1 => top + bottom
      countWrappedLines(`! ${error}`, Math.max(8, contentWidth - 4)) // border + paddingX reduce width
    )
    : 0;
  const chromeRows = titleRows + queryRows + hintRows + loadingRows + errorRows + 1;

  // Reserve lines for top/bottom "more" indicators and extra layout slack.
  // Ink + terminal row accounting can differ slightly with borders/wrapping, so keep a cushion.
  const layoutSlackRows = 3;
  const maxResultLines = Math.max(3, terminalRows - chromeRows - 2 - layoutSlackRows);

  const itemHeights = (shouldShowResults ? items : []).map((item) => {
    const kindLabel = item.kind.toUpperCase();
    const title = item.title;
    const subtitle = item.subtitle ?? '';
    // Card chrome: top/bottom border + type + title + subtitle
    return (
      2 +
      countWrappedLines(kindLabel, cardInnerWidth) +
      countWrappedLines(title, cardInnerWidth) +
      countWrappedLines(subtitle, cardInnerWidth)
    );
  });

  let windowStart = 0;
  let windowEnd = 0;
  if (shouldShowResults) {
    windowStart = clampedIndex;
    let used = itemHeights[clampedIndex] ?? 1;

    // Include as many entries above selection as possible.
    while (windowStart > 0) {
      const prevHeight = itemHeights[windowStart - 1] ?? 1;
      if (used + prevHeight > maxResultLines) break;
      windowStart -= 1;
      used += prevHeight;
    }

    // Fill downward from windowStart.
    windowEnd = windowStart;
    used = 0;
    while (windowEnd < items.length) {
      const nextHeight = itemHeights[windowEnd] ?? 1;
      if (used + nextHeight > maxResultLines && windowEnd > windowStart) break;
      if (used + nextHeight > maxResultLines && windowEnd === windowStart) {
        // Keep at least one item visible even in very short terminals.
        windowEnd += 1;
        break;
      }
      used += nextHeight;
      windowEnd += 1;
    }
  }

  const visibleItems = items.slice(windowStart, windowEnd);
  const hasItemsAbove = shouldShowResults && windowStart > 0;
  const hasItemsBelow = shouldShowResults && windowEnd < items.length;
  const itemsAboveCount = windowStart;
  const itemsBelowCount = items.length - windowEnd;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold>Search</Text>
      <Text>
        Query: <Text inverse>{query || ' '}</Text>
      </Text>
      <Text dimColor>{hintLabel}</Text>

      {!dismissedError && error ? (
        <ErrorMessage message={error} onDismiss={() => setDismissedError(true)} />
      ) : null}

      {loading ? <Text>Searching...</Text> : null}

      {!loading && isQueryEmpty ? (
        <EmptyState message="Start typing to search projects, features, and tasks." />
      ) : null}

      {!loading && !isQueryEmpty && items.length === 0 ? (
        <EmptyState message="No results found." hint="Try a broader query." />
      ) : null}

      {hasItemsAbove ? (
        <Text dimColor>↑ {itemsAboveCount} more</Text>
      ) : null}

      {shouldShowResults
        ? visibleItems.map((item, index) => {
          const actualIndex = windowStart + index;
          const isSelected = actualIndex === clampedIndex;
          return (
            <Box
              key={`${item.kind}-${item.id}`}
              width={contentWidth}
              flexDirection="row"
            >
              <Box width={markerWidth}>
                <Text color={isSelected ? theme.colors.highlight : theme.colors.muted}>
                  {isSelected ? '▎' : ' '}
                </Text>
              </Box>
              <Box
                borderStyle={isSelected ? 'double' : 'round'}
                borderColor={isSelected ? theme.colors.highlight : theme.colors.border}
                paddingX={1}
                width={cardWidth}
              >
                <Box flexDirection="column">
                  <Text color={isSelected ? theme.colors.highlight : (
                    item.kind === 'project' ? theme.colors.accent :
                    item.kind === 'feature' ? theme.colors.warning :
                    theme.colors.success
                  )} bold>
                    {item.kind.toUpperCase()}
                  </Text>
                  <Text bold={isSelected}>
                    {item.title}
                  </Text>
                  <Text dimColor={!isSelected}>{item.subtitle}</Text>
                </Box>
              </Box>
            </Box>
          );
        })
        : null}

      {hasItemsBelow ? (
        <Text dimColor>↓ {itemsBelowCount} more</Text>
      ) : null}
    </Box>
  );
}
