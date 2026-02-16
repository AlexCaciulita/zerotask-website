'use client';

import { useState, useCallback, useRef } from 'react';
import { apiFetch } from './api-client';

interface UseAIOptions {
  onSuccess?: (result: unknown) => void;
  onError?: (error: string) => void;
}

export function useAI(options: UseAIOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  // Use ref to avoid stale closure / dependency issues
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const generate = useCallback(
    async (task: string, params: Record<string, unknown> = {}) => {
      setLoading(true);
      setError(null);

      try {
        const res = await apiFetch('/api/ai', {
          method: 'POST',
          body: JSON.stringify({ task, ...params }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'AI request failed');
        }

        setResult(data.result);
        optionsRef.current.onSuccess?.(data.result);
        return data.result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        optionsRef.current.onError?.(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { generate, loading, error, result, setResult };
}
