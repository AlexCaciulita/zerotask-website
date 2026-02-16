import { NextRequest, NextResponse } from 'next/server';
import { generateSlideImage, generateSlideshow } from '@/lib/image-gen';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';

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
    // Verify authentication
    const auth = await authenticateRequest(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const { action, ...params } = body;

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
        return NextResponse.json({ image: url });
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
        return NextResponse.json({ images: urls });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
