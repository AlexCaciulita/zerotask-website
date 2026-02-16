import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function buildPrompt(scene: string, style: string, slideNumber: number, textOverlay?: string): string {
  let prompt = `iPhone photo, realistic lighting, portrait orientation. ${scene}. Style: ${style}.`;
  if (slideNumber === 1 && textOverlay) {
    prompt += ` Text overlay in lower third: "${textOverlay}"`;
  }
  return prompt;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 4): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isRateLimit = message.includes('429') || message.includes('RESOURCE_EXHAUSTED');
      if (!isRateLimit || attempt === maxRetries) throw err;
      const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s, 16s
      console.log(`Rate limited, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

export async function generateSlideImage(
  sceneDescription: string,
  styleVariation: string,
  slideNumber: number,
  textOverlay?: string
): Promise<string> {
  const prompt = buildPrompt(sceneDescription, styleVariation, slideNumber, textOverlay);

  return withRetry(async () => {
    const response = await genai.models.generateContent({
      model: 'gemini-3-pro-image',
      contents: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }
    return '';
  });
}

export async function generateSlideshow(
  sceneDescription: string,
  styles: string[],
  hookText: string
): Promise<string[]> {
  const results: string[] = new Array(styles.length).fill('');
  const CONCURRENCY = 2;
  let nextIndex = 0;
  let lastStartTime = 0;
  const MIN_INTERVAL = 5000; // 5s between API calls for rate limiting

  async function runNext(): Promise<void> {
    while (nextIndex < styles.length) {
      const i = nextIndex++;
      // Enforce minimum interval between API call starts
      const now = Date.now();
      const elapsed = now - lastStartTime;
      if (elapsed < MIN_INTERVAL && lastStartTime > 0) {
        await new Promise(r => setTimeout(r, MIN_INTERVAL - elapsed));
      }
      lastStartTime = Date.now();

      const image = await generateSlideImage(
        sceneDescription,
        styles[i],
        i + 1,
        i === 0 ? hookText : undefined
      );
      results[i] = image;
    }
  }

  // Launch workers up to concurrency limit
  const workers: Promise<void>[] = [];
  for (let w = 0; w < Math.min(CONCURRENCY, styles.length); w++) {
    workers.push(runNext());
  }
  await Promise.all(workers);

  return results;
}
