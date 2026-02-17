import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Creates a Supabase client authenticated with the user's access token.
 * Use this in API routes to verify the caller's identity.
 */
export function createServerSupabaseClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

// ── Service Role Client (singleton) ────────────────────────────
// Bypasses RLS — use for server-side operations that need full access.
let _serviceClient: SupabaseClient | null = null;

export function createServiceSupabaseClient(): SupabaseClient {
  if (!_serviceClient) {
    _serviceClient = createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _serviceClient;
}
