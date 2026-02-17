import { NextRequest, NextResponse } from 'next/server';
import {
  generateCopy,
  brainstormHooks,
  analyzeReviews,
  suggestKeywords,
  analyzeCompetitor,
  simulateKeywordChange,
  aiGenerate,
  type AppData,
} from '@/lib/ai';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';
import { deductCredit, CreditExhaustedError, getServerCredits, getCreditWarningLevel } from '@/lib/credits-server';
import { rateLimit, getAiRateLimit, rateLimitHeaders, type PlanTier } from '@/lib/rate-limit';
import { createFeedEvent } from '@/lib/feed-server';

// POST /api/ai
// Body: { task: string, ...params }
export async function POST(req: NextRequest) {
  try {
    // ── Layer 0: Authentication ─────────────────────────────────
    const auth = await authenticateRequest(req);
    if (isAuthError(auth)) return auth;

    // Note: ANTHROPIC_API_KEY validation is handled by the Anthropic SDK client
    // in src/lib/ai.ts (with .env.local fallback for empty system env vars)

    // ── Layer 1: Rate Limiting ──────────────────────────────────
    const credits = await getServerCredits(auth.user.id);
    const plan = (credits.plan || 'free') as PlanTier;
    const rlConfig = getAiRateLimit(plan);
    const rlResult = await rateLimit(auth.user.id, rlConfig);

    if (!rlResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please slow down.',
          retryAfter: Math.ceil((rlResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: rateLimitHeaders(rlResult),
        }
      );
    }

    // ── Layer 2: Parse + validate BEFORE deducting credits ──────
    const body = await req.json();
    const { task, brandVoice, ...params } = body;

    if (!task) {
      return NextResponse.json({ error: 'Missing "task" field' }, { status: 400 });
    }

    const KNOWN_TASKS = [
      'generate-copy', 'brainstorm-hooks', 'analyze-reviews', 'suggest-keywords',
      'analyze-competitor', 'simulate-keywords', 'dashboard-audit', 'suggest-influencers',
      'generate-launch-content', 'suggest-slide-styles', 'generate-hashtags', 'generate-briefing', 'freeform',
    ];
    if (!KNOWN_TASKS.includes(task)) {
      return NextResponse.json({ error: `Unknown task: ${task}` }, { status: 400 });
    }

    // ── Layer 3: Credit Check + Deduction ───────────────────────
    let creditInfo;
    try {
      creditInfo = await deductCredit(auth.user.id, 'AI generation');
    } catch (error) {
      if (error instanceof CreditExhaustedError) {
        return NextResponse.json(
          {
            error: 'No credits remaining',
            plan: error.plan,
            nextReset: error.nextReset,
            upgradeUrl: '/pricing',
            message: error.plan === 'free'
              ? 'You\'ve used all your free credits. Upgrade to Pro for 30 credits/month.'
              : `Your monthly credits are depleted. Credits reset on ${new Date(error.nextReset).toLocaleDateString()}. You can also buy credit packs.`,
          },
          { status: 402 }
        );
      }
      throw error;
    }

    // ── Layer 4: Process the AI request ─────────────────────────
    // Build brand voice system prompt addition for creative tasks
    const CREATIVE_TASKS = ['generate-copy', 'brainstorm-hooks', 'analyze-reviews', 'freeform', 'generate-launch-content', 'suggest-slide-styles', 'generate-hashtags'];
    let brandVoicePrompt = '';
    if (brandVoice && CREATIVE_TASKS.includes(task)) {
      brandVoicePrompt = `\n\nBrand Voice Guidelines:\n- Tone: ${brandVoice.tone}\n- Guidelines: ${brandVoice.guidelines}\nApply these consistently in all generated copy and creative output.`;
    }

    let result: string;

    switch (task) {
      case 'generate-copy': {
        const { appData, platform, tone } = params;
        result = await generateCopy(appData as AppData, platform, tone, brandVoicePrompt);
        break;
      }

      case 'brainstorm-hooks': {
        const { appData, count } = params;
        result = await brainstormHooks(appData as AppData, count, brandVoicePrompt);
        break;
      }

      case 'analyze-reviews': {
        const { reviews } = params;
        result = await analyzeReviews(reviews, brandVoicePrompt);
        break;
      }

      case 'suggest-keywords': {
        const { appData, count } = params;
        result = await suggestKeywords(appData as AppData, count);
        break;
      }

      case 'analyze-competitor': {
        const { appData, competitor } = params;
        result = await analyzeCompetitor(appData as AppData, competitor);
        break;
      }

      case 'simulate-keywords': {
        const { appData, currentTitle, proposedTitle, keywords } = params;
        result = await simulateKeywordChange(
          appData as AppData,
          currentTitle,
          proposedTitle,
          keywords
        );
        break;
      }

      case 'dashboard-audit': {
        const { appData } = params;
        const auditPrompt = `You are an app marketing strategist. Run a comprehensive audit for this app and generate an activity feed of insights.

App: ${appData?.name || 'My App'}
Category: ${appData?.category || 'Unknown'}
Platform: ${appData?.platform || 'ios'}
Description: ${appData?.description || 'Not provided'}

Generate 8-12 feed items as a JSON array. Each item should have:
- id (string, unique)
- type (one of: "keyword", "competitor", "content", "tiktok", "review", "launch")
- title (short, attention-grabbing)
- summary (1-2 sentences)
- detail (expanded analysis, 2-3 sentences)
- timestamp (relative like "just now", "1 hour ago")
- badge (object with "label" and "variant" where variant is one of: "success", "warning", "error", "info")
- actionLabel (button text)

Make insights specific, actionable, and realistic for the app's category. Include a mix of opportunities, threats, and quick wins.`;
        result = await aiGenerate(auditPrompt + brandVoicePrompt, { tier: 'smart', maxTokens: 4000 });
        break;
      }

      case 'suggest-influencers': {
        const { appData, count } = params;
        const infPrompt = `Suggest ${count || 10} realistic influencer profiles for marketing this app:

App: ${appData?.name || 'My App'}
Category: ${appData?.category || 'Unknown'}
Platform: ${appData?.platform || 'ios'}

For each influencer, return a JSON array with:
- name (realistic full name)
- handle (realistic social handle)
- platform (TikTok, Instagram, or YouTube)
- followers (like "85K", "1.2M")
- followersNum (number)
- engagement (like "4.2%")
- niche (array of 2-3 tags)
- cashOffer (number, estimated fair price)
- reasoning (why they're a good fit)
- dmDraft (a personalized outreach DM draft)

Focus on micro-influencers (10K-500K) in relevant niches. Make them diverse across platforms.`;
        result = await aiGenerate(infPrompt, { tier: 'smart', maxTokens: 4000 });
        break;
      }

      case 'generate-launch-content': {
        const { stepTitle, stepDescription, appData } = params;
        const launchPrompt = `Generate actionable content for this launch checklist step:

App: ${appData?.name || 'My App'} (${appData?.category || 'Unknown'})
Step: ${stepTitle}
Description: ${stepDescription}

Provide detailed, ready-to-use content for this step. Be specific with templates, copy, timelines, and action items. Format as plain text with clear sections.`;
        result = await aiGenerate(launchPrompt + brandVoicePrompt, { tier: 'smart', maxTokens: 2000 });
        break;
      }

      case 'suggest-slide-styles': {
        const { hookText } = params;
        const stylesPrompt = `Given this TikTok hook text: "${hookText}"

Generate exactly 6 visual style descriptions for a TikTok slideshow that matches this hook's theme and mood. Each style should be for one slide in a sequence that tells a visual story.

Return a JSON array of 6 strings. Each string should be a concise visual style description (e.g. "close-up of frustrated person scrolling phone, moody blue lighting, cinematic grain").

Make the styles progress narratively: setup → conflict → discovery → transformation → result → call-to-action.`;
        result = await aiGenerate(stylesPrompt + brandVoicePrompt, { tier: 'smart', maxTokens: 1000 });
        break;
      }

      case 'generate-hashtags': {
        const { hookText: hashtagHook, appData: hashtagApp, count: hashtagCount } = params;
        const htPrompt = `Generate ${hashtagCount || 12} relevant TikTok hashtags for this content:
App: ${hashtagApp?.name || 'App'} (${hashtagApp?.category || 'General'})
Hook: "${hashtagHook || ''}"

Return a JSON array of strings (without # prefix). Mix popular broad hashtags (like "fyp", "viral") with niche-specific ones. Order by relevance.`;
        result = await aiGenerate(htPrompt + brandVoicePrompt, { tier: 'smart', maxTokens: 500 });
        break;
      }

      case 'freeform': {
        const { prompt, tier, system } = params;
        result = await aiGenerate(prompt + brandVoicePrompt, { tier, system });
        break;
      }

      // default case handled by KNOWN_TASKS validation above
      default:
        return NextResponse.json({ error: `Unknown task: ${task}` }, { status: 400 });
    }

    // Try to parse as JSON if the AI returned JSON
    let parsed: unknown = result;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        parsed = JSON.parse(result);
      }
    } catch {
      // Not JSON, return as plain text
      parsed = result;
    }

    // Fire-and-forget feed event for notable tasks
    const FEED_TASKS: Record<string, { type: string; title: string }> = {
      'dashboard-audit': { type: 'content', title: 'Dashboard audit completed' },
      'analyze-reviews': { type: 'review', title: 'Reviews analyzed with AI' },
      'analyze-competitor': { type: 'competitor', title: 'Competitor analyzed' },
      'generate-copy': { type: 'content', title: 'Marketing copy generated' },
      'brainstorm-hooks': { type: 'tiktok', title: 'TikTok hooks brainstormed' },
      'generate-launch-content': { type: 'launch', title: 'Launch content generated' },
    };
    const feedMeta = FEED_TASKS[task];
    if (feedMeta) {
      createFeedEvent({
        user_id: auth.user.id,
        type: feedMeta.type as 'keyword' | 'competitor' | 'content' | 'review' | 'tiktok' | 'launch',
        title: feedMeta.title,
        summary: `${feedMeta.title} for ${body.appData?.name || 'your app'}.`,
      }).catch(() => {}); // fire-and-forget
    }

    // ── Layer 4: Return result with credit info ─────────────────
    const warningLevel = getCreditWarningLevel(creditInfo);

    return NextResponse.json({
      result: parsed,
      credits: {
        remaining: creditInfo.remaining,
        monthly: creditInfo.monthly,
        purchased: creditInfo.purchased,
        used: creditInfo.used,
        plan: creditInfo.plan,
        warning: warningLevel,
      },
    });
  } catch (error: unknown) {
    console.error('AI API error:', error);
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
