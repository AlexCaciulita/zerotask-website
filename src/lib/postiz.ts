// Postiz API integration for TikTok posting
// Docs: https://docs.postiz.com/public-api/introduction

const POSTIZ_BASE = 'https://api.postiz.com/public/v1';

function getApiKey(): string | null {
  return process.env.POSTIZ_API_KEY || null;
}

async function postizFetch(path: string, options: RequestInit = {}, customApiKey?: string) {
  const apiKey = customApiKey || getApiKey();
  if (!apiKey) throw new Error('POSTIZ_API_KEY not configured');

  const res = await fetch(`${POSTIZ_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Postiz API error ${res.status}: ${text}`);
  }

  return res.json();
}

// Get connected integrations (to find TikTok integration ID)
export async function getIntegrations(): Promise<{ id: string; name: string; type: string }[]> {
  return postizFetch('/integrations');
}

// Upload an image to Postiz (required before posting)
export async function uploadImage(imageBuffer: Buffer, filename: string, customApiKey?: string): Promise<{ id: string; path: string }> {
  const apiKey = customApiKey || getApiKey();
  if (!apiKey) throw new Error('POSTIZ_API_KEY not configured');

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
  formData.append('file', blob, filename);

  const res = await fetch(`${POSTIZ_BASE}/upload`, {
    method: 'POST',
    headers: { Authorization: apiKey },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Postiz upload error ${res.status}: ${text}`);
  }

  return res.json();
}

// Post a TikTok slideshow as a draft (SELF_ONLY) or public
export async function postToTikTok(
  slides: { id: string; path: string }[], // uploaded image refs
  caption: string,
  hashtags: string[],
  options: {
    integrationId: string;
    privacy?: 'SELF_ONLY' | 'PUBLIC_TO_EVERYONE' | 'FOLLOWER_OF_CREATOR';
    scheduledAt?: Date;
    postNow?: boolean;
    customApiKey?: string;
  }
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const fullCaption = `${caption}\n\n${hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`;

    const body = {
      type: options.postNow ? 'now' : 'schedule',
      date: (options.scheduledAt || new Date()).toISOString(),
      shortLink: false,
      tags: [],
      posts: [
        {
          integration: { id: options.integrationId },
          value: [
            {
              content: fullCaption,
              image: slides,
            },
          ],
          settings: {
            __type: 'tiktok',
            title: caption.slice(0, 90),
            privacy_level: options.privacy || 'SELF_ONLY',
            duet: false,
            stitch: false,
            comment: true,
            autoAddMusic: 'no',
            brand_content_toggle: false,
            brand_organic_toggle: false,
            video_made_with_ai: true,
            content_posting_method: options.privacy === 'SELF_ONLY' ? 'UPLOAD' : 'DIRECT_POST',
          },
        },
      ],
    };

    const result = await postizFetch('/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    }, options.customApiKey);

    return { success: true, postId: result.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[Postiz] Error:', message);
    return { success: false, error: message };
  }
}

// Full pipeline: upload images then post
export async function createTikTokSlideshow(
  imageBuffers: Buffer[], // 6 slide images as buffers
  caption: string,
  hashtags: string[],
  integrationId: string,
  asDraft: boolean = true
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    // Upload all images
    const uploaded: { id: string; path: string }[] = [];
    for (let i = 0; i < imageBuffers.length; i++) {
      const result = await uploadImage(imageBuffers[i], `slide-${i + 1}.png`);
      uploaded.push(result);
    }

    // Post to TikTok
    return postToTikTok(uploaded, caption, hashtags, {
      integrationId,
      privacy: asDraft ? 'SELF_ONLY' : 'PUBLIC_TO_EVERYONE',
      postNow: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// Same as createTikTokSlideshow but with a custom API key
export async function createTikTokSlideshowWithKey(
  imageBuffers: Buffer[],
  caption: string,
  hashtags: string[],
  integrationId: string,
  apiKey: string,
  asDraft: boolean = true
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const uploaded: { id: string; path: string }[] = [];
    for (let i = 0; i < imageBuffers.length; i++) {
      const result = await uploadImage(imageBuffers[i], `slide-${i + 1}.png`, apiKey);
      uploaded.push(result);
    }

    return postToTikTok(uploaded, caption, hashtags, {
      integrationId,
      privacy: asDraft ? 'SELF_ONLY' : 'PUBLIC_TO_EVERYONE',
      postNow: true,
      customApiKey: apiKey,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
}
