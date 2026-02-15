// App Store Scraper — uses iTunes Search API (free, no auth)

export interface AppListing {
  appId: string;
  name: string;
  description: string;
  screenshots: string[];
  rating: number;
  reviewCount: number;
  category: string;
  version: string;
  price: number;
  developer: string;
  icon: string;
  url: string;
}

export interface Review {
  author: string;
  rating: number;
  title: string;
  content: string;
  date: string;
}

function parseAppId(url: string): string | null {
  const match = url.match(/\/id(\d+)/);
  return match ? match[1] : null;
}

function mapResult(r: Record<string, unknown>): AppListing {
  return {
    appId: String(r.trackId ?? ''),
    name: String(r.trackName ?? ''),
    description: String(r.description ?? ''),
    screenshots: (r.screenshotUrls as string[]) ?? [],
    rating: Number(r.averageUserRating ?? 0),
    reviewCount: Number(r.userRatingCount ?? 0),
    category: String(r.primaryGenreName ?? ''),
    version: String(r.version ?? ''),
    price: Number(r.price ?? 0),
    developer: String(r.artistName ?? ''),
    icon: String(r.artworkUrl512 ?? r.artworkUrl100 ?? ''),
    url: String(r.trackViewUrl ?? ''),
  };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function scrapeAppStore(appUrl: string): Promise<AppListing | null> {
  try {
    const appId = parseAppId(appUrl);
    if (!appId) return null;
    const res = await fetch(`https://itunes.apple.com/lookup?id=${appId}&country=us`);
    const data = await res.json();
    if (!data.results?.length) return null;
    return mapResult(data.results[0]);
  } catch {
    return null;
  }
}

export async function searchAppStore(term: string, limit = 10): Promise<AppListing[]> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=${limit}`
    );
    const data = await res.json();
    return (data.results ?? []).map(mapResult);
  } catch {
    return [];
  }
}

export async function getAppReviews(appId: string, page = 1): Promise<Review[]> {
  try {
    await delay(300);
    const res = await fetch(
      `https://itunes.apple.com/us/rss/customerreviews/id=${appId}/sortBy=mostRecent/page=${page}/json`
    );
    const data = await res.json();
    const entries = data?.feed?.entry;
    if (!Array.isArray(entries)) return [];
    return entries
      .filter((e: Record<string, unknown>) => e['im:rating'])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((e: any) => ({
        author: e?.author?.name?.label ?? 'Unknown',
        rating: Number(e?.['im:rating']?.label ?? 0),
        title: e?.title?.label ?? '',
        content: e?.content?.label ?? '',
        date: e?.updated?.label ?? '',
      }));
  } catch {
    return [];
  }
}

export async function getKeywordSuggestions(term: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://search.itunes.apple.com/WebObjects/MZSearchHints.woa/wa/hints?term=${encodeURIComponent(term)}`
    );
    const data = await res.json();
    if (!data?.hints) return [];
    return data.hints.map((h: Record<string, string>) => h.term ?? h);
  } catch {
    return [];
  }
}
