# React Hook Dependency Fixes - Remaining Work

## Progress Summary
- **Total Issues**: 17
- **Fixed**: 3
- **Remaining**: 14

## ✅ Completed Fixes

1. **app/(dashboard)/competitive-analysis/[id]/page.tsx**
   - Wrapped `fetchDashboardData` in `useCallback` with `[analysisId, router]` deps
   - Added `fetchDashboardData` to useEffect deps

2. **app/(dashboard)/competitive-analysis/[id]/share/page.tsx**
   - Wrapped `fetchData` in `useCallback` with `[analysisId]` deps
   - Added `fetchData` to useEffect deps

3. **app/(dashboard)/competitive-intelligence/[id]/page.tsx**
   - Wrapped `fetchAnalysisData` in `useCallback` with `[analysisId]` deps
   - Added `fetchAnalysisData` to useEffect deps
   - Fixed unnecessary `router` dependency warning

## 🔧 Remaining Fixes Needed (14 files)

### Pattern to Apply

For each file below, follow this pattern:

```typescript
// 1. Add useCallback to imports
import { useEffect, useState, useCallback } from 'react';

// 2. Wrap fetch function in useCallback
const fetchData = useCallback(async () => {
  // ... existing logic
}, [/* dependencies that are used inside the function */]);

// 3. Add the callback to useEffect deps
useEffect(() => {
  fetchData();
}, [/* existing deps */, fetchData]);
```

### Files to Fix

1. **app/(dashboard)/competitive-analysis/new/page.tsx**
   - Missing: `fetchAnalyses`
   - Line: 53

2. **app/companies/[id]/esg/page.tsx**
   - Missing: `fetchESGSummary`
   - Line: 41

3. **app/grants/page.tsx**
   - Missing: `fetchGrants`
   - Line: 56

4. **components/data-room/ai-insights-sidebar.tsx** ⚠️ **CRITICAL - Has polling**
   - Missing: `fetchSummary`, `pollInterval`
   - Line: 79
   - **Special handling needed**: This useEffect manages a polling interval
   - **Solution**: Add both `fetchSummary` and `pollInterval` to dependencies
   ```typescript
   const fetchSummary = useCallback(async () => {
     // ... logic
   }, [document.id]);

   const fetchTemplates = useCallback(async () => {
     // ... logic
   }, []);

   useEffect(() => {
     fetchTemplates()
     fetchSummary()

     return () => {
       if (pollInterval) clearInterval(pollInterval)
     }
   }, [document.id, fetchSummary, fetchTemplates, pollInterval])
   ```

5. **components/data-room/hypothesis/evidence-panel.tsx**
   - Missing: `fetchEvidence`
   - Line: 68

6. **components/data-room/hypothesis/hypothesis-editor.tsx**
   - Missing: `fetchHypothesis`
   - Line: 68

7. **components/data-room/hypothesis/hypothesis-editor.tsx** (2nd instance)
   - Missing: `loadHypothesis`
   - Line: 113

8. **components/data-room/hypothesis/hypothesis-list.tsx**
   - Missing: `fetchHypotheses`
   - Line: 50

9. **components/data-room/hypothesis/metrics-tracker.tsx**
   - Missing: `fetchMetrics`
   - Line: 77

10. **components/data-room/qa-history-panel.tsx**
    - Missing: `loadHistory`
    - Line: 64

11. **components/data-room/upload-zone.tsx**
    - Missing: `uploadFile` (in useCallback)
    - Line: 57
    - **Special**: This is a useCallback issue, not useEffect
    - **Solution**: Add `uploadFile` dependencies to the useCallback

12. **components/preferences/preferences-panel.tsx**
    - Missing: `loadPreferences`
    - Line: 81

13. **components/red-flags/country-filter.tsx**
    - Missing: `fetchCountries`
    - Line: 95

14. **components/red-flags/red-flag-detail-modal.tsx**
    - Missing: `fetchFlagDetails`
    - Line: 119

## Verification Commands

After fixing all files:

```bash
# Check remaining Hook issues
npm run lint 2>&1 | grep -c "react-hooks/exhaustive-deps"
# Should output: 0

# Verify build works
npm run build

# Run tests (optional)
npm run test:e2e
```

## Estimated Time

- **Per file**: 3-5 minutes
- **Total for 14 files**: 45-60 minutes

## Risk Assessment

- **Low Risk** (13 files): Standard fetch function wrapping
- **Medium Risk** (1 file): `ai-insights-sidebar.tsx` with polling - test thoroughly after fix
