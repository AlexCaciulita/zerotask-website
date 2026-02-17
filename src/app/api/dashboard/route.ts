import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';
import { rateLimit, getReadRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { getCached, setCache, CacheTTL } from '@/lib/api-cache';
import { getFeedEvents } from '@/lib/feed-server';

interface DashboardData {
  stats: {
    totalKeywords: number;
    totalInfluencers: number;
    totalPosts: number;
    publishedPosts: number;
    launchStepsComplete: number;
    launchStepsTotal: number;
    latestGrowthScore: number | null;
  };
  feedItems: unknown[];
}

// GET /api/dashboard — aggregated dashboard data
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (isAuthError(auth)) return auth;

    const rlResult = await rateLimit(auth.user.id, getReadRateLimit());
    if (!rlResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitHeaders(rlResult) }
      );
    }

    const userId = auth.user.id;
    const cacheKey = `dashboard:${userId}`;

    // Check cache (60s TTL)
    const cached = getCached<DashboardData>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const supabase = createServiceSupabaseClient();

    // Run all queries in parallel for speed
    const [
      keywordsResult,
      influencersResult,
      postsResult,
      launchResult,
      auditResult,
      feedItems,
    ] = await Promise.all([
      supabase.from('keywords').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('influencers').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('tiktok_posts').select('id, status').eq('user_id', userId),
      supabase.from('launch_steps').select('id, status').eq('user_id', userId),
      supabase.from('audits').select('growth_score').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
      getFeedEvents(userId, 20),
    ]);

    const posts = postsResult.data || [];
    const launchSteps = launchResult.data || [];

    const data: DashboardData = {
      stats: {
        totalKeywords: keywordsResult.count || 0,
        totalInfluencers: influencersResult.count || 0,
        totalPosts: posts.length,
        publishedPosts: posts.filter(p => p.status === 'published').length,
        launchStepsComplete: launchSteps.filter(s => s.status === 'completed' || s.status === 'done').length,
        launchStepsTotal: launchSteps.length,
        latestGrowthScore: auditResult.data?.[0]?.growth_score ?? null,
      },
      feedItems,
    };

    setCache(cacheKey, data, CacheTTL.SHORT);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
