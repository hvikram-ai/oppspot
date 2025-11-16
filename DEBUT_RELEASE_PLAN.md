# oppSpot Debut Release Plan

**Version:** 0.1.2 → 1.0.0
**Target Launch Date:** Mid-December 2025 (3-4 weeks from now)
**Production URL:** https://oppspot-one.vercel.app
**Status:** 🟡 85% Ready - Critical Sprint Required

---

## Executive Summary

### Current State
oppSpot is a **feature-rich, production-grade B2B intelligence platform** with 85% launch readiness. The application has excellent testing coverage (89 E2E test files), comprehensive features, and solid architecture. However, there are **3 critical blockers** that must be addressed before public launch.

### Go/No-Go Recommendation
✅ **GO** - Conditional on completing the 2-3 week pre-launch sprint outlined below.

### Key Metrics
- **Features Implemented:** 30+ major features across 7 product areas
- **Test Coverage:** 89 E2E test files, 72 contract tests, 21,776 lines of test code
- **Technical Debt:** 1,227 TypeScript 'any' errors, 2 security vulnerabilities
- **Time to Launch:** 2-3 weeks (focused sprint)

---

## 🚨 Critical Blockers (Must Fix Before Launch)

### 1. TypeScript Build Errors (HIGH PRIORITY)
**Current State:** Build disabled type checking via config flags
**Problem:** 1,227 `@typescript-eslint/no-explicit-any` errors compromise type safety

**Impact:** Hidden runtime bugs, reduced code quality, difficult maintenance

**Action Required:**
```bash
# Priority files (500 errors in core business logic):
1. lib/supabase/client.ts
2. lib/ai/openrouter.ts
3. lib/analytics/*.ts (5 files)
4. lib/data-room/repository/*.ts (8 files)
5. lib/competitive-analysis/*.ts (3 files)
6. lib/research-gpt/*.ts (2 files)
```

**Time Estimate:** 20 hours (Tier 1 fixes only)
**Owner:** Senior Developer
**Deadline:** Week 1

---

### 2. Security Vulnerability - xlsx Package (CRITICAL)
**CVE:** GHSA-4r6h-8v6p-xvw6 (Prototype Pollution)
**Severity:** HIGH
**Current Version:** Vulnerable
**Required Version:** 0.19.3+

**Files Affected:**
- `lib/ma-prediction/exporters/excel-exporter.ts`
- `lib/competitive-analysis/exporters/excel-exporter.ts`
- `lib/data-room/summaries/exporters/excel-exporter.ts`

**Action Required:**
```bash
# 1. Update package
npm install xlsx@latest --legacy-peer-deps

# 2. Test all Excel export features
npm run test:e2e -- tests/excel-export.spec.ts

# 3. Verify no breaking changes
```

**Time Estimate:** 2 hours
**Owner:** DevOps/Security Lead
**Deadline:** Week 1, Day 1

---

### 3. Custom Domain Configuration (CRITICAL)
**Problem:** oppspot.ai points to old/stale Vercel deployment
**Impact:** Users accessing outdated version of the application

**Action Required:**
1. Go to Vercel Dashboard → oppspot-one project → Domains
2. Remove oppspot.ai from old deployment
3. Add oppspot.ai to current oppspot-one deployment
4. Update DNS records if needed
5. Verify SSL certificate generation
6. Test https://oppspot.ai loads current version

**Time Estimate:** 30 minutes
**Owner:** DevOps Lead
**Deadline:** Week 1, Day 1

---

## 📋 3-Week Pre-Launch Sprint

### Week 1: Critical Fixes (40 hours)

#### Day 1-2: Security & Infrastructure (8 hours)
- [x] Fix xlsx security vulnerability (2h)
- [x] Fix custom domain routing - oppspot.ai (1h)
- [ ] Verify all Vercel cron jobs working (2h)
  - Companies House data refresh
  - LLM health checks (every 5 min)
  - M&A prediction batch (nightly)
  - Research quota reset (monthly)
- [ ] Security audit of RLS policies (3h)
  - Review all Row-Level Security policies
  - Test with different user roles
  - Document permission matrix

#### Day 3-5: TypeScript Cleanup (32 hours)
- [ ] Fix Tier 1 files - Core Business Logic (20h)
  - `lib/supabase/client.ts` - Database operations
  - `lib/ai/openrouter.ts` - AI integration
  - `lib/analytics/*.ts` - Analytics engine
  - `lib/data-room/repository/*.ts` - Data room operations
  - `lib/competitive-analysis/*.ts` - Competitive intel
  - `lib/research-gpt/*.ts` - ResearchGPT core
- [ ] Fix React Hook dependencies - Top 20 instances (4h)
- [ ] Add error.tsx to major routes (6h)
  - `/app/(dashboard)/error.tsx`
  - `/app/search/error.tsx`
  - `/app/business/[id]/error.tsx`
  - `/app/data-rooms/error.tsx`
  - `/app/weekly-updates/error.tsx`
  - `/app/research/error.tsx`
- [ ] Test ResearchGPT quota system in production (2h)
  - Create test user with quota limit
  - Verify quota enforcement
  - Test quota reset logic
  - Validate email notifications at 90%/100%

**Week 1 Deliverable:** All critical technical issues resolved ✅

---

### Week 2: Polish & Documentation (30 hours)

#### User Experience (16 hours)
- [ ] Create onboarding tutorial for new users (8h)
  - First-time user welcome modal
  - Interactive feature tour (5 key features)
  - Quick start guide with sample searches
  - Video walkthrough (3-5 min)
- [ ] Add contextual help tooltips (8h)
  - ResearchGPT usage and quota
  - Advanced search filters
  - Data Room document upload
  - Collection management
  - M&A prediction scores
  - ESG risk ratings
  - Competitive analysis workflows
  - ITP target matching
  - Command palette shortcuts
  - Weekly Updates subscription

#### Documentation (12 hours)
- [ ] Create CHANGELOG.md (2h)
  - Document all features in v1.0.0
  - Format: Keep a Changelog standard
  - Include migration notes from demo mode
- [ ] Archive old documentation files (2h)
  - Move 80% of markdown files to `/docs/archive/`
  - Keep only: README, CLAUDE.md, CHANGELOG, user guides
  - Create `/docs/archive/ARCHIVE_INDEX.md`
- [ ] Create pricing/plans page (4h)
  - `/app/pricing/page.tsx`
  - Tier comparison table
  - Feature matrix
  - FAQ section
  - CTA buttons with waitlist
- [ ] Accessibility audit - WCAG 2.1 AA (3h)
  - Run axe DevTools on top 10 pages
  - Fix critical issues (color contrast, keyboard nav)
  - Add ARIA labels where missing
  - Test with screen reader
- [ ] Test demo mode thoroughly (1h)
  - Verify sample data loads
  - Check all features work in demo
  - Ensure no real API calls

**Week 2 Deliverable:** User-ready product with clear documentation ✅

---

### Week 3: QA & Launch Prep (20 hours)

#### Quality Assurance (13 hours)
- [ ] Full E2E test suite run - All browsers (4h)
  ```bash
  npm run test:e2e -- --project=chromium
  npm run test:e2e -- --project=firefox
  npm run test:e2e -- --project=webkit
  npm run test:e2e -- --project=mobile-chrome
  npm run test:e2e -- --project=mobile-safari
  ```
- [ ] Manual testing of critical user journeys (6h)
  - **Journey 1:** Sign up → Search → View business → Save to collection
  - **Journey 2:** Generate ResearchGPT report → Review → Export
  - **Journey 3:** Upload to Data Room → Ask Q&A questions → Review citations
  - **Journey 4:** Run competitive analysis → Compare competitors → Export
  - **Journey 5:** Check M&A predictions → Review target companies → Add to watchlist
  - **Journey 6:** ESG risk screening → Review red flags → Generate report
  - **Journey 7:** Create ITP → Match businesses → Review scores
  - **Journey 8:** Subscribe to Weekly Updates → Receive email → Unsubscribe
- [ ] Performance testing under load (3h)
  - Use Artillery or k6 for load testing
  - Test ResearchGPT with 10 concurrent requests
  - Test search with 100 concurrent users
  - Monitor database query performance
  - Check Vercel function timeouts

#### Launch Infrastructure (7 hours)
- [ ] Set up production monitoring (4h)
  - **Option 1:** Sentry for error tracking
    - Install @sentry/nextjs
    - Configure error boundaries
    - Set up performance monitoring
  - **Option 2:** PostHog for analytics
    - Install posthog-js
    - Track key user events
    - Set up feature flags
  - **Recommended:** Both (Sentry for errors, PostHog for analytics)
- [ ] Create launch checklist (1h)
  - See "Launch Day Checklist" section below
- [ ] Prepare rollback plan (2h)
  - Document rollback procedure
  - Test Vercel instant rollback feature
  - Prepare database backup/restore scripts
  - Create status page messaging templates

**Week 3 Deliverable:** Production-ready, battle-tested application ✅

---

## 🚀 Launch Strategy (Phased Approach)

### Phase 1: Soft Launch (Week 4 - Days 1-7)
**Target:** 10-20 beta users (existing contacts, friends, early supporters)

**Goals:**
- Identify critical bugs in production environment
- Validate ResearchGPT quota system with real usage
- Test email notification delivery
- Monitor error rates and performance metrics
- Collect qualitative user feedback

**Success Criteria:**
- < 1% error rate
- < 3s average page load time
- 80%+ feature discovery (users try 3+ features)
- No critical bugs reported

**Actions:**
- [ ] Enable demo mode for easy access
- [ ] Set up feedback form in app (simple modal)
- [ ] Monitor Sentry/PostHog daily
- [ ] Daily check-in with beta users
- [ ] Prepare hotfix deployment process

---

### Phase 2: Limited Release (Week 5-6 - Days 8-21)
**Target:** 50-100 early adopters (LinkedIn outreach, ProductHunt teaser, waitlist)

**Goals:**
- Validate pricing model with real usage patterns
- Test scalability (Supabase connection pooling, Vercel function concurrency)
- Build case studies and testimonials
- Refine onboarding based on user drop-off points
- Iterate on ResearchGPT quota limits

**Success Criteria:**
- < 0.5% error rate
- 60%+ user activation (completed onboarding + 1 core action)
- 3+ testimonials collected
- No Supabase/Vercel scaling issues

**Actions:**
- [ ] Open registration with approval workflow
  - Add "Request Access" form
  - Manual approval in first 2 weeks
  - Auto-approve after stability proven
- [ ] Activate email waitlist
  - Drip campaign with feature highlights
  - Weekly product updates
- [ ] Run ResearchGPT quota monitoring closely
  - Alert if >80% of users hit quota
  - Adjust limits if needed (100 → 150 reports/month)
- [ ] Collect NPS scores (Net Promoter Score)

---

### Phase 3: Public Launch (Week 7-8 - Days 22-30)
**Target:** Open to all (remove restrictions, full marketing push)

**Goals:**
- Achieve product-market fit indicators
- Scale infrastructure as needed
- Build sustainable growth loop
- Establish support processes

**Success Criteria:**
- 100+ active users in first week
- 20%+ week-over-week growth
- < 0.1% error rate
- 90%+ uptime (Vercel SLA)

**Actions:**
- [ ] Remove registration restrictions
- [ ] Activate marketing campaigns
  - ProductHunt launch
  - LinkedIn posts (founder story)
  - Twitter/X announcement
  - Email to waitlist (500+ people)
  - Hacker News "Show HN" post
- [ ] Enable self-service signup
- [ ] Monitor scalability
  - Supabase: Upgrade to Pro if connection pool exhausted
  - Vercel: Monitor function execution times
  - OpenRouter: Watch API rate limits
- [ ] Implement in-app support chat (Intercom or plain.com)

---

## ✅ Launch Day Checklist

### Pre-Launch (T-24 hours)
- [ ] All Week 1-3 sprint items complete
- [ ] Full E2E test suite passing (all browsers)
- [ ] Performance benchmarks validated (< 3s page loads)
- [ ] Security vulnerabilities patched (npm audit clean)
- [ ] Custom domain working (oppspot.ai → oppspot-one.vercel.app)
- [ ] Monitoring/alerting configured (Sentry + PostHog)
- [ ] Backup/restore tested (Supabase backup verified)
- [ ] Rollback plan documented and communicated to team
- [ ] Status page ready (statuspage.io or simple HTML page)
- [ ] Team briefed on launch schedule and responsibilities

### Launch Day (T=0)
**Morning (9 AM):**
- [ ] Final smoke tests on production
  - Login/Logout
  - Search
  - ResearchGPT generation
  - Data Room upload
  - Collection creation
- [ ] Enable production error tracking (Sentry alert threshold: >10 errors/hour)
- [ ] Set up real-time monitoring dashboard
  - Vercel Analytics
  - Supabase Dashboard
  - Sentry Issues
  - PostHog Live Events

**10 AM - Go Live:**
- [ ] Announce on status page: "Launch in progress"
- [ ] Send launch emails to waitlist (batch 1: first 50)
- [ ] Post on LinkedIn, Twitter/X
- [ ] Monitor error rates every 15 minutes

**Noon - First Check-In:**
- [ ] Review error logs (any critical errors?)
- [ ] Check database performance (slow queries?)
- [ ] Verify cron jobs ran successfully
- [ ] Send batch 2 of waitlist emails (next 100)

**3 PM - Afternoon Check-In:**
- [ ] User count check (goal: 10+ signups)
- [ ] Feature usage stats (which features being used?)
- [ ] Support ticket count (any blockers?)
- [ ] Send batch 3 of waitlist emails (remaining)

**6 PM - Evening Review:**
- [ ] Daily metrics review with team
- [ ] Prioritize any hotfixes needed
- [ ] Plan next day's monitoring schedule

### Post-Launch (T+24 hours to T+7 days)
- [ ] Daily error rate review (< 1% target)
- [ ] User feedback collection (survey after first session)
- [ ] Performance optimization based on real usage
  - Identify slow API endpoints
  - Add caching where needed
  - Optimize database queries
- [ ] Hotfix deployment readiness (< 30 min turnaround)
- [ ] Weekly metrics report
  - Total users
  - Active users (7-day)
  - Feature adoption rates
  - ResearchGPT quota usage
  - Data Room documents uploaded
  - Error rate trend

---

## 📊 Monitoring & Success Metrics

### Critical Metrics (Monitor Hourly on Launch Day)
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Error Rate | < 1% | > 2% |
| Page Load Time (P95) | < 3s | > 5s |
| API Response Time (P95) | < 2s | > 4s |
| Uptime | 99%+ | < 95% |
| Active Users | 10+ Day 1 | N/A |

### User Engagement Metrics (Daily)
| Metric | Week 1 Goal | Week 4 Goal |
|--------|-------------|-------------|
| New Signups | 10-20 | 100+ |
| Weekly Active Users | 15+ | 200+ |
| Feature Adoption (3+ features used) | 60% | 80% |
| ResearchGPT Reports Generated | 50+ | 500+ |
| Data Room Documents Uploaded | 20+ | 200+ |
| Collections Created | 30+ | 300+ |
| Demo Mode Sessions | 50+ | 500+ |

### Business Metrics (Weekly)
| Metric | Month 1 Goal | Month 3 Goal |
|--------|--------------|--------------|
| Total Users | 100+ | 1,000+ |
| Paid Conversions | 5+ | 50+ |
| MRR (Monthly Recurring Revenue) | $500+ | $5,000+ |
| NPS Score | 40+ | 50+ |
| Support Tickets | < 20/week | < 100/week |

---

## 🎯 Feature Inventory

### ✅ Launch-Ready Features (Tier 1)

**Core Platform:**
- AI-Powered Business Search with natural language queries
- Interactive Maps with Leaflet clustering (1000+ markers)
- Business Detail Pages with comprehensive data
- Dashboard v2 (Command Center) with AI Daily Digest
- Collections & Lists for organizing businesses
- Demo Mode for prospects (one-click access)
- Authentication & User Management (Supabase Auth + Google OAuth)
- Notifications System (real-time + email via Resend)

**AI & Intelligence:**
- **ResearchGPT™** - AI company intelligence (70% complete - sufficient for launch)
  - 4+ data sources (Companies House, News API, Reed Jobs, Website Scraper)
  - < 30 second report generation
  - Differential caching (7-day snapshots, 6-hour signals)
  - GDPR-compliant with 6-month auto-deletion
  - Monthly quota tracking (100 reports/user/month)
- AI Lead Scoring with predictive analytics
- M&A Prediction Algorithm (nightly batch processing)
- Similar Companies finder with AI-powered similarity

**Data Room Suite:**
- Document Management with multi-file upload
- AI Document Classification (6 types: financial, contract, legal, HR, due diligence, other)
- **Data Room Q&A Copilot** - RAG-based document Q&A
  - Vector search with pgvector
  - Streaming responses
  - Citation deep-linking
  - Query history with export (JSON/CSV)
  - 72 contract tests + 3 E2E tests
- Financial Analysis tools (cohort, concentration, AR/AP aging)
- Red Flags Detection with explainability
- Integration Playbooks for M&A

**Enterprise Features:**
- Competitive Intelligence suite (9 E2E tests)
- ESG Risk Screening with benchmarks
- RBAC System with granular permissions
- Admin Dashboard with system health monitoring
- Alert System with Slack integration
- Audit Logs (immutable activity tracking)
- Team Collaboration with real-time presence

**User Experience:**
- Command Palette (⌘K) for fast navigation
- Keyboard Shortcuts (comprehensive: G+D, G+S, N, R, ?)
- Mobile Navigation with bottom nav
- PWA Support (manifest.json, service worker)
- Weekly Updates newsletter feature
- Responsive Design (verified across all key pages)

---

### ⚠️ Incomplete Features (Mark as Beta or Hide)

**ResearchGPT™ (30% Gap):**
- ❌ Tech stack detection (planned)
- ❌ Competitor analysis section (planned)
- ❌ Voice interface (experimental)
- ❌ LinkedIn activity tracking (API access issue)

**Experimental Features (Hide Behind Feature Flags):**
- 🧪 Agent Workflows (mark as BETA)
- 🧪 Multi-Agent Swarm™ (not implemented)
- 🧪 TimeTravel™ predictive engine (not implemented)
- 🧪 OpportunityBot™ autonomous agent (not implemented)
- 🧪 DealSignals™ real-time dashboard (not implemented)
- 🧪 Knowledge Graph enhancements (partial)
- 🧪 Voice Commands (experimental)

**Action Required:**
```typescript
// Add to lib/feature-flags.ts
export const FEATURE_FLAGS = {
  AGENT_WORKFLOWS: process.env.NEXT_PUBLIC_ENABLE_AGENT_WORKFLOWS === 'true',
  MULTI_AGENT_SWARM: false, // Not implemented
  TIME_TRAVEL: false, // Not implemented
  OPPORTUNITY_BOT: false, // Not implemented
  DEAL_SIGNALS: false, // Not implemented
  VOICE_COMMANDS: process.env.NEXT_PUBLIC_ENABLE_VOICE === 'true',
} as const

// Hide in UI:
{FEATURE_FLAGS.AGENT_WORKFLOWS && <AgentWorkflowsTab />}
```

---

### 📅 Post-Launch Roadmap (Defer 3-6 Months)

**Q1 2026 (Jan-Mar):**
- ResearchGPT 100% completion
  - Tech stack detection
  - Competitor analysis
  - LinkedIn activity integration
- Unit test coverage expansion (target: 50% coverage)
- Data Room workflow automation
- Knowledge Graph enhancements

**Q2 2026 (Apr-Jun):**
- OpportunityBot™ autonomous agent
- Multi-Agent Swarm™ orchestration
- TimeTravel™ predictive engine
- Voice commands refinement
- Mobile apps (iOS, Android)

**Q3 2026 (Jul-Sep):**
- DealSignals™ real-time dashboard
- Advanced workflow builder
- API for third-party integrations
- Webhooks for automation

---

## ⚠️ Risk Assessment & Mitigation

### HIGH RISK

#### 1. Type Safety Compromise (1,227 'any' types)
**Risk:** Hidden production bugs, difficult debugging
**Likelihood:** HIGH
**Impact:** MEDIUM
**Mitigation:**
- Fix Tier 1 files (500 errors) before launch
- Add runtime validation with Zod for critical paths
- Increase Sentry error tracking sensitivity
- Plan Tier 2 cleanup (400 errors) for Month 2

#### 2. Custom Domain Misconfiguration
**Risk:** Users accessing outdated deployment
**Likelihood:** MEDIUM (currently happening)
**Impact:** HIGH (brand confusion, data inconsistency)
**Mitigation:**
- Fix immediately (Day 1 of Week 1)
- Add monitoring to alert if oppspot.ai != oppspot-one.vercel.app
- Document correct domain setup in runbook

#### 3. xlsx Security Vulnerability (CVE-2024-XXXX)
**Risk:** Prototype pollution attack
**Likelihood:** LOW (only affects export, not parsing)
**Impact:** MEDIUM
**Mitigation:**
- Upgrade immediately (Day 1 of Week 1)
- Add input validation on all Excel export functions
- Consider alternative: exceljs package (more maintained)

### MEDIUM RISK

#### 4. ResearchGPT Quota System Untested at Scale
**Risk:** Quota tracking fails, users hit API limits, billing issues
**Likelihood:** MEDIUM
**Impact:** MEDIUM
**Mitigation:**
- Thorough testing in Week 1 (create 10 test users, exhaust quotas)
- Monitor quota usage closely in soft launch
- Add alerts if >50 reports generated in 1 hour (potential abuse)
- Implement rate limiting per user (max 10 reports/hour)

#### 5. Missing Error Handling (Limited error.tsx Coverage)
**Risk:** Poor UX when errors occur, unhelpful error messages
**Likelihood:** MEDIUM
**Impact:** LOW (affects UX, not functionality)
**Mitigation:**
- Add error.tsx to 6 major routes in Week 1
- Implement global error boundary
- Use Sentry to capture all unhandled errors
- Plan comprehensive error handling in Month 2

#### 6. Experimental Features May Confuse Users
**Risk:** Users try beta features, encounter bugs, lose trust
**Likelihood:** MEDIUM
**Impact:** LOW
**Mitigation:**
- Hide behind feature flags (see above)
- Add "BETA" badges to experimental features
- Clear messaging: "This feature is experimental"
- Collect feedback on beta features separately

### LOW RISK

#### 7. Documentation Cleanup (100+ MD Files)
**Risk:** Developer confusion, cluttered repo
**Likelihood:** HIGH
**Impact:** LOW (doesn't affect users)
**Mitigation:**
- Archive 80% to /docs/archive/ in Week 2
- Create ARCHIVE_INDEX.md for reference
- No impact on launch timeline

#### 8. Minor React Warnings (Hook Dependencies)
**Risk:** Subtle bugs in useEffect hooks
**Likelihood:** LOW
**Impact:** LOW
**Mitigation:**
- Fix top 20 instances in Week 1
- Add ESLint rule: exhaustive-deps (warn → error)
- Plan systematic cleanup in Month 2

#### 9. Unused Variables (994 Warnings)
**Risk:** Code bloat, slightly larger bundle size
**Likelihood:** HIGH
**Impact:** NEGLIGIBLE
**Mitigation:**
- No action required for launch
- Run automated cleanup script post-launch
- Enable ESLint rule: no-unused-vars (warn → error)

---

## 🆘 Emergency Procedures

### Rollback Plan

**Trigger Conditions (Initiate Rollback If):**
- Error rate > 5% for 15+ minutes
- Critical feature completely broken (auth, search, ResearchGPT)
- Data corruption detected
- Security breach suspected
- Vercel/Supabase outage affecting >50% of users

**Rollback Procedure (< 5 Minutes):**
```bash
# 1. Vercel Instant Rollback
# Go to Vercel Dashboard → oppspot-one → Deployments
# Click "..." on previous stable deployment → "Promote to Production"

# 2. Database Rollback (if schema changed)
# Restore from Supabase automatic backup
# Go to Supabase Dashboard → Database → Backups
# Select backup from before deployment → Restore

# 3. Notify Users
# Post on status page: "We've detected an issue and rolled back to a previous stable version."
# Send email to active users (if issue affected >100 users)

# 4. Team Communication
# Slack alert: "@channel ROLLBACK INITIATED - [reason]"
# Incident Zoom call link: [insert link]
```

**Post-Rollback Actions:**
- [ ] Root cause analysis (within 2 hours)
- [ ] Fix and test in staging environment
- [ ] Deploy fix with staged rollout (10% → 50% → 100%)
- [ ] Post-mortem document (within 24 hours)

---

### Incident Response Playbook

**Severity Levels:**

**P0 - Critical (Response: Immediate)**
- Authentication completely broken (no one can log in)
- Data loss or corruption
- Security breach
- **Response Time:** < 5 minutes
- **Team:** All hands on deck

**P1 - High (Response: Within 30 Minutes)**
- Core feature broken (search, ResearchGPT, Data Room)
- Performance degradation (> 10s page loads)
- High error rate (3-5%)
- **Response Time:** < 30 minutes
- **Team:** On-call engineer + lead

**P2 - Medium (Response: Within 4 Hours)**
- Non-critical feature broken
- UI bug affecting UX
- Moderate error rate (1-3%)
- **Response Time:** < 4 hours
- **Team:** On-call engineer

**P3 - Low (Response: Next Business Day)**
- Minor UI issues
- Documentation errors
- Non-urgent feature requests
- **Response Time:** < 24 hours
- **Team:** Engineering backlog

**On-Call Schedule (Suggested):**
- **Week 1 (Soft Launch):** All team members on-call
- **Week 2-4:** Rotate daily (2-person coverage)
- **Post-Launch:** Rotate weekly (primary + backup)

---

## 📞 Support Plan

### Support Channels

**Tier 1 - Self-Service (24/7):**
- In-app help tooltips
- Knowledge base (docs.oppspot.ai - to be created)
- FAQ page
- Video tutorials (YouTube channel)

**Tier 2 - Community Support (Best Effort):**
- Discord/Slack community (optional)
- Twitter/X @oppspot for public questions
- ProductHunt discussions

**Tier 3 - Direct Support (Business Hours):**
- Email: support@oppspot.ai (target: 24-hour response)
- In-app chat (Intercom or plain.com) - Premium users only
- Zoom calls (Enterprise users only)

### Support SLAs (Target Response Times)

| User Tier | Email Response | Resolution Time |
|-----------|----------------|-----------------|
| Free | 48 hours | Best effort |
| Professional | 24 hours | 3 business days |
| Enterprise | 4 hours | 24 hours |

### Common Issues & Responses (Pre-Written)

**Issue:** "I can't log in"
**Response:**
1. Check if using correct email (Google OAuth vs. email/password)
2. Clear browser cache and cookies
3. Try incognito/private window
4. Check Supabase Auth logs for error

**Issue:** "ResearchGPT quota exceeded"
**Response:**
1. Explain quota system (100 reports/month)
2. Show quota reset date (1st of next month)
3. Offer upgrade to higher tier
4. Alternative: Use demo mode to view sample reports

**Issue:** "Data Room upload failed"
**Response:**
1. Check file size (< 50MB per file)
2. Check file type (PDF, DOCX, XLSX only)
3. Check browser console for errors
4. Try different browser
5. Escalate if issue persists

---

## 🎓 Team Preparation

### Launch Roles & Responsibilities

**Launch Commander (CEO/Founder):**
- Overall launch decision-making
- External communications (social media, press)
- Customer escalations
- Go/no-go call

**Technical Lead:**
- Code freeze management
- Deployment execution
- Incident response coordination
- Rollback decisions

**QA Lead:**
- Final testing sign-off
- Manual testing during launch
- Bug triage and prioritization

**Support Lead:**
- Support channel monitoring
- Response template preparation
- User feedback collection
- Support ticket escalation

**Marketing Lead:**
- Launch announcement timing
- Social media posting
- Email campaign execution
- Analytics tracking

### Pre-Launch Training (Week 3)

- [ ] Full product walkthrough (2 hours)
  - All features demonstrated
  - Common user flows
  - Known limitations
- [ ] Support training (1 hour)
  - Response templates review
  - Escalation procedures
  - Tone and voice guidelines
- [ ] Incident response drill (1 hour)
  - Simulate P0 incident
  - Practice rollback procedure
  - Test communication channels
- [ ] Launch day dry run (30 min)
  - Walk through launch checklist
  - Verify everyone knows their role
  - Test monitoring dashboards

---

## 💰 Cost Considerations

### Current Monthly Costs (Estimated)

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Pro | $20 |
| Supabase | Pro | $25 |
| OpenRouter API | Pay-as-you-go | $50-200 (varies by ResearchGPT usage) |
| Resend | Pro | $20 |
| Domain | oppspot.ai | $12/year |
| **Total** | | **~$115-245/month** |

### Scaling Costs (If 1,000 Users)

| Service | Expected Cost |
|---------|---------------|
| Vercel | $20 (within Pro limits) |
| Supabase | $25-100 (depends on DB size & bandwidth) |
| OpenRouter API | $500-1,000 (20,000 ResearchGPT reports/month) |
| Resend | $20-50 (100,000 emails/month) |
| Monitoring (Sentry/PostHog) | $29-99 |
| **Total** | **~$594-1,294/month** |

### Cost Optimization Tips

1. **ResearchGPT Caching:** Differential caching reduces AI calls by 60%
2. **Database Indexes:** Properly indexed (25 indexes added) - reduces query costs
3. **Vercel Edge Functions:** Use for static content, reduce compute costs
4. **Supabase Connection Pooling:** Enabled by default, prevents connection exhaustion

---

## 🎯 Success Definition

### Launch Success (Week 1-4)

**Minimum Viable Success:**
- 50+ total signups
- 30+ weekly active users
- 100+ ResearchGPT reports generated
- < 1% error rate
- 3+ positive testimonials

**Target Success:**
- 100+ total signups
- 60+ weekly active users
- 500+ ResearchGPT reports generated
- < 0.5% error rate
- 5+ paying customers
- 10+ positive testimonials

**Stretch Success:**
- 200+ total signups
- 120+ weekly active users
- 1,000+ ResearchGPT reports generated
- < 0.1% error rate
- 20+ paying customers
- Featured on ProductHunt homepage

### Product-Market Fit Indicators (Month 3)

- 40%+ of users return weekly
- 60%+ of users use 3+ features
- NPS score > 50
- 10%+ conversion rate (free → paid)
- Organic growth (word of mouth, referrals)
- Unsolicited feature requests

---

## 📝 Final Recommendations

### Immediate Actions (This Week)

1. **Schedule the Sprint:** Block 2-3 weeks on team calendars
2. **Assign Owners:** Designate owner for each critical blocker
3. **Set Up Monitoring:** Install Sentry + PostHog today
4. **Fix Domain:** Correct oppspot.ai routing (30 minutes)
5. **Security Patch:** Upgrade xlsx package (2 hours)

### Communication Plan

**Internal:**
- Daily standups during sprint (15 min)
- End-of-week demo (Fridays, 30 min)
- Launch rehearsal (Week 3, Day 5)

**External:**
- Soft launch announcement (LinkedIn, Twitter/X)
- Weekly progress updates on social media
- Email to waitlist with launch date

### Decision Points

**Week 1 Review (Go/No-Go #1):**
- If critical blockers not resolved → DELAY launch by 1 week
- If 2+ P0 bugs discovered → DELAY launch by 1 week
- If security audit fails → DELAY launch indefinitely

**Week 2 Review (Go/No-Go #2):**
- If E2E tests failing → DELAY launch by 3 days
- If performance < targets → DELAY launch by 3 days
- If documentation incomplete → PROCEED (can update post-launch)

**Week 3 Review (Final Go/No-Go):**
- If any P0/P1 bugs → DELAY launch by 1 week
- If monitoring not set up → DELAY launch by 2 days
- If rollback untested → DELAY launch by 1 day

---

## 🎉 Conclusion

oppSpot is an **impressive, feature-rich B2B intelligence platform** ready for launch with focused preparation. The 2-3 week sprint outlined above addresses all critical issues while maintaining the strong foundation you've built.

**Your Strengths:**
- ✅ Excellent testing infrastructure (89 E2E tests)
- ✅ Production-grade features (30+ major features)
- ✅ Solid architecture (Supabase RLS, Vercel deployment)
- ✅ Clear product vision (ResearchGPT, Data Room Q&A, Competitive Intel)

**Your Focus Areas:**
- ⚠️ Type safety cleanup (Tier 1 files)
- ⚠️ Security patches (xlsx)
- ⚠️ User onboarding polish

**Recommended Next Steps:**
1. Review this plan with the team
2. Commit to the 3-week sprint
3. Assign owners to each critical task
4. Set launch date for mid-December 2025
5. Execute with discipline and confidence

**You've built something powerful. Now let's launch it successfully.** 🚀

---

**Document Version:** 1.0
**Last Updated:** November 16, 2025
**Next Review:** Week 1 completion (Day 5)
**Owner:** Product/Engineering Leadership
