import React, { createContext, useContext, type ReactNode } from 'react';
import type { DataAdapter } from '../adapters/types';

interface AdapterContextValue {
  adapter: DataAdapter;
}

const AdapterContext = createContext<AdapterContextValue | undefined>(undefined);

interface AdapterProviderProps {
  children: ReactNode;
  adapter: DataAdapter;
}

export function AdapterProvider({ children, adapter }: AdapterProviderProps) {
  const value: AdapterContextValue = {
    adapter,
  };

  return <AdapterContext.Provider value={value}>{children}</AdapterContext.Provider>;
}

export function useAdapter(): AdapterContextValue {
  const context = useContext(AdapterContext);

  if (context === undefined) {
    throw new Error('useAdapter must be used within an AdapterProvider');
  }

  return context;
}
