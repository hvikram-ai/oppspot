-- Business Updates/News Feed Schema

-- Updates table for business news and announcements
CREATE TABLE business_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT NOT NULL CHECK (type IN (
        'announcement', 
        'product_launch', 
        'partnership', 
        'funding', 
        'award', 
        'event', 
        'milestone',
        'hiring',
        'expansion',
        'press_release',
        'general'
    )),
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Media attachments
    image_url TEXT,
    link_url TEXT,
    link_title TEXT,
    
    -- Engagement metrics
    views_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    
    -- Metadata
    source TEXT, -- 'manual', 'linkedin', 'twitter', 'website', 'api'
    source_url TEXT,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- For time-sensitive updates
    is_featured BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    
    -- User tracking
    created_by UUID REFERENCES profiles(id),
    verified_by UUID REFERENCES profiles(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User interactions with updates
CREATE TABLE update_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    update_id UUID REFERENCES business_updates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'like', 'share', 'save')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(update_id, user_id, interaction_type)
);

-- Business followers/subscriptions
CREATE TABLE business_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    notification_preference TEXT DEFAULT 'all' CHECK (notification_preference IN ('all', 'important', 'none')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, user_id)
);

-- Comments on updates
CREATE TABLE update_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    update_id UUID REFERENCES business_updates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES update_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_business_updates_business_id ON business_updates(business_id);
CREATE INDEX idx_business_updates_published_at ON business_updates(published_at DESC);
CREATE INDEX idx_business_updates_type ON business_updates(type);
CREATE INDEX idx_business_updates_is_featured ON business_updates(is_featured);
CREATE INDEX idx_update_interactions_user_id ON update_interactions(user_id);
CREATE INDEX idx_update_interactions_update_id ON update_interactions(update_id);
CREATE INDEX idx_business_followers_user_id ON business_followers(user_id);
CREATE INDEX idx_business_followers_business_id ON business_followers(business_id);
CREATE INDEX idx_update_comments_update_id ON update_comments(update_id);

-- Enable RLS
ALTER TABLE business_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Business updates policies
CREATE POLICY "Anyone can view published updates" ON business_updates
    FOR SELECT USING (published_at <= NOW() AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Business owners can create updates" ON business_updates
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM businesses b
            JOIN profiles p ON p.id = auth.uid()
            WHERE b.id = business_id
            AND (p.role IN ('admin', 'owner') OR b.metadata->>'claimed_by' = auth.uid()::text)
        )
    );

CREATE POLICY "Update creators can edit their updates" ON business_updates
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Update creators can delete their updates" ON business_updates
    FOR DELETE USING (created_by = auth.uid());

-- Interaction policies
CREATE POLICY "Users can view their own interactions" ON update_interactions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create interactions" ON update_interactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own interactions" ON update_interactions
    FOR DELETE USING (user_id = auth.uid());

-- Follower policies
CREATE POLICY "Users can view their follows" ON business_followers
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Public can see follower counts" ON business_followers
    FOR SELECT USING (true);

CREATE POLICY "Users can follow businesses" ON business_followers
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unfollow businesses" ON business_followers
    FOR DELETE USING (user_id = auth.uid());

-- Comment policies
CREATE POLICY "Anyone can view comments" ON update_comments
    FOR SELECT USING (is_deleted = false);

CREATE POLICY "Authenticated users can create comments" ON update_comments
    FOR INSERT WITH CHECK (user_id = auth.uid() AND is_deleted = false);

CREATE POLICY "Users can edit their own comments" ON update_comments
    FOR UPDATE USING (user_id = auth.uid());

-- Functions

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_update_view(update_id UUID, viewer_id UUID)
RETURNS void AS $$
BEGIN
    -- Record the view interaction
    INSERT INTO update_interactions (update_id, user_id, interaction_type)
    VALUES (update_id, viewer_id, 'view')
    ON CONFLICT (update_id, user_id, interaction_type) DO NOTHING;
    
    -- Increment the view count
    UPDATE business_updates
    SET views_count = views_count + 1
    WHERE id = update_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle like
CREATE OR REPLACE FUNCTION toggle_update_like(update_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_liked BOOLEAN;
BEGIN
    -- Check if already liked
    SELECT EXISTS(
        SELECT 1 FROM update_interactions
        WHERE update_id = $1 AND user_id = $2 AND interaction_type = 'like'
    ) INTO is_liked;
    
    IF is_liked THEN
        -- Unlike
        DELETE FROM update_interactions
        WHERE update_id = $1 AND user_id = $2 AND interaction_type = 'like';
        
        UPDATE business_updates
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = $1;
        
        RETURN false;
    ELSE
        -- Like
        INSERT INTO update_interactions (update_id, user_id, interaction_type)
        VALUES ($1, $2, 'like');
        
        UPDATE business_updates
        SET likes_count = likes_count + 1
        WHERE id = $1;
        
        RETURN true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get personalized feed for a user
CREATE OR REPLACE FUNCTION get_user_feed(
    user_id UUID,
    limit_count INT DEFAULT 20,
    offset_count INT DEFAULT 0
)
RETURNS TABLE (
    update_id UUID,
    business_id UUID,
    business_name TEXT,
    title TEXT,
    content TEXT,
    type TEXT,
    image_url TEXT,
    link_url TEXT,
    published_at TIMESTAMPTZ,
    is_featured BOOLEAN,
    views_count INT,
    likes_count INT,
    is_following BOOLEAN,
    has_liked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bu.id as update_id,
        bu.business_id,
        b.name as business_name,
        bu.title,
        bu.content,
        bu.type,
        bu.image_url,
        bu.link_url,
        bu.published_at,
        bu.is_featured,
        bu.views_count,
        bu.likes_count,
        EXISTS(
            SELECT 1 FROM business_followers bf
            WHERE bf.business_id = bu.business_id 
            AND bf.user_id = $1
        ) as is_following,
        EXISTS(
            SELECT 1 FROM update_interactions ui
            WHERE ui.update_id = bu.id 
            AND ui.user_id = $1
            AND ui.interaction_type = 'like'
        ) as has_liked
    FROM business_updates bu
    JOIN businesses b ON b.id = bu.business_id
    WHERE bu.published_at <= NOW() 
    AND (bu.expires_at IS NULL OR bu.expires_at > NOW())
    ORDER BY 
        bu.is_featured DESC,
        bu.published_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get updates for followed businesses
CREATE OR REPLACE FUNCTION get_following_feed(
    user_id UUID,
    limit_count INT DEFAULT 20,
    offset_count INT DEFAULT 0
)
RETURNS TABLE (
    update_id UUID,
    business_id UUID,
    business_name TEXT,
    title TEXT,
    content TEXT,
    type TEXT,
    image_url TEXT,
    link_url TEXT,
    published_at TIMESTAMPTZ,
    is_featured BOOLEAN,
    views_count INT,
    likes_count INT,
    has_liked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bu.id as update_id,
        bu.business_id,
        b.name as business_name,
        bu.title,
        bu.content,
        bu.type,
        bu.image_url,
        bu.link_url,
        bu.published_at,
        bu.is_featured,
        bu.views_count,
        bu.likes_count,
        EXISTS(
            SELECT 1 FROM update_interactions ui
            WHERE ui.update_id = bu.id 
            AND ui.user_id = $1
            AND ui.interaction_type = 'like'
        ) as has_liked
    FROM business_updates bu
    JOIN businesses b ON b.id = bu.business_id
    JOIN business_followers bf ON bf.business_id = bu.business_id
    WHERE bf.user_id = $1
    AND bu.published_at <= NOW() 
    AND (bu.expires_at IS NULL OR bu.expires_at > NOW())
    ORDER BY bu.published_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;