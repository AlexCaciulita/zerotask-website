import { NextRequest, NextResponse } from 'next/server';
import { User } from '@supabase/supabase-js';
import { createServerSupabaseClient } from './supabase-server';

interface AuthResult {
  user: User;
  accessToken: string;
}

/**
 * Extracts and verifies the Supabase auth token from an API request.
 *
 * Expects the client to send the access token in the Authorization header:
 *   Authorization: Bearer <access_token>
 *
 * Returns the authenticated user or a 401 error response.
 */
export async function authenticateRequest(
  req: NextRequest
): Promise<AuthResult | NextResponse> {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401 }
    );
  }

  const accessToken = authHeader.replace('Bearer ', '');

  try {
    const supabase = createServerSupabaseClient(accessToken);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return { user, accessToken };
  } catch {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

/**
 * Type guard to check if authenticateRequest returned an error response.
 */
export function isAuthError(result: AuthResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
