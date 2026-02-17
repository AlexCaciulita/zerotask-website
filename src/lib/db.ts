import { supabase } from './supabase';

// Helper: check if we're in the browser
const isBrowser = typeof window !== 'undefined';

function lsGet(key: string) {
  if (!isBrowser) return null;
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function lsSet(key: string, val: unknown) {
  if (!isBrowser) return;
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function lsPush(key: string, item: unknown) {
  const arr = lsGet(key) || [];
  arr.push(item);
  lsSet(key, arr);
}

// ── Leads ──────────────────────────────────────────────────
export async function saveLead(email: string, appUrl?: string, score?: number) {
  const row = { email, app_url: appUrl ?? null, growth_score: score ?? null };
  try {
    const { data, error } = await supabase.from('leads').insert(row).select().single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[db] saveLead supabase failed, falling back to localStorage', e);
    const fallback = { id: crypto.randomUUID(), ...row, created_at: new Date().toISOString() };
    lsPush('zerotask-leads', fallback);
    return fallback;
  }
}

// ── Audits ─────────────────────────────────────────────────
export async function saveAudit(data: {
  lead_id?: string; app_url: string; app_name?: string; growth_score?: number;
  critical?: unknown[]; warnings?: unknown[]; opportunities?: unknown[]; scraped_data?: unknown;
}) {
  try {
    const { data: row, error } = await supabase.from('audits').insert(data).select().single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.warn('[db] saveAudit fallback', e);
    const fallback = { id: crypto.randomUUID(), ...data, created_at: new Date().toISOString() };
    lsPush('zerotask-audits', fallback);
    return fallback;
  }
}

// ── Keywords ───────────────────────────────────────────────
export async function getKeywords(appId: string) {
  try {
    const { data, error } = await supabase.from('keywords').select('*').eq('app_id', appId);
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[db] getKeywords fallback', e);
    return (lsGet('zerotask-keywords') || []).filter((k: { app_id: string }) => k.app_id === appId);
  }
}

export async function saveKeyword(data: { app_id: string; keyword: string; volume?: number; difficulty?: number; current_rank?: number; country?: string }) {
  try {
    const { data: row, error } = await supabase.from('keywords').insert(data).select().single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.warn('[db] saveKeyword fallback', e);
    const fallback = { id: crypto.randomUUID(), ...data, rank_history: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    lsPush('zerotask-keywords', fallback);
    return fallback;
  }
}

export async function updateKeywordRank(id: string, newRank: number) {
  try {
    const { data, error } = await supabase.from('keywords').update({ current_rank: newRank, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[db] updateKeywordRank fallback', e);
    return null;
  }
}

// ── Influencers ────────────────────────────────────────────
export async function getInfluencers() {
  try {
    const { data, error } = await supabase.from('influencers').select('*');
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[db] getInfluencers fallback', e);
    return lsGet('zerotask-influencers') || [];
  }
}

export async function saveInfluencer(data: { name: string; platform?: string; handle?: string; followers?: number; engagement?: string; niche?: string[]; email?: string }) {
  try {
    const { data: row, error } = await supabase.from('influencers').insert(data).select().single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.warn('[db] saveInfluencer fallback', e);
    const fallback = { id: crypto.randomUUID(), stage: 'discovered', cash_offer: 0, ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    lsPush('zerotask-influencers', fallback);
    return fallback;
  }
}

export async function updateInfluencerStage(id: string, stage: string) {
  try {
    const { data, error } = await supabase.from('influencers').update({ stage, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[db] updateInfluencerStage fallback', e);
    return null;
  }
}

// ── TikTok Posts ───────────────────────────────────────────
export async function getTikTokPosts(appId: string) {
  try {
    const { data, error } = await supabase.from('tiktok_posts').select('*').eq('app_id', appId);
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[db] getTikTokPosts fallback', e);
    return (lsGet('zerotask-tiktok-posts') || []).filter((p: { app_id: string }) => p.app_id === appId);
  }
}

export async function saveTikTokPost(data: { app_id: string; title?: string; hook?: string; status?: string; scheduled_date?: string; scheduled_time?: string; slides?: unknown[] }) {
  try {
    const { data: row, error } = await supabase.from('tiktok_posts').insert(data).select().single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.warn('[db] saveTikTokPost fallback', e);
    const fallback = { id: crypto.randomUUID(), status: 'draft', slides: [], ...data, created_at: new Date().toISOString() };
    lsPush('zerotask-tiktok-posts', fallback);
    return fallback;
  }
}

export async function updateTikTokPost(id: string, data: { title?: string; status?: string; scheduled_time?: string }) {
  try {
    const { data: row, error } = await supabase.from('tiktok_posts').update(data).eq('id', id).select().single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.warn('[db] updateTikTokPost fallback', e);
    return null;
  }
}

export async function deleteTikTokPost(id: string) {
  try {
    const { error } = await supabase.from('tiktok_posts').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[db] deleteTikTokPost fallback', e);
    return false;
  }
}

// ── Launch Steps ───────────────────────────────────────────
export async function getLaunchSteps(appId: string) {
  try {
    const { data, error } = await supabase.from('launch_steps').select('*').eq('app_id', appId);
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[db] getLaunchSteps fallback', e);
    return (lsGet('zerotask-launch-steps') || []).filter((s: { app_id: string }) => s.app_id === appId);
  }
}

export async function saveLaunchStep(data: { app_id: string; step_key: string; title: string; description?: string; status?: string; notes?: string; ai_content?: string; week_label?: string; sort_order?: number }) {
  try {
    const { data: row, error } = await supabase.from('launch_steps').insert(data).select().single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.warn('[db] saveLaunchStep fallback', e);
    const fallback = { id: crypto.randomUUID(), status: 'queued', ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    lsPush('zerotask-launch-steps', fallback);
    return fallback;
  }
}

export async function updateLaunchStep(id: string, data: { status?: string; notes?: string; ai_content?: string }) {
  try {
    const { data: row, error } = await supabase.from('launch_steps').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.warn('[db] updateLaunchStep fallback', e);
    return null;
  }
}

// ── Competitors ───────────────────────────────────────────
export async function getCompetitors() {
  try {
    const { data, error } = await supabase.from('competitors').select('*');
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[db] getCompetitors fallback', e);
    return lsGet('zerotask-competitors') || [];
  }
}

export async function saveCompetitor(data: {
  app_id: string; name: string; icon?: string; rating?: number;
  review_count?: number; downloads_estimate?: string;
  keywords_total?: number; keywords_shared?: number; keywords_unique?: number;
  scraped_data?: unknown;
}) {
  try {
    const { data: row, error } = await supabase.from('competitors').insert({
      ...data,
      last_scraped_at: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.warn('[db] saveCompetitor fallback', e);
    const fallback = { id: crypto.randomUUID(), ...data, last_scraped_at: new Date().toISOString(), created_at: new Date().toISOString() };
    lsPush('zerotask-competitors', fallback);
    return fallback;
  }
}

export async function deleteCompetitor(id: string) {
  try {
    const { error } = await supabase.from('competitors').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[db] deleteCompetitor fallback', e);
    return false;
  }
}

// ── Feed Events (client-side) ─────────────────────────────
export async function getFeedEvents(limit = 20) {
  try {
    const { data, error } = await supabase
      .from('feed_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('[db] getFeedEvents fallback', e);
    return [];
  }
}

export async function markFeedRead(id: string) {
  try {
    const { error } = await supabase.from('feed_events').update({ read: true }).eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[db] markFeedRead fallback', e);
    return false;
  }
}

// ── Scenarios ──────────────────────────────────────────────
export async function saveScenario(data: { app_id: string; title: string; variables: unknown; results?: unknown; saved_to_strategy?: boolean }) {
  try {
    const { data: row, error } = await supabase.from('scenarios').insert(data).select().single();
    if (error) throw error;
    return row;
  } catch (e) {
    console.warn('[db] saveScenario fallback', e);
    const fallback = { id: crypto.randomUUID(), saved_to_strategy: false, ...data, created_at: new Date().toISOString() };
    lsPush('zerotask-scenarios', fallback);
    return fallback;
  }
}

export async function getScenarios(appId: string) {
  try {
    const { data, error } = await supabase.from('scenarios').select('*').eq('app_id', appId);
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[db] getScenarios fallback', e);
    return (lsGet('zerotask-scenarios') || []).filter((s: { app_id: string }) => s.app_id === appId);
  }
}
