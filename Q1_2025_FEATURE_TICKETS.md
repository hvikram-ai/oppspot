# Q1 2025 Feature Tickets - oppSpot Product Roadmap

**Quarter Goal**: Achieve feature parity with mid-tier competitors (Crunchbase Pro, Grata)
**Success Metrics**:
- Launch 5 new features
- Reduce feature gap vs. Crunchbase from 40% to 15%
- Enable 80% of common deal sourcing workflows

---

## Epic 1: Advanced Search & Filtering

**Epic Description**: Build sophisticated search capabilities with 100+ filters to match PitchBook/Grata functionality. Enable users to find precise company matches using multiple criteria dimensions.

**Business Value**: Critical for deal sourcing workflows. Competitors (PitchBook, Grata) have this as core feature. Without it, users cannot efficiently narrow down targets.

**Acceptance Criteria**:
- Users can apply 10+ filters simultaneously
- Search results update in <2 seconds
- Filters persist in URL (shareable links)
- Saved searches stored in database

**Estimated Effort**: 8 weeks (2 engineers)
**Priority**: P0 (Must-Have)
**Dependencies**: None

---

### Story 1.1: Geographic Filters

**As a** PE analyst
**I want to** filter companies by country, region, city, and proximity radius
**So that** I can focus on geographic markets relevant to our investment thesis

**Acceptance Criteria**:
- [ ] Country dropdown with all countries (ISO codes)
- [ ] Region/State dropdown (cascading based on country)
- [ ] City autocomplete (min 3 characters)
- [ ] Proximity radius filter ("within X km of London")
- [ ] Multi-select support (e.g., "London OR Manchester")
- [ ] Map preview showing filtered area
- [ ] Filter counts update in real-time

**Technical Notes**:
- Use existing `locations` table with lat/lng
- PostGIS for radius queries: `ST_DWithin(geography, point, radius)`
- Index: `CREATE INDEX idx_locations_geography ON locations USING GIST(geography);`
- UI: Reuse shadcn Select + Combobox components

**Test Cases**:
1. Filter by UK → Returns only UK companies
2. Filter by "within 50km of London" → Returns companies in radius
3. Multi-select "London OR Manchester" → Returns union of both cities
4. Change country → Region dropdown updates
5. Clear filters → All companies shown

**Estimated Effort**: 5 days
**Priority**: P0
**Labels**: `search`, `filters`, `backend`, `frontend`

---

### Story 1.2: Industry & Sector Filters

**As a** sector-focused investor
**I want to** filter companies by industry, sector, and sub-sector
**So that** I can find targets in my specialization area

**Acceptance Criteria**:
- [ ] Multi-level taxonomy: Sector → Industry → Sub-industry
- [ ] NAICS/SIC code mapping
- [ ] Multi-select with "Select All" option
- [ ] Display company count per industry
- [ ] Quick filters for popular sectors (SaaS, FinTech, HealthTech)
- [ ] Industry keywords (e.g., "AI" finds AI companies across industries)

**Technical Notes**:
- Add `industry_taxonomy` table with hierarchical structure:
  ```sql
  CREATE TABLE industry_taxonomy (
    id UUID PRIMARY KEY,
    name VARCHAR(200),
    parent_id UUID REFERENCES industry_taxonomy(id),
    naics_code VARCHAR(10),
    sic_code VARCHAR(10),
    level INTEGER -- 1=sector, 2=industry, 3=sub-industry
  );
  ```
- Add `business_industries` junction table (many-to-many)
- Pre-populate with standard NAICS taxonomy
- UI: Cascading Select component

**Test Cases**:
1. Select "Technology" → Shows all tech companies
2. Select "Technology → Software → SaaS" → Narrows to SaaS only
3. Multi-select "FinTech" + "HealthTech" → Returns union
4. Search "artificial intelligence" → Finds AI companies
5. Display count: "SaaS (1,234 companies)"

**Estimated Effort**: 8 days
**Priority**: P0
**Labels**: `search`, `filters`, `backend`, `frontend`, `database`

---

### Story 1.3: Company Size Filters

**As a** mid-market PE investor
**I want to** filter companies by revenue range, employee count, and growth rate
**So that** I can focus on targets matching our fund size

**Acceptance Criteria**:
- [ ] Revenue range slider (£0 - £500M+)
- [ ] Employee count range (0 - 10,000+)
- [ ] Growth rate filter (YoY revenue growth %)
- [ ] Custom range input (e.g., "£10M - £50M")
- [ ] Presets: "Small (<£10M)", "Mid-Market (£10-100M)", "Large (£100M+)"
- [ ] Handle missing data gracefully (show "Unknown" category)

**Technical Notes**:
- Use existing `businesses` table columns: `revenue`, `employee_count`
- Add `growth_rate` column (calculated or manual):
  ```sql
  ALTER TABLE businesses ADD COLUMN revenue_growth_rate DECIMAL(5,2); -- e.g., 25.50 for 25.5%
  ```
- Index for performance:
  ```sql
  CREATE INDEX idx_businesses_revenue ON businesses(revenue) WHERE revenue IS NOT NULL;
  CREATE INDEX idx_businesses_employees ON businesses(employee_count) WHERE employee_count IS NOT NULL;
  ```
- UI: Range slider component (shadcn Slider)

**Test Cases**:
1. Filter "£10M - £50M revenue" → Returns companies in range
2. Filter "100-500 employees" → Returns matching companies
3. Filter "Growth >20%" → Returns high-growth companies
4. Select preset "Mid-Market" → Auto-sets £10-100M range
5. Handle missing data → Shows "Unknown revenue (X companies)" separately

**Estimated Effort**: 5 days
**Priority**: P0
**Labels**: `search`, `filters`, `backend`, `frontend`

---

### Story 1.4: Financial Health Filters

**As a** diligence analyst
**I want to** filter companies by profitability, debt level, and financial ratios
**So that** I can pre-screen financially healthy targets

**Acceptance Criteria**:
- [ ] Profitability filter: Profitable/Loss-making/Break-even
- [ ] Debt/Equity ratio filter (<1, 1-3, >3)
- [ ] EBITDA margin range (%)
- [ ] Cash runway (months, for startups)
- [ ] Financial grade (A-F score based on health)
- [ ] Display "Insufficient data" count

**Technical Notes**:
- Add financial metrics columns to `businesses`:
  ```sql
  ALTER TABLE businesses
  ADD COLUMN is_profitable BOOLEAN,
  ADD COLUMN debt_equity_ratio DECIMAL(5,2),
  ADD COLUMN ebitda_margin DECIMAL(5,2),
  ADD COLUMN cash_runway_months INTEGER,
  ADD COLUMN financial_grade CHAR(1) CHECK (financial_grade IN ('A','B','C','D','F'));
  ```
- Calculate financial_grade using algorithm:
  - A: Profitable + low debt + high margin
  - B: Profitable + moderate debt
  - C: Break-even
  - D: Loss-making but funded
  - F: Loss-making + high debt
- Integration: Companies House financial filings (future)

**Test Cases**:
1. Filter "Profitable only" → Returns profitable companies
2. Filter "Debt/Equity < 1" → Returns low-leverage companies
3. Filter "EBITDA margin > 20%" → Returns high-margin companies
4. Filter "Financial Grade A or B" → Returns top-tier companies
5. Display "1,234 companies with sufficient financial data"

**Estimated Effort**: 6 days
**Priority**: P1 (High)
**Labels**: `search`, `filters`, `backend`, `frontend`

---

### Story 1.5: Ownership & Structure Filters

**As a** corp dev professional
**I want to** filter companies by ownership type, PE-backing, and corporate structure
**So that** I can identify acquisition-ready targets

**Acceptance Criteria**:
- [ ] Ownership type: Private/Public/PE-backed/VC-backed/Family-owned
- [ ] PE firm filter (e.g., "Portfolio of Blackstone")
- [ ] VC firm filter (e.g., "Backed by Sequoia")
- [ ] Corporate structure: Ltd/PLC/LLP/Partnership
- [ ] Founder-led vs. Professional management
- [ ] Acquisition readiness indicators (rumored for sale, recent management changes)

**Technical Notes**:
- Add ownership columns to `businesses`:
  ```sql
  ALTER TABLE businesses
  ADD COLUMN ownership_type VARCHAR(50), -- 'private', 'public', 'pe_backed', 'vc_backed', 'family_owned'
  ADD COLUMN is_founder_led BOOLEAN DEFAULT false,
  ADD COLUMN corporate_structure VARCHAR(20); -- 'ltd', 'plc', 'llp', etc.
  ```
- Create `business_investors` junction table:
  ```sql
  CREATE TABLE business_investors (
    id UUID PRIMARY KEY,
    business_id UUID REFERENCES businesses(id),
    investor_name VARCHAR(200),
    investor_type VARCHAR(50), -- 'pe_firm', 'vc_firm', 'angel', 'corporate'
    investment_date DATE,
    stake_percentage DECIMAL(5,2)
  );
  ```
- Scrape PE/VC portfolio pages for data (future automation)

**Test Cases**:
1. Filter "PE-backed" → Returns PE portfolio companies
2. Filter "Portfolio of KKR" → Returns KKR portfolio
3. Filter "Private Ltd" → Returns UK limited companies
4. Filter "Founder-led" → Returns founder-managed companies
5. Multi-select "PE-backed OR VC-backed" → Returns all backed companies

**Estimated Effort**: 7 days
**Priority**: P1 (High)
**Labels**: `search`, `filters`, `backend`, `frontend`, `database`

---

### Story 1.6: Event-Based Filters

**As a** deal sourcing professional
**I want to** filter companies by recent events (funding, M&A, leadership changes)
**So that** I can identify companies with deal momentum

**Acceptance Criteria**:
- [ ] Recent funding filter (last 3/6/12 months)
- [ ] Recent M&A activity (acquirer or target)
- [ ] Leadership changes (CEO, CFO, board)
- [ ] Location expansion (new offices)
- [ ] Product launches
- [ ] Regulatory filings (IPO prep, etc.)
- [ ] Date range picker for custom periods

**Technical Notes**:
- Create `business_events` table:
  ```sql
  CREATE TABLE business_events (
    id UUID PRIMARY KEY,
    business_id UUID REFERENCES businesses(id),
    event_type VARCHAR(50), -- 'funding', 'acquisition', 'leadership_change', etc.
    event_date DATE NOT NULL,
    description TEXT,
    metadata JSONB, -- {amount: "10M", investor: "Sequoia", ...}
    source_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX idx_business_events_date ON business_events(event_date DESC);
  CREATE INDEX idx_business_events_type ON business_events(event_type);
  ```
- Data sources: News API, Companies House filings, LinkedIn, web scraping
- Integration: Webhook from ResearchGPT when it detects events

**Test Cases**:
1. Filter "Funded in last 6 months" → Returns recently funded companies
2. Filter "CEO change in last 3 months" → Returns companies with new CEOs
3. Filter "Acquired a company in last year" → Returns active acquirers
4. Custom date range "Jan 2024 - Dec 2024" → Returns events in 2024
5. Combine with other filters: "SaaS + Funded last 6 months + London"

**Estimated Effort**: 10 days
**Priority**: P1 (High)
**Labels**: `search`, `filters`, `backend`, `frontend`, `database`, `data-pipeline`

---

### Story 1.7: Saved Searches & Alerts

**As a** busy investor
**I want to** save my search criteria and receive email alerts when new matches appear
**So that** I don't miss relevant opportunities

**Acceptance Criteria**:
- [ ] "Save Search" button on search results page
- [ ] Name saved search (e.g., "UK SaaS £10-50M")
- [ ] View all saved searches on dedicated page
- [ ] Edit/delete saved searches
- [ ] Toggle email alerts (daily/weekly/off)
- [ ] Email includes new/changed companies since last alert
- [ ] Click company in email → Opens in oppSpot

**Technical Notes**:
- Create `saved_searches` table:
  ```sql
  CREATE TABLE saved_searches (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    search_criteria JSONB NOT NULL, -- {country: 'UK', revenue_min: 10000000, ...}
    alert_frequency VARCHAR(20) DEFAULT 'off', -- 'off', 'daily', 'weekly'
    last_alert_sent_at TIMESTAMP,
    result_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- Cron job: Check saved searches daily/weekly
- Compare: Hash of result IDs from previous run vs. current
- Email template: Resend API with new company cards
- Rate limiting: Max 10 saved searches per user

**Test Cases**:
1. Save search "UK SaaS" → Appears in saved searches list
2. Enable daily alerts → Receives email next day if new matches
3. Edit saved search → Updates criteria and re-runs
4. Delete saved search → Stops alerts
5. Email includes 5 new companies with summaries + links

**Estimated Effort**: 8 days
**Priority**: P0
**Labels**: `search`, `alerts`, `backend`, `frontend`, `email`, `cron`

---

### Story 1.8: Search Performance Optimization

**As a** developer
**I want to** optimize search queries to return results in <2 seconds
**So that** users have a fast, responsive search experience

**Acceptance Criteria**:
- [ ] Search results return in <2s (95th percentile)
- [ ] Database query execution <500ms
- [ ] Support 10+ simultaneous filters without slowdown
- [ ] Pagination works smoothly (50 results per page)
- [ ] Monitor slow queries with logging
- [ ] Cache popular searches (Redis)

**Technical Notes**:
- **Indexing Strategy**:
  ```sql
  -- Composite indexes for common filter combinations
  CREATE INDEX idx_businesses_location_industry ON businesses(country_code, industry_id)
    WHERE deleted_at IS NULL;
  CREATE INDEX idx_businesses_size ON businesses(revenue, employee_count)
    WHERE revenue IS NOT NULL AND employee_count IS NOT NULL;

  -- GIN index for full-text search
  CREATE INDEX idx_businesses_search ON businesses
    USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
  ```
- **Query Optimization**:
  - Use `EXPLAIN ANALYZE` to identify slow queries
  - Avoid N+1 queries: Use `.select()` with joins
  - Limit: Default 50 results, max 500 per request
- **Caching**:
  - Redis cache for popular filters (TTL: 5 minutes)
  - Cache key: Hash of search criteria JSON
- **Monitoring**:
  - Log queries >1s to Supabase logs
  - Dashboard: Average query time, P95, P99

**Test Cases**:
1. Apply 10 filters → Results in <2s
2. Search with no filters (all companies) → Paginated results in <2s
3. Complex query (5+ filters + text search) → <2s
4. Repeat same search → Cache hit, <200ms
5. Load test: 100 concurrent searches → All <2s

**Estimated Effort**: 5 days
**Priority**: P0
**Labels**: `search`, `performance`, `backend`, `database`, `caching`

---

## Epic 2: Funding & Investment Tracking

**Epic Description**: Build comprehensive funding round tracking to match Crunchbase functionality. Display funding history, investor lists, valuations, and investment trends.

**Business Value**: Essential for VC/PE workflows. Users need to see funding history to assess maturity, traction, and potential acquirers/competitors.

**Acceptance Criteria**:
- Funding data for 10,000+ UK companies
- Display funding rounds, dates, amounts, investors
- Investor profiles with portfolio companies
- Funding timeline visualization
- Alert on new funding rounds

**Estimated Effort**: 8 weeks (2 engineers + 1 data engineer)
**Priority**: P0 (Must-Have)
**Dependencies**: None

---

### Story 2.1: Funding Rounds Data Model

**As a** backend engineer
**I want to** design a scalable database schema for funding data
**So that** we can store and query funding information efficiently

**Acceptance Criteria**:
- [ ] Database schema supports all funding types (Seed, Series A-F, IPO, etc.)
- [ ] Many-to-many relationship: Rounds ↔ Investors
- [ ] Valuation tracking (pre/post-money)
- [ ] Support for convertible notes, SAFEs
- [ ] Historical data (no data loss on updates)
- [ ] API-ready structure for future integrations

**Technical Implementation**:
```sql
-- Funding rounds table
CREATE TABLE funding_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  round_type VARCHAR(50) NOT NULL, -- 'seed', 'series_a', 'series_b', etc.
  announced_date DATE NOT NULL,
  closed_date DATE,
  amount_raised_usd BIGINT, -- Store in cents for precision
  amount_raised_currency VARCHAR(3) DEFAULT 'USD',
  pre_money_valuation_usd BIGINT,
  post_money_valuation_usd BIGINT,
  investor_count INTEGER DEFAULT 0,
  lead_investor_id UUID REFERENCES investors(id),
  press_release_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Investors table
CREATE TABLE investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL UNIQUE,
  type VARCHAR(50), -- 'vc_firm', 'pe_firm', 'angel', 'corporate', 'accelerator'
  website_url TEXT,
  linkedin_url TEXT,
  location_country VARCHAR(2),
  location_city VARCHAR(100),
  aum_usd BIGINT, -- Assets under management
  founded_year INTEGER,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Junction table: Round ↔ Investors
CREATE TABLE funding_round_investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funding_round_id UUID REFERENCES funding_rounds(id) ON DELETE CASCADE,
  investor_id UUID REFERENCES investors(id) ON DELETE CASCADE,
  is_lead BOOLEAN DEFAULT false,
  investment_amount_usd BIGINT, -- Optional: specific amount from this investor
  UNIQUE(funding_round_id, investor_id)
);

-- Indexes
CREATE INDEX idx_funding_rounds_business ON funding_rounds(business_id, announced_date DESC);
CREATE INDEX idx_funding_rounds_type ON funding_rounds(round_type);
CREATE INDEX idx_funding_rounds_date ON funding_rounds(announced_date DESC);
CREATE INDEX idx_investors_type ON investors(type);
CREATE INDEX idx_funding_round_investors_investor ON funding_round_investors(investor_id);
```

**Test Cases**:
1. Insert seed round with 3 angels → Creates round + 3 investor links
2. Insert Series A with lead investor → Marks lead = true
3. Query all rounds for business → Returns ordered by date DESC
4. Query all portfolio companies for VC firm → Returns via investor_id
5. Update round amount → Updates updated_at timestamp

**Estimated Effort**: 3 days
**Priority**: P0
**Labels**: `funding`, `database`, `backend`, `schema`

---

### Story 2.2: Funding Data Scraping Pipeline

**As a** data engineer
**I want to** scrape funding data from public sources
**So that** we have comprehensive coverage without expensive data partnerships

**Acceptance Criteria**:
- [ ] Scrape Crunchbase public pages (respecting robots.txt)
- [ ] Scrape TechCrunch funding announcements
- [ ] Scrape Companies House PSC filings (UK investment data)
- [ ] Scrape press releases from company websites
- [ ] Store raw HTML + parsed data for auditing
- [ ] Daily incremental updates (not full re-scrape)
- [ ] Error handling + retry logic

**Technical Notes**:
- **Scraping Stack**: Playwright for browser automation (already installed)
- **Rate Limiting**: 1 request per 2 seconds (avoid bans)
- **Data Storage**:
  ```sql
  CREATE TABLE scraping_jobs (
    id UUID PRIMARY KEY,
    source VARCHAR(50), -- 'crunchbase', 'techcrunch', 'companies_house'
    url TEXT NOT NULL,
    status VARCHAR(20), -- 'pending', 'success', 'failed'
    raw_html TEXT,
    parsed_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- **Crunchbase Scraping**:
  - Public pages: `/organization/{company-slug}/funding_rounds`
  - Parse: Round type, date, amount, investors
  - No login required (public data only)
- **TechCrunch Scraping**:
  - RSS feed: `https://techcrunch.com/tag/funding/feed/`
  - Parse articles, extract: Company, amount, investors, date
- **Companies House**:
  - API: `https://api.company-information.service.gov.uk/`
  - PSC (People with Significant Control) endpoint for ownership changes
- **Job Scheduling**: Supabase Edge Function triggered by cron (daily 2am)

**Test Cases**:
1. Scrape Crunchbase page → Extracts 5 funding rounds correctly
2. Scrape TechCrunch RSS → Finds 10 recent funding announcements
3. Rate limiting: 100 requests → Takes 200+ seconds (1 req/2s)
4. Handle 404 error → Logs error, continues to next URL
5. Daily cron job → Processes only new URLs (incremental)

**Estimated Effort**: 10 days
**Priority**: P0
**Labels**: `funding`, `scraping`, `data-pipeline`, `backend`

---

### Story 2.3: Funding History UI

**As a** user
**I want to** view a company's full funding history
**So that** I can assess their traction and capital efficiency

**Acceptance Criteria**:
- [ ] Funding history tab on business detail page
- [ ] Timeline visualization (vertical timeline)
- [ ] Each round shows: Type, date, amount, investors, valuation
- [ ] Total funding raised displayed prominently
- [ ] Investor logos/links
- [ ] Click investor → View investor profile
- [ ] Export funding data to CSV

**UI Design Notes**:
- **Timeline Component**:
  - Vertical line with round markers
  - Color-coded by round type (Seed=green, Series A=blue, etc.)
  - Expandable cards for each round
- **Round Card**:
  - Header: "Series A • £10M • March 2023"
  - Body: Investor list with logos
  - Footer: "Pre-money: £40M • Post-money: £50M"
- **Total Raised**:
  - Large number at top: "Total Raised: £45M across 4 rounds"
  - Chart: Bar chart showing amount per round

**Technical Implementation**:
- Component: `components/funding/funding-timeline.tsx`
- API: `GET /api/businesses/{id}/funding`
  ```typescript
  type FundingRound = {
    id: string;
    round_type: string;
    announced_date: string;
    amount_raised_usd: number;
    amount_raised_currency: string;
    pre_money_valuation_usd?: number;
    post_money_valuation_usd?: number;
    investors: {
      id: string;
      name: string;
      type: string;
      logo_url?: string;
      is_lead: boolean;
    }[];
  };
  ```
- State: Zustand store or React Query for caching

**Test Cases**:
1. View company with 5 rounds → Timeline shows all 5 chronologically
2. Click investor "Sequoia" → Navigates to investor profile
3. Export to CSV → Downloads file with all round data
4. Company with no funding → Shows "No funding data available"
5. Mobile view → Timeline collapses to list view

**Estimated Effort**: 6 days
**Priority**: P0
**Labels**: `funding`, `frontend`, `ui`, `business-details`

---

### Story 2.4: Investor Profile Pages

**As a** user
**I want to** view investor profiles with portfolio companies
**So that** I can understand their investment strategy and find co-investment opportunities

**Acceptance Criteria**:
- [ ] Investor profile page: `/investors/{id}`
- [ ] Display: Name, type, location, AUM, description
- [ ] Portfolio companies list (sortable by investment date)
- [ ] Investment activity chart (investments per year)
- [ ] Average investment size
- [ ] Sector focus (chart or tags)
- [ ] Follow investor → Receive alerts on new investments

**UI Design**:
- **Header**: Investor name, logo, location, website link
- **Stats Cards**:
  - Total portfolio companies
  - Average check size
  - Active investments (last 2 years)
  - AUM (if available)
- **Portfolio Table**:
  - Columns: Company, Round Type, Date, Amount
  - Sort by date (newest first)
  - Filter by round type, sector
  - Click company → Navigate to business page
- **Charts**:
  - Investments per year (bar chart)
  - Sector distribution (pie chart)

**Technical Implementation**:
- Route: `app/(dashboard)/investors/[id]/page.tsx`
- API: `GET /api/investors/{id}`
  ```typescript
  type InvestorProfile = {
    id: string;
    name: string;
    type: string;
    website_url?: string;
    location_country: string;
    location_city?: string;
    aum_usd?: number;
    description?: string;
    logo_url?: string;
    portfolio: {
      business_id: string;
      business_name: string;
      round_type: string;
      announced_date: string;
      amount_raised_usd: number;
    }[];
    stats: {
      total_investments: number;
      avg_check_size_usd: number;
      active_investments_2y: number;
    };
  };
  ```

**Test Cases**:
1. View Sequoia profile → Shows 100+ portfolio companies
2. Sort portfolio by date → Newest investments first
3. Filter by "Series A" → Shows only Series A investments
4. Click portfolio company "Stripe" → Navigates to Stripe page
5. Follow investor → Adds to followed_investors table

**Estimated Effort**: 7 days
**Priority**: P1 (High)
**Labels**: `funding`, `frontend`, `investors`, `ui`

---

### Story 2.5: Funding Alerts & Notifications

**As a** user
**I want to** receive alerts when companies or investors I follow raise/make investments
**So that** I can act quickly on new opportunities

**Acceptance Criteria**:
- [ ] Alert when followed company raises funding
- [ ] Alert when followed investor makes new investment
- [ ] Alert when company in saved search raises funding
- [ ] Email notification (daily digest)
- [ ] In-app notification badge
- [ ] Notification settings page (granular controls)

**Technical Implementation**:
- **Followed Entities**:
  ```sql
  CREATE TABLE followed_investors (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    investor_id UUID REFERENCES investors(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, investor_id)
  );
  ```
- **Funding Alert Logic**:
  - Trigger: New funding_round inserted
  - Check: Is business followed by any user?
  - Check: Is business in any user's saved searches?
  - Check: Is investor followed by any user?
  - If yes: Insert notification
- **Notification Table**:
  ```sql
  CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50), -- 'funding_round', 'investor_activity'
    title VARCHAR(200),
    message TEXT,
    related_entity_type VARCHAR(50), -- 'business', 'investor'
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- **Email Digest**: Cron job (daily 8am) → Group notifications → Send via Resend

**Test Cases**:
1. Company raises funding → Followers receive notification
2. Investor makes investment → Followers receive notification
3. Company in saved search raises funding → Search owner notified
4. Daily digest → Email with 5 funding alerts
5. Mark notification as read → Badge count decreases

**Estimated Effort**: 6 days
**Priority**: P1 (High)
**Labels**: `funding`, `notifications`, `backend`, `email`

---

## Epic 3: Quick Wins (High Impact, Low Effort)

**Epic Description**: Ship 3 high-value features quickly to improve user workflows and demonstrate rapid product iteration.

**Business Value**: Quick wins keep users engaged, show product momentum, and address immediate pain points.

**Estimated Effort**: 4 weeks (1 engineer)
**Priority**: P0 (Must-Have)

---

### Story 3.1: CSV/Excel Export for Search Results

**As a** analyst
**I want to** export search results to CSV/Excel
**So that** I can analyze data in spreadsheets and share with team

**Acceptance Criteria**:
- [ ] "Export" button on search results page
- [ ] Export formats: CSV, Excel (XLSX)
- [ ] Export includes all visible columns + hidden metadata
- [ ] Limit: 1,000 rows per export (prevent abuse)
- [ ] Loading indicator during export generation
- [ ] Download triggers automatically (no separate page)
- [ ] Track exports for quota management (future: usage limits)

**Technical Implementation**:
- **Backend**: `POST /api/search/export`
  ```typescript
  // app/api/search/export/route.ts
  export async function POST(req: NextRequest) {
    const { searchCriteria, format } = await req.json();

    // Run search query with LIMIT 1000
    const results = await searchBusinesses(searchCriteria, 1000);

    // Generate CSV or XLSX
    if (format === 'csv') {
      const csv = generateCSV(results);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="oppspot-export.csv"'
        }
      });
    } else {
      const xlsx = generateXLSX(results);
      return new Response(xlsx, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="oppspot-export.xlsx"'
        }
      });
    }
  }
  ```
- **CSV Library**: `csv-stringify` or `papaparse`
- **Excel Library**: `xlsx` (SheetJS) - `npm install xlsx`
- **CSV Columns**: Name, Industry, Location, Revenue, Employees, Website, Founded, Description
- **Excel Features**: Formatted headers, column widths, freeze top row

**Test Cases**:
1. Export 50 results to CSV → Downloads CSV with 50 rows
2. Export 2,000 results → Only exports first 1,000 (shows warning)
3. Export to Excel → Downloads XLSX with formatting
4. Empty search results → Shows "No data to export" error
5. Track export in database → Logged for quota management

**Estimated Effort**: 3 days
**Priority**: P0
**Labels**: `search`, `export`, `backend`, `frontend`, `quick-win`

---

### Story 3.2: Email Alerts for Saved Searches

**As a** user
**I want to** receive email digests when new companies match my saved searches
**So that** I don't have to manually check for new targets

**Acceptance Criteria**:
- [ ] Enable email alerts on saved search page
- [ ] Frequency options: Daily, Weekly, Off
- [ ] Email subject: "oppSpot Alert: 5 new matches for 'UK SaaS'"
- [ ] Email body: List of new/changed companies with summaries
- [ ] Click company in email → Opens oppSpot business page
- [ ] Unsubscribe link in footer
- [ ] Settings page: Manage all email alerts

**Technical Implementation**:
- **Saved Search Enhancement**:
  ```sql
  ALTER TABLE saved_searches
  ADD COLUMN alert_frequency VARCHAR(20) DEFAULT 'off', -- 'off', 'daily', 'weekly'
  ADD COLUMN last_alert_sent_at TIMESTAMP,
  ADD COLUMN last_result_hash VARCHAR(64); -- Hash of result IDs for comparison
  ```
- **Cron Job**: Supabase Edge Function or Next.js API route via cron-job.org
  - Daily: Run at 8am UTC
  - Weekly: Run Mondays at 8am UTC
- **Alert Logic**:
  1. Fetch all saved_searches where alert_frequency != 'off' and last_alert_sent_at < now() - interval
  2. For each search: Run query, hash result IDs
  3. Compare to last_result_hash
  4. If different: Find new IDs (set difference)
  5. Fetch full data for new companies
  6. Send email via Resend
  7. Update last_alert_sent_at and last_result_hash
- **Email Template**: Resend React Email template
  ```tsx
  // emails/saved-search-alert.tsx
  export default function SavedSearchAlert({
    searchName,
    newCompanies
  }: {
    searchName: string;
    newCompanies: Business[]
  }) {
    return (
      <Html>
        <Head />
        <Body>
          <Container>
            <Heading>New matches for "{searchName}"</Heading>
            <Text>{newCompanies.length} new companies match your search:</Text>
            {newCompanies.map(company => (
              <Section key={company.id}>
                <Heading as="h3">{company.name}</Heading>
                <Text>{company.description}</Text>
                <Button href={`https://oppspot.ai/business/${company.id}`}>
                  View Details
                </Button>
              </Section>
            ))}
            <Hr />
            <Text>
              <Link href="https://oppspot.ai/settings/alerts">
                Manage email alerts
              </Link>
            </Text>
          </Container>
        </Body>
      </Html>
    );
  }
  ```

**Test Cases**:
1. Enable daily alerts → Receives email next day at 8am
2. No new matches → No email sent (don't spam)
3. 10 new matches → Email includes all 10
4. Click company link in email → Opens business page
5. Unsubscribe → Sets alert_frequency to 'off'

**Estimated Effort**: 5 days
**Priority**: P0
**Labels**: `search`, `alerts`, `email`, `cron`, `backend`, `quick-win`

---

### Story 3.3: Bulk ResearchGPT Generation

**As a** analyst screening 50 companies
**I want to** generate ResearchGPT reports in bulk
**So that** I can review all targets quickly without manual clicking

**Acceptance Criteria**:
- [ ] "Bulk Generate Reports" button on search results
- [ ] Multi-select companies (checkbox UI)
- [ ] Upload CSV with company names/IDs
- [ ] Queue jobs (rate-limited to avoid quota abuse)
- [ ] Progress indicator: "5 / 20 complete"
- [ ] Email when all complete: "Your 20 reports are ready"
- [ ] Download all as ZIP of PDFs
- [ ] Respect user quota (deduct from monthly limit)

**Technical Implementation**:
- **UI Flow**:
  1. User selects companies (checkboxes) or uploads CSV
  2. Clicks "Generate Reports" → Modal: "This will generate 20 reports (20% of your monthly quota). Continue?"
  3. User confirms → Shows progress page
  4. Background job processes queue
  5. Email sent when complete
- **Backend**: Job Queue (BullMQ or pg-boss)
  ```typescript
  // lib/jobs/bulk-research-generation.ts
  export async function queueBulkResearchGeneration(
    userId: string,
    companyIds: string[]
  ) {
    // Check quota
    const quota = await getUserResearchQuota(userId);
    if (quota.remaining < companyIds.length) {
      throw new Error('Insufficient quota');
    }

    // Create bulk job
    const bulkJobId = uuid();
    await db.insert('bulk_research_jobs', {
      id: bulkJobId,
      user_id: userId,
      company_ids: companyIds,
      status: 'pending',
      total: companyIds.length,
      completed: 0
    });

    // Queue individual jobs
    for (const companyId of companyIds) {
      await researchQueue.add('generate-report', {
        userId,
        companyId,
        bulkJobId
      }, {
        delay: 2000 // 2s between jobs to avoid rate limits
      });
    }

    return bulkJobId;
  }

  // Worker: Process jobs
  researchQueue.process('generate-report', async (job) => {
    const { userId, companyId, bulkJobId } = job.data;

    // Generate ResearchGPT report (existing logic)
    await generateResearchReport(companyId);

    // Update bulk job progress
    await db.query(`
      UPDATE bulk_research_jobs
      SET completed = completed + 1,
          status = CASE WHEN completed + 1 = total THEN 'complete' ELSE 'in_progress' END
      WHERE id = $1
    `, [bulkJobId]);

    // If complete, send email
    const bulkJob = await db.query('SELECT * FROM bulk_research_jobs WHERE id = $1', [bulkJobId]);
    if (bulkJob.status === 'complete') {
      await sendBulkReportsEmail(userId, bulkJobId);
    }
  });
  ```
- **Database**:
  ```sql
  CREATE TABLE bulk_research_jobs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_ids UUID[] NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'complete', 'failed'
    total INTEGER NOT NULL,
    completed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
  );
  ```
- **PDF Generation**: Use existing ResearchGPT PDF export + ZIP library (`archiver`)

**Test Cases**:
1. Select 10 companies → Queue 10 jobs
2. Upload CSV with 50 companies → Queue 50 jobs (if quota allows)
3. Quota exceeded → Shows error "Insufficient quota (need 50, have 30)"
4. Progress page → Updates in real-time (10/50 complete)
5. All complete → Email with ZIP download link
6. Download ZIP → Contains 50 PDF reports

**Estimated Effort**: 8 days
**Priority**: P1 (High)
**Labels**: `research-gpt`, `bulk`, `backend`, `jobs`, `quick-win`

---

## Epic 4: Platform Improvements

**Epic Description**: Infrastructure and UX improvements to support new features and improve performance.

**Estimated Effort**: Ongoing (parallel to other epics)

---

### Story 4.1: API Rate Limiting & Quota Management

**As a** platform owner
**I want to** implement rate limiting and quota management
**So that** we prevent abuse and support tiered pricing

**Acceptance Criteria**:
- [ ] Rate limiting: 100 requests/minute per user
- [ ] Monthly quotas: ResearchGPT reports (Free: 10, Pro: 100, Team: 500, Enterprise: Unlimited)
- [ ] Display quota usage in UI
- [ ] API returns 429 Too Many Requests when exceeded
- [ ] Grace period: Soft limit warning at 80% usage

**Technical Implementation**:
- Use Upstash Redis for rate limiting (already used in Q&A Copilot)
- Quota tracking in `user_research_quotas` table (already exists)
- Middleware: Check rate limit + quota before processing request

**Estimated Effort**: 4 days
**Priority**: P1
**Labels**: `platform`, `backend`, `rate-limiting`

---

### Story 4.2: Telemetry & Analytics Dashboard

**As a** product manager
**I want to** track feature usage and user behavior
**So that** we can make data-driven product decisions

**Acceptance Criteria**:
- [ ] Track: Searches, exports, ResearchGPT generations, data room access
- [ ] Dashboard: Daily active users, feature adoption rates, conversion funnels
- [ ] Integrate: PostHog or Mixpanel
- [ ] Privacy: GDPR-compliant, anonymized where possible

**Estimated Effort**: 5 days
**Priority**: P2
**Labels**: `platform`, `analytics`

---

## Summary: Q1 2025 Backlog

| Epic | Stories | Effort | Priority | Status |
|------|---------|--------|----------|--------|
| 1. Advanced Search & Filtering | 8 stories | 8 weeks | P0 | 🟡 Not Started |
| 2. Funding & Investment Tracking | 5 stories | 8 weeks | P0 | 🟡 Not Started |
| 3. Quick Wins (Export, Alerts, Bulk) | 3 stories | 4 weeks | P0 | 🟡 Not Started |
| 4. Platform Improvements | 2 stories | 2 weeks | P1 | 🟡 Not Started |

**Total Estimated Effort**: 22 weeks (parallel tracks possible)

**Recommended Team Structure**:
- 2 Full-stack Engineers (Search + Funding)
- 1 Data Engineer (Scraping + Pipelines)
- 1 Frontend Engineer (UI Polish)
- 1 Product Manager (Prioritization + User Testing)

---

## Jira/Linear Import Format

For easy import into Jira, Linear, or similar tools:

```csv
Issue Key,Summary,Description,Story Points,Priority,Labels,Epic Link
OPPS-101,"[EPIC] Advanced Search & Filtering","Build sophisticated search capabilities with 100+ filters",40,Highest,"search,epic",
OPPS-102,"Geographic Filters","Implement country/region/city/radius filters",5,Highest,"search,filters,backend,frontend",OPPS-101
OPPS-103,"Industry & Sector Filters","Build multi-level industry taxonomy with NAICS codes",8,Highest,"search,filters,backend,frontend,database",OPPS-101
OPPS-104,"Company Size Filters","Add revenue/employee/growth rate filters",5,Highest,"search,filters,backend,frontend",OPPS-101
OPPS-105,"Financial Health Filters","Filter by profitability, debt, EBITDA, financial grade",6,High,"search,filters,backend,frontend",OPPS-101
OPPS-106,"Ownership & Structure Filters","Filter by ownership type, PE-backing, corporate structure",7,High,"search,filters,backend,frontend,database",OPPS-101
OPPS-107,"Event-Based Filters","Filter by recent funding, M&A, leadership changes",10,High,"search,filters,backend,frontend,database,data-pipeline",OPPS-101
OPPS-108,"Saved Searches & Alerts","Save searches and receive email alerts on new matches",8,Highest,"search,alerts,backend,frontend,email,cron",OPPS-101
OPPS-109,"Search Performance Optimization","Optimize queries to <2s with indexing and caching",5,Highest,"search,performance,backend,database,caching",OPPS-101
OPPS-201,"[EPIC] Funding & Investment Tracking","Build comprehensive funding round tracking",40,Highest,"funding,epic",
OPPS-202,"Funding Rounds Data Model","Design scalable database schema for funding data",3,Highest,"funding,database,backend,schema",OPPS-201
OPPS-203,"Funding Data Scraping Pipeline","Scrape Crunchbase, TechCrunch, Companies House",10,Highest,"funding,scraping,data-pipeline,backend",OPPS-201
OPPS-204,"Funding History UI","Display funding timeline on business detail page",6,Highest,"funding,frontend,ui,business-details",OPPS-201
OPPS-205,"Investor Profile Pages","Create investor profiles with portfolio companies",7,High,"funding,frontend,investors,ui",OPPS-201
OPPS-206,"Funding Alerts & Notifications","Alert users on new funding rounds for followed entities",6,High,"funding,notifications,backend,email",OPPS-201
OPPS-301,"[EPIC] Quick Wins","Ship high-value features quickly",20,Highest,"quick-win,epic",
OPPS-302,"CSV/Excel Export for Search Results","Export search results to CSV or Excel",3,Highest,"search,export,backend,frontend,quick-win",OPPS-301
OPPS-303,"Email Alerts for Saved Searches","Send daily/weekly email digests for saved searches",5,Highest,"search,alerts,email,cron,backend,quick-win",OPPS-301
OPPS-304,"Bulk ResearchGPT Generation","Generate reports for 50+ companies in one batch",8,High,"research-gpt,bulk,backend,jobs,quick-win",OPPS-301
OPPS-401,"API Rate Limiting & Quota Management","Implement rate limits and usage quotas",4,High,"platform,backend,rate-limiting",
OPPS-402,"Telemetry & Analytics Dashboard","Track feature usage with PostHog/Mixpanel",5,Medium,"platform,analytics",
```

---

## Next Steps

1. **Import tickets** into your project management tool (Jira, Linear, GitHub Projects)
2. **Assign owners** to each epic based on team expertise
3. **Schedule sprint planning** for Q1 kick-off
4. **Set up weekly demos** to show progress to stakeholders
5. **Create design mockups** for key UI components (search filters, funding timeline)
6. **Start with Quick Wins** (Epic 3) to demonstrate momentum

---

**Document Version**: 1.0
**Last Updated**: 2025-01-13
**Owner**: Product Team
**Status**: Ready for Sprint Planning
