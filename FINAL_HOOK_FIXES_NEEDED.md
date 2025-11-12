# Final 9 React Hook Fixes - Ready to Apply

## Quick Apply Guide

All 9 remaining files follow the exact same pattern. Apply this to each:

### Pattern (Copy-Paste for Each File)

```typescript
// Step 1: Add useCallback to imports
import { useState, useEffect, useCallback } from 'react';

// Step 2: Wrap the function in useCallback (move BEFORE useEffect)
const functionName = useCallback(async () => {
  // ... existing function body stays the same
}, [/* dependencies - usually just IDs/props used inside */]);

// Step 3: Add function to useEffect dependencies
useEffect(() => {
  functionName();
}, [/* existing deps */,functionName]);
```

---

## Files to Fix (9 total, ~25 minutes)

### 1. `components/data-room/hypothesis/hypothesis-editor.tsx` ⚠️ (2 issues)

**Issue 1 (Line 68)**: Missing `fetchHypothesis`
**Issue 2 (Line 113)**: Missing `loadHypothesis`

```typescript
// Add to imports
import { useState, useEffect, useCallback } from 'react';

// Wrap fetchHypothesis
const fetchHypothesis = useCallback(async () => {
  // existing logic
}, [hypothesisId]);

// Update useEffect
useEffect(() => {
  fetchHypothesis();
}, [fetchHypothesis]); // was: [hypothesisId]

// Wrap loadHypothesis
const loadHypothesis = useCallback(async () => {
  // existing logic
}, [id]);

// Update useEffect
useEffect(() => {
  if (id) {
    loadHypothesis();
  }
}, [id, loadHypothesis]); // was: [id]
```

---

### 2. `components/data-room/hypothesis/hypothesis-list.tsx`

**Line 50**: Missing `fetchHypotheses`

```typescript
// Add to imports
import { useState, useEffect, useCallback } from 'react';

// Wrap function
const fetchHypotheses = useCallback(async () => {
  // existing logic
}, [dataRoomId, searchQuery, statusFilter]);

// Update useEffect
useEffect(() => {
  fetchHypotheses();
}, [fetchHypotheses]); // was: [dataRoomId, searchQuery, statusFilter]
```

---

### 3. `components/data-room/hypothesis/metrics-tracker.tsx`

**Line 77**: Missing `fetchMetrics`

```typescript
const fetchMetrics = useCallback(async () => {
  // existing logic
}, [hypothesisId]);

useEffect(() => {
  fetchMetrics();
}, [fetchMetrics]); // was: [hypothesisId]
```

---

### 4. `components/data-room/qa-history-panel.tsx`

**Line 64**: Missing `loadHistory`

```typescript
const loadHistory = useCallback(async () => {
  // existing logic
}, [dataRoomId, currentPage, searchQuery]);

useEffect(() => {
  loadHistory();
}, [loadHistory]); // was: [dataRoomId, currentPage, searchQuery]
```

---

### 5. `components/data-room/upload-zone.tsx` ⚠️ (Special - useCallback issue)

**Line 57**: Missing `uploadFile` dependency in useCallback

This is different - it's a useCallback that references another useCallback.

```typescript
// Ensure uploadFile is defined with useCallback
const uploadFile = useCallback(async (file: File) => {
  // existing logic
}, [dataRoomId, onUploadComplete]);

// Then reference it in the drop handler
const onDrop = useCallback(
  (acceptedFiles: File[]) => {
    acceptedFiles.forEach(uploadFile);
  },
  [uploadFile] // Add this dependency
);
```

---

### 6. `components/data-room/workflow-notification-preferences.tsx`

**Line 81**: Missing `loadPreferences`

```typescript
const loadPreferences = useCallback(async () => {
  // existing logic
}, [dataRoomId, userId]);

useEffect(() => {
  loadPreferences();
}, [loadPreferences]); // was: [dataRoomId, userId]
```

---

### 7. `components/opp-scan/steps/country-selection.tsx`

**Line 95**: Missing `fetchCountries`

```typescript
const fetchCountries = useCallback(async () => {
  // existing logic
}, []);

useEffect(() => {
  fetchCountries();
}, [fetchCountries]); // was: []
```

---

### 8. `components/red-flags/red-flag-detail-drawer.tsx`

**Line 119**: Missing `fetchFlagDetails`

```typescript
const fetchFlagDetails = useCallback(async () => {
  // existing logic
}, [flagId, companyId]);

useEffect(() => {
  if (open && flagId) {
    fetchFlagDetails();
  }
}, [open, flagId, fetchFlagDetails]); // was: [open, flagId]
```

---

## Verification Commands

After fixing each file:

```bash
# Check progress
npm run lint 2>&1 | grep -c "react-hooks/exhaustive-deps"
# Should decrease: 9 → 8 → 7 → ... → 0

# Verify no new issues introduced
npm run build
```

---

## Why These Fixes Matter

Each fix prevents:
- ✅ Stale closures (function references old state/props)
- ✅ Missing updates when dependencies change
- ✅ Infinite render loops (if improperly fixed)
- ✅ Race conditions in async operations

---

## Estimated Time

- **Per file**: 2-3 minutes
- **Total**: 18-27 minutes
- **With testing**: 25 minutes

---

## Quick Checklist

- [ ] 1. hypothesis-editor.tsx (2 fixes)
- [ ] 2. hypothesis-list.tsx
- [ ] 3. metrics-tracker.tsx
- [ ] 4. qa-history-panel.tsx
- [ ] 5. upload-zone.tsx (special case)
- [ ] 6. workflow-notification-preferences.tsx
- [ ] 7. country-selection.tsx
- [ ] 8. red-flag-detail-drawer.tsx

**When all complete**: `npm run lint 2>&1 | grep -c "react-hooks/exhaustive-deps"` should return `0`
