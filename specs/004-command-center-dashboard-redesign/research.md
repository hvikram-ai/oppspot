# Research & Technical Decisions
**Feature**: Command Center Dashboard Redesign
**Date**: 2025-10-01
**Status**: Complete

## Overview
This document captures technical research and decisions made for the dashboard redesign. Since the feature spec is comprehensive and all technical context is known (existing Next.js 15 stack), research focuses on best practices and implementation patterns.

---

## 1. Navigation Architecture

### Decision: Goal-Based Grouped Navigation
**Chosen**: 5 top-level navigation groups with collapsible sidebar

**Rationale**:
- **Cognitive Load**: 5±2 rule - humans can hold 5-9 items in working memory
- **Industry Standard**: Amplitude, Linear, Slack all use <6 primary nav items
- **Discoverability**: Grouping by workflow (Discover, Intelligence, Pipeline) is more intuitive than alphabetical feature lists
- **Mobile-Friendly**: 5 items fit in mobile bottom nav without overflow

**Alternatives Considered**:
- **Flat navigation (current)**: Rejected - 10+ items overwhelming, no hierarchy
- **Mega-menu dropdown**: Rejected - requires hover (poor mobile UX)
- **Sidebar-only**: Rejected - takes too much horizontal space on desktop

**Implementation Pattern**:
```typescript
const navGroups = [
  { id: 'home', label: 'Command Center', icon: Home, href: '/dashboard' },
  {
    id: 'discover',
    label: 'Discover',
    icon: Search,
    items: [
      { label: 'Search', href: '/search' },
      { label: 'Map View', href: '/map' },
      { label: 'Companies', href: '/companies' }
    ]
  },
  // ... more groups
]
```

---

## 2. AI Digest Implementation

### Decision: Server-Generated Daily Digest with Real-Time Updates
**Chosen**: Cron job generates digest at 8am user timezone, stores in DB, real-time updates via Supabase subscriptions

**Rationale**:
- **Performance**: Pre-generated digest loads instantly (no API calls on dashboard load)
- **Consistency**: Users see same digest throughout morning (predictable UX)
- **Real-time supplements**: New signals trigger real-time updates via Supabase Realtime
- **Cost Efficiency**: 1 AI call per user per day vs on-demand calls

**Alternatives Considered**:
- **On-demand generation**: Rejected - slow dashboard load (2-5s AI latency)
- **Client-side polling**: Rejected - inefficient, battery drain on mobile
- **Real-time only**: Rejected - overwhelming for users, no "morning ritual"

**Technical Approach**:
- Supabase Edge Function runs at 8am (uses pg_cron or Vercel cron)
- Query user activity from last 24 hours
- Call OpenRouter API to generate digest summary
- Store in `ai_digest` table with timestamp
- Frontend subscribes to table changes for real-time updates

**Data Model**:
```sql
CREATE TABLE ai_digest (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  digest_data JSONB, -- { opportunities: [], alerts: [], completions: [] }
  priority_score INTEGER, -- 1-10 for sorting
  read_at TIMESTAMP WITH TIME ZONE
);
```

---

## 3. Priority Queue Algorithm

### Decision: Rule-Based Scoring (Phase 1) → ML Model (Phase 2)
**Chosen**: Start with weighted formula, evolve to ML after collecting training data

**Phase 1 Formula** (launching):
```typescript
priority = (
  (opportunity_value * 0.4) +
  (urgency_score * 0.3) +
  (fit_score * 0.2) +
  (engagement_recency * 0.1)
) / Math.log(age_in_days + 1)
```

**Phase 2 Evolution** (3 months after launch):
- Collect implicit feedback: which items do users act on?
- Train gradient boosting model (XGBoost) on historical data
- Features: all Phase 1 inputs + user behavior patterns
- A/B test ML vs rule-based, switch if >10% improvement

**Rationale**:
- **Start Simple**: Rule-based is explainable, debuggable, fast to implement
- **Data-Driven Evolution**: Need real usage data to train effective ML model
- **User Trust**: Users can understand why items are prioritized

**Alternatives Considered**:
- **Pure recency**: Rejected - misses high-value old opportunities
- **ML from start**: Rejected - no training data yet, black box to users
- **Manual user sorting**: Rejected - defeats purpose of "intelligent" queue

---

## 4. Responsive Design Strategy

### Decision: Mobile-First with Tailwind Breakpoints
**Chosen**: Design mobile layouts first, progressively enhance for tablet/desktop

**Breakpoints** (Tailwind defaults):
- Mobile: Base styles (no prefix) - <640px
- SM: `sm:` prefix - ≥640px
- MD: `md:` prefix - ≥768px (tablet)
- LG: `lg:` prefix - ≥1024px (desktop)
- XL: `xl:` prefix - ≥1280px (large desktop)

**Key Responsive Patterns**:

**1. Navigation**:
- Mobile: Bottom nav bar (5 icons, label on active)
- Tablet: Collapsible sidebar + top nav
- Desktop: Persistent sidebar + full top nav

**2. Dashboard Grid**:
- Mobile: Single column, card stacking
- Tablet: 2-column grid
- Desktop: 3-4 column grid with sidebar

**3. Data Tables**:
- Mobile: Card view (not table)
- Tablet: Horizontal scroll table
- Desktop: Full table with sorting/filtering

**Rationale**:
- **40% mobile usage target**: Must be first-class experience
- **Touch targets**: 44x44px minimum (iOS Human Interface Guidelines)
- **Thumb zone**: Bottom nav in easy reach on mobile
- **Progressive enhancement**: Works on all devices, better on larger screens

**Technical Implementation**:
```tsx
// Mobile-first component example
<div className="flex flex-col md:flex-row lg:grid lg:grid-cols-3 gap-4">
  <Card className="w-full lg:col-span-2">
    {/* Priority Queue - full width mobile, 2/3 desktop */}
  </Card>
  <Card className="w-full lg:col-span-1">
    {/* Sidebar content */}
  </Card>
</div>
```

---

## 5. Performance Optimization

### Decision: Incremental Static Regeneration (ISR) + Client Prefetching
**Chosen**: ISR for dashboard skeleton, client-side fetch for user-specific data

**Architecture**:
```
1. Dashboard page (Next.js): ISR with 60s revalidation
   → Renders static shell (nav, layout, skeletons)

2. Client components mount:
   → Fetch user-specific data (metrics, digest, queue)
   → Show skeleton loaders during fetch
   → Cache responses with SWR (stale-while-revalidate)

3. Prefetch on hover:
   → Mouse over "Search" nav link → prefetch /search
   → Instant navigation when clicked
```

**Performance Targets**:
- **First Contentful Paint**: <1.0s (ISR provides instant shell)
- **Time to Interactive**: <2.5s (JavaScript hydration + data fetch)
- **Largest Contentful Paint**: <2.0s (user data renders)

**Implementation**:
```tsx
// Dashboard page (server component)
export default function DashboardPage() {
  return (
    <DashboardShell> {/* Static, cached via ISR */}
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection /> {/* Client component, fetches user data */}
      </Suspense>
      <Suspense fallback={<GridSkeleton />}>
        <InsightsGrid />
      </Suspense>
    </DashboardShell>
  )
}
```

**Caching Strategy**:
- **SWR**: 30s cache for metrics, 5min for digest
- **LocalStorage**: Persist last known state for offline
- **Optimistic UI**: Update immediately, rollback if fails

**Rationale**:
- **Instant shell**: ISR provides navigation and layout immediately
- **No flash of wrong data**: Skeletons instead of stale cached data
- **Offline resilience**: Last known state shown if network fails

**Alternatives Considered**:
- **Full SSR**: Rejected - slow TTFB waiting for user data queries
- **Pure CSR**: Rejected - poor initial load, SEO issues
- **SSG only**: Rejected - can't personalize without client fetch

---

## 6. Accessibility (WCAG 2.1 AA)

### Decision: Built-in Accessibility, Not Retrofit
**Chosen**: Accessibility requirements integrated from component creation

**Key Patterns**:

**1. Keyboard Navigation**:
```tsx
// Command palette (Cmd+K)
useEffect(() => {
  const down = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      setOpen((open) => !open)
    }
  }
  document.addEventListener('keydown', down)
  return () => document.removeEventListener('keydown', down)
}, [])
```

**2. Screen Reader Support**:
```tsx
// Priority queue item
<div
  role="article"
  aria-label={`${item.type}: ${item.title}, priority ${item.priority}`}
  tabIndex={0}
>
  <span className="sr-only">Urgency: {item.urgency}</span>
  {/* Visual content */}
</div>
```

**3. Color Contrast**:
- All text: minimum 4.5:1 contrast ratio
- Interactive elements: 3:1 minimum
- Use `clsx` to toggle high-contrast mode

**4. Focus Management**:
- Visible focus rings (not removed)
- Logical tab order (top to bottom, left to right)
- Skip links for nav bypass

**Testing Tools**:
- **axe-core**: Automated a11y tests in Playwright
- **NVDA/JAWS**: Manual screen reader testing
- **Keyboard only**: Full workflow test without mouse

**Rationale**:
- **Legal requirement**: WCAG AA compliance for B2B SaaS
- **Better UX for all**: Clear focus, logical structure helps everyone
- **SEO benefit**: Semantic HTML improves search ranking

---

## 7. State Management

### Decision: React Server Components + Zustand (Client State)
**Chosen**: Minimize client state, use server components where possible

**State Architecture**:

**Server State** (via React Server Components):
- User profile, permissions
- Dashboard config (card visibility, order)
- Initial data (metrics, digest)

**Client State** (Zustand stores):
```typescript
// dashboard-store.ts
interface DashboardStore {
  sidebarOpen: boolean
  activeTab: string
  filters: FilterState
  toggleSidebar: () => void
  setActiveTab: (tab: string) => void
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  sidebarOpen: true,
  activeTab: 'all',
  filters: {},
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveTab: (tab) => set({ activeTab: tab })
}))
```

**Why Not Redux/Context**:
- **Zustand**: Simpler API, less boilerplate, better performance
- **Context**: Causes re-renders of entire tree, Zustand is selective
- **Redux**: Overkill for dashboard UI state

**Data Fetching**:
- Use `fetch()` in server components (automatic deduplication)
- Use `useSWR` in client components (stale-while-revalidate)
- No global data store - fetch where needed

---

## 8. Animation & Micro-interactions

### Decision: Framer Motion for Complex, CSS for Simple
**Chosen**: Use existing Framer Motion library, fallback to CSS for performance

**Animation Hierarchy**:

**1. Page Transitions** (Framer Motion):
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {children}
</motion.div>
```

**2. Micro-interactions** (CSS):
```css
.card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}
```

**3. Loading States** (Framer Motion):
- Skeleton pulse animation
- Progress bars
- Spinner for critical actions

**Performance Considerations**:
- **GPU acceleration**: `transform` and `opacity` only
- **Reduce motion**: Respect `prefers-reduced-motion` media query
- **60fps target**: Monitor with Chrome DevTools

**Rationale**:
- **Framer Motion**: Already installed, handles complex sequences
- **CSS**: Faster for simple hovers, no JS overhead
- **Accessibility**: Honor user motion preferences

---

## 9. PWA (Progressive Web App)

### Decision: PWA with Workbox Service Worker
**Chosen**: Installable web app with offline capabilities

**PWA Features**:
1. **Manifest** (`/public/manifest.json`):
```json
{
  "name": "oppSpot Command Center",
  "short_name": "oppSpot",
  "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192" }],
  "start_url": "/dashboard",
  "display": "standalone",
  "theme_color": "#6366F1"
}
```

2. **Service Worker** (Workbox):
```typescript
// sw.ts
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST)

// Cache dashboard data (network-first)
registerRoute(
  /\/api\/dashboard/,
  new NetworkFirst({ cacheName: 'dashboard-data' })
)

// Cache images (cache-first)
registerRoute(
  /\.(png|jpg|svg)$/,
  new CacheFirst({ cacheName: 'images' })
)
```

3. **Offline Fallback**:
- Show cached dashboard with "Offline" indicator
- Queue actions (save lead, create list) to sync when online

**Benefits**:
- **Install to home screen**: Native app feel on mobile
- **Offline access**: View cached data, queue actions
- **Push notifications**: Re-engagement (future enhancement)
- **Faster load**: Cached assets

**Rationale**:
- **40% mobile users**: PWA provides app-like experience
- **Spotty network**: UK has many areas with poor 4G
- **No app store approval**: Deploy instantly, no gatekeepers

---

## 10. Testing Strategy

### Decision: Test Pyramid (E2E > Integration > Unit)
**Chosen**: Heavy E2E coverage with Playwright, selective unit tests

**Test Distribution**:
- **70% E2E** (Playwright): User workflows, responsive layouts
- **20% Integration** (React Testing Library): Component interactions
- **10% Unit** (Vitest): Utility functions, pure logic

**Key E2E Test Scenarios**:
```typescript
// dashboard-responsive.spec.ts
test('mobile user sees bottom navigation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
  await page.goto('/dashboard')
  await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible()
  await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeHidden()
})

// dashboard-digest.spec.ts
test('user sees AI digest with overnight discoveries', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.locator('[data-testid="ai-digest"]')).toContainText('found overnight')
})

// dashboard-priority-queue.spec.ts
test('priority queue shows high-urgency items first', async ({ page }) => {
  await page.goto('/dashboard')
  const items = page.locator('[data-testid="queue-item"]')
  await expect(items.first()).toHaveAttribute('data-priority', 'high')
})
```

**Visual Regression**:
```typescript
// Use Playwright's screenshot comparison
await expect(page).toHaveScreenshot('dashboard-desktop.png')
await page.setViewportSize({ width: 375, height: 667 })
await expect(page).toHaveScreenshot('dashboard-mobile.png')
```

**Rationale**:
- **E2E catches real issues**: Layout breaks, navigation failures, data loading
- **Fast feedback**: Playwright runs in parallel, <2 min test suite
- **Confidence to ship**: If E2E passes, dashboard works

---

## Technology Stack Summary

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend Framework** | Next.js 15 (App Router) | Existing stack, RSC support, excellent DX |
| **UI Components** | shadcn/ui + Tailwind | Already used, consistent design system |
| **State Management** | Zustand (client) + RSC (server) | Simple, performant, minimal boilerplate |
| **Animations** | Framer Motion + CSS | Complex sequences + performant micro-interactions |
| **Data Fetching** | SWR + native fetch | Stale-while-revalidate, automatic caching |
| **Database** | Supabase PostgreSQL | Existing, RLS for security, real-time subscriptions |
| **Testing** | Playwright (E2E) + RTL (integration) | Full coverage, visual regression, fast |
| **Performance** | ISR + Prefetch + SWR | <1s FCP, <2.5s TTI, offline support |
| **Accessibility** | Radix UI + axe-core | WCAG 2.1 AA, keyboard nav, screen readers |
| **PWA** | Workbox + manifest.json | Installable, offline-capable, native feel |

---

## Open Questions (Resolved)

**Q1: Custom dashboard layouts?**
✅ **Decision**: Role-based presets with toggle visibility (not drag-and-drop)
- Simpler to implement, 80% of value
- Future enhancement: drag-and-drop if user demand

**Q2: AI Digest frequency?**
✅ **Decision**: Daily at 8am user timezone
- Predictable morning routine
- Supplemented with real-time alerts for urgent items

**Q3: Priority queue algorithm?**
✅ **Decision**: Rule-based (launch) → ML model (3 months post-launch)
- Need usage data to train effective ML
- Explainable scoring builds user trust

**Q4: Mobile: PWA or native?**
✅ **Decision**: PWA (installable web app)
- Faster to market, one codebase
- Can build native later if needed

**Q5: Feature spotlight rotation?**
✅ **Decision**: Usage-based (show features user hasn't tried)
- Most relevant to each user
- Ensures 100% feature discovery over time

**Q6: Empty state strategy?**
✅ **Decision**: Helpful messages + optional interactive tutorial
- Clear guidance without confusion of sample data
- Tutorial for users who want hand-holding

---

## Implementation Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking existing dashboard | HIGH | MEDIUM | Feature flag rollout, side-by-side comparison |
| Performance regression | HIGH | MEDIUM | Lighthouse CI, bundle size monitoring |
| Mobile UX issues | MEDIUM | MEDIUM | Responsive E2E tests, mobile device testing |
| AI digest API costs | MEDIUM | LOW | Cache aggressively, batch API calls |
| User resistance to change | LOW | HIGH | Gradual rollout, clear value communication |

---

## Success Criteria

### Quantitative Metrics:
- ✅ Time to First Value < 60 seconds (new users)
- ✅ ResearchGPT™ discovery rate > 80% (week 1)
- ✅ Mobile engagement > 40% of sessions
- ✅ Lighthouse Performance score > 90
- ✅ WCAG 2.1 AA compliance (axe-core 0 violations)

### Qualitative Metrics:
- ✅ User can navigate to any feature in <2 clicks
- ✅ New user understands value within 30 seconds
- ✅ Dashboard feels "fast and modern" (user feedback)
- ✅ No support tickets about "where is feature X?"

---

**Status**: ✅ Research complete - All decisions documented, ready for Phase 1 (Design & Contracts)
