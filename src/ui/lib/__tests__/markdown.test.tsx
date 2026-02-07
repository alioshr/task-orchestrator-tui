import { describe, it, expect } from 'bun:test';
import { looksLikeMarkdown } from '../markdown';

describe('looksLikeMarkdown', () => {
  it('should detect literal \\n as markdown', () => {
    expect(looksLikeMarkdown('Line one\\nLine two')).toBe(true);
  });

  it('should detect headers as markdown', () => {
    expect(looksLikeMarkdown('## Header')).toBe(true);
    expect(looksLikeMarkdown('# Title')).toBe(true);
    expect(looksLikeMarkdown('### Sub header')).toBe(true);
  });

  it('should detect bullet points as markdown', () => {
    expect(looksLikeMarkdown('- Item one')).toBe(true);
    expect(looksLikeMarkdown('* Item one')).toBe(true);
    expect(looksLikeMarkdown('  - Nested item')).toBe(true);
  });

  it('should detect inline code as markdown', () => {
    expect(looksLikeMarkdown('Use `code` here')).toBe(true);
    expect(looksLikeMarkdown('Run `npm install`')).toBe(true);
  });

  it('should detect bold as markdown', () => {
    expect(looksLikeMarkdown('This is **bold** text')).toBe(true);
  });

  it('should return false for plain text', () => {
    expect(looksLikeMarkdown('Just plain text')).toBe(false);
    expect(looksLikeMarkdown('No special formatting here.')).toBe(false);
    expect(looksLikeMarkdown('A sentence with some words.')).toBe(false);
  });

  it('should return false for text with hash not at start', () => {
    expect(looksLikeMarkdown('C# programming')).toBe(false);
    expect(looksLikeMarkdown('Issue #123')).toBe(false);
  });

  it('should return false for text with dash not as bullet', () => {
    expect(looksLikeMarkdown('foo-bar')).toBe(false);
    expect(looksLikeMarkdown('2023-01-01')).toBe(false);
  });
});
