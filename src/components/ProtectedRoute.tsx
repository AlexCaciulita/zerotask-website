'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/subscription';
import PaywallGate from '@/components/PaywallGate';

const PUBLIC_PATHS = ['/', '/auth', '/pricing', '/pricing/success'];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isPro, loading: subLoading } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname?.startsWith(p + '/'));

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.replace('/auth');
    }
  }, [user, loading, isPublic, router]);

  if (loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isPublic) return null;

  // Public pages — no paywall
  if (isPublic) return <>{children}</>;

  // Authenticated but no subscription — show paywall
  if (!isPro) return <PaywallGate>{children}</PaywallGate>;

  return <>{children}</>;
}
