import { useState, useEffect } from 'react';

/**
 * Debounces a value by delaying updates until the value has stopped changing
 * for the specified delay period.
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const searchQuery = useDebounce(inputValue, 500);
 *
 * useEffect(() => {
 *   // This will only run 500ms after user stops typing
 *   performSearch(searchQuery);
 * }, [searchQuery]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if value changes before delay completes
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
