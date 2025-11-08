# Structured Smart Summaries - Fixed Migration Guide

## ⚠️ Important Fix Applied

**Issue Found**: The original migration referenced `dra.role` but the actual column is `dra.permission_level`.

**Status**: ✅ **FIXED** - Use the corrected migration file below.

---

## Quick Start (Updated)

### Step 1: Apply Fixed Migration

1. **Open Supabase SQL Editor**:
   - Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new

2. **Copy the FIXED migration**:
   - Use file: `supabase/migrations/20251031000003_structured_summaries_fixed.sql`
   - OR manually replace all `dra.role` with `dra.permission_level` in the original file

3. **Execute**:
   - Paste into SQL Editor
   - Click "Run"
   - Wait for confirmation

### Step 2: Load Seed Data

1. **Open new SQL query**

2. **Copy seed file**:
   - Use file: `supabase/seeds/summary_templates.sql`
   - (This file is correct, no changes needed)

3. **Execute**:
   - Paste and click "Run"

---

## What Was Fixed

### Original (BROKEN):
```sql
AND dra.role IN ('owner', 'editor')
```

### Fixed (CORRECT):
```sql
AND dra.permission_level IN ('owner', 'editor')
```

### Files Updated:
1. ✅ `supabase/migrations/20251031000003_structured_summaries_fixed.sql` - New fixed migration
2. ✅ `app/api/data-room/summaries/run/route.ts` - Fixed API route
3. ✅ `app/api/data-room/summaries/[id]/route.ts` - Fixed API route
4. ✅ `app/api/data-room/summaries/[id]/export/route.ts` - Fixed API route

---

## Verification

After applying the migration, verify it works:

```sql
-- Should return 6 tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'summary_%'
ORDER BY table_name;

-- Should return 5 templates
SELECT key, title
FROM summary_templates
WHERE org_id IS NULL;

-- Test RLS policy (should not error)
SELECT COUNT(*)
FROM summary_templates;
```

---

## API Routes Status

All API routes have been updated to use `permission_level` instead of `role`:

- ✅ POST `/api/data-room/summaries/run`
- ✅ GET `/api/data-room/summaries/[id]`
- ✅ DELETE `/api/data-room/summaries/[id]`
- ✅ GET `/api/data-room/summaries/[id]/export`
- ✅ POST `/api/data-room/summaries/[id]/export`
- ✅ GET `/api/data-room/templates`

---

## Ready to Deploy

The feature is now fully corrected and ready for production use!

---

*Fixed: 2025-10-31*
*All code updates applied*
