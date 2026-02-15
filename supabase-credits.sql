-- Credits system tables for ZeroTask
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS credits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL UNIQUE,
  plan text DEFAULT 'pro',
  monthly_allocation int DEFAULT 30,
  used_this_month int DEFAULT 0,
  purchased_credits int DEFAULT 0,
  billing_cycle_start timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  type text NOT NULL, -- 'generation', 'purchase', 'monthly_reset'
  amount int NOT NULL, -- negative for usage, positive for purchase/reset
  balance_after int,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
