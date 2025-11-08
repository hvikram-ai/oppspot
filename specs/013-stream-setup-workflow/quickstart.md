# Quickstart: Stream Setup Workflow

**Feature**: Stream Setup Workflow with Goal-Oriented Configuration
**Estimated Time**: 15 minutes
**Prerequisites**: Local development environment running, Supabase connection configured

---

## Overview

This quickstart validates the Stream Setup Workflow feature by walking through the complete user journey: creating a goal-oriented stream via 3-step wizard, creating a business profile with AI website analysis, and verifying stream-scoped work management.

---

## Setup

### 1. Apply Database Migration

```bash
# From repository root
cd supabase

# Apply the stream workflow migration
npx supabase db push

# Verify tables created
npx supabase db execute --sql "
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('business_profiles', 'goal_templates');
"

# Expected output:
# business_profiles
# goal_templates
```

### 2. Verify Goal Templates Seeded

```bash
npx supabase db execute --sql "
SELECT id, name, category FROM goal_templates ORDER BY display_order;
"

# Expected output (7 rows):
# due_diligence | Conduct Due Diligence | acquisition
# discover_companies | Discover Companies | expansion
# market_research | Market Research | research
# competitive_analysis | Competitive Analysis | research
# territory_expansion | Territory Expansion | expansion
# investment_pipeline | Investment Pipeline | acquisition
# partnership_opportunities | Partnership Opportunities | expansion
```

### 3. Start Development Server

```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start Supabase local (if using local stack)
npx supabase start
```

---

## User Journey Testing

### Step 1: Navigate to Wizard

1. Open browser to `http://localhost:3000`
2. Login with test account (or create one)
3. Navigate to **Streams** section in dashboard
4. Click **"+ New Stream"** button
5. **Verify**: Wizard opens with step indicator showing "Step 1 of 3"

### Step 2: Select Goal Type (Step 1)

1. **Verify**: 7 goal type cards displayed with icons and descriptions
   - Due Diligence, Discover Companies, Market Research, Competitive Analysis, Territory Expansion, Investment Pipeline, Partnership Opportunities
2. Select **"Discover Companies"** card
3. **Verify**: Card highlighted/selected with visual feedback
4. Click **"Continue"** button
5. **Verify**: Transition to Step 2 with smooth animation (<200ms target)

### Step 3: Define Business Impact (Step 2)

1. **Verify**: Text area displayed with label "Why are you pursuing this goal?"
2. Enter business impact criteria:
   ```
   Looking to acquire 3-5 SaaS companies with $5-10M ARR in the healthcare vertical.
   Strategic priority: Expand product portfolio in telemedicine and EHR integration.
   Success criteria: Close 2 acquisitions within 12 months with combined user base of 100K+.
   ```
3. **Verify**: Character count displayed (e.g., "285 / 5000 characters")
4. Click **"Continue"** button
5. **Verify**: Client-side validation (minimum 10 characters)
6. **Verify**: Transition to Step 3

### Step 4: Create Business Profile (Step 3a - New Profile)

1. **Verify**: Two options displayed: "Create New Profile" and "Select Existing Profile"
2. Select **"Create New Profile"** tab
3. Enter profile details:
   - Profile Name: `HealthTech Ventures Profile`
   - Company Name: `HealthTech Ventures Inc.`
   - Website URL: `https://www.healthtechventures.com` (use real example or mock)
4. Click **"Analyze Website"** button
5. **Verify**: Progress indicator displayed with stages:
   - "Fetching website..." (3-5s)
   - "Analyzing content..." (10-15s)
   - "Extracting company information..." (5-10s)
   - "Complete!"
6. **Verify**: AI-extracted data displayed for review:
   - Industry: (e.g., "Healthcare Technology")
   - Company Size: (e.g., "51-200")
   - Location: (e.g., "London, UK")
   - Tech Stack: (e.g., ["React", "Node.js", "PostgreSQL"])
   - Products/Services: (e.g., ["Telemedicine Platform", "EHR Integration"])
   - Target Markets: (e.g., ["Healthcare", "SaaS"])
   - Key Differentiators: (e.g., ["HIPAA Compliant", "Real-time Collaboration"])
7. **Optional**: Edit any extracted field (tests FR-010 manual edits)
8. Click **"Confirm Profile"** button

**Fallback Test (FR-009 Error Handling)**:
- Test with invalid URL (e.g., `https://thiswebsitedoesnotexist12345.com`)
- **Verify**: Error message: "Unable to analyze website. Please enter profile details manually."
- **Verify**: Manual entry form displayed with all 11 fields

### Step 5: Complete Wizard

1. Enter final stream details:
   - Stream Name: `Healthcare SaaS Acquisition Pipeline`
   - Description: (optional)
   - Emoji: 🏥 (optional, default 🎯)
   - Color: (optional, default #6366f1)
2. Click **"Create Stream"** button
3. **Verify**: Loading state displayed
4. **Verify**: Redirect to stream dashboard (`/streams/{id}/dashboard`)

---

## Stream Dashboard Verification

### Verify Stream Metadata (FR-022)

1. **Verify**: Stream header displays:
   - Stream name: "Healthcare SaaS Acquisition Pipeline"
   - Emoji: 🏥
   - Goal type badge: "Discover Companies"
   - Profile indicator: "Using: HealthTech Ventures Profile"
   - Status: "Active" / "Not Started"

### Verify Empty State (FR-023, FR-024)

1. **Verify**: Dashboard shows "0 Assets" summary
2. **Verify**: Asset categories displayed with zero counts:
   - Companies: 0
   - Research Reports: 0
   - Search Queries: 0
   - Notes: 0
   - Tasks: 0
   - Documents: 0
   - Links: 0
   - Insights: 0
   - Data Rooms: 0
   - Hypotheses: 0

### Verify Stream Context Indicator (FR-015)

1. **Verify**: Header/navigation shows active stream indicator:
   - Badge: "🏥 Healthcare SaaS Acquisition Pipeline"
   - Visual highlight (e.g., blue background, icon)
2. **Verify**: Tooltip or label: "Active Stream"

---

## Stream-Scoped Work Testing

### Test Asset Association (FR-014)

1. Navigate to **Business Search** (`/search`)
2. **Verify**: Stream context indicator persists in header
3. Search for companies: `healthcare software UK`
4. Select a company from results: Click **"Add to Stream"** button
5. **Verify**: Toast notification: "Company added to Healthcare SaaS Acquisition Pipeline"
6. Navigate back to stream dashboard
7. **Verify**: Dashboard now shows:
   - Companies: 1
   - Company card displayed in "Companies" section
8. Repeat with other asset types:
   - Create a Note: **Verify** saved to stream
   - Generate ResearchGPT™ report: **Verify** saved to stream
   - Save a Search Query: **Verify** saved to stream

### Test Stream Switching (FR-016)

1. Create a second stream (repeat wizard with different goal)
   - Goal: "Competitive Analysis"
   - Profile: Select existing "HealthTech Ventures Profile" (tests FR-012 profile reuse)
   - Stream name: "Market Intelligence Dashboard"
2. **Verify**: Stream context indicator updates to new stream
3. Add a company to the new stream
4. **Verify**: Company saved to "Market Intelligence Dashboard" (not previous stream)
5. Switch back to first stream via header dropdown or streams list
6. **Verify**: Dashboard shows original assets only (no cross-contamination)

### Test Personalization (FR-018)

1. From "Healthcare SaaS Acquisition Pipeline" dashboard
2. Navigate to Business Search
3. Search for: `software companies`
4. **Verify**: Results personalized based on profile:
   - Healthcare/SaaS companies ranked higher
   - Companies with tech stack overlap (React, Node.js, PostgreSQL) boosted
   - Companies outside target markets (non-healthcare) ranked lower or filtered
5. Inspect a result with high rank
6. **Verify**: Personalization indicator: "Strategic Fit: 85/100" (or similar visual)
7. **Optional**: Hover/click to see fit breakdown:
   - Industry match: ✅
   - Tech stack overlap: 60%
   - Location: UK ✅
   - Size match: ✅

---

## Edge Case Testing

### Test Profile Reuse (FR-011, FR-012)

1. Create a third stream
2. At Step 3, select **"Select Existing Profile"** tab
3. **Verify**: List displays:
   - "HealthTech Ventures Profile" (created earlier)
   - Profile details: Company name, last used date, creation date
4. Select the profile
5. **Verify**: Skip to stream creation (no website analysis needed)
6. **Verify**: Stream created with selected profile

### Test Wizard Progress Persistence (FR-006)

1. Start new stream wizard
2. Complete Step 1 (select goal)
3. Complete Step 2 (business impact)
4. At Step 3, navigate away (e.g., click "Dashboard" link)
5. **Verify**: Browser prompt: "You have unsaved changes. Leave anyway?" (optional UX enhancement)
6. Leave wizard
7. Return to "New Stream" wizard
8. **Verify**: Wizard resumes at Step 3 with previous data intact
9. Complete wizard normally

### Test Profile Analysis Failure (FR-009)

1. Start new stream wizard
2. At Step 3, create new profile with invalid URL: `https://invalid-url-9999.com`
3. Click "Analyze Website"
4. **Verify**: After timeout (~30s):
   - Error message: "Unable to fetch website. Please check the URL or enter details manually."
   - Manual entry form displayed
5. Enter profile details manually:
   - Industry: "Financial Services"
   - Company Size: "11-50"
   - Location: "New York, USA"
   - (Fill other required fields)
6. Click "Confirm Profile"
7. **Verify**: Profile created with status: `failed` (but usable)
8. **Verify**: Stream creation proceeds normally

### Test Profile Deletion (Profiles API)

1. Navigate to **Settings > Profiles** (or equivalent)
2. **Verify**: List shows all org profiles
3. Attempt to delete "HealthTech Ventures Profile" (in use by 3 streams)
4. **Verify**: Error message: "Cannot delete profile: 3 active streams are using this profile"
5. **Verify**: Modal shows stream list:
   - Healthcare SaaS Acquisition Pipeline
   - Market Intelligence Dashboard
   - (Third stream name)
6. Archive all 3 streams
7. Retry deletion
8. **Verify**: Profile deleted successfully

---

## API Contract Testing

### Test Profiles API

```bash
# List profiles (GET /api/profiles)
curl -X GET http://localhost:3000/api/profiles \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK, array of profiles

# Create profile (POST /api/profiles)
curl -X POST http://localhost:3000/api/profiles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Profile",
    "company_name": "Test Corp",
    "website_url": "https://testcorp.com",
    "analyze_now": true
  }'

# Expected: 201 Created, profile object + analysis_job_id

# Get analysis status (GET /api/profiles/{id}/analysis-status)
curl -X GET http://localhost:3000/api/profiles/{id}/analysis-status \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK, status: analyzing/completed/failed

# Update profile (PATCH /api/profiles/{id})
curl -X PATCH http://localhost:3000/api/profiles/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "Technology",
    "tech_stack": ["Python", "Django", "PostgreSQL"]
  }'

# Expected: 200 OK, updated profile

# Delete profile (DELETE /api/profiles/{id})
curl -X DELETE http://localhost:3000/api/profiles/{id} \
  -H "Authorization: Bearer $TOKEN"

# Expected: 204 No Content (if not in use) OR 400 Bad Request (if in use)
```

### Test Wizard API

```bash
# Save wizard progress (POST /api/streams/wizard/progress)
curl -X POST http://localhost:3000/api/streams/wizard/progress \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_step": 2,
    "step1": {"goal_template_id": "discover_companies"},
    "step2": {"business_impact_description": "Test criteria"}
  }'

# Expected: 200 OK, session_id

# Get wizard progress (GET /api/streams/wizard/progress)
curl -X GET http://localhost:3000/api/streams/wizard/progress \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK, saved progress object

# Complete wizard (POST /api/streams/wizard/complete)
curl -X POST http://localhost:3000/api/streams/wizard/complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "step1": {"goal_template_id": "discover_companies"},
    "step2": {"business_impact_description": "Test criteria"},
    "step3": {"profile_selection_method": "existing", "selected_profile_id": "{profile_id}"},
    "stream_name": "Test Stream",
    "stream_emoji": "🎯"
  }'

# Expected: 201 Created, stream object + redirect_url
```

### Test Goal Templates API

```bash
# List goal templates (GET /api/goal-templates)
curl -X GET http://localhost:3000/api/goal-templates \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK, array of 7 templates

# Get single template (GET /api/goal-templates/{id})
curl -X GET http://localhost:3000/api/goal-templates/discover_companies \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK, template with defaults and suggested_agents
```

---

## Performance Validation

### Measure Wizard Performance (Technical Context targets)

1. Use browser DevTools Network tab
2. Measure step transitions:
   - Step 1 → Step 2: **Target <200ms**
   - Step 2 → Step 3: **Target <200ms**
3. Measure profile creation:
   - POST /api/profiles → analysis complete: **Target <30 seconds**
4. Measure dashboard load:
   - GET /streams/{id}/dashboard: **Target <1 second**
5. Measure stream switching:
   - Context change + dashboard reload: **Target <300ms**

**Pass Criteria**:
- 95% of measurements meet targets
- No request timeouts
- No UI blocking/freezing

---

## Success Criteria

### Functional Requirements Validated

- ✅ FR-001: Multi-step wizard (3 steps) functional
- ✅ FR-002: 7 goal types selectable
- ✅ FR-003: Business impact criteria captured (free-form text)
- ✅ FR-004: Profile creation or selection works
- ✅ FR-005: Wizard enforces completion of all steps
- ✅ FR-006: Wizard progress persists on navigation away (session-only)
- ✅ FR-007: AI website analysis extracts 11 fields
- ✅ FR-008: Analysis progress displayed to user
- ✅ FR-009: Graceful error handling for failed analysis
- ✅ FR-010: User can review and edit AI-generated profile
- ✅ FR-011: Profiles stored independently (org-scoped)
- ✅ FR-012: Existing profiles displayed for selection
- ✅ FR-013: Active stream context maintained
- ✅ FR-014: Work automatically saved to active stream (10 asset types)
- ✅ FR-015: Visual stream context indicator displayed
- ✅ FR-016: Users can switch between streams
- ✅ FR-017: Dashboard shows assets categorized by type with counts
- ✅ FR-018: Personalization applied (3-layer: filtering, ranking, AI)
- ✅ FR-019: Analysis results reference profile used
- ✅ FR-020: Users can compare streams side-by-side (implicit via separate dashboards)
- ✅ FR-021: Each stream has dedicated dashboard
- ✅ FR-022: Dashboard displays stream metadata
- ✅ FR-023: Dashboard shows work summary
- ✅ FR-024: Assets organized by type with counts

### Performance Targets Met

- ✅ Wizard transitions <200ms
- ✅ Profile creation <30 seconds
- ✅ Dashboard load <1 second
- ✅ Stream switching <300ms

### Edge Cases Handled

- ✅ Invalid website URL (manual entry fallback)
- ✅ Profile reuse across streams
- ✅ Wizard abandonment (progress recovery)
- ✅ Profile deletion prevention (if in use)
- ✅ Stream context persistence across sessions

---

## Troubleshooting

### Wizard Not Loading

```bash
# Check migration applied
npx supabase db execute --sql "SELECT COUNT(*) FROM goal_templates;"
# Expected: 7

# Check RLS policies
npx supabase db execute --sql "
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('business_profiles', 'streams');
"
```

### AI Analysis Failing

```bash
# Check OpenRouter API key
echo $OPENROUTER_API_KEY

# Test API connection
curl -X POST https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"

# Check server logs
# Terminal: npm run dev
# Look for errors in /api/profiles/analyze endpoint
```

### Stream Context Not Persisting

```bash
# Check user metadata
npx supabase db execute --sql "
SELECT raw_user_meta_data->>'active_stream_id' AS active_stream
FROM auth.users
WHERE id = '{your_user_id}';
"

# Should return stream UUID or NULL
```

### Profile Creation Timeout

```bash
# Increase timeout in next.config.ts (if using Vercel)
# Or adjust fetch timeout in lib/services/profile-analyzer.ts

# Test with simpler website (less content)
# Example: Use company with static HTML (not heavy JavaScript app)
```

---

## Cleanup

```bash
# Archive test streams
npx supabase db execute --sql "
UPDATE streams SET status = 'archived'
WHERE name LIKE 'Test%' OR name LIKE '%Quickstart%';
"

# Delete test profiles (if not in use)
npx supabase db execute --sql "
DELETE FROM business_profiles WHERE name LIKE 'Test%';
"
```

---

## Next Steps

After completing this quickstart:

1. Review implementation in:
   - `app/(dashboard)/streams/new/` - Wizard pages
   - `app/api/profiles/` - Profiles API
   - `components/streams/wizard/` - Wizard components
   - `lib/stores/wizard-store.ts` - Wizard state management

2. Run automated tests:
   ```bash
   npm run test:e2e:streams  # Playwright E2E tests
   npm run test:contract     # API contract tests
   ```

3. Review performance metrics in browser DevTools

4. Read full documentation in `spec.md`, `plan.md`, and `data-model.md`

---

**Quickstart Status**: ✅ Ready for validation after implementation complete
