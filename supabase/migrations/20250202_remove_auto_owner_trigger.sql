-- Remove the auto_add_stream_owner trigger that causes infinite recursion
-- The application code now handles adding the owner member using admin client

-- Drop the trigger
DROP TRIGGER IF EXISTS trigger_auto_add_stream_owner ON streams;

-- Drop the function
DROP FUNCTION IF EXISTS auto_add_stream_owner();

-- Note: The application code in StreamService.createStream now manually
-- adds the stream owner using the admin client, which bypasses RLS entirely
