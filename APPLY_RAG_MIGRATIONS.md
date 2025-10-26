# Apply RAG Migrations - Manual Steps

The RAG database migrations need to be applied through the Supabase SQL Editor.

## Quick Steps

### 1. Open Supabase SQL Editor

🔗 **[Click here to open SQL Editor](https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new)**

Or navigate to:
- https://supabase.com/dashboard
- Select project: `fuqdbewftdthbjfcecrz`
- Click "SQL Editor" in left sidebar
- Click "+ New query"

---

### 2. Execute Migration 1: RAG Preferences

**Copy and paste** the following SQL into the editor and click **RUN**:

```sql
-- ================================================
-- RAG User Preferences Migration
-- ================================================

-- Add RAG preference columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS rag_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rag_auto_index BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rag_indexed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rag_indexed_count INTEGER DEFAULT 0;

-- Add index for querying RAG-enabled users
CREATE INDEX IF NOT EXISTS idx_profiles_rag_enabled
ON profiles(rag_enabled)
WHERE rag_enabled = true;

-- Add index for finding users needing reindexing
CREATE INDEX IF NOT EXISTS idx_profiles_rag_indexed_at
ON profiles(rag_indexed_at)
WHERE rag_enabled = true;

-- Add comments for documentation
COMMENT ON COLUMN profiles.rag_enabled IS 'Enable RAG personalization for this user';
COMMENT ON COLUMN profiles.rag_auto_index IS 'Automatically index user data for RAG';
COMMENT ON COLUMN profiles.rag_indexed_at IS 'Timestamp of last successful indexing';
COMMENT ON COLUMN profiles.rag_indexed_count IS 'Number of vectors indexed in Pinecone';
```

✅ **Expected result**: "Success. No rows returned"

---

### 3. Execute Migration 2: Query Logs

**Create a new query** and execute:

```sql
-- ================================================
-- RAG Query Analytics Migration
-- ================================================

-- Create rag_query_logs table
CREATE TABLE IF NOT EXISTS rag_query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  used_rag BOOLEAN NOT NULL DEFAULT false,
  context_items INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_rag_query_logs_user
ON rag_query_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_rag_query_logs_created
ON rag_query_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rag_query_logs_used_rag
ON rag_query_logs(used_rag);

-- Composite index for A/B testing comparisons
CREATE INDEX IF NOT EXISTS idx_rag_query_logs_rag_performance
ON rag_query_logs(used_rag, response_time_ms)
WHERE response_time_ms IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE rag_query_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own query logs
CREATE POLICY "Users can view own query logs"
ON rag_query_logs
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: System can insert query logs for any user
CREATE POLICY "System can insert query logs"
ON rag_query_logs
FOR INSERT
WITH CHECK (true);

-- RLS Policy: Users can update their own ratings/feedback
CREATE POLICY "Users can update own ratings"
ON rag_query_logs
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE rag_query_logs IS 'Analytics tracking for RAG query performance and A/B testing';
COMMENT ON COLUMN rag_query_logs.used_rag IS 'Whether RAG personalization was used for this query';
COMMENT ON COLUMN rag_query_logs.context_items IS 'Number of context items retrieved from Pinecone';
COMMENT ON COLUMN rag_query_logs.response_time_ms IS 'Total query response time in milliseconds';
COMMENT ON COLUMN rag_query_logs.satisfaction_rating IS 'User satisfaction rating (1-5 stars)';
```

✅ **Expected result**: "Success. No rows returned"

---

### 4. Verify Migrations

Run this verification query:

```sql
-- Check profiles table has RAG columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE 'rag%'
ORDER BY ordinal_position;

-- Check rag_query_logs table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rag_query_logs'
ORDER BY ordinal_position;
```

✅ **Expected result**: Should show 4 RAG columns in profiles and rag_query_logs table structure

---

## Alternative: Use psql Command Line

If you have `psql` installed and database credentials:

```bash
# Get connection string from Supabase dashboard Settings > Database
# Then run:
psql "your-connection-string" -f supabase/migrations/20251026000001_add_rag_preferences.sql
psql "your-connection-string" -f supabase/migrations/20251026000002_create_rag_query_logs.sql
```

---

## Verify After Migration

Run the verification script:

```bash
node scripts/verify-rag-schema.js
```

✅ **Expected output**: "All RAG schema migrations applied successfully!"

---

## Next Steps

Once migrations are applied:

1. **Start dev server**: `npm run dev`
2. **Test preferences API**:
   ```bash
   curl http://localhost:3000/api/user/rag-preferences \
     -H "Cookie: auth-token=YOUR_TOKEN"
   ```
3. **Follow testing guide**: See `docs/PHASE_2_TESTING.md`
4. **Add indexing triggers**: See `docs/PHASE_2_INTEGRATION.md`

---

## Troubleshooting

**Error: "relation profiles does not exist"**
- Make sure you're connected to the correct database
- Check that initial migrations have been run

**Error: "column already exists"**
- Safe to ignore if using `IF NOT EXISTS`
- Or drop columns first: `ALTER TABLE profiles DROP COLUMN rag_enabled CASCADE;`

**RLS Policy errors**
- May need to drop existing policies first
- Check with: `SELECT * FROM pg_policies WHERE tablename = 'rag_query_logs';`
