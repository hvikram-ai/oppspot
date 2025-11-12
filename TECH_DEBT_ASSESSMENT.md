# Technical Debt Assessment & Cleanup Plan

**Date**: November 12, 2025
**Status**: 🔴 **HIGH PRIORITY** - 2,452 linting issues blocking strict type checking

---

## 📊 Current State

### Lint Summary
```
✖ 2,452 problems (1,103 errors, 1,349 warnings)
  1 error potentially fixable with --fix
```

### Issue Breakdown by Type

| Issue Type | Count | Severity | Priority |
|-----------|-------|----------|----------|
| `@typescript-eslint/no-unused-vars` | 1,342 | Warning | Low |
| `@typescript-eslint/no-explicit-any` | 1,041 | Error | **High** |
| Parsing errors (`#!` shebang) | 25 | Error | **Critical** |
| `Function` type usage | 24 | Error | Medium |
| `react-hooks/exhaustive-deps` | 6 | Warning | Medium |
| `react/no-unescaped-entities` | 2 | Error | Low |
| Other | 12 | Mixed | Low |

---

## 🎯 Prioritized Cleanup Plan

### Phase 1: Critical Blocking Issues (Day 1)
**Goal**: Fix syntax errors preventing builds

1. **Shebang errors in scripts** (25 errors)
   - Files with `#!/usr/bin/env node` not at line 1
   - Scripts in `/scripts/` directory
   - Fix: Move shebang to first line or remove if not needed

2. **Parsing errors** (4 errors)
   - `'=>' expected` in tech-stack page
   - `',' expected` errors
   - `'>' expected` errors
   - Fix: Review syntax and correct TypeScript issues

**Estimated Time**: 1-2 hours
**Impact**: Unblocks builds, allows TypeScript strict mode

---

### Phase 2: High-Priority TypeScript Issues (Day 1-2)
**Goal**: Replace `any` types with proper TypeScript interfaces

**Top Offenders** (files with most `any` usage):
1. `lib/ma-prediction/valuation/valuation-estimator.ts` - Heavy `any` usage
2. `lib/data-room/qa/retrieval-service.ts` - Vector search types
3. `app/api/` routes - Request/response types
4. `workers/start-workers.ts` - Worker types

**Strategy**:
- Create proper TypeScript interfaces for:
  - Database query results
  - API request/response payloads
  - Worker message types
  - Vector search results
- Use Zod for runtime validation where needed
- Leverage `types/database.ts` for Supabase types

**Estimated Time**: 4-6 hours
**Impact**: Type safety, prevents runtime errors, better IDE support

---

### Phase 3: Clean Unused Variables (Day 2)
**Goal**: Remove or prefix unused variables

**1,342 unused variables to clean**:
- Unused imports (e.g., `Filter`, `BarChart3`, `useCallback`)
- Unused function parameters (prefix with `_`)
- Unused variables in try-catch blocks (error handling)

**Strategy**:
- Use auto-fix where possible: `npm run lint -- --fix`
- Manually review and remove truly unused imports
- Prefix intentionally unused vars with `_` (e.g., `_error`, `_userId`)

**Estimated Time**: 2-3 hours
**Impact**: Cleaner code, smaller bundle size

---

### Phase 4: React Hook Dependencies (Day 3)
**Goal**: Fix `react-hooks/exhaustive-deps` warnings

**6 violations** in:
- Data room components
- Dashboard components
- Map components

**Strategy**:
- Add missing dependencies to `useEffect` arrays
- Use `useCallback` for functions in dependencies
- Add ESLint disable comments with justification if truly not needed

**Estimated Time**: 1 hour
**Impact**: Prevents stale closure bugs

---

### Phase 5: Minor Cleanup (Day 3)
**Goal**: Fix remaining low-priority issues

1. **React JSX entities** (2 errors)
   - Replace `"` with `&quot;` or `&ldquo;`/`&rdquo;`

2. **Function type usage** (24 errors)
   - Replace `Function` with proper function signatures
   - E.g., `Function` → `(...args: unknown[]) => unknown`

3. **Type constraint issues** (1 error)
   - Fix `@typescript-eslint/no-unnecessary-type-constraint`

**Estimated Time**: 1 hour
**Impact**: Follows React best practices

---

## 🔧 Execution Strategy

### Approach
✅ **Incremental fixes** - Fix one category at a time
✅ **Test after each phase** - Run `npm run build` to ensure no regressions
✅ **Git commits per phase** - Easy rollback if needed
✅ **Auto-fix first** - Use `--fix` for mechanical changes
✅ **Document exceptions** - ESLint disable comments with justification

### Automated Tools
```bash
# Auto-fix what's possible
npm run lint -- --fix

# Check specific file
npx eslint app/page.tsx --fix

# Check specific rule
npm run lint 2>&1 | grep "no-explicit-any"
```

### Testing Protocol
After each phase:
1. Run `npm run lint` - Should see decreasing error count
2. Run `npm run build` - Should succeed without errors
3. Run `npm run dev` - Should start without warnings
4. Manual smoke test - Test key user flows

---

## 📈 Success Metrics

### Target Goals
- **Phase 1**: 0 parsing errors (currently 29)
- **Phase 2**: <50 `no-explicit-any` errors (currently 1,041)
- **Phase 3**: <100 unused variable warnings (currently 1,342)
- **Phase 4**: 0 hook dependency warnings (currently 6)
- **Phase 5**: 0 remaining errors

### Final Target
```
✓ 0 errors, <50 warnings
```

### Re-enable Strict Checking
Once errors < 50:
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false, // ✅ Re-enabled
  },
  typescript: {
    ignoreBuildErrors: false, // ✅ Re-enabled
  },
  // ...
};
```

---

## 🚨 Known Blockers

### Database Type Generation
- `npx supabase gen types typescript --local` is failing
- Need to fix before uncommenting type-safe database queries
- May need to run migrations or update Supabase CLI

### Large Files Requiring Refactoring
Some files are too complex and need architectural changes:
- `lib/ma-prediction/valuation/valuation-estimator.ts` (467 lines, many `any`)
- `lib/data-room/qa/retrieval-service.ts` (heavy vector search logic)
- `workers/start-workers.ts` (complex worker management)

**Strategy**: Create proper type definitions first, then refactor incrementally

---

## 📝 Notes

### Why Technical Debt Accumulated
1. **Rapid feature development** - Prioritized shipping over type safety
2. **Missing Supabase types** - Database types not regenerated after schema changes
3. **Legacy code patterns** - Some files predate TypeScript strict mode
4. **External library types** - Some libraries lack proper TypeScript definitions

### Best Practices Going Forward
1. ✅ **Type everything** - No `any` types in new code
2. ✅ **Use Zod schemas** - Runtime validation + TypeScript types
3. ✅ **Regenerate DB types** - After each migration
4. ✅ **Pre-commit hooks** - Catch issues before push
5. ✅ **Code reviews** - Enforce type safety standards

---

## 🎓 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [ESLint Rules Reference](https://eslint.org/docs/latest/rules/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Supabase TypeScript Support](https://supabase.com/docs/reference/javascript/typescript-support)

---

**Status**: Ready for Phase 1 execution
**Next Action**: Fix critical parsing errors in scripts directory
