-- Social Media Presence and Website Data Schema

-- Social media profiles for businesses
CREATE TABLE social_media_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN (
        'facebook', 'instagram', 'twitter', 'linkedin', 
        'youtube', 'tiktok', 'pinterest', 'snapchat', 
        'reddit', 'yelp', 'tripadvisor', 'glassdoor'
    )),
    profile_url TEXT NOT NULL,
    username TEXT,
    profile_id TEXT, -- Platform-specific ID
    verified BOOLEAN DEFAULT false,
    
    -- Metrics
    followers_count INT,
    following_count INT,
    posts_count INT,
    engagement_rate DECIMAL(5,2), -- Percentage
    avg_likes_per_post INT,
    avg_comments_per_post INT,
    
    -- Profile info
    bio TEXT,
    profile_image_url TEXT,
    cover_image_url TEXT,
    
    -- Activity
    last_post_date TIMESTAMPTZ,
    posting_frequency TEXT, -- 'daily', 'weekly', 'monthly', 'rarely'
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    last_scraped_at TIMESTAMPTZ,
    scrape_status TEXT CHECK (scrape_status IN ('pending', 'success', 'failed', 'rate_limited')),
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(business_id, platform)
);

-- Website scraped data
CREATE TABLE website_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    website_url TEXT NOT NULL,
    
    -- Basic info
    title TEXT,
    meta_description TEXT,
    meta_keywords TEXT[],
    
    -- Content extracted
    about_text TEXT,
    services TEXT[],
    products TEXT[],
    team_members JSONB, -- Array of {name, role, image, bio}
    testimonials JSONB, -- Array of {author, text, rating}
    
    -- Technical info
    technologies TEXT[], -- Detected technologies/frameworks
    has_ssl BOOLEAN,
    mobile_friendly BOOLEAN,
    page_speed_score INT, -- 0-100
    accessibility_score INT, -- 0-100
    
    -- SEO metrics
    seo_score INT, -- 0-100
    has_sitemap BOOLEAN,
    has_robots_txt BOOLEAN,
    structured_data JSONB, -- Schema.org data
    
    -- Contact info found
    emails TEXT[],
    phone_numbers TEXT[],
    addresses JSONB[],
    business_hours JSONB,
    
    -- Social links found on website
    social_links JSONB, -- {platform: url}
    
    -- E-commerce
    has_online_store BOOLEAN DEFAULT false,
    payment_methods TEXT[],
    shipping_info TEXT,
    return_policy TEXT,
    
    -- Legal
    privacy_policy_url TEXT,
    terms_url TEXT,
    
    -- Scraping metadata
    last_scraped_at TIMESTAMPTZ DEFAULT NOW(),
    scrape_status TEXT CHECK (scrape_status IN ('pending', 'success', 'partial', 'failed')),
    pages_scraped INT DEFAULT 1,
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(business_id)
);

-- Social media posts/content
CREATE TABLE social_media_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES social_media_profiles(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    
    platform TEXT NOT NULL,
    post_id TEXT, -- Platform-specific post ID
    post_url TEXT,
    
    -- Content
    content TEXT,
    media_type TEXT CHECK (media_type IN ('text', 'image', 'video', 'link', 'album')),
    media_urls TEXT[],
    hashtags TEXT[],
    mentions TEXT[],
    
    -- Engagement
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    views_count INT,
    engagement_rate DECIMAL(5,2),
    
    -- Metadata
    posted_at TIMESTAMPTZ,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(platform, post_id)
);

-- Social media metrics history
CREATE TABLE social_metrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES social_media_profiles(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    
    metric_date DATE NOT NULL,
    followers_count INT,
    following_count INT,
    posts_count INT,
    engagement_rate DECIMAL(5,2),
    
    -- Growth metrics
    followers_growth INT, -- Daily change
    engagement_growth DECIMAL(5,2), -- Percentage change
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(profile_id, metric_date)
);

-- Website monitoring/changes
CREATE TABLE website_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    
    check_date TIMESTAMPTZ NOT NULL,
    is_online BOOLEAN,
    response_time_ms INT,
    status_code INT,
    
    -- Content changes detected
    content_changed BOOLEAN DEFAULT false,
    changes_detected JSONB, -- Details of what changed
    
    -- SEO changes
    title_changed BOOLEAN DEFAULT false,
    description_changed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated social media presence score
CREATE TABLE social_presence_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Overall scores (0-100)
    overall_score INT,
    reach_score INT, -- Based on followers across platforms
    engagement_score INT, -- Based on interactions
    activity_score INT, -- Based on posting frequency
    growth_score INT, -- Based on follower growth
    
    -- Platform breakdown
    platform_scores JSONB, -- {platform: score}
    active_platforms TEXT[],
    primary_platform TEXT,
    
    -- Insights
    strengths TEXT[],
    weaknesses TEXT[],
    recommendations TEXT[],
    
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(business_id)
);

-- Create indexes
CREATE INDEX idx_social_profiles_business_id ON social_media_profiles(business_id);
CREATE INDEX idx_social_profiles_platform ON social_media_profiles(platform);
CREATE INDEX idx_social_profiles_followers ON social_media_profiles(followers_count DESC);
CREATE INDEX idx_website_data_business_id ON website_data(business_id);
CREATE INDEX idx_social_posts_business_id ON social_media_posts(business_id);
CREATE INDEX idx_social_posts_posted_at ON social_media_posts(posted_at DESC);
CREATE INDEX idx_social_metrics_business_id ON social_metrics_history(business_id);
CREATE INDEX idx_social_metrics_date ON social_metrics_history(metric_date DESC);
CREATE INDEX idx_website_monitoring_business_id ON website_monitoring(business_id);
CREATE INDEX idx_social_scores_business_id ON social_presence_scores(business_id);
CREATE INDEX idx_social_scores_overall ON social_presence_scores(overall_score DESC);

-- Enable RLS
ALTER TABLE social_media_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_presence_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public read access for social media profiles
CREATE POLICY "Anyone can view social profiles" ON social_media_profiles
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage social profiles" ON social_media_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
    );

-- Public read access for website data
CREATE POLICY "Anyone can view website data" ON website_data
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage website data" ON website_data
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
    );

-- Public read for social posts
CREATE POLICY "Anyone can view social posts" ON social_media_posts
    FOR SELECT USING (true);

-- Public read for metrics
CREATE POLICY "Anyone can view social metrics" ON social_metrics_history
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view social scores" ON social_presence_scores
    FOR SELECT USING (true);

-- Functions

-- Calculate social presence score
CREATE OR REPLACE FUNCTION calculate_social_presence_score(target_business_id UUID)
RETURNS TABLE (
    overall_score INT,
    reach_score INT,
    engagement_score INT,
    activity_score INT,
    growth_score INT
) AS $$
DECLARE
    total_followers INT;
    avg_engagement DECIMAL;
    platform_count INT;
    posting_freq_score INT;
    growth_rate DECIMAL;
BEGIN
    -- Get total followers across all platforms
    SELECT COALESCE(SUM(followers_count), 0) INTO total_followers
    FROM social_media_profiles
    WHERE business_id = target_business_id;
    
    -- Get average engagement rate
    SELECT COALESCE(AVG(engagement_rate), 0) INTO avg_engagement
    FROM social_media_profiles
    WHERE business_id = target_business_id
    AND engagement_rate IS NOT NULL;
    
    -- Count active platforms
    SELECT COUNT(*) INTO platform_count
    FROM social_media_profiles
    WHERE business_id = target_business_id
    AND is_active = true;
    
    -- Calculate reach score (based on followers)
    reach_score := LEAST(100, 
        CASE 
            WHEN total_followers >= 100000 THEN 100
            WHEN total_followers >= 50000 THEN 90
            WHEN total_followers >= 10000 THEN 80
            WHEN total_followers >= 5000 THEN 70
            WHEN total_followers >= 1000 THEN 60
            WHEN total_followers >= 500 THEN 50
            WHEN total_followers >= 100 THEN 40
            WHEN total_followers >= 50 THEN 30
            WHEN total_followers > 0 THEN 20
            ELSE 0
        END
    );
    
    -- Calculate engagement score
    engagement_score := LEAST(100, GREATEST(0, avg_engagement * 10));
    
    -- Calculate activity score
    SELECT AVG(
        CASE posting_frequency
            WHEN 'daily' THEN 100
            WHEN 'weekly' THEN 75
            WHEN 'monthly' THEN 50
            WHEN 'rarely' THEN 25
            ELSE 0
        END
    ) INTO posting_freq_score
    FROM social_media_profiles
    WHERE business_id = target_business_id;
    
    activity_score := COALESCE(posting_freq_score, 0)::INT;
    
    -- Calculate growth score (simplified)
    growth_score := CASE
        WHEN platform_count >= 5 THEN 80
        WHEN platform_count >= 3 THEN 60
        WHEN platform_count >= 2 THEN 40
        WHEN platform_count >= 1 THEN 20
        ELSE 0
    END;
    
    -- Calculate overall score (weighted average)
    overall_score := (
        reach_score * 0.3 +
        engagement_score * 0.3 +
        activity_score * 0.25 +
        growth_score * 0.15
    )::INT;
    
    RETURN QUERY SELECT 
        overall_score,
        reach_score,
        engagement_score,
        activity_score,
        growth_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extract social links from website
CREATE OR REPLACE FUNCTION extract_social_links(website_content TEXT)
RETURNS JSONB AS $$
DECLARE
    social_links JSONB := '{}'::jsonb;
    platforms TEXT[] := ARRAY[
        'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
        'linkedin.com', 'youtube.com', 'tiktok.com', 'pinterest.com'
    ];
    platform TEXT;
    pattern TEXT;
    match TEXT;
BEGIN
    FOREACH platform IN ARRAY platforms
    LOOP
        pattern := 'https?://(?:www\.)?' || regexp_replace(platform, '\.', '\.', 'g') || '/[^"\s<>]+';
        match := regexp_match(website_content, pattern, 'i');
        
        IF match IS NOT NULL THEN
            social_links := social_links || jsonb_build_object(
                split_part(platform, '.', 1),
                match[1]
            );
        END IF;
    END LOOP;
    
    RETURN social_links;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update social metrics
CREATE OR REPLACE FUNCTION update_social_metrics()
RETURNS void AS $$
BEGIN
    -- Insert today's metrics for all active profiles
    INSERT INTO social_metrics_history (
        profile_id,
        business_id,
        metric_date,
        followers_count,
        following_count,
        posts_count,
        engagement_rate,
        followers_growth
    )
    SELECT 
        sp.id,
        sp.business_id,
        CURRENT_DATE,
        sp.followers_count,
        sp.following_count,
        sp.posts_count,
        sp.engagement_rate,
        sp.followers_count - COALESCE(
            (SELECT followers_count 
             FROM social_metrics_history smh 
             WHERE smh.profile_id = sp.id 
             AND smh.metric_date = CURRENT_DATE - 1),
            sp.followers_count
        ) as followers_growth
    FROM social_media_profiles sp
    WHERE sp.is_active = true
    ON CONFLICT (profile_id, metric_date) DO UPDATE
    SET 
        followers_count = EXCLUDED.followers_count,
        following_count = EXCLUDED.following_count,
        posts_count = EXCLUDED.posts_count,
        engagement_rate = EXCLUDED.engagement_rate,
        followers_growth = EXCLUDED.followers_growth;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;