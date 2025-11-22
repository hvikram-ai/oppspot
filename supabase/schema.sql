-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    subscription_tier TEXT DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'member',
    preferences JSONB DEFAULT '{}',
    streak_count INT DEFAULT 0,
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Businesses table
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_place_id TEXT UNIQUE,
    name TEXT NOT NULL,
    slug TEXT,
    description TEXT,
    address JSONB,
    location GEOGRAPHY(POINT),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone_numbers JSONB DEFAULT '[]',
    emails JSONB DEFAULT '[]',
    website TEXT,
    social_links JSONB DEFAULT '{}',
    categories TEXT[] DEFAULT '{}',
    ai_insights JSONB DEFAULT '{}',
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Searches table
CREATE TABLE searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    results_count INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lists table
CREATE TABLE lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    business_ids UUID[] DEFAULT '{}',
    collaborators UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exports table
CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    export_type TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    record_count INT,
    file_url TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_businesses_location ON businesses USING GIST(location);
CREATE INDEX idx_businesses_categories ON businesses USING GIN(categories);
CREATE INDEX idx_businesses_name ON businesses USING GIN(to_tsvector('english', name));
CREATE INDEX idx_businesses_google_place_id ON businesses(google_place_id);
CREATE INDEX idx_searches_user_id ON searches(user_id);
CREATE INDEX idx_lists_org_id ON lists(org_id);
CREATE INDEX idx_lists_created_by ON lists(created_by);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Organizations policies
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view organization members" ON profiles
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Businesses policies (public read for now)
CREATE POLICY "Anyone can view businesses" ON businesses
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create businesses" ON businesses
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update businesses" ON businesses
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Searches policies
CREATE POLICY "Users can view own searches" ON searches
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own searches" ON searches
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Lists policies
CREATE POLICY "Users can view their organization's lists" ON lists
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
        ) OR is_public = true
    );

CREATE POLICY "Users can create lists for their organization" ON lists
    FOR INSERT WITH CHECK (
        org_id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own lists" ON lists
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own lists" ON lists
    FOR DELETE USING (created_by = auth.uid());

-- Exports policies
CREATE POLICY "Users can view own exports" ON exports
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own exports" ON exports
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Functions

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

-- OpenCorporates rate limit state (persisted for quota tracking)
CREATE TABLE IF NOT EXISTS opencorporates_rate_limits (
    id TEXT PRIMARY KEY,
    daily_requests INT DEFAULT 0,
    monthly_requests INT DEFAULT 0,
    day_reset_date TIMESTAMPTZ,
    month_reset_date TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lists_updated_at BEFORE UPDATE ON lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ language plpgsql security definer;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to search businesses by location
CREATE OR REPLACE FUNCTION search_businesses_by_location(
    lat DECIMAL,
    lng DECIMAL,
    radius_km INT DEFAULT 10
)
RETURNS SETOF businesses AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM businesses
    WHERE ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
        radius_km * 1000
    )
    ORDER BY ST_Distance(
        location::geography,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    );
END;
$$ language plpgsql;
