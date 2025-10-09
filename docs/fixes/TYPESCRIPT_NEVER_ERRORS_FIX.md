# TypeScript "never" Type Errors - Fix Documentation

## Summary

**Initial State**: 752 "Property does not exist on type 'never'" errors across the codebase
**After Page Fixes**: 703 errors remaining (49 errors fixed)
**Files Affected**: 100+ files across app/, lib/, and components/ directories

## Root Cause

Supabase TypeScript client returns `never` type when queries are not properly typed. This happens because the Supabase client cannot infer the table schema at compile time without explicit type assertions.

## Solution Pattern

### 1. Add Type Import
```typescript
import type { Row } from '@/lib/supabase/helpers'
```

### 2. Apply Type Assertions to Queries

#### For .single() queries (returns one row):
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single() as { data: Row<'profiles'> | null; error: any }
```

#### For array queries (returns multiple rows):
```typescript
const { data: businesses } = await supabase
  .from('businesses')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false }) as { data: Row<'businesses'>[] | null; error: any }
```

#### For queries with joins:
```typescript
const { data } = await supabase
  .from('saved_businesses')
  .select(`
    id,
    business_id,
    businesses (
      id,
      name,
      description
    )
  `)
  .eq('user_id', user.id) as { data: any[] | null; error: any }
```

## Files Fixed (Manual)

### ✅ Page Components (49 errors fixed)
- `/home/vik/oppspot/app/research/page.tsx` - 20 errors fixed
- `/home/vik/oppspot/app/research/[reportId]/page.tsx` - 14 errors fixed
- `/home/vik/oppspot/app/settings/ai/page.tsx` - 8 errors fixed
- `/home/vik/oppspot/app/settings/notifications/page.tsx` - 2 errors fixed
- `/home/vik/oppspot/app/streams/page.tsx` - 5 errors fixed

## Files Remaining (703 errors)

### Highest Priority (Most Errors)
1. `app/api/similar-companies/[id]/export/route.ts` - 28 errors
2. `lib/ai/scoring/ai-financial-scorer.ts` - 25 errors
3. `lib/analytics/opportunity-identifier.ts` - 24 errors
4. `lib/ai/enrichment/enrichment-orchestrator.ts` - 24 errors
5. `lib/knowledge-graph/query/graph-query-engine.ts` - 20 errors
6. `lib/streams/stream-service.ts` - 19 errors
7. `app/api/streams/[id]/progress/route.ts` - 18 errors
8. `app/api/qualification/dashboard/route.ts` - 18 errors
9. `lib/signals/buying-signal-detector.ts` - 17 errors
10. `lib/integrations/crm/smartsync-orchestrator.ts` - 16 errors

### Distribution by Directory
- `app/api/*` - ~400 errors (API routes)
- `lib/*` - ~250 errors (Service layer)
- `components/*` - ~50 errors (React components)

## Automation Approach

### Option 1: Sed Script (Quick but needs verification)
```bash
#!/bin/bash
# Add type assertions to all .single() calls
find app lib components -name "*.ts" -o -name "*.tsx" | while read file; do
  # Add import if missing
  if ! grep -q "import type { Row } from '@/lib/supabase/helpers'" "$file"; then
    sed -i "/import.*from.*supabase/a import type { Row } from '@/lib/supabase/helpers'" "$file"
  fi

  # Fix .single() calls
  sed -i 's/\.single()$/\.single() as { data: Row<TABLE> | null; error: any }/g' "$file"
done
```

### Option 2: TypeScript Transformer (Safe but complex)
Use a custom TypeScript transformer to add type assertions automatically while preserving code structure.

### Option 3: Manual Fix with Editor (Recommended for accuracy)
1. Open file in VSCode
2. Search for `.single()` without `as {`
3. Add type assertion: `as { data: Row<'table_name'> | null; error: any }`
4. Replace `table_name` with actual table from `.from('table_name')`
5. Repeat for array queries ending with `.order()` or plain `.select()`

## Testing After Fixes

```bash
# Check remaining errors
npx tsc --noEmit 2>&1 | grep "Property.*does not exist on type 'never'" | wc -l

# List files with errors
npx tsc --noEmit 2>&1 | grep "Property.*does not exist on type 'never'" | sed 's/(.*//' | sort -u

# Count errors by file
npx tsc --noEmit 2>&1 | grep "Property.*does not exist on type 'never'" | sed 's/(.*//' | uniq -c | sort -rn
```

## Next Steps

### Immediate (High Priority)
1. Fix API routes with most errors (top 10 files above)
2. Fix lib/ service files (critical business logic)
3. Verify builds succeed after fixes

### Short Term
1. Fix remaining API routes
2. Fix component files
3. Add to CI/CD to prevent regression

### Long Term
1. Generate proper TypeScript types from Supabase schema
2. Use `supabase gen types typescript` to create type-safe client
3. Update `@/lib/supabase/helpers` to use generated types
4. Consider using Supabase's built-in type generation

## Prevention

### 1. Use Generated Types
```bash
# Generate types from Supabase
npx supabase gen types typescript --project-id fuqdbewftdthbjfcecrz > lib/supabase/database.types.ts
```

### 2. Create Typed Client Helper
```typescript
// lib/supabase/typed-client.ts
import { createClient } from '@/lib/supabase/server'
import { Database } from './database.types'

export async function getTypedClient() {
  const supabase = await createClient()
  return supabase as unknown as SupabaseClient<Database>
}
```

### 3. Add Lint Rule
Add ESLint rule to catch untyped Supabase queries:
```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.property.name='single']:not([parent.type='TSAsExpression'])",
        "message": "Supabase .single() must have type assertion"
      }
    ]
  }
}
```

## References

- Supabase TypeScript Guide: https://supabase.com/docs/guides/api/generating-types
- TypeScript Type Assertions: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions
- Issue Tracker: See git commit history for related fixes
