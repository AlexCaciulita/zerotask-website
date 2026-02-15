-- Leads from homepage email capture
CREATE TABLE leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  app_url text,
  growth_score int,
  created_at timestamptz DEFAULT now()
);

-- App audit results
CREATE TABLE audits (
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
CREATE TABLE keywords (
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
CREATE TABLE influencers (
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
CREATE TABLE tiktok_posts (
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
CREATE TABLE launch_steps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id text NOT NULL,
  step_key text NOT NULL,
  status text DEFAULT 'queued',
  notes text,
  ai_content text,
  updated_at timestamptz DEFAULT now()
);

-- What-If scenarios
CREATE TABLE scenarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id text NOT NULL,
  title text NOT NULL,
  variables jsonb NOT NULL,
  results jsonb,
  saved_to_strategy boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
