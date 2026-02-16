-- Row Level Security (RLS) policies for ZeroTask
-- Run this in Supabase SQL Editor AFTER creating all tables
--
-- IMPORTANT: All data tables need a user_id column to associate data with users.
-- Some existing tables use app_id instead — for those we add a user_id column.

-- ═══════════════════════════════════════════════════════
-- 1. ADD user_id TO EXISTING TABLES (where missing)
-- ═══════════════════════════════════════════════════════

-- Add user_id to tables that don't have it
ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE audits ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE tiktok_posts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE launch_steps ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- ═══════════════════════════════════════════════════════
-- 2. ENABLE RLS ON ALL TABLES
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
-- 3. RLS POLICIES: Users can only access their own data
-- ═══════════════════════════════════════════════════════

-- LEADS
CREATE POLICY "Users can view own leads" ON leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leads" ON leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leads" ON leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own leads" ON leads FOR DELETE USING (auth.uid() = user_id);

-- AUDITS
CREATE POLICY "Users can view own audits" ON audits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own audits" ON audits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own audits" ON audits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own audits" ON audits FOR DELETE USING (auth.uid() = user_id);

-- KEYWORDS
CREATE POLICY "Users can view own keywords" ON keywords FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own keywords" ON keywords FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own keywords" ON keywords FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own keywords" ON keywords FOR DELETE USING (auth.uid() = user_id);

-- INFLUENCERS
CREATE POLICY "Users can view own influencers" ON influencers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own influencers" ON influencers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own influencers" ON influencers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own influencers" ON influencers FOR DELETE USING (auth.uid() = user_id);

-- TIKTOK_POSTS
CREATE POLICY "Users can view own tiktok posts" ON tiktok_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tiktok posts" ON tiktok_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tiktok posts" ON tiktok_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tiktok posts" ON tiktok_posts FOR DELETE USING (auth.uid() = user_id);

-- LAUNCH_STEPS
CREATE POLICY "Users can view own launch steps" ON launch_steps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own launch steps" ON launch_steps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own launch steps" ON launch_steps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own launch steps" ON launch_steps FOR DELETE USING (auth.uid() = user_id);

-- SCENARIOS
CREATE POLICY "Users can view own scenarios" ON scenarios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scenarios" ON scenarios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scenarios" ON scenarios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scenarios" ON scenarios FOR DELETE USING (auth.uid() = user_id);

-- CREDITS (user_id is text, not uuid — uses auth.uid()::text)
CREATE POLICY "Users can view own credits" ON credits FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own credits" ON credits FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own credits" ON credits FOR UPDATE USING (auth.uid()::text = user_id);

-- CREDIT_TRANSACTIONS (user_id is text)
CREATE POLICY "Users can view own credit transactions" ON credit_transactions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own credit transactions" ON credit_transactions FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- SUBSCRIPTIONS
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);
