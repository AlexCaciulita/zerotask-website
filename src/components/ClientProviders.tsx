'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth';
import { SubscriptionProvider } from '@/lib/subscription';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      <AuthProvider>
        <SubscriptionProvider>
          <ProtectedRoute>
            {children}
          </ProtectedRoute>
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
