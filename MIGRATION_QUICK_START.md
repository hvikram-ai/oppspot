# Quick Start: Apply Data Room Q&A Migrations

## 3-Step Migration Process (~5 minutes)

### 🔗 Open Supabase SQL Editor
https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new

---

## Step 1: Q&A Tables (272 lines)

### Copy SQL:
```bash
cat supabase/migrations/20250129_dataroom_qa.sql
```

1. Run command above
2. Select ALL output (Ctrl+Shift+A)
3. Copy (Ctrl+Shift+C)
4. Paste into Supabase SQL Editor
5. Click **"Run"**

**✅ Expected**: `NOTICE: Data Room Q&A Migration Complete: 6 tables created/verified`

---

## Step 2: RLS Policies (406 lines)

### Copy SQL:
```bash
cat supabase/migrations/20250129_dataroom_qa_rls.sql
```

1. Clear SQL Editor
2. Run command above
3. Select ALL output (Ctrl+Shift+A)
4. Copy (Ctrl+Shift+C)
5. Paste into Supabase SQL Editor
6. Click **"Run"**

**✅ Expected**: `NOTICE: Data Room Q&A RLS Migration Complete`

---

## Step 3: LLM Management (480 lines)

### Copy SQL:
```bash
cat supabase/migrations/20250129000001_create_llm_management_system.sql
```

1. Clear SQL Editor
2. Run command above
3. Select ALL output (Ctrl+Shift+A)
4. Copy (Ctrl+Shift+C)
5. Paste into Supabase SQL Editor
6. Click **"Run"**

**✅ Expected**: `NOTICE: LLM Management System Migration Complete`

---

## Verify Tables Created

Run this in SQL Editor:
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE 'qa_%' OR tablename LIKE 'document_%')
ORDER BY tablename;
```

**Expected Output**:
- document_chunks
- document_pages
- qa_citations
- qa_feedback
- qa_queries
- qa_rate_limits

---

## Test Endpoints Work

After migrations applied:

```bash
# Should return 401/403, NOT 404
curl http://localhost:3000/api/data-room/test-id/history
```

**✅ Success**: Returns `401 Unauthorized` or `403 Forbidden`
**❌ Failure**: Returns `404 Not Found` (routing broken)

---

## Done! 🎉

Next: Run contract tests to verify implementation
```bash
npx playwright test tests/contract/data-room-qa-*.contract.test.ts --project=chromium
```
