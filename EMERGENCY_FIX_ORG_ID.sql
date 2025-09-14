-- EMERGENCY FIX: Add org_id column to profiles table
-- Run this IMMEDIATELY in Supabase SQL Editor

-- Step 1: Add the org_id column (this is the critical missing piece)
ALTER TABLE profiles 
ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Step 2: Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'org_id';

-- If you see a result above, the column is added successfully!