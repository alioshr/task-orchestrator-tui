import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../ui/context/theme-context';

export interface FormField {
  key: string;
  label: string;
  value?: string;
  required?: boolean;
}

interface FormDialogProps {
  title: string;
  description?: string;
  fields: FormField[];
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
  isActive?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function sanitizeInputValue(value: string): string {
  const normalized = normalizeNewlines(value);
  // Keep printable chars + newlines; drop other control bytes that can corrupt TUI layout.
  return normalized.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function toChars(value: string): string[] {
  return Array.from(value);
}

function deleteWordBeforeCursor(value: string, cursor: number): { value: string; cursor: number } {
  const chars = toChars(value);
  let start = clamp(cursor, 0, chars.length);

  while (start > 0 && /\s/.test(chars[start - 1] ?? '')) {
    start -= 1;
  }
  while (start > 0 && !/\s/.test(chars[start - 1] ?? '')) {
    start -= 1;
  }

  const next = chars.slice(0, start).concat(chars.slice(clamp(cursor, 0, chars.length))).join('');
  return { value: next, cursor: start };
}

function getCursorLineAndColumn(value: string, cursor: number): { line: number; column: number } {
  const chars = toChars(value);
  const clamped = clamp(cursor, 0, chars.length);
  let line = 0;
  let column = 0;
  for (let i = 0; i < clamped; i += 1) {
    if (chars[i] === '\n') {
      line += 1;
      column = 0;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

export function FormDialog({
  title,
  description,
  fields,
  onSubmit,
  onCancel,
  isActive = true,
}: FormDialogProps) {
  const { theme } = useTheme();

  const initialValues = useMemo(() => {
    const values: Record<string, string> = {};
    for (const field of fields) {
      values[field.key] = field.value ?? '';
    }
    return values;
  }, [fields]);

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [activeIndex, setActiveIndex] = useState(0);
  const [cursorPositions, setCursorPositions] = useState<Record<string, number>>(() => {
    const positions: Record<string, number> = {};
    for (const field of fields) {
      positions[field.key] = toChars(field.value ?? '').length;
    }
    return positions;
  });
  const [showCursor, setShowCursor] = useState(true);

  const activeField = fields[activeIndex];

  useEffect(() => {
    if (!isActive || !activeField) {
      setShowCursor(true);
      return;
    }
    const timer = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(timer);
  }, [isActive, activeField]);

  useInput((input, key) => {
    if (!isActive) return;
    if (!activeField) return;

    if (key.escape) {
      onCancel();
      return;
    }

    const currentValue = normalizeNewlines(values[activeField.key] ?? '');
    const chars = toChars(currentValue);
    const currentCursor = clamp(cursorPositions[activeField.key] ?? chars.length, 0, chars.length);
    setShowCursor(true);

    if (key.leftArrow) {
      setCursorPositions((prev) => ({
        ...prev,
        [activeField.key]: Math.max(0, currentCursor - 1),
      }));
      return;
    }

    if (key.rightArrow) {
      setCursorPositions((prev) => ({
        ...prev,
        [activeField.key]: Math.min(chars.length, currentCursor + 1),
      }));
      return;
    }

    if ((key.backspace || key.delete) && key.meta) {
      const next = deleteWordBeforeCursor(currentValue, currentCursor);
      setValues((prev) => ({
        ...prev,
        [activeField.key]: sanitizeInputValue(next.value),
      }));
      setCursorPositions((prev) => ({
        ...prev,
        [activeField.key]: next.cursor,
      }));
      return;
    }

    if (key.backspace) {
      if (currentCursor === 0) return;
      const nextChars = chars.slice(0, currentCursor - 1).concat(chars.slice(currentCursor));
      setValues((prev) => ({
        ...prev,
        [activeField.key]: sanitizeInputValue(nextChars.join('')),
      }));
      setCursorPositions((prev) => ({
        ...prev,
        [activeField.key]: currentCursor - 1,
      }));
      return;
    }

    if (key.delete) {
      if (currentCursor === 0) return;
      const nextChars = chars.slice(0, currentCursor - 1).concat(chars.slice(currentCursor));
      setValues((prev) => ({
        ...prev,
        [activeField.key]: sanitizeInputValue(nextChars.join('')),
      }));
      setCursorPositions((prev) => ({
        ...prev,
        [activeField.key]: currentCursor - 1,
      }));
      return;
    }

    if (key.return && key.shift) {
      const nextChars = chars.slice(0, currentCursor).concat('\n', chars.slice(currentCursor));
      setValues((prev) => ({
        ...prev,
        [activeField.key]: sanitizeInputValue(nextChars.join('')),
      }));
      setCursorPositions((prev) => ({
        ...prev,
        [activeField.key]: currentCursor + 1,
      }));
      return;
    }

    if (key.return || key.tab) {
      if (activeIndex < fields.length - 1) {
        const nextIndex = activeIndex + 1;
        const nextField = fields[nextIndex];
        setActiveIndex(nextIndex);
        if (nextField) {
          const nextValue = values[nextField.key] ?? '';
          setCursorPositions((prev) => ({
            ...prev,
            [nextField.key]: toChars(nextValue).length,
          }));
        }
        return;
      }

      const hasMissingRequired = fields.some((field) => field.required && !values[field.key]?.trim());
      if (!hasMissingRequired) {
        onSubmit(values);
      }
      return;
    }

    if (key.upArrow) {
      const nextIndex = Math.max(0, activeIndex - 1);
      const nextField = fields[nextIndex];
      setActiveIndex(nextIndex);
      if (nextField) {
        const nextValue = values[nextField.key] ?? '';
        setCursorPositions((prev) => ({
          ...prev,
          [nextField.key]: toChars(nextValue).length,
        }));
      }
      return;
    }

    if (key.downArrow) {
      const nextIndex = Math.min(fields.length - 1, activeIndex + 1);
      const nextField = fields[nextIndex];
      setActiveIndex(nextIndex);
      if (nextField) {
        const nextValue = values[nextField.key] ?? '';
        setCursorPositions((prev) => ({
          ...prev,
          [nextField.key]: toChars(nextValue).length,
        }));
      }
      return;
    }

    if (input && input.length === 1 && !key.ctrl && !key.meta) {
      // Ignore control characters that can break terminal layout rendering.
      if (/[\p{C}]/u.test(input)) return;
      const nextChars = chars.slice(0, currentCursor).concat(input, chars.slice(currentCursor));
      setValues((prev) => ({
        ...prev,
        [activeField.key]: sanitizeInputValue(nextChars.join('')),
      }));
      setCursorPositions((prev) => ({
        ...prev,
        [activeField.key]: currentCursor + 1,
      }));
    }
  }, { isActive });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.highlight} paddingX={1} paddingY={0} marginY={1}>
      <Text bold>{title}</Text>
      {description ? <Text dimColor>{description}</Text> : null}
      {fields.map((field, index) => {
        const isActiveField = index === activeIndex;
        const value = sanitizeInputValue(values[field.key] ?? '');
        const valueChars = toChars(value);
        const cursor = clamp(cursorPositions[field.key] ?? valueChars.length, 0, valueChars.length);
        const isMissing = field.required && value.trim().length === 0;
        const renderedLines = value.split('\n');
        const cursorPos = getCursorLineAndColumn(value, cursor);
        return (
          <Box key={field.key} flexDirection="column" marginTop={1}>
            <Text bold={isActiveField}>
              {isActiveField ? '>' : ' '} {field.label}
              {isMissing ? <Text color={theme.colors.warning}> *</Text> : null}
            </Text>
            <Box
              borderStyle={isActiveField ? 'double' : 'round'}
              borderColor={isActiveField ? theme.colors.highlight : theme.colors.border}
              paddingX={1}
            >
              {isActiveField
                ? (
                  <Box flexDirection="column">
                    {renderedLines.map((line, lineIndex) => {
                      if (!showCursor || lineIndex !== cursorPos.line) {
                        return (
                          <Text key={`${field.key}-line-${lineIndex}`}>{line || ' '}</Text>
                        );
                      }

                      const lineChars = toChars(line);
                      const column = clamp(cursorPos.column, 0, lineChars.length);

                      // Keep rendered width stable: never append an extra cursor glyph.
                      if (lineChars.length === 0) {
                        return (
                          <Text key={`${field.key}-line-${lineIndex}`}>
                            <Text color={theme.colors.accent} inverse> </Text>
                          </Text>
                        );
                      }

                      if (column >= lineChars.length) {
                        const before = lineChars.slice(0, lineChars.length - 1).join('');
                        const last = lineChars[lineChars.length - 1] ?? ' ';
                        return (
                          <Text key={`${field.key}-line-${lineIndex}`}>
                            {before}
                            <Text color={theme.colors.accent} inverse>{last}</Text>
                          </Text>
                        );
                      }

                      const before = lineChars.slice(0, column).join('');
                      const current = lineChars[column] ?? ' ';
                      const after = lineChars.slice(column + 1).join('');
                      return (
                        <Text key={`${field.key}-line-${lineIndex}`}>
                          {before}
                          <Text color={theme.colors.accent} inverse>{current}</Text>
                          {after}
                        </Text>
                      );
                    })}
                  </Box>
                )
                : <Text>{value || '—'}</Text>}
            </Box>
          </Box>
        );
      })}
      <Text dimColor>Type to edit • ←/→ cursor • Shift+Enter newline • Option+Delete delete word • Delete/Backspace delete char • Enter/Tab next • Esc cancel</Text>
    </Box>
  );
}
