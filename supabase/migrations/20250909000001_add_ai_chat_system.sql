-- AI Chat System Tables
-- Comprehensive chat system with citations, feedback, and analytics

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  context JSONB DEFAULT '{}', -- Store page context, user preferences, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  model_used TEXT,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  tool_calls JSONB DEFAULT '[]', -- Store tool calls made during message generation
  citations JSONB DEFAULT '[]', -- Store inline citations
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Citations table for detailed reference storage
CREATE TABLE IF NOT EXISTS chat_citations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  source_type TEXT CHECK (source_type IN ('web', 'platform', 'document', 'analysis')),
  title TEXT NOT NULL,
  url TEXT,
  snippet TEXT,
  author TEXT,
  published_date DATE,
  confidence_score DECIMAL(3,2),
  relevance_score DECIMAL(3,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User feedback table
CREATE TABLE IF NOT EXISTS chat_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type TEXT CHECK (feedback_type IN ('helpful', 'not_helpful', 'incorrect', 'incomplete')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved prompts/templates
CREATE TABLE IF NOT EXISTS chat_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  usage_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat analytics table
CREATE TABLE IF NOT EXISTS chat_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  total_messages INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  tools_used TEXT[],
  topics_discussed TEXT[],
  user_satisfaction_score DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_citations_message_id ON chat_citations(message_id);
CREATE INDEX idx_chat_feedback_message_id ON chat_feedback(message_id);
CREATE INDEX idx_chat_prompts_user_id ON chat_prompts(user_id);
CREATE INDEX idx_chat_prompts_category ON chat_prompts(category);

-- Full text search
CREATE INDEX idx_chat_messages_content_search ON chat_messages USING GIN(to_tsvector('english', content));
CREATE INDEX idx_chat_citations_search ON chat_citations USING GIN(to_tsvector('english', title || ' ' || COALESCE(snippet, '')));

-- RLS Policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only see their own chat sessions
CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL); -- Allow anonymous sessions

CREATE POLICY "Users can create chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Messages policies
CREATE POLICY "Users can view messages from their sessions"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions 
      WHERE chat_sessions.id = chat_messages.session_id 
      AND (chat_sessions.user_id = auth.uid() OR chat_sessions.user_id IS NULL)
    )
  );

CREATE POLICY "Users can create messages in their sessions"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions 
      WHERE chat_sessions.id = chat_messages.session_id 
      AND (chat_sessions.user_id = auth.uid() OR chat_sessions.user_id IS NULL)
    )
  );

-- Citations policies
CREATE POLICY "Users can view citations from their messages"
  ON chat_citations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages 
      JOIN chat_sessions ON chat_sessions.id = chat_messages.session_id
      WHERE chat_messages.id = chat_citations.message_id 
      AND (chat_sessions.user_id = auth.uid() OR chat_sessions.user_id IS NULL)
    )
  );

-- Feedback policies
CREATE POLICY "Users can view own feedback"
  ON chat_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create feedback"
  ON chat_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Prompts policies
CREATE POLICY "Users can view own and public prompts"
  ON chat_prompts FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create prompts"
  ON chat_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
  ON chat_prompts FOR UPDATE
  USING (auth.uid() = user_id);

-- Analytics policies
CREATE POLICY "Users can view analytics for their sessions"
  ON chat_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions 
      WHERE chat_sessions.id = chat_analytics.session_id 
      AND (chat_sessions.user_id = auth.uid() OR chat_sessions.user_id IS NULL)
    )
  );

-- Helper functions
CREATE OR REPLACE FUNCTION update_chat_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_timestamp();

CREATE TRIGGER update_chat_prompts_updated_at
  BEFORE UPDATE ON chat_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_timestamp();

-- Function to get or create a chat session
CREATE OR REPLACE FUNCTION get_or_create_chat_session(
  p_user_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT 'New Chat',
  p_context JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Try to find an active session
  SELECT id INTO v_session_id
  FROM chat_sessions
  WHERE (user_id = p_user_id OR (p_user_id IS NULL AND user_id IS NULL))
    AND is_active = true
    AND created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no active session, create a new one
  IF v_session_id IS NULL THEN
    INSERT INTO chat_sessions (user_id, title, context)
    VALUES (p_user_id, p_title, p_context)
    RETURNING id INTO v_session_id;
  END IF;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate session analytics
CREATE OR REPLACE FUNCTION calculate_session_analytics(p_session_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO chat_analytics (
    session_id,
    total_messages,
    total_tokens,
    avg_response_time_ms,
    tools_used
  )
  SELECT 
    p_session_id,
    COUNT(*),
    SUM(COALESCE(tokens_used, 0)),
    AVG(COALESCE(response_time_ms, 0))::INTEGER,
    ARRAY_AGG(DISTINCT tool_call->>'name')
  FROM chat_messages
  LEFT JOIN LATERAL jsonb_array_elements(tool_calls) AS tool_call ON true
  WHERE session_id = p_session_id
  ON CONFLICT (session_id) DO UPDATE SET
    total_messages = EXCLUDED.total_messages,
    total_tokens = EXCLUDED.total_tokens,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms,
    tools_used = EXCLUDED.tools_used,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;