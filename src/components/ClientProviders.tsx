'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth';
import { SubscriptionProvider } from '@/lib/subscription';
import { CreditProvider } from '@/lib/credit-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import CreditWarningToast from '@/components/CreditWarningToast';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      <AuthProvider>
        <SubscriptionProvider>
          <CreditProvider>
            <ProtectedRoute>
              {children}
            </ProtectedRoute>
            <CreditWarningToast />
          </CreditProvider>
        </SubscriptionProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'bg-surface border-border text-text-primary',
          }}
          richColors
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
