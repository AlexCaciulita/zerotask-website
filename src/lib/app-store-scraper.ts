export interface AppStoreData {
  appId: string;
  name: string;
  developer: string;
  rating: number;
  reviewCount: number;
  description: string;
  subtitle: string;
  category: string;
  price: string;
  screenshotCount: number;
  keywords: string[];
  icon: string;
}

function extractKeywords(name: string, subtitle: string, description: string): string[] {
  const text = `${name} ${subtitle} ${description}`.toLowerCase();
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'it', 'this', 'that', 'are', 'was', 'be', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'can', 'from', 'your', 'you', 'we', 'our', 'their', 'them', 'they', 'its', 'not', 'no', 'all', 'more', 'most', 'very', 'just', 'also', 'than', 'then', 'so', 'if', 'up', 'out', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'like', 'been', 'have', 'one', 'what', 'how', 'new']);
  const words = text.match(/[a-z]{3,}/g) || [];
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([w]) => w);
}

function parseAppResult(item: Record<string, unknown>): AppStoreData {
  const name = (item.trackName as string) || '';
  const subtitle = (item.subtitle as string) || '';
  const description = (item.description as string) || '';
  const screenshots = (item.screenshotUrls as string[]) || [];
  const ipadScreenshots = (item.ipadScreenshotUrls as string[]) || [];

  return {
    appId: String(item.trackId || ''),
    name,
    developer: (item.artistName as string) || '',
    rating: Number((item.averageUserRating as number)?.toFixed(1)) || 0,
    reviewCount: (item.userRatingCount as number) || 0,
    description,
    subtitle,
    category: (item.primaryGenreName as string) || '',
    price: item.price === 0 ? 'Free' : `$${item.price}`,
    screenshotCount: screenshots.length + ipadScreenshots.length,
    keywords: extractKeywords(name, subtitle, description),
    icon: (item.artworkUrl100 as string) || '',
  };
}

export async function lookupApp(appId: string): Promise<AppStoreData | null> {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${appId}&country=us`);
  const data = await res.json();
  if (data.resultCount === 0) return null;
  return parseAppResult(data.results[0]);
}

export async function searchApps(query: string): Promise<AppStoreData[]> {
  const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=software&country=us&limit=5`);
  const data = await res.json();
  return (data.results || []).map(parseAppResult);
}

export function extractAppIdFromUrl(url: string): string | null {
  const match = url.match(/id(\d+)/);
  return match ? match[1] : null;
}
