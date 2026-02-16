import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';

async function getKeywordSuggestionsFromApple(term: string): Promise<string[]> {
  const keywords = new Set<string>();
  const stopWords = new Set(['the', 'and', 'for', 'with', 'app', 'free', 'new', 'best', 'your', 'get', 'all', 'you', 'from']);

  try {
    // Use iTunes search API to find related apps and extract keyword ideas
    const searchRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=25&country=us`
    );
    const data = await searchRes.json();

    for (const app of data.results || []) {
      // Add full app names as keyword phrases
      const name = (app.trackName || '').toLowerCase().trim();
      if (name && name.length < 50) keywords.add(name);

      // Extract meaningful multi-word phrases from app names
      const cleanName = name.replace(/[^\w\s]/g, ' ').trim();
      const words = cleanName.split(/\s+/).filter((w: string) => w.length > 2 && !stopWords.has(w));
      // Add individual meaningful words
      words.forEach((w: string) => { if (w.length > 3) keywords.add(w); });
      // Add 2-word combos
      for (let i = 0; i < words.length - 1; i++) {
        keywords.add(`${words[i]} ${words[i + 1]}`);
      }

      // Add category and genre info
      const genre = (app.primaryGenreName || '').toLowerCase();
      if (genre) keywords.add(`${term} ${genre}`);
    }

    // Remove the original term if it's the only one
    keywords.delete(term.toLowerCase());
    // Re-add it at the start
    return [term, ...keywords].slice(0, 30);
  } catch {
    return [term];
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const auth = await authenticateRequest(req);
    if (isAuthError(auth)) return auth;

    const { term, country } = await req.json();
    if (!term) return NextResponse.json({ error: 'term required' }, { status: 400 });

    const suggestions = await getKeywordSuggestionsFromApple(term);
    return NextResponse.json({ suggestions, count: suggestions.length });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
