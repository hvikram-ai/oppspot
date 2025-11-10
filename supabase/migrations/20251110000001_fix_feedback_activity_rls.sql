-- Fix Feedback Activity RLS Policies
--
-- Issue: feedback_activity table was missing INSERT policy, causing feedback submission to fail
-- The API tries to log activity when feedback is created, but RLS blocked the INSERT operation
--
-- This migration adds the missing INSERT policy and updates GRANT permissions

-- Add INSERT policy for feedback_activity
-- Allow authenticated users to insert activity logs for feedback they interact with
CREATE POLICY "Authenticated users can create activity logs"
    ON feedback_activity FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Update GRANT to allow INSERT operations
GRANT INSERT ON feedback_activity TO authenticated;

-- Add comment for documentation
COMMENT ON POLICY "Authenticated users can create activity logs" ON feedback_activity
IS 'Allows authenticated users to create activity log entries when they interact with feedback';
