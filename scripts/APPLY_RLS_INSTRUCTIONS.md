# Apply Collections RLS - Quick Instructions

## Current Status
✅ 15/18 checks passed
❌ RLS not enabled on 3 tables

## Quick Fix (Choose One Method)

### Method 1: Via Supabase CLI (Easiest)
```bash
# From project root
cat scripts/apply-collections-rls-complete.sql | npx supabase db execute
```

### Method 2: Via Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/editor
2. Click "SQL Editor" (left sidebar)
3. Click "New Query"
4. Copy contents of `scripts/apply-collections-rls-complete.sql`
5. Paste into editor
6. Click "Run" (or press Ctrl+Enter)

### Method 3: Manual SQL Commands
```bash
# Enable RLS only (quickest)
cat scripts/enable-collections-rls.sql | npx supabase db execute
```

## Verify It Worked
```bash
# Run verification script
npx tsx scripts/verify-collections-migration.ts

# Should show: 18/18 checks passed ✅
```

## Test the API
```bash
# Run a single test
npx playwright test tests/e2e/collections-api.spec.ts:111 --project=chromium

# Should return: HTTP 201 (not 500) ✅
```

## What This Fixes
- Enables Row Level Security on all 3 tables
- Applies 12 RLS policies for proper access control
- Ensures helper functions are in place
- Makes Collections API work properly

## Files Created
- ✅ `scripts/verify-collections-migration.ts` - Check migration status
- ✅ `scripts/enable-collections-rls.sql` - Simple RLS enable
- ✅ `scripts/apply-collections-rls-complete.sql` - Complete RLS setup
