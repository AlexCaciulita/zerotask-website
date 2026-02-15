const BRAND_VOICE_KEY = 'zerotask-brand-voice';

export interface BrandVoice {
  tone: string;
  guidelines: string;
}

export function getBrandVoice(): BrandVoice | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(BRAND_VOICE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (parsed.tone || parsed.guidelines) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveBrandVoice(voice: BrandVoice): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BRAND_VOICE_KEY, JSON.stringify(voice));
}
