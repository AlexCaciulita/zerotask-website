import { NextRequest, NextResponse } from 'next/server';
import { generateSlideImage, generateSlideshow } from '@/lib/image-gen';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';
import { deductCredit, CreditExhaustedError, getServerCredits, getCreditWarningLevel } from '@/lib/credits-server';
import { rateLimit, getImageRateLimit, rateLimitHeaders, type PlanTier } from '@/lib/rate-limit';

function dataUriToBuffer(dataUri: string): { buffer: Buffer; ext: string } {
  const match = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URI');
  return { buffer: Buffer.from(match[2], 'base64'), ext: match[1] === 'jpeg' ? 'jpg' : match[1] };
}

async function saveImage(dataUri: string, name: string): Promise<string> {
  const { buffer, ext } = dataUriToBuffer(dataUri);
  const filename = `${name}.${ext}`;
  const publicDir = join(process.cwd(), 'public', 'generated');
  await writeFile(join(publicDir, filename), buffer);
  return `/generated/${filename}`;
}

export async function POST(req: NextRequest) {
  try {
    // ── Authentication ──────────────────────────────────────────
    const auth = await authenticateRequest(req);
    if (isAuthError(auth)) return auth;

    // ── Rate Limiting ───────────────────────────────────────────
    const credits = await getServerCredits(auth.user.id);
    const plan = (credits.plan || 'free') as PlanTier;
    const rlResult = await rateLimit(auth.user.id, getImageRateLimit(plan));

    if (!rlResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.', retryAfter: Math.ceil((rlResult.reset - Date.now()) / 1000) },
        { status: 429, headers: rateLimitHeaders(rlResult) }
      );
    }

    // ── Parse + validate BEFORE deducting credits ──────────────
    const body = await req.json();
    const { action, ...params } = body;

    if (!action || !['generate-slide', 'generate-slideshow'].includes(action)) {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    // ── Credit Deduction ────────────────────────────────────────
    let creditInfo;
    try {
      creditInfo = await deductCredit(auth.user.id, 'Image generation');
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
              : `Your monthly credits are depleted. Credits reset on ${new Date(error.nextReset).toLocaleDateString()}.`,
          },
          { status: 402 }
        );
      }
      throw error;
    }

    // ── Generate Image ──────────────────────────────────────────
    let imageResult: unknown;

    switch (action) {
      case 'generate-slide': {
        const dataUri = await generateSlideImage(
          params.sceneDescription,
          params.styleVariation,
          params.slideNumber ?? 1,
          params.textOverlay
        );
        if (!dataUri) return NextResponse.json({ error: 'No image generated' }, { status: 500 });
        const ts = Date.now();
        const url = await saveImage(dataUri, `slide-${params.slideNumber ?? 1}-${ts}`);
        imageResult = { image: url };
        break;
      }
      case 'generate-slideshow': {
        const dataUris = await generateSlideshow(
          params.sceneDescription,
          params.styles ?? [],
          params.hookText ?? ''
        );
        const ts = Date.now();
        const urls: string[] = [];
        for (let i = 0; i < dataUris.length; i++) {
          if (dataUris[i]) {
            const url = await saveImage(dataUris[i], `slideshow-${i + 1}-${ts}`);
            urls.push(url);
          } else {
            urls.push('');
          }
        }
        imageResult = { images: urls };
        break;
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    // ── Return result with credit info ──────────────────────────
    const warningLevel = getCreditWarningLevel(creditInfo);

    return NextResponse.json({
      ...imageResult as Record<string, unknown>,
      credits: {
        remaining: creditInfo.remaining,
        monthly: creditInfo.monthly,
        purchased: creditInfo.purchased,
        used: creditInfo.used,
        plan: creditInfo.plan,
        warning: warningLevel,
      },
    });
  } catch (e) {
    console.error('Image generation error:', e);
    const message = e instanceof Error ? e.message : 'Image generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
