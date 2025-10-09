# Supabase TypeScript Type Patterns

Quick reference guide for fixing "Property does not exist on type 'never'" errors in Supabase queries.

## Setup

### 1. Import the Row Type
Add this import to any file using Supabase:
```typescript
import type { Row } from '@/lib/supabase/helpers'
```

## Common Patterns

### ✅ Single Row Query (.single())
```typescript
// ❌ BEFORE (causes 'never' type error)
const { data: user } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()

// ✅ AFTER (properly typed)
const { data: user } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single() as { data: Row<'profiles'> | null; error: any }
```

### ✅ Multiple Rows Query
```typescript
// ❌ BEFORE
const { data: businesses } = await supabase
  .from('businesses')
  .select('*')
  .eq('user_id', userId)

// ✅ AFTER
const { data: businesses } = await supabase
  .from('businesses')
  .select('*')
  .eq('user_id', userId) as { data: Row<'businesses'>[] | null; error: any }
```

### ✅ With Order By
```typescript
// ❌ BEFORE
const { data: reports } = await supabase
  .from('research_reports')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })

// ✅ AFTER
const { data: reports } = await supabase
  .from('research_reports')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false }) as { data: Row<'research_reports'>[] | null; error: any }
```

### ✅ With Limit
```typescript
// ❌ BEFORE
const { data: topBusinesses } = await supabase
  .from('businesses')
  .select('*')
  .order('rating', { ascending: false })
  .limit(10)

// ✅ AFTER
const { data: topBusinesses } = await supabase
  .from('businesses')
  .select('*')
  .order('rating', { ascending: false })
  .limit(10) as { data: Row<'businesses'>[] | null; error: any }
```

### ✅ With Joins (use generic type)
```typescript
// ❌ BEFORE
const { data: savedBusinesses } = await supabase
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
  .eq('user_id', userId)

// ✅ AFTER
const { data: savedBusinesses } = await supabase
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
  .eq('user_id', userId) as { data: any[] | null; error: any }
```

### ✅ Count Query
```typescript
// ❌ BEFORE
const { count } = await supabase
  .from('businesses')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)

// ✅ AFTER
const { count } = await supabase
  .from('businesses')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId) as { count: number | null; error: any }
```

### ✅ Insert Query
```typescript
// ❌ BEFORE
const { data: newBusiness, error } = await supabase
  .from('businesses')
  .insert({
    name: 'New Business',
    user_id: userId
  })
  .select()
  .single()

// ✅ AFTER
const { data: newBusiness, error } = await supabase
  .from('businesses')
  .insert({
    name: 'New Business',
    user_id: userId
  })
  .select()
  .single() as { data: Row<'businesses'> | null; error: any }
```

### ✅ Update Query
```typescript
// ❌ BEFORE
const { data: updatedProfile } = await supabase
  .from('profiles')
  .update({ full_name: 'New Name' })
  .eq('id', userId)
  .select()
  .single()

// ✅ AFTER
const { data: updatedProfile } = await supabase
  .from('profiles')
  .update({ full_name: 'New Name' })
  .eq('id', userId)
  .select()
  .single() as { data: Row<'profiles'> | null; error: any }
```

### ✅ Upsert Query
```typescript
// ❌ BEFORE
const { data } = await supabase
  .from('user_settings')
  .upsert({ user_id: userId, theme: 'dark' })
  .select()
  .single()

// ✅ AFTER
const { data } = await supabase
  .from('user_settings')
  .upsert({ user_id: userId, theme: 'dark' })
  .select()
  .single() as { data: Row<'user_settings'> | null; error: any }
```

## Server vs Client Components

### Server Components (app/*/page.tsx, route.ts)
```typescript
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

export default async function Page() {
  const supabase = await createClient()  // Note: await needed

  const { data } = await supabase
    .from('businesses')
    .select('*')
    .single() as { data: Row<'businesses'> | null; error: any }
}
```

### Client Components ('use client')
```typescript
'use client'
import { createClient } from '@/lib/supabase/client'
import type { Row } from '@/lib/supabase/helpers'

export default function Component() {
  const supabase = createClient()  // No await

  const fetchData = async () => {
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .single() as { data: Row<'businesses'> | null; error: any }
  }
}
```

## Quick Find & Replace

### VSCode Regex Find & Replace

**Find:** `\.single\(\)(?!\s+as)`
**Replace:** `.single() as { data: Row<'TABLE'> | null; error: any }`

Then manually replace `TABLE` with the actual table name from the `.from('table_name')` call above.

## Table Names Reference

Common tables in the oppSpot codebase:

- `businesses` - Main business entities
- `profiles` - User profiles
- `saved_businesses` - User saved businesses
- `business_lists` - User-created lists
- `acquisition_scans` - Opp scan results
- `research_reports` - Generated research reports
- `research_sections` - Report sections
- `research_sources` - Research sources
- `api_keys` - User API keys
- `user_settings` - User settings
- `similarity_analyses` - Similarity analysis results
- `companies_house_data` - Companies House enrichment data
- `streams` - Streams for collaboration
- `notifications` - User notifications

## Troubleshooting

### Error: "Property 'X' does not exist on type 'never'"
**Solution**: Add type assertion to the Supabase query (see patterns above)

### Error: Type assertion has no effect
**Cause**: Placing assertion on wrong part of query
**Solution**: Place assertion after the final query method (`.single()`, `.order()`, etc.)

### Error: Cannot find name 'Row'
**Solution**: Add import: `import type { Row } from '@/lib/supabase/helpers'`

### Row type shows unknown properties
**Solution**: The Row helper type is a wrapper. For more specific typing, use:
```typescript
type Business = Row<'businesses'>
```

## Best Practices

1. **Always type assertions**: Add type assertions to all Supabase queries
2. **Use Row helper**: Use `Row<'table_name'>` instead of importing full database types
3. **Handle nulls**: Remember data can be `null`, always check before accessing
4. **Error handling**: Always destructure and handle the `error` property
5. **Type safety**: Use TypeScript's type narrowing for runtime safety

```typescript
const { data, error } = await supabase
  .from('businesses')
  .select('*')
  .eq('id', id)
  .single() as { data: Row<'businesses'> | null; error: any }

if (error) {
  console.error('Error:', error)
  return null
}

if (!data) {
  console.error('No data found')
  return null
}

// Now data is typed as Row<'businesses'> (not null)
return data
```

## Additional Resources

- [Supabase TypeScript Guide](https://supabase.com/docs/guides/api/generating-types)
- [TypeScript Type Assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)
- [Full Fix Documentation](../TYPESCRIPT_NEVER_ERRORS_FIX.md)
