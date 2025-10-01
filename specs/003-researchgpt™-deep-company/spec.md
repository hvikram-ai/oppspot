# Feature Specification: ResearchGPT" - Deep Company Intelligence

**Feature Branch**: `003-researchgpt"-deep-company`
**Created**: 2025-10-01
**Status**: Draft
**Input**: User description: "ResearchGPT" - Deep Company Intelligence in Seconds. AI agent that researches any UK company in 30 seconds with depth that would take a human 2 hours."

## Execution Flow (main)
```
1. Parse user description from Input 
   � Feature: AI-powered company research agent
2. Extract key concepts from description 
   � Actors: Sales reps, SDRs, account executives
   � Actions: Research companies, detect signals, identify contacts
   � Data: Company profiles, buying signals, decision makers
   � Constraints: 30-second execution time, UK companies only
3. For each unclear aspect: 
   � Marked clarifications below
4. Fill User Scenarios & Testing section 
5. Generate Functional Requirements 
6. Identify Key Entities 
7. Run Review Checklist
8. Return: SUCCESS (spec ready for planning)
```

---

## � Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
Sarah, an SDR at a SaaS company, receives a warm lead for "Monzo Bank" from her marketing team. Before reaching out, she wants to understand:
- What the company does and how they're performing
- Whether they're in buying mode (growth signals)
- Who the key decision makers are
- What pain points they might have
- The best approach to start a conversation

Currently, this research takes her 45-60 minutes of Googling, LinkedIn searching, and reading press releases. With ResearchGPT, she clicks "Research" next to Monzo's name, and in 30 seconds receives a comprehensive intelligence report that would have taken 2 hours to compile manually.

### Acceptance Scenarios

1. **Given** a user is viewing a company profile in oppSpot
   **When** they click the "Research with AI" button
   **Then** the system generates a comprehensive research report in under 30 seconds

2. **Given** a user enters a company name in the search field
   **When** they select "Deep Research" from the actions menu
   **Then** the system identifies the correct UK company and begins research automatically

3. **Given** a research report has been generated
   **When** the user views the report
   **Then** they see 6 key sections: Company Snapshot, Buying Signals, Key Decision Makers, Revenue Signals, Recommended Approach, and Sources

4. **Given** a company has been researched before
   **When** a user requests research again
   **Then** the system uses smart caching: company fundamentals cached for 7 days, buying signals cached for 6 hours (users can force refresh)

5. **Given** a company doesn't exist or isn't found
   **When** research is initiated
   **Then** the system displays a clear error message with suggestions

6. **Given** multiple users research the same company simultaneously
   **When** both users click Research
   **Then** the system runs independent research executions for each user request

### Edge Cases
- What happens when the AI cannot find sufficient information about a company?
- How does the system handle very new companies (< 6 months old) with limited public data?
- What if Companies House API is down or rate-limited?
- How should the system handle companies with ambiguous names (multiple matches)?
- What happens when LinkedIn or other data sources block our scraping?
- How do we handle GDPR compliance when displaying personal information about decision makers? → RESOLVED: Only public data from official sources (company websites, press releases), never scrape social networks, include source attribution, provide removal mechanism

---

## Requirements

### Functional Requirements

#### Core Research Capabilities
- **FR-001**: System MUST generate a research report for any valid UK company in under 30 seconds
- **FR-002**: System MUST include 6 mandatory sections in every report: Company Snapshot, Buying Signals, Key Decision Makers, Revenue Signals, Recommended Approach, Sources
- **FR-003**: System MUST verify all data points with at least one source and provide source links
- **FR-004**: System MUST handle company name ambiguity by presenting matches for user selection
- **FR-005**: System MUST gracefully degrade when data is incomplete (show what's available, note what's missing)

#### Company Snapshot Section
- **FR-006**: System MUST display founding year, company type, and current status
- **FR-007**: System MUST show current employee count with year-over-year growth percentage
- **FR-008**: System MUST estimate revenue (or show last filed accounts if public)
- **FR-009**: System MUST identify technology stack where available
- **FR-010**: System MUST detect recent funding rounds (Series A/B/C, amount, date)

#### Buying Signals Detection
- **FR-011**: System MUST detect hiring signals (job postings, volume, departments)
- **FR-012**: System MUST identify expansion signals (new offices, market entry, press releases)
- **FR-013**: System MUST flag leadership changes (new C-level hires, promotions)
- **FR-014**: System MUST detect tech stack changes or migrations
- **FR-015**: System MUST analyze social media sentiment from company executives
- **FR-016**: System MUST prioritize signals by relevance (HIGH/MEDIUM/LOW)

#### Key Decision Makers
- **FR-017**: System MUST identify top 3-5 decision makers relevant to the user's product
- **FR-018**: System MUST provide job title, LinkedIn profile URL, and background summary for each decision maker
- **FR-019**: System MUST show reporting structure where available
- **FR-020**: System MUST identify champions (people who have shown interest in similar products)
- **FR-021**: System MUST display publicly available information for decision makers: name, job title, LinkedIn profile URL, and company email/phone if found on official company website or press releases
- **FR-021a**: System MUST NOT scrape or display personal email addresses or phone numbers from LinkedIn or other social networks
- **FR-021b**: System MUST include GDPR-compliant data source attribution showing where each contact detail was obtained
- **FR-021c**: System MUST provide a "Request Removal" mechanism for individuals to remove their personal data from research reports

#### Revenue Signals
- **FR-022**: System MUST show customer growth metrics (if publicly available)
- **FR-023**: System MUST identify recent press releases about revenue/profitability
- **FR-024**: System MUST compare company performance to industry benchmarks
- **FR-025**: System MUST detect market share or competitive positioning mentions

#### Recommended Approach
- **FR-026**: System MUST generate a personalized outreach recommendation based on research findings
- **FR-027**: System MUST suggest best contact person and why they're the right choice
- **FR-028**: System MUST recommend optimal timing for outreach based on signals detected
- **FR-029**: System MUST identify conversation starters based on recent company activity

#### Sources & Verification
- **FR-030**: System MUST cite at least 10 verified sources for each research report
- **FR-031**: System MUST link to source URLs that users can click to verify
- **FR-032**: System MUST timestamp each source (when the information was published)
- **FR-033**: System MUST assign confidence scores to findings (HIGH/MEDIUM/LOW confidence)

#### User Experience
- **FR-034**: Users MUST be able to initiate research from company profile pages
- **FR-035**: Users MUST be able to export research reports as PDF
- **FR-036**: Users MUST be able to share research reports with team members
- **FR-037**: Users MUST be able to save research reports to CRM with one click
- **FR-038**: System MUST show real-time progress during research generation (e.g., "Analyzing financials...", "Detecting buying signals...")

#### Performance & Limits
- **FR-039**: System MUST complete research in under 30 seconds for 95% of requests
- **FR-040**: System MUST handle up to 5 concurrent research requests per user
- **FR-041**: System MUST enforce a limit of 100 research reports per user per month
- **FR-041a**: System MUST display remaining research quota in the UI (e.g., "87 researches remaining this month")
- **FR-041b**: System MUST notify users when they reach 90% of their monthly quota
- **FR-042**: System MUST use smart caching: company fundamentals (incorporation date, registered address, company type) cached for 7 days; buying signals (hiring, funding, leadership changes) cached for 6 hours
- **FR-042a**: System MUST provide a "Force Refresh" option allowing users to bypass cache and fetch fresh data
- **FR-042b**: System MUST display cache age timestamp on research reports (e.g., "Data as of 2 hours ago")

#### Error Handling
- **FR-043**: System MUST display clear error messages when company is not found
- **FR-044**: System MUST provide alternative suggestions when company name is ambiguous
- **FR-045**: System MUST handle API failures gracefully and offer retry option
- **FR-046**: System MUST notify users if research is taking longer than expected

### Non-Functional Requirements

#### Performance
- **NFR-001**: Research generation MUST complete in under 30 seconds (target: 20 seconds average)
- **NFR-002**: System MUST support [NEEDS CLARIFICATION: How many concurrent users?]
- **NFR-003**: Page load for research reports MUST be under 2 seconds

#### Accuracy
- **NFR-004**: Data accuracy MUST be verified against original sources
- **NFR-005**: System MUST flag outdated information with differentiated thresholds: buying signals (hiring, funding, leadership changes) flagged if >30 days old; company fundamentals (incorporation, address, industry) flagged if >90 days old
- **NFR-005a**: System MUST display visual indicators (e.g., yellow warning icon) for outdated data sections

#### Compliance
- **NFR-006**: System MUST comply with GDPR when displaying personal information (only public data from official sources, source attribution, removal mechanism)
- **NFR-007**: System MUST respect robots.txt and website scraping policies
- **NFR-007a**: System MUST NOT scrape LinkedIn, Facebook, or other social networks for personal contact details
- **NFR-008**: System MUST automatically delete personal data (decision maker names, contact info) from research reports after 6 months unless user explicitly saves the report
- **NFR-008a**: System MUST anonymize deleted personal data by replacing with role titles (e.g., "Chief Technology Officer at [Company]")
- **NFR-008b**: System MUST notify users 30 days before automatic deletion of personal data from saved reports

#### Usability
- **NFR-009**: Research reports MUST be readable at a glance (scannable format)
- **NFR-010**: UI MUST work on desktop, tablet, and mobile devices

### Key Entities

- **Research Report**: A comprehensive intelligence document about a company containing 6 sections (Snapshot, Signals, Decision Makers, Revenue, Approach, Sources). Attributes: company_id, generated_at, confidence_score, section_data, sources_count

- **Company Snapshot**: Basic company information including founding date, employee count, revenue estimates, funding history, tech stack, and industry classification

- **Buying Signal**: An indicator that a company may be in buying mode. Attributes: signal_type (hiring/expansion/funding/tech_change), priority (high/medium/low), detected_date, confidence, description, source_url

- **Decision Maker**: A key person at the company who influences purchasing decisions. Attributes: name, title, department, seniority_level, linkedin_url, background_summary, decision_influence (champion/influencer/blocker/unknown)

- **Revenue Signal**: Information about company financial performance. Attributes: metric_type (customer_growth/revenue/funding/market_share), value, time_period, source, confidence_level

- **Recommendation**: AI-generated outreach strategy. Attributes: recommended_contact_id, approach_summary, timing_suggestion, conversation_starters[], reasoning

- **Source**: A verified reference for research data. Attributes: url, title, published_date, source_type (press_release/linkedin/companies_house/news), reliability_score

---

## Success Criteria

### Business Metrics
- 80% of users who try ResearchGPT use it again within 7 days
- Average research time reduced from 45-60 minutes to under 1 minute (including reading time)
- Users report research quality is "better than manual" in 70%+ of cases
- 50% of paying customers use ResearchGPT at least weekly

### Technical Metrics
- 95% of research requests complete in under 30 seconds
- Data accuracy rate of 90%+ when fact-checked against sources
- Less than 5% error rate (failed or incomplete research)
- API uptime of 99.5%+

### User Satisfaction
- Net Promoter Score (NPS) of 8+ for ResearchGPT feature
- "Very Satisfied" or "Satisfied" rating from 85%+ of users
- Feature mentioned in 50%+ of customer success stories

---

## Dependencies & Assumptions

### Dependencies
- Companies House API access and rate limits
- External data sources: Companies House API (official UK data), news APIs for press releases, job board APIs for hiring signals, web scraping for company websites
- Existing oppSpot company database and enrichment pipeline
- User authentication and authorization system
- OpenRouter AI API for research synthesis and analysis

### Assumptions
- Users have basic understanding of their target market (know what companies to research)
- Users are targeting UK companies (not international)
- Users have permission to research companies (compliance/legal approval)
- Internet connectivity is available for real-time research
- Users primarily use desktop browsers (mobile is secondary use case)

---

## Out of Scope

The following are explicitly NOT included in this feature:

- Research for non-UK companies (international markets)
- Automated outreach based on research (that's a separate feature)
- Integration with email platforms to send messages directly
- Competitive intelligence tracking over time (that's TimeTravel" feature)
- Team collaboration features like shared annotations (that's TeamPlay" feature)
- Voice-controlled research (that's Voice Command" feature)
- Bulk research (researching 100+ companies at once)

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain **(All 7 clarifications resolved)**
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Clarifications

### Session 1: 2025-10-01 (Initial Spec Creation)

**Clarification Status:** ✅ COMPLETE - All 7 ambiguities resolved

**Decisions Made:**

1. **Caching Strategy**: ✅ RESOLVED - Smart caching implemented: fundamentals (7 days), buying signals (6 hours), with force refresh option
   - Decision: Balances data freshness for time-sensitive signals with cost optimization for static data

2. **Concurrent Request Handling**: ✅ RESOLVED - Run independent executions per user request
   - Decision: Simpler architecture, no queue management complexity, smart caching already reduces costs

3. **Rate Limits**: ✅ RESOLVED - 100 researches/month per user, 5 concurrent requests
   - Decision: Generous limits build trust with £99/month customers, quota notifications prevent surprise overages

4. **Personal Data Handling**: ✅ RESOLVED - Display public data from official sources (company websites, press releases) including business contact info; never scrape social networks
   - Decision: Balances utility (users get contact info) with legal safety (GDPR-compliant public data only, source attribution, removal mechanism)

5. **Data Freshness**: ✅ RESOLVED - Differentiated thresholds: buying signals flagged >30 days, fundamentals flagged >90 days
   - Decision: Aligns freshness expectations with data volatility, maintains user trust with appropriate staleness warnings

6. **Data Retention**: ✅ RESOLVED - Auto-delete personal data after 6 months, anonymize to role titles, notify users 30 days before deletion
   - Decision: GDPR-compliant retention, balances utility with privacy requirements, users can extend by explicitly saving

7. **External Data Sources**: ✅ RESOLVED - Primary sources: Companies House API (free, official UK data), company websites (official data), news APIs (press releases), job board APIs (hiring signals)
   - Decision: Use free/low-cost official sources, avoid LinkedIn API (expensive + scraping restrictions), focus on public verifiable data

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (7 clarifications needed)
- [x] User scenarios defined
- [x] Requirements generated (46 functional + 10 non-functional)
- [x] Entities identified (7 key entities)
- [x] Review checklist passed (pending clarifications)

**Status**: ✅ All clarifications resolved. Ready for `/plan` to generate implementation plan.
