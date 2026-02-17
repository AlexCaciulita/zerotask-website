import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

const POSTIZ_BASE = 'https://api.postiz.com/public/v1';

export async function POST(req: NextRequest) {
  try {
    // Require authentication — prevents abuse as an API key validation oracle
    const auth = await authenticateRequest(req);
    if (isAuthError(auth)) return auth;

    // Rate limit: 10 test calls per minute per user
    const rlResult = await rateLimit(auth.user.id, {
      prefix: 'tiktok-test',
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (!rlResult.success) {
      return NextResponse.json(
        { valid: false, error: 'Too many test requests. Please wait a moment.' },
        { status: 429, headers: rateLimitHeaders(rlResult) }
      );
    }

    const { apiKey, integrationId } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ valid: false, error: 'API key required' }, { status: 400 });
    }

    // Validate the key by fetching integrations
    const res = await fetch(`${POSTIZ_BASE}/integrations`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ valid: false, error: 'Invalid API key' });
    }

    const integrations = await res.json();

    // If integrationId provided, check it exists
    if (integrationId) {
      const found = Array.isArray(integrations)
        ? integrations.find((i: { id: string; name?: string }) => i.id === integrationId)
        : null;
      if (!found) {
        return NextResponse.json({ valid: false, error: 'Integration ID not found' });
      }
      return NextResponse.json({ valid: true, accountName: found.name || 'TikTok Account' });
    }

    return NextResponse.json({ valid: true, accountName: 'Postiz Connected' });
  } catch (error) {
    console.error('TikTok test error:', error);
    return NextResponse.json({ valid: false, error: 'Connection test failed' }, { status: 500 });
  }
}
