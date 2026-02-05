/**
 * Format a date as a relative time string
 * @example timeAgo(new Date(Date.now() - 3600000)) // "1h ago"
 */
export function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks}w ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo ago`;
  }

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/**
 * Truncate a UUID or ID for display
 * @example truncateId('550e8400-e29b-41d4-a716-446655440000') // "550e84..."
 */
export function truncateId(id: string, length: number = 6): string {
  if (id.length <= length + 3) {
    return id;
  }
  return `${id.slice(0, length)}...`;
}

/**
 * Truncate text with ellipsis
 * @example truncateText('Long text here', 8) // "Long t..."
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  if (maxLength <= 3) {
    return text.slice(0, maxLength);
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Pluralize a word based on count
 * @example pluralize(1, 'task') // "task"
 * @example pluralize(5, 'task') // "tasks"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) {
    return singular;
  }
  return plural ?? `${singular}s`;
}

/**
 * Format task counts for display
 * @example formatTaskCount({ completed: 5, total: 12 }) // "5/12 tasks"
 */
export function formatTaskCount(counts: { total: number; byStatus: Record<string, number> }): string {
  const completed = counts.byStatus['COMPLETED'] ?? 0;
  return `${completed}/${counts.total} ${pluralize(counts.total, 'task')}`;
}

/**
 * Format a count with label
 * @example formatCount(5, 'task') // "5 tasks"
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  return `${count} ${pluralize(count, singular, plural)}`;
}

/**
 * Format a status string for display (convert to title case)
 * @example formatStatus('IN_PROGRESS') // "In Progress"
 */
export function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format a priority for display
 * @example formatPriority('HIGH') // "High"
 */
export function formatPriority(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
}
