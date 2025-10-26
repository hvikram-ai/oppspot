# Apply pgvector Migration

Execute this SQL in Supabase SQL Editor to create the user_context_vectors table.

## Quick Steps

1. Open Supabase SQL Editor:
   🔗 https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new

2. Copy the SQL from:
   `supabase/migrations/20251026000003_create_user_context_vectors.sql`

3. Paste and click "RUN"

4. Expected result: ✅ "Success. No rows returned"

## What This Creates

- **user_context_vectors** table for RAG
- HNSW index for fast similarity search
- Helper functions for querying context
- RLS policies for security
- Monitoring views

## Verify

After applying, verify with:

```bash
node scripts/verify-pgvector-schema.js
```

Or in SQL Editor:

```sql
SELECT COUNT(*) FROM user_context_vectors;
SELECT * FROM user_context_coverage;
```

Both should return 0 (no data yet, but tables exist).
