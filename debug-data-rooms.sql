-- Debug Script: Why aren't data rooms showing up?
-- Run this in Supabase SQL Editor while logged in as demo user

-- Step 1: Check current user
SELECT
  auth.uid() as current_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as current_user_email;

-- Step 2: Check all data rooms in database (bypass RLS)
SELECT
  id,
  name,
  user_id,
  status,
  created_at,
  (SELECT email FROM auth.users WHERE id = user_id) as owner_email
FROM data_rooms
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Check what RLS policy allows (respects RLS)
SELECT
  id,
  name,
  user_id,
  status,
  created_at
FROM data_rooms
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Check data_room_access records
SELECT
  dra.data_room_id,
  dra.user_id,
  dra.permission_level,
  dra.revoked_at,
  dra.expires_at,
  dr.name as room_name
FROM data_room_access dra
LEFT JOIN data_rooms dr ON dr.id = dra.data_room_id
ORDER BY dra.created_at DESC
LIMIT 10;

-- Step 5: Check RLS policies currently active
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'data_rooms'
ORDER BY policyname;

-- Step 6: Test the exact query the API uses
SELECT
  dr.*,
  p.name as owner_name,
  p.email as owner_email
FROM data_rooms dr
LEFT JOIN profiles p ON p.id = dr.user_id
WHERE dr.status = 'active'
ORDER BY dr.created_at DESC;
