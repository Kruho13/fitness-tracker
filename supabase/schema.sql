-- Enable RLS on all tables
-- Run this in your Supabase SQL editor

-- User profiles table (body stats for TDEE calculation)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')) NOT NULL,
  age INTEGER NOT NULL,
  height_cm INTEGER NOT NULL,
  weight_lbs DECIMAL(5,1) NOT NULL,
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')) DEFAULT 'moderately_active',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mode TEXT CHECK (mode IN ('cut_aggressive', 'cut', 'maintain', 'lean_bulk')) DEFAULT 'maintain',
  calories INTEGER DEFAULT 2200,
  carbs INTEGER DEFAULT 220,
  protein INTEGER DEFAULT 180,
  fats INTEGER DEFAULT 70,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Food logs table
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  raw_text TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0,
  carbs INTEGER NOT NULL DEFAULT 0,
  protein INTEGER NOT NULL DEFAULT 0,
  fats INTEGER NOT NULL DEFAULT 0,
  meal_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved meals table
CREATE TABLE IF NOT EXISTS saved_meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  carbs INTEGER NOT NULL,
  protein INTEGER NOT NULL,
  fats INTEGER NOT NULL,
  use_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Weight logs table
CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  weight_lbs DECIMAL(5,1) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Weekly check-ins table
CREATE TABLE IF NOT EXISTS weekly_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  strength TEXT CHECK (strength IN ('up', 'same', 'down')) NOT NULL,
  gym_consistency TEXT CHECK (gym_consistency IN ('consistent', 'missed_some', 'didnt_go')) NOT NULL,
  sleep TEXT CHECK (sleep IN ('good', 'alright', 'poor')) NOT NULL,
  tracking_quality TEXT CHECK (tracking_quality IN ('tracked_everything', 'missed_some', 'didnt_track')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Weekly reports table
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  report_text TEXT NOT NULL,
  avg_calories INTEGER,
  avg_carbs INTEGER,
  avg_protein INTEGER,
  avg_fats INTEGER,
  weight_start DECIMAL(5,1),
  weight_end DECIMAL(5,1),
  days_logged INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can manage their own profile" ON user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own goals" ON goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own food_logs" ON food_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own saved_meals" ON saved_meals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own weight_logs" ON weight_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own weekly_checkins" ON weekly_checkins FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own weekly_reports" ON weekly_reports FOR ALL USING (auth.uid() = user_id);

-- Seed demo weekly reports for new users (inserted on signup via trigger or API)
-- See /src/lib/seed.ts for the seed data
