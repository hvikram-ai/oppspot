-- Add explicit RLS INSERT policies for signup flow and harden org creation function

-- Organizations: allow authenticated users to create an organization (used if not using admin client)
DROP POLICY IF EXISTS "Users can create organization on signup" ON organizations;
CREATE POLICY "Users can create organization on signup"
ON organizations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Profiles: allow users to insert their own profile row
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
CREATE POLICY "Users can create own profile"
ON profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- Fix create_organization_for_user to avoid identifier ambiguity and ensure profile update
CREATE OR REPLACE FUNCTION create_organization_for_user(
    user_id UUID,
    company_name TEXT,
    company_industry TEXT DEFAULT NULL,
    company_size TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
    v_org_slug TEXT;
BEGIN
    -- Generate unique slug
    v_org_slug := lower(regexp_replace(company_name, '[^a-z0-9]+', '-', 'g'));
    v_org_slug := v_org_slug || '-' || substr(md5(random()::text), 1, 6);

    -- Create organization
    INSERT INTO organizations (name, slug, industry, company_size)
    VALUES (company_name, v_org_slug, company_industry, company_size)
    RETURNING id INTO v_org_id;

    -- Update user profile with new org id
    UPDATE profiles
    SET org_id = v_org_id,
        updated_at = NOW()
    WHERE id = user_id;

    -- Log event
    INSERT INTO events (user_id, org_id, event_type, metadata)
    VALUES (
        user_id,
        v_org_id,
        'organization_created',
        jsonb_build_object(
            'company_name', company_name,
            'industry', company_industry,
            'company_size', company_size
        )
    );

    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow authenticated users to execute helper function if needed (optional)
GRANT EXECUTE ON FUNCTION create_organization_for_user(UUID, TEXT, TEXT, TEXT) TO authenticated;

