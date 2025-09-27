-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE subscription_plan AS ENUM ('free', 'premium', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('inactive', 'active', 'trialing', 'past_due', 'canceled', 'unpaid');
CREATE TYPE bet_status AS ENUM ('pending', 'won', 'lost');
CREATE TYPE bankroll_unit_mode AS ENUM ('fixed', 'percent');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subscription_plan subscription_plan DEFAULT 'free',
  subscription_status subscription_status DEFAULT 'inactive',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE,
  monthly_bet_limit INTEGER DEFAULT 20,
  max_bankrolls INTEGER DEFAULT 1,
  advanced_analytics BOOLEAN DEFAULT FALSE,
  kelly_calculator BOOLEAN DEFAULT FALSE,
  google_sheets_id TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TIMESTAMPTZ,
  google_sheets_connected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bankrolls table
CREATE TABLE public.bankrolls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  starting_balance DECIMAL(12, 2) NOT NULL,
  unit_mode bankroll_unit_mode DEFAULT 'fixed',
  unit_value DECIMAL(12, 4) NOT NULL,
  max_bet_pct DECIMAL(5, 4) DEFAULT 0.05,
  daily_loss_limit_pct DECIMAL(5, 4),
  weekly_loss_limit_pct DECIMAL(5, 4),
  kelly_fraction DECIMAL(5, 4) DEFAULT 0.25,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bets table
CREATE TABLE public.bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  bankroll_id UUID NOT NULL REFERENCES public.bankrolls(id) ON DELETE CASCADE,
  sport TEXT NOT NULL,
  event TEXT NOT NULL,
  bet_type TEXT NOT NULL,
  odds TEXT NOT NULL,
  stake DECIMAL(10, 2) NOT NULL,
  stake_units DECIMAL(8, 4) NOT NULL,
  potential_payout DECIMAL(10, 2) NOT NULL,
  status bet_status DEFAULT 'pending',
  actual_payout DECIMAL(10, 2),
  screenshot_url TEXT,
  extracted_data JSONB,
  notes TEXT,
  sheet_row_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);

-- Bankroll transactions table
CREATE TABLE public.bankroll_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bankroll_id UUID NOT NULL REFERENCES public.bankrolls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'adjustment', 'profit', 'loss', 'transfer_in', 'transfer_out')),
  amount DECIMAL(12, 2) NOT NULL,
  reason TEXT,
  ref_bet_id UUID REFERENCES public.bets(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bankroll goals table
CREATE TABLE public.bankroll_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bankroll_id UUID NOT NULL REFERENCES public.bankrolls(id) ON DELETE CASCADE,
  target_amount DECIMAL(12, 2),
  target_profit DECIMAL(12, 2),
  target_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'met', 'missed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bet histories table
CREATE TABLE public.bet_histories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bet_id UUID NOT NULL REFERENCES public.bets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'settled', 'deleted', 'duplicated')),
  changes JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Screenshots table
CREATE TABLE public.screenshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  processed INTEGER DEFAULT 0,
  extracted_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  status TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'premium', 'enterprise')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL,
  usage_month TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature_type, usage_month)
);

-- Create indexes
CREATE INDEX idx_bets_user_id ON public.bets(user_id);
CREATE INDEX idx_bets_bankroll_id ON public.bets(bankroll_id);
CREATE INDEX idx_bets_status ON public.bets(status);
CREATE INDEX idx_bets_created_at ON public.bets(created_at DESC);
CREATE INDEX idx_bankrolls_user_id ON public.bankrolls(user_id);
CREATE INDEX idx_transactions_bankroll_id ON public.bankroll_transactions(bankroll_id);
CREATE INDEX idx_usage_tracking_user_month ON public.usage_tracking(user_id, usage_month);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bankrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bankroll_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bankroll_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- User profiles: Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Bankrolls: Users can only see and manage their own bankrolls
CREATE POLICY "Users can view own bankrolls" ON public.bankrolls
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bankrolls" ON public.bankrolls
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bankrolls" ON public.bankrolls
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bankrolls" ON public.bankrolls
  FOR DELETE USING (auth.uid() = user_id);

-- Bets: Users can only see and manage their own bets
CREATE POLICY "Users can view own bets" ON public.bets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bets" ON public.bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bets" ON public.bets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bets" ON public.bets
  FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for other tables
CREATE POLICY "Users can view own transactions" ON public.bankroll_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.bankroll_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own goals" ON public.bankroll_goals
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.bankrolls WHERE id = bankroll_id));

CREATE POLICY "Users can manage own goals" ON public.bankroll_goals
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.bankrolls WHERE id = bankroll_id));

-- Create functions for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();