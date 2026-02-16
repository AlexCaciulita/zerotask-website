'use client';

import { supabase } from './supabase';

/**
 * Authenticated fetch wrapper for internal API routes.
 *
 * Automatically attaches the current user's Supabase access token
 * as a Bearer token in the Authorization header.
 *
 * Usage:
 *   const res = await apiFetch('/api/ai', {
 *     method: 'POST',
 *     body: JSON.stringify({ task: 'generate-copy', ... }),
 *   });
 */
export async function apiFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  const headers = new Headers(init.headers);

  // Always set Content-Type for JSON unless already set or body is FormData
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach auth token if available
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(url, {
    ...init,
    headers,
  });
}
