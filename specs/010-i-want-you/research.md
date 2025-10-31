# Phase 0: Research & Technical Decisions

**Feature**: Live Demo Session Enhancement
**Date**: 2025-10-30
**Status**: Complete

---

## Executive Summary

oppSpot has **90% of the demo infrastructure already built**, requiring only targeted enhancements for conversion optimization. The existing demo mode (`lib/demo/`, `components/demo/`) provides solid foundations with React Context state management, localStorage persistence, and comprehensive demo data including 6 businesses and 127-target acquisition scans.

**Key Finding**: This is primarily a **content creation + guided tour implementation** task, not a greenfield project.

---

## 1. Guided Tour Library

### Decision: Driver.js

**Rationale**:
- **Lightweight**: 5KB gzipped vs. 20KB for react-joyride
- **TypeScript Native**: Built-in type definitions
- **Next.js 15 Compatible**: Works seamlessly with Server/Client Components
- **Tailwind-Friendly**: Easy custom styling
- **localStorage Integration**: Built-in progress tracking
- **Active Development**: 22K+ GitHub stars, maintained

**Installation**:
```bash
npm install driver.js
```

**Alternatives Considered**:
- **react-joyride**: Rejected (4x larger, React-specific limitations)
- **intro.js**: Rejected (older, jQuery legacy, styling constraints)
- **shepherd.js**: Rejected (complex API, unnecessary features)

**Implementation Pattern**:
```typescript
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const driverObj = driver({
  showProgress: true,
  steps: [/* 8-10 steps */],
  onDestroyed: () => localStorage.setItem('tour-completed', 'true')
})
```

---

## 2. Analytics Tracking

### Decision: Extend Existing Pattern

**Current Implementation**: `/lib/analytics/command-bar-analytics.ts` - Batched event tracking with localStorage fallback

**Pattern to Follow**:
```typescript
class DemoTourAnalytics {
  private endpoint = '/api/analytics/demo-tours'
  private queue: DemoTourEventData[] = []
  private FLUSH_INTERVAL = 5000 // 5 seconds

  track(data: Omit<DemoTourEventData, 'timestamp'>) {
    const event = { ...data, timestamp: Date.now() }
    this.queue.push(event)
    this.logToLocalStorage(event) // Offline tracking

    if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), this.FLUSH_INTERVAL)
    }
  }

  private async flush() {
    await fetch(this.endpoint, {
      method: 'POST',
      body: JSON.stringify({ events: this.queue })
    })
    this.queue = []
  }
}
```

**Event Types**:
- `tour_started`, `tour_step_viewed`, `tour_completed`, `tour_abandoned`
- `exit_intent_shown`, `exit_intent_dismissed`, `exit_intent_converted`
- `demo_feature_explored`, `demo_upgrade_prompt_shown`, `demo_signup_initiated`

**Rationale**: Reuse proven patterns, maintain consistency, offline-capable

**Alternatives Considered**:
- **Google Analytics only**: Rejected (no offline support, less granular)
- **Third-party analytics SaaS**: Rejected (cost, GDPR concerns, vendor lock-in)

---

## 3. Exit Intent Detection

### Decision: Native Browser APIs

**Rationale**: No library needed, 3 complementary detection methods

**Method 1: Mouse Leave (Desktop)**:
```typescript
document.addEventListener('mouseleave', (e: MouseEvent) => {
  if (e.clientY <= 0 && !hasShown) {
    showExitIntentModal()
    sessionStorage.setItem('exit-intent-shown', 'true')
  }
})
```

**Method 2: Visibility Change (Tab Switch)**:
```typescript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && !hasShown) {
    showExitIntentModal()
  }
})
```

**Method 3: Browser Back Button**:
```typescript
window.addEventListener('popstate', () => {
  if (!hasShown) {
    showExitIntentModal()
  }
})
```

**Best Practices Applied**:
- Show once per session (`sessionStorage`)
- 30-second delay before activation
- Respect intentional exits (clicked "Exit Demo" button)
- Mobile: Scroll-based triggers (no mouse events)

**Alternatives Considered**:
- **react-exit-intent**: Rejected (unmaintained, unnecessary dependency)
- **use-exit-intent hook**: Rejected (limited features, 2KB for simple logic)

---

## 4. localStorage Management

### Decision: Custom TypeScript Utility

**Rationale**: Type safety, expiry management, cross-tab sync, error handling

**Implementation**:
```typescript
export class LocalStorageManager<T> {
  constructor(private config: {
    key: string
    defaultValue?: T
    expiry?: number // milliseconds
    serialize?: (value: T) => string
    deserialize?: (value: string) => T
  }) {}

  get(): T | null {
    const item = localStorage.getItem(this.config.key)
    if (!item) return this.config.defaultValue ?? null

    const parsed = JSON.parse(item)

    // Check expiry
    if (this.config.expiry && parsed.timestamp) {
      const age = Date.now() - parsed.timestamp
      if (age > this.config.expiry) {
        this.remove()
        return this.config.defaultValue ?? null
      }
    }

    return parsed.value
  }

  set(value: T): void {
    const item = { value, timestamp: Date.now() }
    localStorage.setItem(this.config.key, JSON.stringify(item))
  }

  // Cross-tab sync
  subscribe(callback: (value: T | null) => void): () => void {
    const handler = (e: StorageEvent) => {
      if (e.key === this.config.key) callback(this.get())
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }
}
```

**Usage Example**:
```typescript
const tourProgress = new LocalStorageManager({
  key: 'oppspot:demo-tour-progress',
  defaultValue: { completed: false, step: 0 },
  expiry: 30 * 24 * 60 * 60 * 1000 // 30 days
})
```

**Alternatives Considered**:
- **Direct localStorage access**: Rejected (current pattern, no type safety)
- **localforage**: Rejected (overkill, IndexedDB not needed)
- **zustand/persist**: Rejected (coupling to state management)

---

## 5. Conversion Prompt Components

### Decision: Radix UI Dialog (Existing)

**Current Implementation**: `/components/ui/dialog.tsx` - shadcn/ui Radix Dialog

**Rationale**: Already installed, styled with Tailwind, accessible (ARIA), animation support

**Pattern for Upgrade Prompts**:
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function UpgradePrompt({
  open,
  onOpenChange,
  trigger: 'exit_intent' | 'feature_restriction' | 'quota_limit'
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Wait! You're exploring with sample data</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Benefits list */}
        </div>
        <Button onClick={handleSignUp}>Create Free Account</Button>
      </DialogContent>
    </Dialog>
  )
}
```

**Rate Limiting**:
```typescript
class PromptFrequencyManager {
  canShow(promptType: string): boolean {
    const lastShown = this.getLastShown(promptType)
    if (!lastShown) return true

    // Show max once per hour
    const hoursSince = (Date.now() - lastShown) / (1000 * 60 * 60)
    return hoursSince >= 1
  }
}
```

**Alternatives Considered**: None needed, existing components sufficient

---

## 6. Pre-Seeded Demo Content Strategy

### Decision: Static JSON Data Files

**Rationale**:
- Instant loading (<2s requirement)
- No API calls in demo mode
- Predictable, controlled experience
- Easy to update/maintain

### A. ResearchGPT Reports (3 samples)

**Target Demo Companies**:
1. **TechHub Solutions** (Software, London) - High-growth SaaS
2. **Green Energy Partners** (Energy, Edinburgh) - Renewable energy
3. **FinTech Innovations** (Finance, Dublin) - Financial technology

**Per Report**:
- 6 sections: snapshot, buying_signals, decision_makers, revenue_signals, recommended_approach, sources
- 8-10 buying signals per company
- 5-8 decision makers per company
- 10-15 revenue signals per company
- 15+ sources per company
- **Total**: 18 sections, 45+ sources, 30+ signals

**Schema**: `/types/research-gpt.ts` (existing)

**Storage**: `/lib/demo/demo-research-data.ts` (new file)

### B. Data Room Documents (5 samples)

**Document Types**:
1. **Q4_2024_Financial_Statement.pdf** - Financial (TechHub Solutions)
2. **Enterprise_Customer_Agreement_Acme.pdf** - Contract (TechHub)
3. **Due_Diligence_Report_GreenEnergy.pdf** - Due Diligence (Green Energy)
4. **Employment_Agreement_Template.pdf** - HR (Generic)
5. **NDA_Confidentiality_Agreement.pdf** - Legal (Generic)

**Per Document**:
- AI classification (document_type, confidence_score)
- Extracted metadata (dates, amounts, parties, contract terms)
- Document analysis (findings, risks, anomalies)

**Schema**: `/lib/data-room/types.ts` (existing)

**Storage**: `/lib/demo/demo-dataroom-data.ts` (new file)

**Note**: Actual PDF files in `/public/demo-docs/` (placeholder PDFs with representative content)

### C. Q&A Queries (5-8 samples)

**Question Categories**:
1. **Financial**: "What were the revenue projections for Q3 2024?"
2. **Contractual**: "What are the key terms of the Acme Corporation contract?"
3. **Risk**: "Are there any red flags in the financial statements?"
4. **Compliance**: "What are the termination clauses in the customer agreements?"
5. **Operational**: "What is the company's tech stack and infrastructure?"

**Per Query**:
- Question text
- Grounded answer (2-4 sentences)
- 2-4 citations with page numbers, relevance scores
- Performance metrics (retrieval_time_ms, total_time_ms)

**Schema**: `/types/data-room-qa.ts` (existing)

**Storage**: `/lib/demo/demo-qa-data.ts` (new file)

**Alternatives Considered**:
- **Dynamic generation**: Rejected (violates <2s load requirement, API costs)
- **Server-side rendering**: Rejected (complexity, caching issues)

---

## 7. Testing Approach

### Decision: Playwright E2E + Contract Tests (Existing Pattern)

**Rationale**: 27 E2E tests already exist, proven patterns, matches team skills

**Test Categories**:

**1. Tour Flow Tests** (`tests/e2e/demo-tour-*.spec.ts`):
- Happy path: Complete tour from start to finish
- Skip tour: Verify tour can be dismissed
- Resume tour: Verify tour resumes after page navigation
- Tour persistence: Verify localStorage state across sessions
- Mobile responsive: Tour adapts to smaller screens

**2. Exit Intent Tests** (`tests/e2e/demo-exit-intent.spec.ts`):
- Mouse leave detection
- Visibility change (tab switch)
- Back button press
- Session limit (only once)
- Analytics tracking

**3. Pre-Seeded Content Tests** (`tests/e2e/demo-content-*.spec.ts`):
- ResearchGPT reports load instantly
- Data Room documents display correctly
- Q&A queries show with citations
- All demo data marked with badges

**4. Conversion Flow Tests** (`tests/e2e/demo-conversion.spec.ts`):
- Upgrade prompt triggers (feature restriction, quota limit)
- Signup flow preserves demo state
- Analytics events fire correctly
- Rate limiting prevents prompt fatigue

**5. Contract Tests** (`tests/contract/demo-*.contract.test.ts`):
- Demo mode API endpoints (if any)
- Tour state structure validation
- Analytics event schema validation

**Existing Test Helpers**: `/tests/helpers/test-helpers.ts` (login, waitForDataLoad, etc.)

**Playwright Config**: Base URL `http://localhost:3009`, 3 browsers + mobile viewports

**Alternatives Considered**: None, existing setup is comprehensive

---

## 8. Technology Stack Summary

| Component | Decision | Existing/New | Rationale |
|-----------|----------|--------------|-----------|
| **Frontend Framework** | Next.js 15 (App Router) | Existing | Current stack, Server/Client Components |
| **State Management** | React Context (`demo-context.tsx`) | Existing | Already implemented, sufficient for demo |
| **Styling** | Tailwind CSS | Existing | Consistent with codebase |
| **UI Components** | shadcn/ui (Radix UI) | Existing | Dialog, Button, Badge, etc. |
| **Guided Tours** | Driver.js | **New** | Lightweight, TypeScript, responsive |
| **Analytics** | Custom batched tracking | Extend Existing | Proven pattern, offline-capable |
| **Exit Intent** | Native Browser APIs | **New** | No library needed, 3 detection methods |
| **localStorage** | Custom TypeScript utility | **New** | Type safety, expiry, cross-tab sync |
| **Pre-Seeded Data** | Static JSON in `/lib/demo/` | **New** | Instant loading, predictable |
| **Testing** | Playwright E2E + Contract | Existing | 27 tests exist, proven patterns |

---

## 9. Performance Considerations

### Requirements from Spec:
- **Demo content loads**: <2 seconds (FR-010)
- **Tour initialization**: <1 second
- **Exit intent detection**: <100ms
- **Analytics flush**: 5 seconds (batched)

### Optimization Strategies:

**1. Pre-Seeded Content**:
- Static imports (no fetch calls)
- Tree-shaking via named exports
- Lazy load heavy content (images in documents)

**2. Driver.js**:
- CSS loaded once globally
- Tour instance created on-demand
- Cleanup on unmount

**3. Analytics**:
- Batch events (5s interval)
- localStorage fallback for offline
- Async flush, non-blocking

**4. Exit Intent**:
- Event listeners added after 30s delay
- Debounced mouse tracking (100ms)
- Immediate cleanup on trigger

---

## 10. GDPR & Privacy Compliance

### Demo Mode Privacy Characteristics:
- **No PII Collected**: Demo users are anonymous until signup
- **localStorage Only**: No server-side tracking of demo sessions
- **Analytics Anonymized**: No user IDs, device fingerprinting
- **Email Capture**: Only on explicit signup intent (exit intent modal)
- **Demo Content**: Fictional companies, no real individuals
- **Decision Makers**: Only public data (Companies House, LinkedIn profiles)

### Compliance Measures:
- **Cookie Banner**: Not required (no tracking cookies in demo)
- **Privacy Policy**: Link in demo banner footer
- **Data Deletion**: Demo state auto-expires (24 hours)
- **GDPR Rights**: Demo users can clear localStorage manually

---

## 11. Existing Demo Infrastructure (Leverage)

### Already Built (90% Complete):

**`lib/demo/demo-context.tsx`** (310 lines):
- React Context provider with `isDemoMode`, `enableDemoMode`, `disableDemoMode`
- Action permissions system (`canPerformAction()`)
- Demo scans management (localStorage)
- Google Analytics integration
- Upgrade prompt hooks

**`lib/demo/demo-data.ts`** (356 lines):
- 6 demo businesses (full profiles, metadata, financials)
- Demo metrics, opportunities, trends, competitors, notifications
- Demo user profile

**`lib/opp-scan/demo-results-data.ts`** (719 lines):
- 4 pre-configured acquisition scans
- Dynamic target generation (18 companies with full financial data)
- `DemoResultsDataGenerator` class

**`components/demo/demo-banner.tsx`** (176 lines):
- Persistent banner with minimize/expand
- CTAs: "Create Free Account", "Sign In", "Exit Demo"
- `DemoRestrictionModal` for blocked actions
- Framer Motion animations

**What's Missing** (10% to build):
1. Guided tour system (Driver.js integration)
2. Pre-seeded ResearchGPT reports (3 companies)
3. Pre-seeded Data Room documents (5 PDFs + analysis)
4. Pre-seeded Q&A queries (5-8 samples)
5. Exit intent detection
6. Tour analytics tracking
7. Tour progress persistence
8. Feature-specific tours (ResearchGPT, Data Room, Q&A)

---

## 12. Implementation Priorities

### Phase 1: Core Tour System (Days 1-2)
1. Install Driver.js
2. Create tour definitions (welcome tour, 8-10 steps)
3. Tour state management (localStorage)
4. Tour analytics tracking
5. Basic E2E tests

### Phase 2: Pre-Seeded Content (Days 2-3)
1. Generate 3 ResearchGPT reports (full schema)
2. Create 5 Data Room document metadata
3. Generate 5-8 Q&A query/answer pairs
4. Create placeholder PDFs for Data Room
5. Integrate into existing demo mode

### Phase 3: Conversion Optimization (Days 3-4)
1. Exit intent detection (3 methods)
2. Upgrade prompt components (4 trigger types)
3. Prompt frequency management
4. Session analytics
5. E2E conversion flow tests

### Phase 4: Polish & Testing (Days 4-5)
1. Feature-specific tours (ResearchGPT, Data Room, Q&A)
2. Mobile responsive testing
3. Tour replay functionality
4. Demo reset functionality
5. Comprehensive E2E test suite

---

## 13. Key Files to Create

### New Files (10 files):
1. `/lib/demo/demo-research-data.ts` - ResearchGPT reports (3 companies, 18 sections)
2. `/lib/demo/demo-dataroom-data.ts` - Data Room documents (5 docs + analysis)
3. `/lib/demo/demo-qa-data.ts` - Q&A queries (5-8 pairs)
4. `/lib/utils/local-storage-manager.ts` - localStorage utility
5. `/lib/analytics/demo-tour-analytics.ts` - Tour event tracking
6. `/components/demo/tour/welcome-tour.tsx` - Main guided tour
7. `/components/demo/tour/feature-tours.tsx` - Feature-specific tours
8. `/components/demo/exit-intent-modal.tsx` - Exit intent component
9. `/components/demo/conversion-prompts/upgrade-prompt.tsx` - Upgrade CTAs
10. `/lib/utils/prompt-frequency-manager.ts` - Rate limiting

### New Test Files (5 files):
1. `/tests/e2e/demo-tour-happy-path.spec.ts`
2. `/tests/e2e/demo-tour-exit-intent.spec.ts`
3. `/tests/e2e/demo-content-preseeded.spec.ts`
4. `/tests/e2e/demo-conversion-flow.spec.ts`
5. `/tests/contract/demo-tour-analytics.contract.test.ts`

### Modified Files (3 files):
1. `/lib/demo/demo-context.tsx` - Add tour state management
2. `/components/demo/demo-banner.tsx` - Add "Replay Tour" button
3. `/app/layout.tsx` - Add Driver.js CSS import

---

## 14. Dependencies to Add

```json
{
  "dependencies": {
    "driver.js": "^1.3.1"
  }
}
```

**Existing Dependencies (Reuse)**:
- `@radix-ui/react-dialog` - Modals
- `framer-motion` - Animations
- `lucide-react` - Icons
- `next` - Framework
- `react` - UI library
- `@playwright/test` - E2E tests

---

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Pre-seeded content becomes stale** | Medium | Document update schedule (quarterly), create admin script to regenerate |
| **Tour blocks critical functionality** | High | Always allow tour skip, test with real users, A/B test tour timing |
| **localStorage limits exceeded** | Medium | Monitor usage (<5MB), implement cleanup, warn at 90% |
| **Mobile tour experience poor** | Medium | Responsive testing, simplified mobile tour (5 steps vs 10) |
| **Conversion prompts annoy users** | High | Rate limiting (1/hour), session limits, respect dismissals |
| **Driver.js breaking changes** | Low | Pin version (^1.3.1), test before upgrades |

---

## 16. Success Criteria (Technical)

### Functional:
- [ ] Tour completes successfully on desktop (Chromium, Firefox, WebKit)
- [ ] Tour completes successfully on mobile (iOS Safari, Android Chrome)
- [ ] Pre-seeded content loads in <2 seconds (90th percentile)
- [ ] Exit intent triggers within 100ms of detection
- [ ] Analytics events flush within 5 seconds (batched)
- [ ] Tour state persists across page navigations
- [ ] Tour state persists across browser sessions (until expiry)
- [ ] Cross-tab sync works (tour progress reflected in other tabs)

### Non-Functional:
- [ ] Zero console errors during tour
- [ ] Lighthouse Performance score >90
- [ ] Accessibility score >95 (WCAG AA compliant)
- [ ] Mobile Lighthouse score >85
- [ ] Bundle size increase <50KB (gzipped)
- [ ] localStorage usage <500KB for demo mode

### Testing:
- [ ] 100% pass rate on E2E tour tests (5 files)
- [ ] 100% pass rate on contract tests
- [ ] Zero flaky tests (<1% failure rate over 100 runs)

---

## 17. Open Questions (Resolved)

| Question | Answer | Source |
|----------|--------|--------|
| Which guided tour library? | **Driver.js** | Research comparison (lightweight, TypeScript, Next.js compatible) |
| Static or dynamic demo content? | **Static JSON** | Performance requirement (<2s load), cost savings (no API calls) |
| Exit intent library needed? | **No, native APIs** | Sufficient with 3 detection methods, no dependency needed |
| localStorage abstraction? | **Yes, custom utility** | Type safety, expiry management, cross-tab sync |
| Separate analytics service? | **No, extend existing** | Consistent with command-bar-analytics.ts pattern |
| How many pre-seeded reports? | **3 ResearchGPT, 5 Data Room docs, 5-8 Q&A** | Spec requirements + demo variety |
| Tour on every page or dashboard only? | **Dashboard + feature-specific** | Welcome tour on dashboard, mini-tours on ResearchGPT/Data Room/Q&A |
| Mobile tour different from desktop? | **Simplified (5 steps vs 10)** | Mobile UX best practices, smaller screens |

---

## 18. Conclusion

This feature is **highly feasible** with **4-6 day implementation** timeline due to:

1. **90% infrastructure exists**: Demo mode, state management, UI components, analytics
2. **Proven patterns**: Reuse existing analytics, modal, localStorage patterns
3. **Minimal dependencies**: Only Driver.js needed (5KB)
4. **Clear scope**: 3 ResearchGPT reports, 5 Data Room docs, 5-8 Q&A, 1 guided tour
5. **Testable**: E2E patterns established, 27 existing tests to follow

**Recommended Next Steps**:
1. Approve this research document
2. Proceed to Phase 1: Design & Contracts (`/plan` command continues)
3. Generate data models, API contracts, quickstart guide
4. Create tasks.md with ordered implementation steps (`/tasks` command)

---

**Research Complete** ✅
**All NEEDS CLARIFICATION Resolved** ✅
**Ready for Phase 1: Design** ✅
