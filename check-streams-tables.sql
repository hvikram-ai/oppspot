SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('streams', 'stream_members', 'stream_items', 'stream_activities', 'stream_comments', 'stream_notifications')
ORDER BY table_name;
