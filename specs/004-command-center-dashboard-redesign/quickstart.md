# Quickstart: Command Center Dashboard

**Purpose**: Validate that the redesigned dashboard works correctly through realistic user scenarios
**Duration**: ~10 minutes
**Prerequisites**: Development environment running, test user account created

---

## Setup

###1. Start Development Environment
```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start Supabase (if local)
supabase start
```

### 2. Create Test User (if needed)
```bash
npm run create-account
# Or use demo account: demo@oppspot.com / Demo123456!
```

### 3. Seed Test Data
```bash
# Run seed script to populate dashboard data
npx tsx scripts/seed-dashboard-data.ts
```

---

## Scenario 1: New User First Experience (Time to First Value)

**Objective**: New user understands value and completes first action within 60 seconds

### Steps:

1. **Navigate to dashboard** (logged out state)
   ```
   http://localhost:3000/login
   ```

2. **Login with fresh account**
   - Email: `newuser@test.com`
   - Password: `Test123456!`

3. **✅ Verify: Empty State Guidance**
   - [ ] Hero section shows "Welcome! Let's find your first opportunity"
   - [ ] Clear primary CTA: "Start Discovery Search" button visible
   - [ ] Optional "Take 2-minute tour" link present
   - [ ] Empty state cards show helpful messages (not just "0")
   - [ ] No "null" or "undefined" errors

4. **Click "Start Discovery Search"**
   - [ ] Navigation to `/search` is instant (<100ms perceived)
   - [ ] Search page loads with helpful placeholder

5. **Return to dashboard**
   - [ ] Dashboard remembers state (no full reload)
   - [ ] Recent activity shows "Viewed search page"

**Success Criteria**:
- ✅ User completes first action (viewed search) within 60 seconds
- ✅ Value proposition clear within first 3 seconds
- ✅ No confusion about "what to do next"

---

## Scenario 2: Power User Daily Workflow (AI Digest & Priority Queue)

**Objective**: Returning user sees overnight discoveries and knows exactly what to do

### Steps:

1. **Login as power user**
   ```
   Email: demo@oppspot.com
   Password: Demo123456!
   ```

2. **✅ Verify: AI Digest Card (Top of Page)**
   - [ ] AI Digest card visible above the fold
   - [ ] Shows overnight discoveries count (e.g., "8 new opportunities found")
   - [ ] Displays urgent alerts (e.g., "3 leads need follow-up")
   - [ ] Shows completed research reports overnight
   - [ ] "View All" button expands full digest

3. **✅ Verify: Impact Metrics**
   - [ ] "Time saved this week" metric shows calculated hours
   - [ ] "Pipeline value" shows currency amount (not just count)
   - [ ] Metrics have trend indicators (↑ 12% vs last week)
   - [ ] Clicking metric drills down to detail view

4. **✅ Verify: Priority Queue**
   - [ ] Queue items ranked by priority (high urgency first)
   - [ ] Each item shows: title, description, urgency badge, action button
   - [ ] High-priority items have 🔥 indicator
   - [ ] One-click actions work ("View Research", "Contact Lead")

5. **Interact with queue item**
   - Click "View Research" on top priority item
   - [ ] Navigation works correctly
   - [ ] Research report opens
   - Return to dashboard
   - [ ] Queue item marked as "in progress" or completed

**Success Criteria**:
- ✅ All overnight work visible immediately
- ✅ Clear prioritization of actions
- ✅ One-click access to high-value tasks
- ✅ No manual checking of multiple pages

---

## Scenario 3: Feature Discovery (ResearchGPT™ Visibility)

**Objective**: User discovers and tries ResearchGPT™ within first week (80% target)

### Steps:

1. **Login as user who hasn't used ResearchGPT™**
   ```
   Email: feature-hunter@test.com
   Password: Test123456!
   ```

2. **✅ Verify: Feature Spotlight**
   - [ ] Feature Spotlight carousel visible
   - [ ] ResearchGPT™ card in top 3 spotlights
   - [ ] Card shows: icon, "NEW" badge, description, "Try It Now" CTA
   - [ ] Credits remaining displayed (e.g., "100/100 credits")

3. **✅ Verify: Navigation Access**
   - [ ] Top navigation has "Intelligence" group
   - [ ] Dropdown shows "ResearchGPT™" option
   - [ ] Hover tooltip explains feature

4. **✅ Verify: Quick Actions**
   - [ ] "Generate Research" button in top 3 quick actions
   - [ ] Button prominent (gradient background for premium features)
   - [ ] Click opens research modal or page

5. **Click "Try It Now" from spotlight**
   - [ ] Navigation to `/research` or research modal opens
   - [ ] Company search/autocomplete ready
   - [ ] Credits remaining visible inline

6. **Generate first research report**
   - Search for "Monzo"
   - Click "Generate Report"
   - [ ] Progress indicator shows (2-second polling)
   - [ ] Report completes in <30 seconds
   - [ ] Success message shown
   - [ ] Credits updated (99/100)

7. **Return to dashboard**
   - [ ] Feature Spotlight no longer shows ResearchGPT™ (user has tried it)
   - [ ] Next spotlight appears (e.g., "Opp Scan", "AI Scoring")

**Success Criteria**:
- ✅ ResearchGPT™ discoverable within 3 clicks
- ✅ Multiple discovery paths (spotlight, nav, quick actions)
- ✅ Clear usage limits shown
- ✅ First-time experience smooth and fast

---

## Scenario 4: Mobile Experience (Responsive & Touch-Friendly)

**Objective**: Mobile user can access all features with thumb-friendly navigation

### Steps:

1. **Open dashboard on mobile** (or resize browser to 375px width)
   ```
   Chrome DevTools > Toggle Device Toolbar > iPhone SE
   ```

2. **✅ Verify: Mobile Navigation**
   - [ ] Bottom navigation bar visible (5 icons)
   - [ ] Active tab highlighted
   - [ ] Labels show on active tab only
   - [ ] Desktop sidebar hidden
   - [ ] Touch targets minimum 44x44px

3. **✅ Verify: Mobile Layout**
   - [ ] Single column card stacking (no horizontal scroll)
   - [ ] Cards stack in priority order (digest → metrics → queue)
   - [ ] Text readable without zoom
   - [ ] Buttons easy to tap (no fat-finger errors)

4. **✅ Verify: Swipeable Cards**
   - [ ] Stats cards swipeable left/right
   - [ ] Swipe indicators visible (dots below card)
   - [ ] Smooth animation (60fps)

5. **✅ Verify: Mobile Interactions**
   - Pull down to refresh dashboard
   - [ ] Refresh animation shows
   - [ ] Data reloads
   - Tap priority queue item
   - [ ] Item expands to show full details
   - [ ] Actions (View, Dismiss) easy to tap

6. **✅ Verify: Mobile Performance**
   - [ ] Dashboard loads in <2 seconds on 3G (DevTools throttle)
   - [ ] No layout shift (CLS < 0.1)
   - [ ] Smooth scrolling (no jank)

**Success Criteria**:
- ✅ All features accessible on mobile
- ✅ Thumb zone navigation (bottom bar)
- ✅ No horizontal scroll required
- ✅ Performance <2s on 3G

---

## Scenario 5: Accessibility (Keyboard & Screen Reader)

**Objective**: Dashboard fully usable without mouse, accessible to screen readers

### Steps:

1. **Keyboard-Only Navigation**
   - Disconnect mouse or commit to not using it
   - Press `Tab` to navigate
   - [ ] Visible focus indicators on all interactive elements
   - [ ] Logical tab order (top to bottom, left to right)
   - [ ] No keyboard traps (can always Tab to next element)

2. **✅ Verify: Keyboard Shortcuts**
   - Press `Cmd/Ctrl + K`
   - [ ] Command palette opens
   - Type "research"
   - [ ] ResearchGPT™ appears in results
   - Press `Enter`
   - [ ] Navigates to research page

3. **✅ Verify: Screen Reader Support** (macOS VoiceOver or NVDA)
   - Enable VoiceOver: `Cmd + F5`
   - Navigate dashboard with `VO + →`
   - [ ] All cards announced with purpose
   - [ ] Priority queue items read with priority level
   - [ ] Buttons announce action (e.g., "View Research, button")
   - [ ] Images have alt text
   - [ ] Form inputs have labels

4. **✅ Verify: Color Contrast**
   - Open Chrome DevTools > Lighthouse
   - Run accessibility audit
   - [ ] All text meets 4.5:1 contrast ratio (WCAG AA)
   - [ ] Interactive elements 3:1 minimum
   - [ ] No color-only indicators (use icons + color)

5. **✅ Verify: Reduced Motion**
   - Enable "Reduce Motion" in OS settings
   - Refresh dashboard
   - [ ] Animations disabled (no fade-in, slide-in)
   - [ ] Instant transitions (respects `prefers-reduced-motion`)

**Success Criteria**:
- ✅ Full keyboard navigation support
- ✅ Screen reader announces all interactive elements
- ✅ WCAG 2.1 AA compliant (axe-core 0 violations)
- ✅ Respects user motion preferences

---

## Scenario 6: Performance (Speed & Optimization)

**Objective**: Dashboard feels instant even with 10,000+ data items

### Steps:

1. **Seed Large Dataset**
   ```bash
   # Generate 10,000 priority queue items
   npx tsx scripts/seed-large-dataset.ts --items=10000
   ```

2. **✅ Verify: Load Time (Desktop)**
   - Open Chrome DevTools > Performance
   - Refresh dashboard (`Cmd + R`)
   - [ ] First Contentful Paint < 1.0s
   - [ ] Time to Interactive < 2.5s
   - [ ] Largest Contentful Paint < 2.0s
   - [ ] Cumulative Layout Shift < 0.1

3. **✅ Verify: Load Time (3G Throttle)**
   - DevTools > Network > Throttle: "Slow 3G"
   - Refresh dashboard
   - [ ] Page loads in <5s on 3G
   - [ ] Skeleton loaders show during fetch
   - [ ] No blank white screen

4. **✅ Verify: Lighthouse Score**
   - DevTools > Lighthouse
   - Run audit (Performance + Accessibility + Best Practices)
   - [ ] Performance score > 90
   - [ ] Accessibility score > 95
   - [ ] Best Practices score > 90

5. **✅ Verify: Bundle Size**
   ```bash
   npm run build
   npm run analyze # (if bundle analyzer installed)
   ```
   - [ ] Dashboard page < 200KB gzipped
   - [ ] No duplicate dependencies
   - [ ] Tree-shaking working (unused code removed)

6. **✅ Verify: Runtime Performance**
   - Scroll priority queue (10,000 items)
   - [ ] Smooth 60fps scrolling (virtual scrolling/windowing)
   - [ ] No memory leaks (DevTools > Memory > Take Snapshot)
   - Interact with cards (open/close, toggle visibility)
   - [ ] Instant feedback (<100ms)
   - [ ] No UI blocking

**Success Criteria**:
- ✅ Lighthouse Performance score > 90
- ✅ Handles 10,000+ items without lag
- ✅ Works on slow 3G networks
- ✅ Feels instant (<100ms perceived latency)

---

## Scenario 7: Personalization & Preferences

**Objective**: User can customize dashboard to their workflow

### Steps:

1. **Open Dashboard Settings** (gear icon or `/dashboard/settings`)

2. **✅ Verify: Card Visibility Toggles**
   - [ ] List of all dashboard cards with checkboxes
   - Toggle off "Feature Spotlight"
   - [ ] Spotlight card immediately hidden
   - Refresh page
   - [ ] Setting persisted (spotlight still hidden)

3. **✅ Verify: Metric Format**
   - Change metric format: "Relative" → "Absolute"
   - [ ] Metrics update immediately
   - [ ] "↑12% vs last week" changes to "1,234 searches"
   - [ ] Preference saved to database

4. **✅ Verify: Theme Switching**
   - Toggle theme: Light → Dark
   - [ ] Entire dashboard switches to dark mode
   - [ ] Colors maintain contrast (WCAG compliant)
   - [ ] Theme persists across sessions

5. **✅ Verify: AI Digest Frequency**
   - Change digest frequency: "Daily" → "Real-time"
   - [ ] Digest updates every hour (or see timestamp)
   - [ ] Notifications for new digest items (if enabled)

6. **✅ Verify: Default Landing Page**
   - Set default landing: "/search"
   - Logout and login again
   - [ ] Redirects to /search instead of /dashboard
   - Change back to /dashboard

**Success Criteria**:
- ✅ All preferences persist across sessions
- ✅ Changes apply immediately (optimistic UI)
- ✅ Settings stored in database (not just localStorage)
- ✅ Role-based presets work (SDR vs Manager defaults)

---

## Scenario 8: Error Handling & Offline Mode

**Objective**: Dashboard degrades gracefully when things go wrong

### Steps:

1. **✅ Verify: API Error Handling**
   - Block API requests in DevTools (Network > Block request URL: `/api/dashboard/*`)
   - Refresh dashboard
   - [ ] Error message shown (not blank screen)
   - [ ] Cached data displayed (if available)
   - [ ] "Retry" button present
   - Unblock requests, click "Retry"
   - [ ] Data loads successfully

2. **✅ Verify: Offline Mode (PWA)**
   - DevTools > Application > Service Workers > Offline
   - Refresh dashboard
   - [ ] "You're offline" indicator shown
   - [ ] Last cached dashboard displayed
   - [ ] Actions queued (e.g., "Mark as complete" saved locally)
   - Go back online
   - [ ] Queued actions sync automatically
   - [ ] Fresh data loads

3. **✅ Verify: Slow Loading**
   - DevTools > Network > Throttle: "Slow 3G"
   - Navigate to dashboard
   - [ ] Skeleton loaders show immediately
   - [ ] No flash of wrong content
   - [ ] Progressive loading (hero first, then details)

4. **✅ Verify: Empty States**
   - Delete all priority queue items
   - Refresh dashboard
   - [ ] Helpful empty state: "No urgent actions - great job!"
   - [ ] Suggestions: "Generate research on saved companies"
   - [ ] Not depressing (avoid "You have nothing")

**Success Criteria**:
- ✅ Errors shown gracefully (not white screen)
- ✅ Offline mode works (PWA caching)
- ✅ Empty states helpful, not demotivating
- ✅ Skeleton loaders prevent layout shift

---

## Validation Checklist

After completing all scenarios, verify:

### Functional Requirements
- [x] All 9 functional requirements from spec.md implemented
- [x] Navigation restructured (5 goal-based groups)
- [x] AI digest shows overnight discoveries
- [x] Priority queue ranks items by urgency
- [x] Feature spotlight rotates based on usage
- [x] Responsive design (mobile, tablet, desktop)
- [x] Performance targets met (Lighthouse >90)
- [x] Accessibility WCAG 2.1 AA compliant
- [x] Personalization preferences work

### Non-Functional Requirements
- [x] First Contentful Paint < 1.0s
- [x] Time to Interactive < 2.5s
- [x] Handles 10,000+ items without lag
- [x] Works on slow 3G networks
- [x] Keyboard navigation complete
- [x] Screen reader compatible
- [x] Bundle size < 200KB gzipped

### User Experience
- [x] New users complete first action <60 seconds
- [x] ResearchGPT™ discovery rate >80%
- [x] Mobile users can access all features
- [x] No horizontal scrolling required
- [x] Errors handled gracefully
- [x] Offline mode works

### Business Metrics (Post-Launch Tracking)
- [ ] Time to First Value < 60s (measure with analytics)
- [ ] Feature Discovery Rate 80%+ for ResearchGPT™
- [ ] Mobile engagement 40%+ of sessions
- [ ] NPS score >50 (survey after 1 week)
- [ ] Support tickets -30% ("how do I..." questions)

---

## Common Issues & Debugging

### Issue: Dashboard loads slowly (>3s)
**Debug**:
```bash
# Check bundle size
npm run build
# Look for: Page Size First Load JS
# Dashboard should be <200KB

# Profile with React DevTools
# Check for: unnecessary re-renders
```

**Fix**:
- Add React.memo() to expensive components
- Lazy load below-fold content
- Optimize images (use Next.js Image component)

### Issue: Priority queue doesn't update
**Debug**:
```bash
# Check Supabase Realtime subscription
# Components > PriorityQueue > useEffect
# Should see: "subscribed to priority_queue_items"
```

**Fix**:
- Verify RLS policies allow SELECT
- Check Supabase Realtime enabled for table
- Add error logging to subscription

### Issue: Metrics show "0" or incorrect values
**Debug**:
```sql
-- Check data in Supabase
SELECT * FROM dashboard_metrics
WHERE user_id = 'current-user-id'
ORDER BY created_at DESC;
```

**Fix**:
- Verify metric calculation functions
- Check date range filters
- Ensure user has activity data

### Issue: Mobile bottom nav overlaps content
**Debug**:
```css
/* Check if padding-bottom applied to body */
body {
  padding-bottom: 60px; /* Height of bottom nav */
}
```

**Fix**:
- Add safe-area-inset-bottom for iOS
- Use fixed positioning correctly
- Test on actual device (not just DevTools)

---

## Success Criteria Summary

✅ **Quickstart Passed** if:
1. All 8 scenarios complete without critical errors
2. Functional requirements checklist 100% complete
3. Performance targets met (Lighthouse >90, <2.5s TTI)
4. Accessibility 100% (0 axe-core violations)
5. Mobile experience smooth (no horizontal scroll, <2s load)
6. Error handling graceful (offline mode works)

**Next Steps**:
- If quickstart passes → Proceed to full implementation
- If issues found → Document in GitHub issues, fix before launch
- Track business metrics post-launch for validation

---

**Status**: ✅ Quickstart ready for validation testing
