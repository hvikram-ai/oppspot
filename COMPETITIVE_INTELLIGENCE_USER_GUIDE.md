# Competitive Intelligence - User Guide

**Feature**: AI-Powered Competitive Analysis Dashboard
**Status**: ✅ Production Ready
**Access**: `/competitive-intelligence` (Premium Feature)

---

## Quick Start

### 1. Access the Feature

Navigate to the feature via:
- **Sidebar**: DILIGENCE → Competitive Intel
- **Direct URL**: http://localhost:3000/competitive-intelligence

---

## User Journey

### Step 1: View Your Analyses

**Page**: `/competitive-intelligence`

**What You See**:
- Quick stats cards (Active Analyses, Competitors Tracked, Avg Parity, Moat Strength)
- Stale data alerts (if any analyses need refreshing)
- Table of all your analyses with:
  - Title
  - Target Company
  - Competitor count
  - Status badge
  - Last refreshed timestamp
  - Actions menu (View, Edit, Delete)

**Actions Available**:
- **New Analysis** button (top right)
- **Search** box (filter by title or company name)
- **Status Filter** dropdown (Draft, Active, Archived)
- **Pagination** (Previous/Next buttons)

---

### Step 2: Create a New Analysis

**Trigger**: Click "New Analysis" button

**Dialog Opens**: Create Competitive Analysis

**Required Fields**:
- **Analysis Title** (e.g., "Q3 2024 SaaS Analytics Competitive Analysis")
  - 1-200 characters
  - Describes what you're analyzing
- **Target Company Name** (e.g., "Acme Analytics Inc.")
  - 1-200 characters
  - The company you're analyzing (usually yours or a client's)

**Optional Fields**:
- **Target Company Website** (e.g., "https://acmeanalytics.com")
  - Valid HTTPS URL
  - Used for AI-powered data gathering
- **Market Segment** (e.g., "B2B SaaS Analytics")
  - 0-100 characters
  - Industry or market category
- **Primary Geography** (e.g., "Global", "North America", "EMEA")
  - 0-100 characters
  - Main geographic focus
- **Description** (e.g., "Competitive landscape analysis for our new analytics product...")
  - 0-2000 characters
  - Detailed context and goals

**Validation**:
- Real-time character counts
- Inline error messages (red text below fields)
- URL format validation

**Submit**:
- Click "Create Analysis"
- Success toast: "Analysis created - Redirecting to your new analysis..."
- Auto-redirect to detail page

---

### Step 3: View Analysis Detail

**Page**: `/competitive-intelligence/[id]`

**Header Section**:
- Analysis title (large, bold)
- Target company name, market segment, geography, created date
- Status badge (Draft, Active, Archived)
- Data age badge (Fresh, Stale, Very Stale)

**Key Metrics Cards** (4-column grid):
1. **Competitors** - Number of competitors tracked
2. **Avg. Feature Parity** - Average parity score across all competitors
3. **Moat Score** - Competitive defensibility score (0-100)
4. **Deal Status** - Active, Closed (Acquired), Closed (Passed), Abandoned

**Action Bar**:
- **Refresh Data** button (triggers AI data gathering)
- **Share** button (invite team members)
- **Export** button (PDF/Excel/PowerPoint)

**Tabs** (below action bar):

#### Tab 1: Overview
- **Competitors Grid** - Cards for each competitor with:
  - Company name
  - Website link
  - Industry
  - Company size
  - Parity score badge
- **Moat Score Breakdown** - 5 dimensions:
  - Feature Differentiation
  - Pricing Power
  - Brand Recognition
  - Customer Lock-in
  - Network Effects

#### Tab 2: Competitors
- **Add Competitor** button
- **Competitor Table** with:
  - Name
  - Website (clickable)
  - Industry
  - Size
  - Delete action

#### Tab 3: Feature Matrix
- **Interactive Table** comparing features across competitors
- Checkboxes for "Target Company Has" vs "Competitor Has"
- Feature categories (Core, Integrations, Enterprise, Mobile, etc.)

#### Tab 4: Pricing
- **Pricing Comparison Charts**
- Price tier cards
- Representative price comparison
- Pricing positioning (Premium, Parity, Discount)

#### Tab 5: Competitive Moat
- **Radar Chart** visualizing moat strength across 5 dimensions
- Score breakdown with details
- Risk factors and supporting evidence

---

### Step 4: Add Competitors

**Trigger**: Click "Add Competitor" button (on Competitors tab or Overview empty state)

**Dialog Opens**: Add Competitor

**Required Fields**:
- **Competitor Name** (e.g., "Competitor Inc.")
  - 1-200 characters

**Optional Fields**:
- **Website** (e.g., "https://competitor.com")
  - Valid HTTPS URL
  - Used for AI data gathering
- **Relationship Type** (dropdown):
  - Direct Competitor (default)
  - Adjacent Market
  - Potential Threat
  - Substitute Product
- **Threat Level** (dropdown):
  - Low
  - Medium (default)
  - High
  - Critical
- **Notes** (e.g., "Emerging player in EMEA market...")
  - 0-1000 characters

**Submit**:
- Click "Add Competitor"
- Success toast: "[Competitor Name] has been added to the analysis"
- Table refreshes with new row

**Remove Competitor**:
- Click trash icon in Actions column
- Confirm dialog: "Are you sure you want to remove [Competitor]?"
- Click OK
- Success toast: "[Competitor] has been removed from the analysis"
- Table refreshes

---

### Step 5: Refresh Data (AI-Powered)

**Trigger**: Click "Refresh Data" button

**Prerequisites**:
- Must be the analysis owner
- Must have at least 1 competitor added

**What Happens**:
1. **Modal Opens**: "Refreshing Data"
   - Shows progress bar (0-100%)
   - Displays message: "Gathering fresh data for [N] competitors..."
   - Shows estimated time (e.g., "~60 seconds")
2. **Background Process** (API handles this):
   - Creates snapshot before refresh (rollback capability)
   - Scrapes competitor websites
   - Extracts features using AI
   - Extracts pricing information
   - Updates feature matrix
   - Calculates parity scores
   - Recalculates moat score
   - Updates `last_refreshed_at` timestamp
3. **Completion**:
   - Progress bar reaches 100%
   - Green checkmark icon
   - Message: "Feature matrix, pricing, and moat scores have been updated"
   - Modal auto-closes after 2 seconds
   - Success toast: "Data refreshed successfully"
   - Page refreshes to show new data

**Polling**:
- Frontend polls `/api/competitive-analysis/[id]/refresh` every 5 seconds
- Checks if `last_refreshed_at` was updated
- If updated → complete
- If not → continue polling
- Timeout after estimated time + 30 seconds

**Error Handling**:
- If validation fails (no competitors): Toast error with guidance
- If refresh fails: Modal shows error icon + message
- "Close" button to dismiss modal

---

### Step 6: Share Analysis (Collaboration)

**Trigger**: Click "Share" button

**Prerequisites**:
- Must be the analysis owner (button disabled for viewers)

**Dialog Opens**: Share Analysis

**Current Access Section**:
- Table of existing access grants:
  - Email
  - Access level (View/Edit badge)
  - Granted date
  - Revoke button (trash icon)
- Empty state: "No one has been invited yet"

**Invite Form**:
- **Email Address** field
  - Valid email required
  - Disposable email domains blocked
- **Access Level** dropdown:
  - **View Only** - Can view analysis but cannot make changes
  - **Can Edit** - Can view, edit, and refresh analysis data
- **Send Invitation** button

**Submit**:
- Click "Send Invitation"
- Validation:
  - Email format check
  - User exists in system (profiles table)
  - Not already granted access (prevents duplicates)
- Success toast: "Invitation sent - [email] has been granted [view/edit] access"
- Table refreshes with new grant

**Revoke Access**:
- Click trash icon in Actions column
- Delete confirmation (browser confirm)
- Success toast: "Access revoked"
- Table refreshes

**Errors**:
- Invalid email: Toast error "Invalid email - Please enter a valid email address"
- User not found: Toast error "User not found - [email]"
- Duplicate grant: Toast error "This user already has access to the analysis"

---

### Step 7: Export Data

**Trigger**: Click "Export" button

**Dialog Opens**: Export Analysis

**Options**:
- **Format**: PDF, Excel (.xlsx), PowerPoint (.pptx)
- **Include**: Competitors, Feature Matrix, Pricing, Moat Score
- **Date Range**: All data, Last 30 days, Last 90 days

**Submit**:
- Click "Export"
- Processing spinner
- File download starts
- Success toast: "Export complete"

*(Note: Export functionality implementation pending in Phase 3)*

---

## Status Indicators

### Analysis Status Badge
- **Draft** (outline badge) - Newly created, no data yet
- **Active** (blue badge) - Has data, actively tracked
- **Archived** (gray badge) - Archived, no longer active

### Data Age Badge
- **Fresh** (green badge) - Refreshed within 30 days
- **Stale** (yellow badge) - 30-60 days since refresh
- **Very Stale** (red badge) - 60+ days since refresh

### Threat Level Badge
- **Low** (outline) - Minor competitive concern
- **Medium** (gray) - Moderate competitive concern
- **High** (blue) - Significant competitive concern
- **Critical** (red, with warning icon) - Severe competitive threat

### Access Level Badge
- **View** (gray, with eye icon) - Read-only access
- **Edit** (blue, with pencil icon) - Read-write access

---

## Error Messages

### Authentication Errors (401)
**Message**: "You must be logged in to view this analysis"
**Action**: Redirected to login page by middleware

### Authorization Errors (403)
**Message**: "You do not have permission to view this analysis"
**Action**: Error card with "Go Back" button

### Not Found Errors (404)
**Message**: "Analysis not found"
**Action**: Error card with "Try Again" button

### Validation Errors (400)
**Message**: Field-specific errors displayed inline (red text below field)
**Examples**:
- "Title is required"
- "Company name must be less than 200 characters"
- "Website must be a valid URL"

### Rate Limit Errors (429)
**Message**: "You have exceeded the rate limit. Please try again later."
**Action**: Error alert with "Dismiss" button

### Server Errors (500)
**Message**: "An unexpected error occurred"
**Action**: Error card with "Try Again" and "Reload Page" buttons

---

## Keyboard Shortcuts

- **Enter** in Create Analysis dialog → Submit form
- **Enter** in Add Competitor dialog → Submit form
- **Enter** in Share dialog email field → Send invitation
- **Escape** in any dialog → Close dialog

---

## Mobile Responsiveness

- **Desktop** (>1024px): 3-column competitor grid, side-by-side layout
- **Tablet** (768-1024px): 2-column competitor grid, stacked metrics
- **Mobile** (<768px): 1-column layout, horizontal scroll on tables

---

## Performance

### Expected Load Times
- **List page**: <500ms (20 analyses)
- **Detail page**: <1s (with 10 competitors)
- **Refresh operation**: 20 seconds per competitor (~2 minutes for 6 competitors)

### Polling Frequency
- **Refresh status**: Every 5 seconds
- **Stale alerts**: On page load only

### Pagination
- **Page size**: 20 analyses per page
- **Load time**: Consistent regardless of total count

---

## Tips & Best Practices

### Creating Analyses
1. Use descriptive titles (include date, product, market)
2. Add website URLs for better AI data gathering
3. Fill out market segment and geography for better organization
4. Write detailed descriptions for team context

### Adding Competitors
1. Start with 3-5 direct competitors
2. Add website URLs for AI scraping
3. Use threat level to prioritize monitoring
4. Add notes for team context (e.g., "Acquired by X in 2023")

### Refreshing Data
1. Refresh every 30 days to keep data current
2. Always refresh after adding new competitors
3. Refresh before important meetings/presentations
4. Review changes after each refresh

### Sharing
1. Use "View Only" for stakeholders (execs, investors)
2. Use "Can Edit" for team members working on analysis
3. Revoke access when team members leave

### Organizing
1. Use status filters to manage active vs archived analyses
2. Archive completed deal analyses
3. Use search to quickly find specific analyses

---

## Troubleshooting

### "Refresh Data" button disabled
**Cause**: No competitors added yet
**Solution**: Add at least 1 competitor first

### "Share" button disabled
**Cause**: You are not the analysis owner
**Solution**: Contact the owner to request edit access

### Data looks outdated
**Cause**: Analysis hasn't been refreshed recently
**Solution**: Click "Refresh Data" button (owner only)

### Can't see analysis
**Cause**: Not logged in or no access granted
**Solution**: Log in or request access from owner

### Export not working
**Cause**: Export functionality not yet implemented
**Status**: Coming in Phase 3

---

## Limitations

### Current Version (Phase 2)
- **No real-time updates**: Refresh requires manual trigger
- **No bulk operations**: Must add/remove competitors one-by-one
- **No inline editing**: Must use dialogs
- **No comparison view**: Can't compare multiple analyses side-by-side
- **No historical tracking**: Snapshots stored but not visualized
- **Export not implemented**: Coming in Phase 3

### Rate Limits (Future)
- Refresh operations: 5 per hour per analysis
- API calls: 100 per minute per user

---

## Support

### Report Issues
**Method**: Feedback button in sidebar
**Include**:
- URL where error occurred
- Error message (if any)
- Steps to reproduce

### Feature Requests
**Method**: Feedback button → Feature Request
**Include**:
- Use case description
- Expected behavior
- Priority (low, medium, high)

---

## Next Steps

After using the feature:
1. ✅ Create your first analysis
2. ✅ Add 3-5 competitors
3. ✅ Trigger a data refresh
4. ✅ Share with your team
5. ✅ Review feature parity and moat scores
6. ✅ Make strategic decisions based on insights

---

**Feature Documentation**: See `FRONTEND_INTEGRATION_COMPLETE.md` for technical details
**API Documentation**: See `AUTHORIZATION_HARDENING_COMPLETE.md` for API reference
