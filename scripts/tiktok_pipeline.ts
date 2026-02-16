#!/usr/bin/env npx tsx
/**
 * TikTok Slideshow Pipeline
 * 
 * Generates hook → AI images → uploads to TikTok via Postiz
 * 
 * Usage: 
 *   cd ~/clawd/zerotask-app && npx tsx ../scripts/tiktok_pipeline.ts
 *   cd ~/clawd/zerotask-app && npx tsx ../scripts/tiktok_pipeline.ts --topic "photo editing"
 *   cd ~/clawd/zerotask-app && npx tsx ../scripts/tiktok_pipeline.ts --hook "Stop editing photos like it's 2020"
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// Load env from zerotask-app/.env.local manually
const envPath = resolve(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq);
  const val = trimmed.slice(eq + 1);
  if (!process.env[key]) process.env[key] = val;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const POSTIZ_BASE = 'https://api.postiz.com/public/v1';
const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY!;
const TIKTOK_INTEGRATION_ID = process.env.POSTIZ_TIKTOK_INTEGRATION_ID!;

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (flag: string) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
};
const topic = getArg('--topic') || 'app marketing';
const providedHook = getArg('--hook');
const slideCount = parseInt(getArg('--slides') || '5');
const dryRun = args.includes('--dry-run');

// ── Step 1: Generate hook + slide content plan ──
async function generateContent(topic: string, hook?: string): Promise<{
  hook: string;
  caption: string;
  hashtags: string[];
  slides: { text: string; imagePrompt: string }[];
}> {
  console.log('🧠 Generating content plan...');
  
  const prompt = hook
    ? `I have this TikTok hook: "${hook}"
    
Create a ${slideCount}-slide TikTok slideshow around this hook for an app marketing audience.`
    : `Create a viral TikTok slideshow about: ${topic}

Target audience: indie app developers, solopreneurs, people marketing mobile apps.
The hook (slide 1) is THE most important part — it must stop the scroll.

Generate a ${slideCount}-slide TikTok slideshow.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1500,
    temperature: 0.9,
    system: `You create viral TikTok slideshow content. You understand what hooks stop the scroll.
Your style: punchy, conversational, slightly provocative. Never corporate. Think @oliverhenry energy.

Reply in this exact JSON format (no markdown):
{
  "hook": "The text that appears on slide 1 — this is the scroll-stopper",
  "caption": "Short TikTok caption (2-3 lines max)",
  "hashtags": ["apptok", "appmarketing", "indiedev", "growthhack", "techtok"],
  "slides": [
    { "text": "Slide 1 text (the hook)", "imagePrompt": "Detailed image description for AI generation. Realistic iPhone photo style, portrait 9:16. Describe the scene, lighting, mood. NO text in image." },
    { "text": "Slide 2 text", "imagePrompt": "..." },
    ...
  ]
}

IMPORTANT for imagePrompt:
- Describe a SCENE, not text. The text overlay is added separately.
- Think: what would a human film for this slide?
- Examples: person looking at phone shocked, laptop screen with analytics, coffee shop work setup
- Always specify: "portrait orientation, iPhone photo, natural lighting, realistic"
- NO text, logos, or UI mockups in the image`,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (response.content[0] as { type: 'text'; text: string }).text;
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting JSON from response
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Failed to parse AI response: ${text.slice(0, 200)}`);
  }
}

// ── Step 2: Generate images ──
async function generateImage(prompt: string, slideNum: number): Promise<Buffer> {
  console.log(`🎨 Generating slide ${slideNum} image...`);
  
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: `${prompt}. No text or writing in the image.`,
    n: 1,
    size: '1024x1536' as any,
  });

  const data = response.data?.[0];
  if (data?.b64_json) {
    return Buffer.from(data.b64_json, 'base64');
  } else if (data?.url) {
    const res = await fetch(data.url);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error(`No image data for slide ${slideNum}`);
}

// ── Step 3: Upload to Postiz ──
async function uploadImage(imageBuffer: Buffer, filename: string): Promise<{ id: string; path: string }> {
  console.log(`📤 Uploading ${filename} (${(imageBuffer.length/1024).toFixed(0)}KB)...`);
  
  // Retry up to 3 times
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
      formData.append('file', blob, filename);

      const res = await fetch(`${POSTIZ_BASE}/upload`, {
        method: 'POST',
        headers: { Authorization: POSTIZ_API_KEY },
        body: formData,
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed ${res.status}: ${text}`);
      }
      return res.json();
    } catch (e: any) {
      console.error(`  ⚠️ Attempt ${attempt}/3 failed: ${e.message}`);
      if (attempt === 3) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('Upload failed after 3 attempts');
}

// ── Step 4: Post to TikTok ──
async function postToTikTok(
  slides: { id: string; path: string }[],
  caption: string,
  hashtags: string[]
): Promise<any> {
  console.log('🚀 Posting to TikTok...');
  
  const fullCaption = `${caption}\n\n${hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`;

  const body = {
    type: 'now',
    date: new Date().toISOString(),
    shortLink: false,
    tags: [],
    posts: [
      {
        integration: { id: TIKTOK_INTEGRATION_ID },
        value: [{ content: fullCaption, image: slides }],
        settings: {
          __type: 'tiktok',
          title: caption.slice(0, 90),
          privacy_level: 'SELF_ONLY',
          duet: false,
          stitch: false,
          comment: true,
          autoAddMusic: 'no',
          brand_content_toggle: false,
          brand_organic_toggle: false,
          video_made_with_ai: true,
          content_posting_method: 'UPLOAD',
        },
      },
    ],
  };

  const res = await fetch(`${POSTIZ_BASE}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: POSTIZ_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Post failed ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Main Pipeline ──
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎬 TikTok Slideshow Pipeline');
  console.log(`📋 Topic: ${topic}`);
  console.log(`📊 Slides: ${slideCount}`);
  console.log(`${dryRun ? '🧪 DRY RUN — no posting' : '🔴 LIVE — will post to TikTok'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 1: Content
  const content = await generateContent(topic, providedHook);
  console.log(`\n✅ Hook: "${content.hook}"`);
  console.log(`📝 Caption: ${content.caption}`);
  console.log(`#️⃣  ${content.hashtags.join(' ')}`);
  content.slides.forEach((s, i) => console.log(`  Slide ${i+1}: ${s.text}`));

  if (dryRun) {
    console.log('\n🧪 Dry run complete. Use without --dry-run to post.');
    return;
  }

  // Step 2: Generate images (saved to /tmp for recovery)
  const tmpDir = '/tmp/tiktok-slides';
  mkdirSync(tmpDir, { recursive: true });
  const imageBuffers: Buffer[] = [];
  for (let i = 0; i < content.slides.length; i++) {
    const buf = await generateImage(content.slides[i].imagePrompt, i + 1);
    imageBuffers.push(buf);
    writeFileSync(`${tmpDir}/slide-${i+1}.png`, buf);
    console.log(`  ✅ Slide ${i+1}: ${(buf.length / 1024).toFixed(0)}KB → ${tmpDir}/slide-${i+1}.png`);
  }

  // Step 3: Upload images
  const uploaded: { id: string; path: string }[] = [];
  for (let i = 0; i < imageBuffers.length; i++) {
    const result = await uploadImage(imageBuffers[i], `slide-${i+1}.png`);
    uploaded.push(result);
    console.log(`  ✅ Uploaded: ${result.path}`);
  }

  // Step 4: Post
  const result = await postToTikTok(uploaded, content.caption, content.hashtags);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Posted to TikTok as draft!');
  console.log(`📱 Check your TikTok drafts to add sound & publish`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => {
  console.error('❌ Pipeline failed:', e.message);
  process.exit(1);
});
