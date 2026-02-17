-- ═══════════════════════════════════════════════════════════════
-- ZeroTask — COMPLETE DATABASE MIGRATION
-- ═══════════════════════════════════════════════════════════════
-- Combines all Phase 1 + Phase 2 migrations into one idempotent script.
-- Safe to run multiple times — uses IF NOT EXISTS everywhere.
-- Paste this entire file into Supabase Dashboard → SQL Editor → Run.
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════
-- PART 1: BASE TABLES (Phase 1)
-- ═══════════════════════════════════════════════════════

-- Leads from homepage email capture
CREATE TABLE IF NOT EXISTS leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  app_url text,
  growth_score int,
  created_at timestamptz DEFAULT now()
);

-- App audit results
CREATE TABLE IF NOT EXISTS audits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES leads(id),
  app_url text NOT NULL,
  app_name text,
  growth_score int,
  critical jsonb DEFAULT '[]',
  warnings jsonb DEFAULT '[]',
  opportunities jsonb DEFAULT '[]',
  scraped_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Keyword tracking
CREATE TABLE IF NOT EXISTS keywords (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id text NOT NULL,
  keyword text NOT NULL,
  volume int,
  difficulty int,
  current_rank int,
  rank_history jsonb DEFAULT '[]',
  country text DEFAULT 'US',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Influencer CRM
CREATE TABLE IF NOT EXISTS influencers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  platform text,
  handle text,
  followers int,
  engagement text,
  niche text[],
  stage text DEFAULT 'discovered',
  email text,
  cash_offer int DEFAULT 0,
  outreach_history jsonb DEFAULT '[]',
  ai_dms jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TikTok content calendar
CREATE TABLE IF NOT EXISTS tiktok_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id text NOT NULL,
  title text,
  hook text,
  status text DEFAULT 'draft',
  scheduled_date date,
  scheduled_time text,
  postiz_id text,
  performance jsonb,
  slides jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Launch checklist state
CREATE TABLE IF NOT EXISTS launch_steps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id text NOT NULL,
  step_key text NOT NULL,
  status text DEFAULT 'queued',
  notes text,
  ai_content text,
  updated_at timestamptz DEFAULT now()
);

-- What-If scenarios
CREATE TABLE IF NOT EXISTS scenarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id text NOT NULL,
  title text NOT NULL,
  variables jsonb NOT NULL,
  results jsonb,
  saved_to_strategy boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Credits system
CREATE TABLE IF NOT EXISTS credits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL UNIQUE,
  plan text DEFAULT 'pro',
  monthly_allocation int DEFAULT 30,
  used_this_month int DEFAULT 0,
  purchased_credits int DEFAULT 0,
  bonus_credit_used boolean DEFAULT false,
  billing_cycle_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  type text NOT NULL,
  amount int NOT NULL,
  balance_after int,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'none',
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);


-- ═══════════════════════════════════════════════════════
-- PART 2: INDEXES (Phase 1)
-- ═══════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);


-- ═══════════════════════════════════════════════════════
-- PART 3: ADD user_id TO TABLES (RLS prep)
-- ═══════════════════════════════════════════════════════

ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE audits ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE tiktok_posts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE launch_steps ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);


-- ═══════════════════════════════════════════════════════
-- PART 4: ENABLE RLS ON ALL TABLES
-- ═══════════════════════════════════════════════════════

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiktok_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════
-- PART 5: RLS POLICIES (Phase 1)
-- ═══════════════════════════════════════════════════════
-- Using DO blocks so policies don't error if they already exist.

-- LEADS
DO $$ BEGIN CREATE POLICY "Users can view own leads" ON leads FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own leads" ON leads FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own leads" ON leads FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own leads" ON leads FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AUDITS
DO $$ BEGIN CREATE POLICY "Users can view own audits" ON audits FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own audits" ON audits FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own audits" ON audits FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own audits" ON audits FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- KEYWORDS
DO $$ BEGIN CREATE POLICY "Users can view own keywords" ON keywords FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own keywords" ON keywords FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own keywords" ON keywords FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own keywords" ON keywords FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- INFLUENCERS
DO $$ BEGIN CREATE POLICY "Users can view own influencers" ON influencers FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own influencers" ON influencers FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own influencers" ON influencers FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own influencers" ON influencers FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- TIKTOK_POSTS
DO $$ BEGIN CREATE POLICY "Users can view own tiktok posts" ON tiktok_posts FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own tiktok posts" ON tiktok_posts FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own tiktok posts" ON tiktok_posts FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own tiktok posts" ON tiktok_posts FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- LAUNCH_STEPS
DO $$ BEGIN CREATE POLICY "Users can view own launch steps" ON launch_steps FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own launch steps" ON launch_steps FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own launch steps" ON launch_steps FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own launch steps" ON launch_steps FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SCENARIOS
DO $$ BEGIN CREATE POLICY "Users can view own scenarios" ON scenarios FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own scenarios" ON scenarios FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own scenarios" ON scenarios FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own scenarios" ON scenarios FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CREDITS (user_id is text, not uuid — uses auth.uid()::text)
DO $$ BEGIN CREATE POLICY "Users can view own credits" ON credits FOR SELECT USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own credits" ON credits FOR INSERT WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own credits" ON credits FOR UPDATE USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CREDIT_TRANSACTIONS (user_id is text)
DO $$ BEGIN CREATE POLICY "Users can view own credit transactions" ON credit_transactions FOR SELECT USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own credit transactions" ON credit_transactions FOR INSERT WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SUBSCRIPTIONS
DO $$ BEGIN CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own subscription" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own subscription" ON subscriptions FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════
-- PART 6: PHASE 2 — NEW TABLES
-- ═══════════════════════════════════════════════════════

-- Feed events — real-time activity feed for dashboard
CREATE TABLE IF NOT EXISTS feed_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  type text NOT NULL,
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

DO $$ BEGIN CREATE POLICY "Users can view own feed events" ON feed_events FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own feed events" ON feed_events FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own feed events" ON feed_events FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own feed events" ON feed_events FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Competitors — tracked competitor apps
CREATE TABLE IF NOT EXISTS competitors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  app_id text NOT NULL,
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

DO $$ BEGIN CREATE POLICY "Users can view own competitors" ON competitors FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own competitors" ON competitors FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own competitors" ON competitors FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own competitors" ON competitors FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Briefings — AI morning briefing cache
CREATE TABLE IF NOT EXISTS briefings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  content text NOT NULL,
  highlights jsonb DEFAULT '[]',
  generated_at timestamptz DEFAULT now(),
  read boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_briefings_user_generated
  ON briefings (user_id, generated_at DESC);

ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Users can view own briefings" ON briefings FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can insert own briefings" ON briefings FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own briefings" ON briefings FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own briefings" ON briefings FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════
-- PART 7: PHASE 2 — ALTER EXISTING TABLES
-- ═══════════════════════════════════════════════════════

ALTER TABLE launch_steps ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE launch_steps ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE launch_steps ADD COLUMN IF NOT EXISTS week_label text;
ALTER TABLE launch_steps ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;
ALTER TABLE launch_steps ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();


-- ═══════════════════════════════════════════════════════
-- PART 8: PATCH — Missing columns on credits table
-- ═══════════════════════════════════════════════════════

ALTER TABLE credits ADD COLUMN IF NOT EXISTS bonus_credit_used boolean DEFAULT false;
ALTER TABLE credits ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();


-- ═══════════════════════════════════════════════════════
-- DONE! Expected result: 13 tables, all with RLS enabled.
-- Tables: leads, audits, keywords, influencers, tiktok_posts,
--         launch_steps, scenarios, credits, credit_transactions,
--         subscriptions, feed_events, competitors, briefings
-- ═══════════════════════════════════════════════════════
