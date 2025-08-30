# Deployment Error Resolution Guide

This document contains common Vercel/Next.js deployment errors and their successful resolution strategies.

## TypeScript & ESLint Errors

### 1. ESLint Apostrophe Error
**Error:**
```
Error: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
```

**Resolution:**
Replace apostrophes in JSX text with `&apos;`:
```tsx
// Before
<p>Let's start</p>

// After  
<p>Let&apos;s start</p>
```

### 2. Next.js 15 Async Params Error
**Error:**
```
Type error: Type 'OmitWithTag<{ params: { slug: string[] } }, ...>' does not satisfy the constraint '{ [x: string]: never; }'
```

**Resolution:**
In Next.js 15, dynamic route params are Promises that must be awaited:
```typescript
// Before (Next.js 14)
export async function GET(
  request: Request,
  { params }: { params: { slug: string[] } }
) {
  const { slug } = params
}

// After (Next.js 15)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
}
```

### 3. Supabase TypeScript Type Inference Errors
**Error:**
```
Type error: Argument of type '...' is not assignable to parameter of type 'never'
```

**Common Scenarios:**
- When using `.insert()`, `.update()`, or `.upsert()` with Supabase
- TypeScript infers incorrect types from the Database interface

**Resolution:**
Use `as any` type assertion with proper ESLint disable comments:

```typescript
// For insert operations - place comment inline with closing brace
const { data: org, error: orgError } = await supabase
  .from('organizations')
  .insert([{
    name: companyName,
    slug: orgSlug,
    settings: { /* ... */ },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }] as any)
  .select()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .single() as any

// For update operations
const { error: profileError } = await supabase
  .from('profiles')
  .update({
    preferences: { /* ... */ },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .eq('id', user.id) as any
```

### 4. ESLint no-explicit-any Errors
**Error:**
```
Error: Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
```

**Resolution Strategies:**

1. **Inline disable for single usage:**
```typescript
// Place comment on the line BEFORE the 'as any'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}] as any)
```

2. **Important placement rules:**
   - Comment must be on the line immediately before the `as any`
   - For chained methods, each `as any` needs its own disable comment
   - Comments placed incorrectly will cause "Unused eslint-disable directive" warnings

### 5. Unused ESLint Disable Directive
**Error:**
```
Warning: Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any')
```

**Resolution:**
This occurs when the eslint-disable comment is not properly aligned with the code it's meant to suppress:

```typescript
// WRONG - comment too far from the actual 'as any'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data } = await supabase
  .from('table')
  .insert([{ /* ... */ }] as any)

// CORRECT - comment immediately before the 'as any'
const { data } = await supabase
  .from('table')
  .insert([{ 
    /* ... */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }] as any)
```

### 6. Property Does Not Exist on Type 'never'
**Error:**
```
Type error: Property 'id' does not exist on type 'never'
```

**Resolution:**
Add null checks after Supabase operations and use type assertions:

```typescript
const { data: org, error: orgError } = await supabase
  .from('organizations')
  .insert([{ /* ... */ }] as any)
  .select()
  .single() as any

// Add null check
if (orgError || !org) {
  return NextResponse.json({ error: 'Failed' }, { status: 500 })
}

// Now safe to use org.id
const orgId = org.id
```

## Vercel Build Cache Issues

When fixes don't seem to take effect on Vercel:

### Clear Build Cache Method 1 - Redeploy
1. Go to Vercel Dashboard
2. Click "..." menu next to latest deployment
3. Select "Redeploy"
4. **UNCHECK** "Use existing Build Cache"
5. Click "Redeploy"

### Clear Build Cache Method 2 - Settings
1. Go to Project Settings → Functions
2. Scroll to "Build & Development Settings"
3. Click "Clear Build Cache" button

### Force Manual Deploy
1. Go to "Deployments" tab
2. Click "Create Deployment"
3. Select main branch
4. Deploy

## General Debugging Tips

1. **Always check local build first:**
```bash
npm run build
```

2. **For TypeScript errors, check the actual type inference:**
```bash
npx tsc --noEmit
```

3. **ESLint issues can be checked with:**
```bash
npx next lint
```

4. **When in doubt about type issues with Supabase:**
   - Use `as any` with proper eslint-disable comments
   - Add null checks after operations
   - Consider updating the Database types if schema changed

## Common Patterns to Remember

1. **Supabase operations often need type assertions** when using generated Database types
2. **ESLint disable comments must be placed precisely** - directly before the line they affect
3. **Next.js 15 has breaking changes** - params are now Promises in dynamic routes
4. **Vercel caches aggressively** - always clear cache when debugging persistent errors
5. **TypeScript strict mode** can cause "never" type issues - use type assertions judiciously

## Testing Deployment Fixes

After pushing fixes:
1. Wait for Vercel to auto-deploy (or trigger manually)
2. Check build logs for any new errors
3. If build succeeds but app doesn't work, check runtime logs
4. Clear browser cache when testing the deployed app

This guide will be updated as new error patterns are discovered and resolved.