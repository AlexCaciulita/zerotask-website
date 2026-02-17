'use client';

import { useCreditWarning } from '@/lib/useCreditWarning';

/**
 * Invisible component that mounts the credit warning toast hook.
 * Must be rendered inside CreditProvider and AuthProvider.
 */
export default function CreditWarningToast() {
  useCreditWarning();
  return null;
}
