import React from 'react';
import { Text, Box } from 'ink';

/**
 * Detect if content looks like markdown
 * Checks for common patterns LLMs use
 */
export function looksLikeMarkdown(content: string): boolean {
  // Check for literal \n (escaped newlines that should be actual newlines)
  if (content.includes('\\n')) return true;

  // Check for markdown headers (## Header)
  if (/^#{1,6}\s/m.test(content)) return true;

  // Check for bullet points (- item or * item)
  if (/^\s*[-*]\s/m.test(content)) return true;

  // Check for inline code (`code`)
  if (/`[^`]+`/.test(content)) return true;

  // Check for bold (**text**)
  if (/\*\*[^*]+\*\*/.test(content)) return true;

  return false;
}

interface MarkdownTextProps {
  children: string;
}

/**
 * Render markdown content with Ink styling
 * Handles common markdown patterns used by LLMs
 */
export function MarkdownText({ children }: MarkdownTextProps) {
  if (!looksLikeMarkdown(children)) {
    return <Text>{children}</Text>;
  }

  // First, convert literal \n to actual newlines
  const normalized = children.replace(/\\n/g, '\n');

  // Split into lines for processing
  const lines = normalized.split('\n');

  return (
    <Box flexDirection="column">
      {lines.map((line, lineIndex) => (
        <MarkdownLine key={lineIndex} line={line} />
      ))}
    </Box>
  );
}

interface MarkdownLineProps {
  line: string;
}

function MarkdownLine({ line }: MarkdownLineProps) {
  // Empty line
  if (!line.trim()) {
    return <Text> </Text>;
  }

  // Header (## Header)
  const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
  if (headerMatch && headerMatch[1] && headerMatch[2] !== undefined) {
    const level = headerMatch[1].length;
    const text = headerMatch[2];
    return (
      <Box marginTop={level === 1 ? 1 : 0}>
        <Text bold color={level <= 2 ? 'cyan' : undefined}>
          {text}
        </Text>
      </Box>
    );
  }

  // Bullet point (- item or * item)
  const bulletMatch = line.match(/^(\s*)([-*])\s+(.*)$/);
  if (bulletMatch && bulletMatch[1] !== undefined && bulletMatch[3] !== undefined) {
    const indent = bulletMatch[1].length;
    const content = bulletMatch[3];
    return (
      <Box marginLeft={indent}>
        <Text>
          <Text dimColor>• </Text>
          <InlineMarkdown text={content} />
        </Text>
      </Box>
    );
  }

  // Regular line with inline formatting
  return (
    <Text>
      <InlineMarkdown text={line} />
    </Text>
  );
}

interface InlineMarkdownProps {
  text: string;
}

/**
 * Handle inline markdown: `code`, **bold**
 */
function InlineMarkdown({ text }: InlineMarkdownProps) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Check for inline code `code`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/);
    if (codeMatch && codeMatch[2] !== undefined && codeMatch[3] !== undefined) {
      if (codeMatch[1]) {
        parts.push(<BoldMarkdown key={key++} text={codeMatch[1]} />);
      }
      parts.push(
        <Text key={key++} color="yellow">
          {codeMatch[2]}
        </Text>
      );
      remaining = codeMatch[3];
      continue;
    }

    // Check for bold **text**
    const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/);
    if (boldMatch && boldMatch[2] !== undefined && boldMatch[3] !== undefined) {
      if (boldMatch[1]) {
        parts.push(<Text key={key++}>{boldMatch[1]}</Text>);
      }
      parts.push(
        <Text key={key++} bold>
          {boldMatch[2]}
        </Text>
      );
      remaining = boldMatch[3];
      continue;
    }

    // No more patterns, add remaining text
    parts.push(<Text key={key++}>{remaining}</Text>);
    break;
  }

  return <>{parts}</>;
}

/**
 * Handle bold within text that might have already had code extracted
 */
function BoldMarkdown({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/);
    if (boldMatch && boldMatch[2] !== undefined && boldMatch[3] !== undefined) {
      if (boldMatch[1]) {
        parts.push(<Text key={key++}>{boldMatch[1]}</Text>);
      }
      parts.push(
        <Text key={key++} bold>
          {boldMatch[2]}
        </Text>
      );
      remaining = boldMatch[3];
      continue;
    }

    parts.push(<Text key={key++}>{remaining}</Text>);
    break;
  }

  return <>{parts}</>;
}
