-- Add INSERT policy for organizations table
-- This allows users to create their own organization during signup/stream creation

CREATE POLICY "Users can create organizations" ON organizations
    FOR INSERT WITH CHECK (true);

-- Note: This is permissive because we want users to be able to create
-- their first organization. The profile will be updated with org_id
-- to establish the relationship.
