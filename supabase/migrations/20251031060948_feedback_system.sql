-- Feedback System Database Schema for oppSpot
-- Comprehensive bug reporting and feature request system with voting, comments, and admin management

-- Create enum types for feedback
CREATE TYPE feedback_category AS ENUM (
  'bug',
  'feature',
  'improvement',
  'data_quality',
  'integration',
  'performance',
  'documentation',
  'other'
);

CREATE TYPE feedback_status AS ENUM (
  'pending',
  'in_review',
  'in_progress',
  'resolved',
  'declined',
  'duplicate'
);

CREATE TYPE feedback_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- Main feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category feedback_category DEFAULT 'other',
    status feedback_status DEFAULT 'pending',
    priority feedback_priority DEFAULT 'medium',
    votes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    admin_response TEXT,
    admin_response_by UUID REFERENCES auth.users(id),
    admin_response_at TIMESTAMP WITH TIME ZONE,
    is_public BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    tags TEXT[],
    affected_feature VARCHAR(100),
    page_url TEXT,
    browser_info JSONB,
    attachment_urls TEXT[],
    screenshot_url TEXT,
    view_count INTEGER DEFAULT 0
);

-- Feedback votes table
CREATE TABLE IF NOT EXISTS feedback_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(feedback_id, user_id)
);

-- Feedback comments table
CREATE TABLE IF NOT EXISTS feedback_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES feedback_comments(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    likes_count INTEGER DEFAULT 0
);

-- Feedback followers table (for notifications)
CREATE TABLE IF NOT EXISTS feedback_followers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(feedback_id, user_id)
);

-- Feedback activity log
CREATE TABLE IF NOT EXISTS feedback_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'status_changed', 'commented', 'voted'
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback submissions tracking (for email notifications)
CREATE TABLE IF NOT EXISTS feedback_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
    reference_id VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    admin_email_sent BOOLEAN DEFAULT FALSE,
    user_email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_category ON feedback(category);
CREATE INDEX idx_feedback_votes_count ON feedback(votes_count DESC);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_is_public ON feedback(is_public);
CREATE INDEX idx_feedback_is_pinned ON feedback(is_pinned);
CREATE INDEX idx_feedback_affected_feature ON feedback(affected_feature);
CREATE INDEX idx_feedback_votes_feedback_id ON feedback_votes(feedback_id);
CREATE INDEX idx_feedback_votes_user_id ON feedback_votes(user_id);
CREATE INDEX idx_feedback_comments_feedback_id ON feedback_comments(feedback_id);
CREATE INDEX idx_feedback_comments_user_id ON feedback_comments(user_id);
CREATE INDEX idx_feedback_followers_feedback_id ON feedback_followers(feedback_id);
CREATE INDEX idx_feedback_followers_user_id ON feedback_followers(user_id);
CREATE INDEX idx_feedback_activity_feedback_id ON feedback_activity(feedback_id);
CREATE INDEX idx_feedback_gin_tags ON feedback USING gin(tags);
CREATE INDEX idx_feedback_submissions_reference_id ON feedback_submissions(reference_id);

-- Create views for easier querying
CREATE OR REPLACE VIEW feedback_with_user AS
SELECT
    f.*,
    u.email as user_email,
    admin_u.email as admin_response_by_email
FROM feedback f
LEFT JOIN auth.users u ON f.user_id = u.id
LEFT JOIN auth.users admin_u ON f.admin_response_by = admin_u.id;

-- Function to update votes_count when vote is added/removed
CREATE OR REPLACE FUNCTION update_feedback_votes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE feedback
        SET votes_count = votes_count + 1
        WHERE id = NEW.feedback_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE feedback
        SET votes_count = GREATEST(0, votes_count - 1)
        WHERE id = OLD.feedback_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update votes count
CREATE TRIGGER feedback_votes_count_trigger
AFTER INSERT OR DELETE ON feedback_votes
FOR EACH ROW
EXECUTE FUNCTION update_feedback_votes_count();

-- Function to update comments_count
CREATE OR REPLACE FUNCTION update_feedback_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE feedback
        SET comments_count = comments_count + 1
        WHERE id = NEW.feedback_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE feedback
        SET comments_count = GREATEST(0, comments_count - 1)
        WHERE id = OLD.feedback_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update comments count
CREATE TRIGGER feedback_comments_count_trigger
AFTER INSERT OR DELETE ON feedback_comments
FOR EACH ROW
EXECUTE FUNCTION update_feedback_comments_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_feedback_updated_at_trigger
BEFORE UPDATE ON feedback
FOR EACH ROW
EXECUTE FUNCTION update_feedback_updated_at();

-- RLS Policies
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Feedback policies
CREATE POLICY "Public feedback viewable by all authenticated users"
    ON feedback FOR SELECT
    USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can create feedback"
    ON feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
    ON feedback FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback"
    ON feedback FOR DELETE
    USING (auth.uid() = user_id);

-- Votes policies
CREATE POLICY "Votes viewable by all authenticated users"
    ON feedback_votes FOR SELECT
    USING (true);

CREATE POLICY "Users can manage their own votes"
    ON feedback_votes FOR ALL
    USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments viewable by all authenticated users"
    ON feedback_comments FOR SELECT
    USING (true);

CREATE POLICY "Users can create comments"
    ON feedback_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
    ON feedback_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
    ON feedback_comments FOR DELETE
    USING (auth.uid() = user_id);

-- Followers policies
CREATE POLICY "Users can view their own follows"
    ON feedback_followers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own follows"
    ON feedback_followers FOR ALL
    USING (auth.uid() = user_id);

-- Activity log policies (read-only for users)
CREATE POLICY "Activity log viewable by all authenticated users"
    ON feedback_activity FOR SELECT
    USING (true);

-- Submissions policies
CREATE POLICY "Users can view their own submissions"
    ON feedback_submissions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create submissions"
    ON feedback_submissions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON feedback TO authenticated;
GRANT ALL ON feedback_votes TO authenticated;
GRANT ALL ON feedback_comments TO authenticated;
GRANT ALL ON feedback_followers TO authenticated;
GRANT SELECT ON feedback_activity TO authenticated;
GRANT ALL ON feedback_submissions TO authenticated;
GRANT SELECT ON feedback_with_user TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE feedback IS 'Main feedback table storing bug reports, feature requests, and improvements for oppSpot';
COMMENT ON COLUMN feedback.affected_feature IS 'Auto-detected from page URL (e.g., ResearchGPT, Data Room, Search)';
COMMENT ON COLUMN feedback.is_public IS 'User choice: true for community board visibility, false for private admin-only';
COMMENT ON COLUMN feedback.page_url IS 'URL where feedback was submitted from';
COMMENT ON TABLE feedback_votes IS 'Community voting system for feedback prioritization';
COMMENT ON TABLE feedback_comments IS 'Comment threads on feedback items';
COMMENT ON TABLE feedback_followers IS 'Users following feedback for notifications';
COMMENT ON TABLE feedback_activity IS 'Audit trail of all feedback changes';
COMMENT ON TABLE feedback_submissions IS 'Email notification tracking for feedback';
