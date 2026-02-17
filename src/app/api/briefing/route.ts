import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { getCached, setCache, CacheTTL } from '@/lib/api-cache';
import { deductCredit, CreditExhaustedError, getServerCredits, getCreditWarningLevel } from '@/lib/credits-server';
import { aiGenerate } from '@/lib/ai';

interface BriefingData {
  id: string;
  content: string;
  highlights: { type: string; title: string; detail: string }[];
  generated_at: string;
  read: boolean;
}

// GET /api/briefing — returns today's briefing or generates a new one
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (isAuthError(auth)) return auth;

    // Rate limit: 5 req/min
    const rlResult = await rateLimit(auth.user.id, {
      prefix: 'briefing',
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (!rlResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitHeaders(rlResult) }
      );
    }

    const userId = auth.user.id;
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `briefing:${userId}:${today}`;

    // Check cache first
    const cached = getCached<BriefingData>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const supabase = createServiceSupabaseClient();

    // Check if we already have a briefing for today
    const { data: existing } = await supabase
      .from('briefings')
      .select('*')
      .eq('user_id', userId)
      .gte('generated_at', `${today}T00:00:00Z`)
      .order('generated_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      const briefing: BriefingData = {
        id: existing[0].id,
        content: existing[0].content,
        highlights: existing[0].highlights || [],
        generated_at: existing[0].generated_at,
        read: existing[0].read,
      };
      setCache(cacheKey, briefing, CacheTTL.LONG);
      return NextResponse.json(briefing);
    }

    // Gather data for the briefing
    const [keywordsResult, feedResult, creditsData] = await Promise.all([
      supabase
        .from('keywords')
        .select('keyword, current_rank, volume, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(10),
      supabase
        .from('feed_events')
        .select('type, title, summary')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10),
      getServerCredits(userId),
    ]);

    const keywords = keywordsResult.data || [];
    const recentEvents = feedResult.data || [];

    // If no data at all, return a simple "no changes" briefing without using AI
    if (keywords.length === 0 && recentEvents.length === 0) {
      const simpleBriefing: BriefingData = {
        id: 'empty',
        content: 'All quiet overnight. Start tracking keywords and analyzing reviews to get daily briefings.',
        highlights: [],
        generated_at: new Date().toISOString(),
        read: false,
      };
      return NextResponse.json(simpleBriefing);
    }

    // Deduct credit for AI generation
    let creditInfo;
    try {
      creditInfo = await deductCredit(userId, 'Morning Briefing');
    } catch (error) {
      if (error instanceof CreditExhaustedError) {
        return NextResponse.json(
          {
            error: 'No credits remaining',
            plan: error.plan,
            message: 'Morning briefing requires 1 credit.',
          },
          { status: 402 }
        );
      }
      throw error;
    }

    // Generate briefing with AI
    const changesJson = JSON.stringify({
      trackedKeywords: keywords.map(k => ({
        keyword: k.keyword,
        rank: k.current_rank,
        volume: k.volume,
      })),
      recentActivity: recentEvents.map(e => ({
        type: e.type,
        title: e.title,
        summary: e.summary,
      })),
      credits: {
        remaining: creditsData.remaining,
        plan: creditsData.plan,
      },
    });

    const briefingContent = await aiGenerate(
      `Generate a concise daily briefing for an app marketer. Summarize what happened in the last 24 hours based on this data:\n\n${changesJson}\n\nFormat as a short 2-3 paragraph summary in a friendly, professional tone. Start with "Good morning!" Include actionable insights. If there are keyword rank changes, highlight them. If there's nothing notable, say things are stable. Keep it under 200 words. Return ONLY the briefing text, no JSON wrapping.`,
      { tier: 'fast', maxTokens: 500, temperature: 0.6 }
    );

    // Extract highlights
    const highlights: { type: string; title: string; detail: string }[] = [];
    if (keywords.length > 0) {
      highlights.push({
        type: 'keyword',
        title: `${keywords.length} keywords tracked`,
        detail: `Top keyword: "${keywords[0]?.keyword}" at rank #${keywords[0]?.current_rank}`,
      });
    }
    if (recentEvents.length > 0) {
      highlights.push({
        type: 'activity',
        title: `${recentEvents.length} events in last 24h`,
        detail: recentEvents[0]?.title || '',
      });
    }

    // Save to DB
    const { data: saved } = await supabase
      .from('briefings')
      .insert({
        user_id: userId,
        content: briefingContent,
        highlights,
      })
      .select('id, generated_at')
      .single();

    const briefing: BriefingData = {
      id: saved?.id || 'generated',
      content: briefingContent,
      highlights,
      generated_at: saved?.generated_at || new Date().toISOString(),
      read: false,
    };

    setCache(cacheKey, briefing, CacheTTL.LONG);

    const warningLevel = getCreditWarningLevel(creditInfo);

    return NextResponse.json({
      ...briefing,
      credits: {
        remaining: creditInfo.remaining,
        monthly: creditInfo.monthly,
        purchased: creditInfo.purchased,
        used: creditInfo.used,
        plan: creditInfo.plan,
        warning: warningLevel,
      },
    });
  } catch (error) {
    console.error('Briefing API error:', error);
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 });
  }
}

// PATCH /api/briefing — mark briefing as read
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (isAuthError(auth)) return auth;

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = createServiceSupabaseClient();
    await supabase
      .from('briefings')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', auth.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Briefing PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update briefing' }, { status: 500 });
  }
}
