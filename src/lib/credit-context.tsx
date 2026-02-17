'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useCredits, type ClientCreditInfo } from './useCredits';

interface CreditContextValue {
  credits: ClientCreditInfo;
  loading: boolean;
  refresh: () => Promise<void>;
  updateFromResponse: (data: Partial<ClientCreditInfo>) => void;
}

const CreditContext = createContext<CreditContextValue | null>(null);

export function CreditProvider({ children }: { children: ReactNode }) {
  const value = useCredits();

  return (
    <CreditContext.Provider value={value}>
      {children}
    </CreditContext.Provider>
  );
}

export function useCreditContext(): CreditContextValue {
  const ctx = useContext(CreditContext);
  if (!ctx) {
    // Return a safe default when used outside provider (e.g., auth page)
    return {
      credits: {
        remaining: 0,
        monthly: 0,
        purchased: 0,
        used: 0,
        plan: 'free',
        warning: null,
      },
      loading: true,
      refresh: async () => {},
      updateFromResponse: () => {},
    };
  }
  return ctx;
}
