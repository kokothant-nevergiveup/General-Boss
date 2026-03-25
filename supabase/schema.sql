-- ============================================================
-- Supabase Schema for Manus AI Clone
-- Run this in your Supabase SQL Editor to create all tables
-- ============================================================

-- 1. PROFILES table: user credits, settings, plan info
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,                          -- user_id (generated client-side)
  email TEXT DEFAULT '',
  name TEXT DEFAULT 'User',
  plan TEXT DEFAULT 'free',
  credits INTEGER DEFAULT 1000,
  total_credits INTEGER DEFAULT 1000,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CONVERSATIONS table: chat sessions linked to user
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,                          -- conversation_id (generated client-side)
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MESSAGES table: individual messages in conversations
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. USAGE_HISTORY table: credit usage tracking
CREATE TABLE IF NOT EXISTS usage_history (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  detail TEXT NOT NULL,
  change_amount INTEGER NOT NULL,
  type TEXT DEFAULT 'usage' CHECK (type IN ('usage', 'bonus', 'purchase', 'refund')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_usage_history_user ON usage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_history_created ON usage_history(created_at DESC);

-- Enable Row Level Security (RLS) - recommended for production
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE usage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (uncomment when using Supabase Auth)
-- CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid()::text = id);
-- CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid()::text = id);
-- CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (auth.uid()::text = user_id);
-- CREATE POLICY "Users can insert own conversations" ON conversations FOR INSERT WITH CHECK (auth.uid()::text = user_id);
-- CREATE POLICY "Users can delete own conversations" ON conversations FOR DELETE USING (auth.uid()::text = user_id);
