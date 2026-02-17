import { createServiceSupabaseClient } from './supabase-server';

/**
 * Server-side helper to create feed events.
 * Uses service role to bypass RLS (called from API routes that already authenticated the user).
 */

interface FeedEventData {
  user_id: string;
  type: 'keyword' | 'competitor' | 'content' | 'review' | 'tiktok' | 'launch';
  title: string;
  summary: string;
  detail?: string;
  badge_label?: string;
  badge_variant?: 'error' | 'warning' | 'success' | 'info';
  action_label?: string;
  action_href?: string;
}

export async function createFeedEvent(data: FeedEventData): Promise<void> {
  try {
    const supabase = createServiceSupabaseClient();
    await supabase.from('feed_events').insert(data);
  } catch (e) {
    // Feed events are non-critical — don't fail the parent operation
    console.warn('[feed] Failed to create feed event:', e);
  }
}

export async function getFeedEvents(userId: string, limit = 20) {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('feed_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('[feed] Failed to fetch feed events:', e);
    return [];
  }
}

export async function markFeedEventRead(userId: string, eventId: string): Promise<void> {
  try {
    const supabase = createServiceSupabaseClient();
    await supabase
      .from('feed_events')
      .update({ read: true })
      .eq('id', eventId)
      .eq('user_id', userId);
  } catch (e) {
    console.warn('[feed] Failed to mark feed event read:', e);
  }
}
