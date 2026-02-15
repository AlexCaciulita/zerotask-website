'use client';

import { useState, useCallback } from 'react';

interface UseAIOptions {
  onSuccess?: (result: unknown) => void;
  onError?: (error: string) => void;
}

export function useAI(options: UseAIOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  const generate = useCallback(
    async (task: string, params: Record<string, unknown> = {}) => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task, ...params }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'AI request failed');
        }

        setResult(data.result);
        options.onSuccess?.(data.result);
        return data.result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        options.onError?.(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  return { generate, loading, error, result, setResult };
}
