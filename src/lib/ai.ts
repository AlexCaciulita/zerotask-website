import Anthropic from '@anthropic-ai/sdk';

// Server-side only — ANTHROPIC_API_KEY is never exposed to the browser
// Next.js only exposes env vars prefixed with NEXT_PUBLIC_ to the client
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model routing — cheap for simple tasks, smart for creative/strategic
const MODELS = {
  fast: 'claude-3-haiku-20240307' as const,        // cheapest — keyword analysis, reviews, simple tasks
  smart: 'claude-sonnet-4-20250514' as const,      // copy generation, strategy, creative work
};

type ModelTier = keyof typeof MODELS;

interface AIOptions {
  tier?: ModelTier;
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

export async function aiGenerate(
  prompt: string,
  options: AIOptions = {}
): Promise<string> {
  const {
    tier = 'fast',
    maxTokens = 2048,
    temperature = 0.7,
    system,
  } = options;

  const response = await client.messages.create({
    model: MODELS[tier],
    max_tokens: maxTokens,
    temperature,
    ...(system ? { system } : {}),
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  if (block.type === 'text') {
    return block.text;
  }
  return '';
}

// Streaming version for real-time UI updates
export async function* aiStream(
  prompt: string,
  options: AIOptions = {}
): AsyncGenerator<string> {
  const {
    tier = 'fast',
    maxTokens = 2048,
    temperature = 0.7,
    system,
  } = options;

  const stream = client.messages.stream({
    model: MODELS[tier],
    max_tokens: maxTokens,
    temperature,
    ...(system ? { system } : {}),
    messages: [{ role: 'user', content: prompt }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}

// ── Task-specific AI functions ──────────────────────────────

const APP_CONTEXT = (appData: AppData) => `
You are an expert mobile app marketing strategist. You're analyzing this app:
- Name: ${appData.name}
- Category: ${appData.category}
- Platform: ${appData.platform}
- Current description: ${appData.description || 'Not provided'}
- Current keywords: ${appData.keywords?.join(', ') || 'Not provided'}
- Store URL: ${appData.storeUrl || 'Not provided'}
`;

export interface AppData {
  name: string;
  category: string;
  platform: 'ios' | 'android' | 'both';
  description?: string;
  keywords?: string[];
  storeUrl?: string;
}

export interface CopyVariation {
  title: string;
  subtitle?: string;
  description: string;
  keywords?: string[];
}

export interface Hook {
  text: string;
  formula: string;
  predictedScore: number;
  reasoning: string;
}

export interface KeywordSuggestion {
  keyword: string;
  estimatedVolume: string;
  difficulty: string;
  reasoning: string;
}

export interface ReviewResponse {
  reviewId: string;
  response: string;
  tone: string;
}

// Generate app store copy
export async function generateCopy(
  appData: AppData,
  platform: string,
  tone: string = 'professional',
  brandVoicePrompt: string = ''
): Promise<string> {
  const prompt = `Generate 3 variations of ${platform} listing copy for this app.
Tone: ${tone}

For each variation provide:
- Title (max 30 chars for App Store, 50 for Play Store)
- Subtitle (max 30 chars, App Store only)
- Description (first 3 lines are most important — hook the reader)
- Keywords (comma-separated, App Store only)

Format as JSON array with keys: title, subtitle, description, keywords

App details:
Name: ${appData.name}
Category: ${appData.category}
Current description: ${appData.description || 'Not provided'}`;

  return aiGenerate(prompt + brandVoicePrompt, {
    tier: 'smart',
    maxTokens: 3000,
    temperature: 0.9,
    system: APP_CONTEXT(appData),
  });
}

// Brainstorm TikTok hooks
export async function brainstormHooks(
  appData: AppData,
  count: number = 10,
  brandVoicePrompt: string = ''
): Promise<string> {
  const prompt = `Generate ${count} TikTok slideshow hooks for this app.

CRITICAL FORMULA (proven to get 100K+ views):
[Another person] + [conflict or doubt] → showed them the app → they changed their mind

Rules:
- Every hook MUST have another person (friend, roommate, sister, coworker, etc.)
- Every hook MUST have conflict or doubt relevant to the app's category
- Every hook must be under 100 characters
- Make them feel like real human stories, not ads
- Focus on problems the app solves for its target audience

Return as JSON array with keys: text, formula (describe the person+conflict), predictedScore (1-10), reasoning

App: ${appData.name} — ${appData.category}`;

  return aiGenerate(prompt + brandVoicePrompt, {
    tier: 'smart',
    maxTokens: 2000,
    temperature: 0.9,
    system: APP_CONTEXT(appData),
  });
}

// Analyze reviews and extract insights
export async function analyzeReviews(
  reviews: { text: string; rating: number; id: string }[],
  brandVoicePrompt: string = ''
): Promise<string> {
  const prompt = `Analyze these ${reviews.length} app reviews and provide:

1. SENTIMENT CLUSTERS: Group reviews by topic (not just star rating). For each cluster:
   - Topic name
   - Count of reviews
   - Average rating
   - Summary of complaints/praise
   - Suggested fix or response strategy

2. FEATURE REQUESTS: Top 5 most-requested features based on review content

3. RESPONSE DRAFTS: For the 5 most negative reviews, write a professional response that:
   - Acknowledges the specific issue
   - Shows empathy
   - Offers a solution or timeline
   - Keeps brand voice friendly

Return as JSON with keys: clusters, featureRequests, responseDrafts

Reviews:
${reviews.map(r => `[${r.rating}★ id:${r.id}] ${r.text}`).join('\n')}`;

  return aiGenerate(prompt + brandVoicePrompt, {
    tier: 'fast',
    maxTokens: 3000,
    temperature: 0.3,
  });
}

// Keyword suggestions
export async function suggestKeywords(
  appData: AppData,
  count: number = 30
): Promise<string> {
  const prompt = `Suggest ${count} App Store keywords for this app.

For each keyword provide:
- keyword (the actual search term)
- estimatedVolume (high/medium/low based on your knowledge)
- difficulty (easy/medium/hard — based on competition)
- reasoning (why this keyword, what intent it captures)

Focus on:
- Long-tail keywords that indie apps can actually rank for
- Keywords competitors might miss
- Trending terms in this category
- User intent keywords (what problem are they solving?)

Avoid:
- Single generic words that are too broad
- Keywords dominated by the biggest players in the category

Return as JSON array.

App: ${appData.name} — ${appData.category}
Current keywords: ${appData.keywords?.join(', ') || 'none'}`;

  return aiGenerate(prompt, {
    tier: 'fast',
    maxTokens: 3000,
    temperature: 0.3,
    system: APP_CONTEXT(appData),
  });
}

// Competitor analysis
export async function analyzeCompetitor(
  appData: AppData,
  competitor: { name: string; description?: string; keywords?: string[] }
): Promise<string> {
  const prompt = `Compare my app against this competitor and provide strategic recommendations.

MY APP:
Name: ${appData.name}
Category: ${appData.category}
Keywords: ${appData.keywords?.join(', ') || 'not set'}

COMPETITOR:
Name: ${competitor.name}
Description: ${competitor.description || 'not available'}
Keywords: ${competitor.keywords?.join(', ') || 'not available'}

Provide:
1. KEYWORD OVERLAP: Which keywords we share, which are unique to each
2. STRENGTHS: What competitor does better (be honest)
3. OPPORTUNITIES: Gaps in their strategy we can exploit
4. RECOMMENDED ACTIONS: Top 3 specific things to do this week
5. COUNTER-STRATEGY: If they update their listing, what should we do?

Return as JSON with those 5 keys.`;

  return aiGenerate(prompt, {
    tier: 'smart',
    maxTokens: 2000,
  });
}

// What-If keyword simulator
export async function simulateKeywordChange(
  appData: AppData,
  currentTitle: string,
  proposedTitle: string,
  keywords: string[]
): Promise<string> {
  const prompt = `Predict the impact of changing this app's title on keyword rankings.

Current title: "${currentTitle}"
Proposed title: "${proposedTitle}"
Tracked keywords: ${keywords.join(', ')}

For each keyword, predict:
- currentRelevance (1-10): how well the current title targets this keyword
- proposedRelevance (1-10): how well the new title would target it
- predictedRankChange: estimated rank change (e.g., "+5", "-3", "no change")
- reasoning: brief explanation

Also provide an overall recommendation: should they make this change?

Return as JSON with keys: predictions (array), overallRecommendation (string)`;

  return aiGenerate(prompt, {
    tier: 'fast',
    maxTokens: 2000,
    temperature: 0.3,
  });
}
