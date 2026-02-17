-- Phase 2: Real Data Dashboard — New Tables
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════
-- 1. FEED EVENTS — Real-time activity feed for dashboard
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS feed_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  type text NOT NULL, -- 'keyword' | 'competitor' | 'content' | 'review' | 'tiktok' | 'launch'
  title text NOT NULL,
  summary text NOT NULL,
  detail text,
  badge_label text,
  badge_variant text DEFAULT 'success',
  action_label text,
  action_href text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_events_user_created
  ON feed_events (user_id, created_at DESC);

ALTER TABLE feed_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed events"
  ON feed_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feed events"
  ON feed_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feed events"
  ON feed_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own feed events"
  ON feed_events FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- 2. COMPETITORS — Tracked competitor apps
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS competitors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  app_id text NOT NULL,        -- the competitor's App Store ID
  name text NOT NULL,
  icon text,
  rating numeric,
  review_count int,
  downloads_estimate text,
  keywords_total int,
  keywords_shared int,
  keywords_unique int,
  last_scraped_at timestamptz,
  scraped_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitors_user_id
  ON competitors (user_id);

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own competitors"
  ON competitors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own competitors"
  ON competitors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own competitors"
  ON competitors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own competitors"
  ON competitors FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- 3. BRIEFINGS — AI Morning Briefing cache
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS briefings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  content text NOT NULL,             -- markdown formatted briefing
  highlights jsonb DEFAULT '[]',     -- [{type, title, detail}]
  generated_at timestamptz DEFAULT now(),
  read boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_briefings_user_generated
  ON briefings (user_id, generated_at DESC);

ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own briefings"
  ON briefings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own briefings"
  ON briefings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own briefings"
  ON briefings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own briefings"
  ON briefings FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- 4. ADD title/description/sort_order TO launch_steps
-- ═══════════════════════════════════════════════════════

ALTER TABLE launch_steps ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE launch_steps ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE launch_steps ADD COLUMN IF NOT EXISTS week_label text;
ALTER TABLE launch_steps ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;
ALTER TABLE launch_steps ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
