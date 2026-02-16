import { NextRequest, NextResponse } from 'next/server';
import { createTikTokSlideshow, createTikTokSlideshowWithKey } from '@/lib/postiz';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const auth = await authenticateRequest(req);
    if (isAuthError(auth)) return auth;

    const { imageUrls, caption, hashtags, apiKey, integrationId: bodyIntegrationId } = await req.json();

    const integrationId = bodyIntegrationId || process.env.POSTIZ_TIKTOK_INTEGRATION_ID;
    if (!integrationId) {
      return NextResponse.json({ error: 'TikTok integration ID not configured' }, { status: 500 });
    }

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // Fetch each image URL and convert to buffer
    const buffers: Buffer[] = [];
    for (const url of imageUrls) {
      let fetchUrl = url;
      if (url.startsWith('/')) {
        const origin = req.nextUrl.origin;
        fetchUrl = `${origin}${url}`;
      }

      const res = await fetch(fetchUrl);
      if (!res.ok) {
        return NextResponse.json({ error: `Failed to fetch image: ${url}` }, { status: 500 });
      }
      const arrayBuffer = await res.arrayBuffer();
      buffers.push(Buffer.from(arrayBuffer));
    }

    // Use user's API key if provided, otherwise fall back to env var
    let result;
    if (apiKey) {
      result = await createTikTokSlideshowWithKey(
        buffers,
        caption || 'Check this out!',
        hashtags || ['fyp'],
        integrationId,
        apiKey,
        true
      );
    } else {
      result = await createTikTokSlideshow(
        buffers,
        caption || 'Check this out!',
        hashtags || ['fyp'],
        integrationId,
        true
      );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('TikTok post error:', error);
    const message = error instanceof Error ? error.message : 'Failed to post to TikTok';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
