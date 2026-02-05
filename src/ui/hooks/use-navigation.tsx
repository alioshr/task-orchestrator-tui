import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { Screen, type NavigationState } from '../lib/types';

/**
 * Navigation context interface
 */
interface NavigationContextValue {
  screen: Screen;
  params: Record<string, unknown>;
  push(screen: Screen, params?: Record<string, unknown>): void;
  pop(): void;
  replace(screen: Screen, params?: Record<string, unknown>): void;
  reset(): void;
  canGoBack: boolean;
}

/**
 * Navigation context for TUI routing
 */
const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

/**
 * Provider props
 */
interface NavigationProviderProps {
  children: ReactNode;
}

/**
 * Navigation provider that manages the screen stack
 */
export function NavigationProvider({ children }: NavigationProviderProps) {
  const [state, setState] = useState<NavigationState>({
    stack: [{ screen: Screen.Dashboard, params: {} }],
  });

  const currentStackItem = state.stack[state.stack.length - 1]!;

  const push = (screen: Screen, params: Record<string, unknown> = {}) => {
    setState((prev: NavigationState) => ({
      stack: [...prev.stack, { screen, params }],
    }));
  };

  const pop = () => {
    setState((prev: NavigationState) => {
      if (prev.stack.length <= 1) {
        return prev;
      }
      return {
        stack: prev.stack.slice(0, -1),
      };
    });
  };

  const replace = (screen: Screen, params: Record<string, unknown> = {}) => {
    setState((prev: NavigationState) => ({
      stack: [...prev.stack.slice(0, -1), { screen, params }],
    }));
  };

  const reset = () => {
    setState({
      stack: [{ screen: Screen.Dashboard, params: {} }],
    });
  };

  const value: NavigationContextValue = {
    screen: currentStackItem.screen,
    params: currentStackItem.params,
    push,
    pop,
    replace,
    reset,
    canGoBack: state.stack.length > 1,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

/**
 * Hook to access navigation state and actions
 */
export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
