# Data Room Q&A Copilot - Database Migration Guide

## Overview
This guide will walk you through applying 3 database migrations to enable the Data Room Q&A Copilot feature.

**Total Time Required**: ~5 minutes
**Method**: Supabase Dashboard SQL Editor (Copy & Paste)

---

## Prerequisites

- Access to Supabase Dashboard: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz
- Project: `fuqdbewftdthbjfcecrz` (oppspot production)

---

## Migration Order

Apply these migrations **in sequence** (each builds on the previous):

1. ✅ **20250129_dataroom_qa.sql** - Q&A tables (272 lines)
2. ✅ **20250129_dataroom_qa_rls.sql** - RLS policies (406 lines)
3. ✅ **20250129000001_create_llm_management_system.sql** - LLM tables (480 lines)

---

## Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor

1. Open your browser and navigate to:
   ```
   https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new
   ```

2. You should see the SQL Editor with a blank query area.

---

### Step 2: Apply Migration 1 - Q&A Tables

**What it does**: Creates 6 new tables for the Q&A system with vector search capabilities.

**Tables Created**:
- `document_pages` - Per-page text extraction
- `document_chunks` - Text chunks with vector embeddings (pgvector)
- `qa_queries` - User questions and AI answers
- `qa_citations` - Citation links to source documents
- `qa_feedback` - User ratings (helpful/not_helpful)
- `qa_rate_limits` - Rate limiting state (60 queries/hour)

**How to Apply**:

1. In your terminal, run:
   ```bash
   cat supabase/migrations/20250129_dataroom_qa.sql
   ```

2. Select ALL the output and copy it (Ctrl+Shift+C)

3. Paste into the Supabase SQL Editor

4. Click **"Run"** button (or press Ctrl+Enter)

5. **Expected Output**:
   ```
   NOTICE:  Data Room Q&A Migration Complete: 6 tables created/verified
   ```

6. ✅ Verify success - you should see no errors

---

### Step 3: Apply Migration 2 - RLS Policies

**What it does**: Enables Row Level Security policies to ensure users only access their own data.

**Policies Created**:
- `SELECT` - Users can only read their own queries/feedback
- `INSERT` - Users can only create queries for data rooms they have access to
- `UPDATE` - Users can only update their own feedback
- `DELETE` - Users can only delete their own queries

**How to Apply**:

1. **Clear** the SQL Editor (or open a new tab)

2. In your terminal, run:
   ```bash
   cat supabase/migrations/20250129_dataroom_qa_rls.sql
   ```

3. Select ALL the output and copy it

4. Paste into the Supabase SQL Editor

5. Click **"Run"** button

6. **Expected Output**:
   ```
   NOTICE:  Data Room Q&A RLS Migration Complete: X policies created
   ```

7. ✅ Verify success - you should see no errors

---

### Step 4: Apply Migration 3 - LLM Management System

**What it does**: Creates tables for multi-provider LLM management and monitoring.

**Tables Created**:
- `llm_providers` - LLM provider configurations (OpenAI, Anthropic, etc.)
- `llm_models` - Model specifications and pricing
- `llm_requests` - Request logs for monitoring
- `llm_fallback_chains` - Automatic fallback configurations
- `llm_costs` - Cost tracking per user/feature

**How to Apply**:

1. **Clear** the SQL Editor (or open a new tab)

2. In your terminal, run:
   ```bash
   cat supabase/migrations/20250129000001_create_llm_management_system.sql
   ```

3. Select ALL the output and copy it

4. Paste into the Supabase SQL Editor

5. Click **"Run"** button

6. **Expected Output**:
   ```
   NOTICE:  LLM Management System Migration Complete: X tables created
   ```

7. ✅ Verify success - you should see no errors

---

## Verification

After all 3 migrations are complete, verify the tables were created:

### Option 1: SQL Editor

Run this query in the SQL Editor:
```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE 'qa_%' OR tablename LIKE 'document_%' OR tablename LIKE 'llm_%')
ORDER BY tablename;
```

**Expected Output** (should show 15+ tables):
```
document_chunks
document_pages
llm_costs
llm_fallback_chains
llm_models
llm_providers
llm_requests
qa_citations
qa_feedback
qa_queries
qa_rate_limits
```

### Option 2: Supabase Table Editor

1. Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/editor
2. You should see the new tables in the left sidebar

---

## Troubleshooting

### Error: "relation already exists"

**Meaning**: Table was already created in a previous run.
**Solution**: This is safe to ignore. The migration uses `IF NOT EXISTS` so it won't fail.

### Error: "extension 'vector' does not exist"

**Meaning**: pgvector extension is not installed.
**Solution**: Contact Supabase support or enable it via:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Error: "foreign key constraint"

**Meaning**: Referenced table doesn't exist (e.g., `documents`, `data_rooms`, `users`).
**Solution**: Verify core tables exist:
```sql
SELECT tablename FROM pg_tables
WHERE tablename IN ('documents', 'data_rooms', 'users');
```

### Error: "permission denied"

**Meaning**: Insufficient database permissions.
**Solution**: Ensure you're logged in as the project owner/admin in Supabase Dashboard.

---

## Post-Migration Testing

After migrations are applied, test the Q&A endpoints:

### Test 1: History Endpoint

```bash
curl https://oppspot-one.vercel.app/api/data-room/test-room-id/history
```

**Expected**: `401 Unauthorized` (because no auth token provided) or `403 Forbidden` (if room doesn't exist)
**Success Indicator**: NOT `404 Not Found` (which means routing is broken)

### Test 2: Check Tables Exist

```bash
# Run from oppspot directory
psql "postgresql://postgres.fuqdbewftdthbjfcecrz:TCLP-oppSpot3@aws-0-eu-west-2.pooler.supabase.com:6543/postgres" \
  -c "SELECT COUNT(*) FROM qa_queries;"
```

**Expected**: `0` (table exists but is empty)

---

## Next Steps

After migrations are successfully applied:

1. ✅ Test Q&A API endpoints work (should return proper auth errors, not 404)
2. ✅ Run contract tests: `npm run test:contract`
3. ✅ Run E2E tests: `npx playwright test tests/e2e/data-room-qa-*.spec.ts`
4. ✅ Deploy to production (merge PR)

---

## Rollback (If Needed)

To rollback the migrations:

```sql
-- Drop Q&A tables
DROP TABLE IF EXISTS qa_rate_limits CASCADE;
DROP TABLE IF EXISTS qa_feedback CASCADE;
DROP TABLE IF EXISTS qa_citations CASCADE;
DROP TABLE IF EXISTS qa_queries CASCADE;
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS document_pages CASCADE;

-- Drop LLM tables
DROP TABLE IF EXISTS llm_costs CASCADE;
DROP TABLE IF EXISTS llm_requests CASCADE;
DROP TABLE IF EXISTS llm_fallback_chains CASCADE;
DROP TABLE IF EXISTS llm_models CASCADE;
DROP TABLE IF EXISTS llm_providers CASCADE;

-- Remove added columns from documents table
ALTER TABLE documents
  DROP COLUMN IF EXISTS processing_status,
  DROP COLUMN IF EXISTS ocr_attempted,
  DROP COLUMN IF EXISTS chunk_count,
  DROP COLUMN IF EXISTS avg_chunk_size;
```

---

## Support

If you encounter issues:
- Check Supabase logs: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/logs/postgres-logs
- Review migration files: `supabase/migrations/`
- Consult CLAUDE.md for feature documentation

---

**Created**: 2025-10-30
**Feature**: 008-oppspot-docs-dataroom
**Branch**: `008-oppspot-docs-dataroom`
**Commits**: `e360886`, `71590b3`
