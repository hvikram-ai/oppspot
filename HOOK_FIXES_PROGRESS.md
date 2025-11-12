# React Hook Fixes - Progress Report

## Status: 7/17 Complete (41%)

### ✅ Fixed (7 files)
1. ✅ `app/(dashboard)/competitive-analysis/[id]/page.tsx`
2. ✅ `app/(dashboard)/competitive-analysis/[id]/share/page.tsx`
3. ✅ `app/(dashboard)/competitive-intelligence/[id]/page.tsx`
4. ✅ `app/companies/[id]/esg/page.tsx`
5. ✅ `components/data-room/ai-insights-sidebar.tsx` (Critical - Polling)
6. ✅ `components/competitive-analysis/analysis-list.tsx`
7. ✅ `components/competitive-analysis/share-dialog.tsx`

### 🔧 Remaining (10 files)

All follow the same pattern - wrap function in useCallback, add to deps.

#### 1. `components/data-room/hypothesis/evidence-panel.tsx`
Line 68: Missing `fetchEvidence`

#### 2. `components/data-room/hypothesis/hypothesis-editor.tsx` (2 issues)
- Line 68: Missing `fetchHypothesis`
- Line 113: Missing `loadHypothesis`

#### 3. `components/data-room/hypothesis/hypothesis-list.tsx`
Line 50: Missing `fetchHypotheses`

#### 4. `components/data-room/hypothesis/metrics-tracker.tsx`
Line 77: Missing `fetchMetrics`

#### 5. `components/data-room/qa-history-panel.tsx`
Line 64: Missing `loadHistory`

#### 6. `components/data-room/upload-zone.tsx`
Line 57: Missing `uploadFile` (in useCallback, not useEffect)

#### 7. `components/data-room/workflow-notification-preferences.tsx`
Missing dependencies (new file found)

#### 8. `components/red-flags/red-flag-detail-drawer.tsx`
Missing dependencies (updated from red-flag-detail-modal.tsx)

## Pattern to Apply

For each file:

```typescript
// 1. Add useCallback to imports
import { useState, useEffect, useCallback } from 'react';

// 2. Wrap function in useCallback
const fetchData = useCallback(async () => {
  // existing logic
}, [/* dependencies used inside function */]);

// 3. Add callback to useEffect
useEffect(() => {
  fetchData();
}, [/* existing deps */, fetchData]);
```

## Commands to Verify

```bash
# Check remaining count
npm run lint 2>&1 | grep -c "react-hooks/exhaustive-deps"
# Should show: 10 → 0

# Build still works
npm run build
```

## Estimated Time Remaining
- **Per file**: 3-5 minutes
- **Total**: 30-40 minutes
