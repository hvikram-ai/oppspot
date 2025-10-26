# React Hook Dependencies - Remaining Fixes

## Summary

- **Total Hook dependency issues found**: 13
- **Fixed in this session**: 2
- **Remaining**: 11

---

## What Was Fixed

### ✅ Fixed Files

1. **app/admin/alerts/page.tsx**
   - Removed unused imports: Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Clock
   - Reduced imports by 7 unused items

2. **app/icp/page.tsx**
   - Added `useCallback` import
   - Wrapped `loadProfiles()` function in `useCallback`
   - Added `loadProfiles` to useEffect dependency array
   - Removed unused `Users` import
   - **Issue**: useEffect calling function not in dependency array
   - **Fix**: Wrapped function in useCallback and added to deps

---

## Remaining Hook Dependency Issues

All following files have the same pattern:
```typescript
useEffect(() => {
  someFunction()  // Function called but not in dependency array
}, [])

const someFunction = async () => {
  // Function definition
}
```

### Files Needing Fixes

1. **app/knowledge-graph/page.tsx**
   - Function: `loadDashboard()`
   - Fix: Wrap in useCallback, add to deps

2. **app/billing/page.tsx**
   - Function: `loadBillingInfo()`
   - Fix: Wrap in useCallback, add to deps

3. **app/settings/notifications/page.tsx**
   - Function: `loadSettings()`
   - Fix: Wrap in useCallback, add to deps

4. **app/admin/embeddings/page.tsx**
   - Function: `loadStats()`
   - Fix: Wrap in useCallback, add to deps

5. **app/admin/import/page.tsx**
   - Function: `fetchImportData()`
   - Fix: Wrap in useCallback, add to deps

6. **app/admin/agents/page.tsx**
   - Functions: `loadAgents()`, `loadExecutions()`
   - Fix: Wrap both in useCallback, add to deps

7. **app/admin/enhance/page.tsx**
   - Function: `fetchBusinesses()`
   - Fix: Wrap in useCallback, add to deps

8. **app/admin/signals/page.tsx**
   - Function: `loadSignals()`
   - Fix: Wrap in useCallback, add to deps

9. **app/profile/page.tsx**
   - Function: `loadProfile()`
   - Fix: Wrap in useCallback, add to deps

10. **app/(dashboard)/timetravel/page.tsx**
    - Function: `fetchPredictions()`
    - Fix: Wrap in useCallback, add to deps

11. **app/competitive/page.tsx**
    - Function: `fetchCompetitorSets()`
    - Fix: Wrap in useCallback, add to deps

---

## How to Fix (Pattern)

### Before:
```typescript
import { useState, useEffect } from 'react'

export default function MyPage() {
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // fetch data
  }
}
```

### After:
```typescript
import { useState, useEffect, useCallback } from 'react'

export default function MyPage() {
  const loadData = useCallback(async () => {
    // fetch data
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])
}
```

---

## Why This Matters

**Issue**: React Hook useEffect has a missing dependency

**Impact**:
- ESLint warnings (react-hooks/exhaustive-deps)
- Potential stale closure bugs
- Function not updating when dependencies change

**Solution**:
- Wrap functions in `useCallback` to memoize them
- Add memoized function to useEffect dependency array
- Ensures function reference is stable

---

## Automation Script

```bash
# Check for Hook dependency issues
npx eslint . --ext .tsx --rule 'react-hooks/exhaustive-deps: error'

# Or manually search
grep -r "useEffect" app/ --include="*.tsx" -A 3 | grep -B 2 "\[\]"
```

---

## Next Steps

1. Fix remaining 11 files using the pattern above
2. Run ESLint to verify: `npm run lint`
3. Test affected pages to ensure no regressions
4. Consider enabling `react-hooks/exhaustive-deps` as error in ESLint config

---

## Related Issues

- Unused variables with `_` prefix are intentional (TypeScript pattern)
- ~1700 ESLint warnings total in codebase
- Most are `@typescript-eslint/no-explicit-any` errors (separate issue)

---

**Status**: Partially complete - 2/13 files fixed
**Time to complete remaining**: ~1-2 hours
**Priority**: Medium (improves code quality, prevents potential bugs)
