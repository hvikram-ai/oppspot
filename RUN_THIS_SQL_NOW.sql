-- IMMEDIATE FIX FOR SIGNUP ERROR
-- Run this in Supabase SQL Editor RIGHT NOW

-- Check if org_id column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name = 'org_id';

-- If the above returns NO ROWS, then run this:
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;