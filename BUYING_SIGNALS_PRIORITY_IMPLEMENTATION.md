# Buying Signals Detection - Priority Implementation Plan

## Executive Summary
Implement a comprehensive buying signals detection system that monitors multiple data sources to identify companies showing purchase intent, enabling proactive sales engagement at the optimal time.

## Business Value
- **Increase conversion rates by 40%** by engaging prospects at the right time
- **Reduce sales cycle by 25%** through early signal detection
- **Improve lead prioritization** with real-time buying intent scoring
- **Enable proactive outreach** before competitors

## Phase 1: Core Signal Detection (Weeks 1-3)

### Week 1: Infrastructure Setup
**Goal**: Establish the foundation for signal detection

#### Tasks:
1. **Database Schema**
   ```sql
   -- Buying signals master table
   CREATE TABLE buying_signals (
     id UUID PRIMARY KEY,
     company_id UUID,
     signal_type VARCHAR(50),
     signal_strength FLOAT,
     confidence_score FLOAT,
     source VARCHAR(100),
     raw_data JSONB,
     detected_at TIMESTAMP,
     processed BOOLEAN DEFAULT FALSE
   );

   -- Signal patterns table
   CREATE TABLE signal_patterns (
     id UUID PRIMARY KEY,
     pattern_name VARCHAR(100),
     pattern_type VARCHAR(50),
     detection_rules JSONB,
     weight FLOAT,
     active BOOLEAN DEFAULT TRUE
   );
   ```

2. **Signal Detection Service**
   ```typescript
   // lib/signals/buying-signal-detector.ts
   class BuyingSignalDetector {
     async detectSignals(companyId: string): Promise<Signal[]>
     async analyzeWebActivity(domain: string): Promise<WebSignals>
     async checkJobPostings(companyName: string): Promise<JobSignals>
     async monitorNewsEvents(companyName: string): Promise<NewsSignals>
   }
   ```

3. **API Endpoints**
   - `POST /api/signals/detect` - Trigger signal detection
   - `GET /api/signals/company/{id}` - Get signals for company
   - `POST /api/signals/batch` - Batch signal detection

### Week 2: Web Activity Monitoring
**Goal**: Track website visits and content engagement

#### Implementation:
```typescript
// lib/signals/web-activity-tracker.ts
interface WebActivitySignal {
  company_id: string
  activities: {
    page_views: number
    time_on_site: number
    pages_visited: string[]
    content_downloads: string[]
    form_submissions: number
    pricing_page_views: number
  }
  intent_score: number
  last_visit: Date
}

class WebActivityTracker {
  async trackPageView(session: Session, page: string): void {
    // Track page view
    await this.incrementPageViews(session.company_id)

    // Check for high-intent pages
    if (this.isHighIntentPage(page)) {
      await this.triggerHighIntentSignal(session.company_id, page)
    }
  }

  private isHighIntentPage(page: string): boolean {
    const highIntentPages = ['/pricing', '/demo', '/trial', '/contact']
    return highIntentPages.some(p => page.includes(p))
  }
}
```

#### Tracking Script:
```javascript
// public/tracking.js
(function() {
  const tracker = {
    sessionId: generateSessionId(),
    companyId: identifyCompany(),

    track: function(event, data) {
      fetch('/api/signals/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionId,
          company_id: this.companyId,
          event: event,
          data: data,
          timestamp: new Date().toISOString()
        })
      });
    }
  };

  // Track page views
  tracker.track('page_view', {
    url: window.location.href,
    referrer: document.referrer
  });

  // Track time on page
  let startTime = Date.now();
  window.addEventListener('beforeunload', () => {
    tracker.track('time_on_page', {
      duration: Date.now() - startTime,
      url: window.location.href
    });
  });
})();
```

### Week 3: Job Posting Analysis
**Goal**: Monitor hiring patterns indicating growth or new initiatives

#### Implementation:
```typescript
// lib/signals/job-posting-analyzer.ts
class JobPostingAnalyzer {
  private readonly JOB_BOARDS = [
    'linkedin.com/jobs',
    'indeed.com',
    'glassdoor.com',
    'careers.google.com'
  ];

  async analyzeJobPostings(companyName: string): Promise<JobPostingSignals> {
    const postings = await this.fetchJobPostings(companyName);

    return {
      total_openings: postings.length,
      departments: this.categorizeByDepartment(postings),
      seniority_levels: this.analyzeSeniorityLevels(postings),
      tech_stack: this.extractTechStack(postings),
      growth_indicators: this.identifyGrowthPatterns(postings),
      signal_strength: this.calculateSignalStrength(postings)
    };
  }

  private identifyGrowthPatterns(postings: JobPosting[]): GrowthIndicator[] {
    const patterns = [];

    // New department creation
    if (this.hasNewDepartment(postings)) {
      patterns.push({
        type: 'new_department',
        strength: 0.8,
        description: 'Creating new department/team'
      });
    }

    // Rapid hiring
    if (postings.length > 10) {
      patterns.push({
        type: 'rapid_expansion',
        strength: 0.9,
        description: `Hiring ${postings.length} positions`
      });
    }

    // Technology adoption
    const techRoles = postings.filter(p =>
      p.title.match(/engineer|developer|architect|devops/i)
    );
    if (techRoles.length > 5) {
      patterns.push({
        type: 'digital_transformation',
        strength: 0.7,
        description: 'Heavy technology hiring'
      });
    }

    return patterns;
  }
}
```

## Phase 2: Advanced Signal Sources (Weeks 4-6)

### Week 4: Social Media Monitoring
**Goal**: Track social mentions and engagement patterns

#### Implementation:
```typescript
// lib/signals/social-media-monitor.ts
class SocialMediaMonitor {
  async monitorCompany(companyId: string): Promise<SocialSignals> {
    const company = await this.getCompany(companyId);

    const signals = await Promise.all([
      this.monitorLinkedIn(company),
      this.monitorTwitter(company),
      this.monitorReddit(company)
    ]);

    return this.aggregateSignals(signals);
  }

  private async monitorLinkedIn(company: Company): Promise<LinkedInSignals> {
    // Monitor company page activity
    const companyActivity = await this.getLinkedInActivity(company.linkedin_url);

    // Monitor employee posts about initiatives
    const employeePosts = await this.searchEmployeePosts(company.name);

    // Analyze engagement patterns
    return {
      company_posts: companyActivity.posts,
      employee_mentions: employeePosts.length,
      engagement_rate: companyActivity.engagement_rate,
      growth_mentions: this.extractGrowthMentions(employeePosts),
      technology_mentions: this.extractTechMentions(employeePosts)
    };
  }

  private extractGrowthMentions(posts: Post[]): string[] {
    const growthKeywords = [
      'expanding', 'hiring', 'growth', 'new market',
      'launching', 'scaling', 'investment', 'transformation'
    ];

    return posts
      .filter(post =>
        growthKeywords.some(keyword =>
          post.content.toLowerCase().includes(keyword)
        )
      )
      .map(post => post.content.substring(0, 200));
  }
}
```

### Week 5: Technology Stack Changes
**Goal**: Detect technology adoption and changes

#### Implementation:
```typescript
// lib/signals/tech-stack-monitor.ts
class TechStackMonitor {
  async detectTechnologyChanges(companyId: string): Promise<TechSignals> {
    const company = await this.getCompany(companyId);

    // Multiple detection methods
    const signals = await Promise.all([
      this.analyzeWebsiteTech(company.website),
      this.checkDNSRecords(company.domain),
      this.scanJobPostingsForTech(company.name),
      this.checkPublicRepos(company.github_org)
    ]);

    return this.consolidateTechSignals(signals);
  }

  private async analyzeWebsiteTech(website: string): Promise<Technology[]> {
    // Use Wappalyzer API or similar
    const response = await fetch(`https://api.wappalyzer.com/v2/lookup?url=${website}`);
    const data = await response.json();

    return data.technologies.map(tech => ({
      name: tech.name,
      category: tech.category,
      confidence: tech.confidence,
      version: tech.version,
      first_detected: new Date()
    }));
  }

  private async checkDNSRecords(domain: string): Promise<ServiceProvider[]> {
    // Check MX records for email providers
    // Check NS records for hosting
    // Check TXT records for services

    const records = await this.getDNSRecords(domain);
    const providers = [];

    // Email provider change
    if (records.mx?.includes('google.com')) {
      providers.push({ type: 'email', provider: 'Google Workspace' });
    }

    // CDN adoption
    if (records.cname?.includes('cloudflare')) {
      providers.push({ type: 'cdn', provider: 'Cloudflare' });
    }

    return providers;
  }
}
```

### Week 6: Financial Signals
**Goal**: Track financial indicators and funding events

#### Implementation:
```typescript
// lib/signals/financial-signal-detector.ts
class FinancialSignalDetector {
  async detectFinancialSignals(companyId: string): Promise<FinancialSignals> {
    const company = await this.getCompany(companyId);

    const signals = await Promise.all([
      this.checkFundingNews(company.name),
      this.analyzeFinancialReports(company.company_number),
      this.checkCreditRating(company),
      this.detectExpansionSignals(company)
    ]);

    return this.aggregateFinancialSignals(signals);
  }

  private async detectExpansionSignals(company: Company): Promise<ExpansionSignal[]> {
    const signals = [];

    // Office expansion
    const newOffices = await this.checkNewOfficeLocations(company);
    if (newOffices.length > 0) {
      signals.push({
        type: 'geographic_expansion',
        strength: 0.8,
        details: `New offices in ${newOffices.join(', ')}`
      });
    }

    // Partnership announcements
    const partnerships = await this.findPartnershipNews(company.name);
    if (partnerships.length > 0) {
      signals.push({
        type: 'strategic_partnerships',
        strength: 0.7,
        details: partnerships
      });
    }

    // Product launches
    const products = await this.detectProductLaunches(company);
    if (products.length > 0) {
      signals.push({
        type: 'product_expansion',
        strength: 0.6,
        details: products
      });
    }

    return signals;
  }
}
```

## Phase 3: Signal Scoring & Intelligence (Weeks 7-8)

### Week 7: Signal Aggregation and Scoring
**Goal**: Combine all signals into actionable intelligence

#### Implementation:
```typescript
// lib/signals/signal-intelligence.ts
class SignalIntelligence {
  private readonly SIGNAL_WEIGHTS = {
    funding_round: 0.9,
    rapid_hiring: 0.8,
    technology_adoption: 0.7,
    pricing_page_visit: 0.8,
    demo_request: 0.95,
    competitor_research: 0.6,
    executive_change: 0.7,
    expansion_news: 0.75
  };

  async calculateBuyingIntent(companyId: string): Promise<BuyingIntent> {
    // Fetch all signals
    const signals = await this.getAllSignals(companyId);

    // Calculate weighted score
    const intentScore = this.calculateWeightedScore(signals);

    // Determine intent level
    const intentLevel = this.determineIntentLevel(intentScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(signals, intentLevel);

    // Predict timeline
    const timeline = this.predictPurchaseTimeline(signals);

    return {
      company_id: companyId,
      intent_score: intentScore,
      intent_level: intentLevel,
      top_signals: this.getTopSignals(signals, 5),
      recommendations: recommendations,
      predicted_timeline: timeline,
      confidence: this.calculateConfidence(signals),
      last_updated: new Date()
    };
  }

  private calculateWeightedScore(signals: Signal[]): number {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const signal of signals) {
      const weight = this.SIGNAL_WEIGHTS[signal.type] || 0.5;
      weightedSum += signal.strength * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  }

  private determineIntentLevel(score: number): IntentLevel {
    if (score >= 80) return 'hot';
    if (score >= 60) return 'warm';
    if (score >= 40) return 'lukewarm';
    if (score >= 20) return 'cold';
    return 'no_intent';
  }

  private generateRecommendations(
    signals: Signal[],
    intentLevel: IntentLevel
  ): Recommendation[] {
    const recommendations = [];

    if (intentLevel === 'hot') {
      recommendations.push({
        action: 'immediate_outreach',
        priority: 'high',
        message: 'Schedule a call within 24 hours',
        template: 'high_intent_outreach'
      });
    }

    // Check specific signals
    if (signals.some(s => s.type === 'demo_request')) {
      recommendations.push({
        action: 'personalized_demo',
        priority: 'high',
        message: 'Prepare customized demo based on their industry'
      });
    }

    if (signals.some(s => s.type === 'pricing_page_visit')) {
      recommendations.push({
        action: 'send_roi_calculator',
        priority: 'medium',
        message: 'Share ROI calculator and case studies'
      });
    }

    return recommendations;
  }
}
```

### Week 8: Real-time Alerting
**Goal**: Notify sales team of high-value signals immediately

#### Implementation:
```typescript
// lib/signals/signal-alerting.ts
class SignalAlertingSystem {
  async processSignal(signal: Signal): Promise<void> {
    // Evaluate signal importance
    const priority = this.evaluatePriority(signal);

    if (priority === 'high') {
      await this.sendImmediateAlert(signal);
    } else if (priority === 'medium') {
      await this.queueDigestAlert(signal);
    }

    // Update CRM
    await this.updateCRM(signal);

    // Trigger workflows
    await this.triggerWorkflows(signal);
  }

  private async sendImmediateAlert(signal: Signal): Promise<void> {
    const company = await this.getCompany(signal.company_id);
    const owner = await this.getAccountOwner(company.id);

    // Send multiple channels
    await Promise.all([
      this.sendEmail(owner.email, this.formatEmailAlert(signal, company)),
      this.sendSlack(owner.slack_id, this.formatSlackAlert(signal, company)),
      this.sendInAppNotification(owner.id, signal)
    ]);

    // Log alert
    await this.logAlert({
      signal_id: signal.id,
      user_id: owner.id,
      alert_type: 'immediate',
      channels: ['email', 'slack', 'in_app'],
      sent_at: new Date()
    });
  }

  private formatSlackAlert(signal: Signal, company: Company): SlackMessage {
    return {
      text: `🔥 High Intent Signal Detected!`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${company.name}* is showing strong buying signals`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Signal Type:*\n${signal.type}`
            },
            {
              type: 'mrkdwn',
              text: `*Strength:*\n${signal.strength}/10`
            }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Details' },
              url: `https://oppspot.ai/companies/${company.id}`
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Contact Now' },
              style: 'primary',
              action_id: 'contact_company'
            }
          ]
        }
      ]
    };
  }
}
```

## Phase 4: UI Implementation (Week 9)

### Buying Signals Dashboard
```typescript
// app/(dashboard)/signals/page.tsx
export default function SignalsPage() {
  return (
    <div className="space-y-6">
      {/* Signal Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Buying Signals</CardTitle>
          <CardDescription>
            Companies showing purchase intent in the last 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignalFeed
            signals={signals}
            onSignalClick={handleSignalClick}
          />
        </CardContent>
      </Card>

      {/* Signal Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Hot Leads"
          value={metrics.hot_leads}
          trend={{ value: 23, type: 'up' }}
          icon={Flame}
        />
        <MetricCard
          title="Signals Today"
          value={metrics.signals_today}
          trend={{ value: 15, type: 'up' }}
          icon={Activity}
        />
        <MetricCard
          title="Avg Intent Score"
          value={`${metrics.avg_intent_score}%`}
          icon={TrendingUp}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversion_rate}%`}
          trend={{ value: 5, type: 'up' }}
          icon={Target}
        />
      </div>

      {/* Company Signal Details */}
      <DataTable
        title="Companies by Intent Level"
        columns={[
          { id: 'company', header: 'Company' },
          { id: 'intent_score', header: 'Intent Score' },
          { id: 'top_signal', header: 'Top Signal' },
          { id: 'last_activity', header: 'Last Activity' },
          { id: 'actions', header: 'Actions' }
        ]}
        data={companies}
      />
    </div>
  );
}
```

### Signal Timeline Component
```typescript
// components/signals/signal-timeline.tsx
export function SignalTimeline({ companyId }: { companyId: string }) {
  const signals = useSignals(companyId);

  return (
    <TimelineCard
      title="Buying Signal History"
      events={signals.map(signal => ({
        id: signal.id,
        title: getSignalTitle(signal),
        description: signal.description,
        timestamp: signal.detected_at,
        type: getSignalType(signal),
        icon: getSignalIcon(signal),
        badges: [signal.source, `${signal.strength}/10`]
      }))}
    />
  );
}
```

## Phase 5: Testing & Optimization (Week 10)

### Performance Benchmarks
- Signal detection: < 500ms per company
- Batch processing: 1000 companies/minute
- Real-time alerts: < 2 seconds latency
- Dashboard load: < 1 second

### A/B Testing
```typescript
// lib/signals/ab-testing.ts
class SignalABTesting {
  async runExperiment(experimentId: string): Promise<ExperimentResults> {
    const variants = {
      control: this.originalScoringAlgorithm,
      variant_a: this.mlBasedScoring,
      variant_b: this.hybridScoring
    };

    const results = await this.splitTraffic(variants);
    return this.analyzeResults(results);
  }
}
```

## Success Metrics

### KPIs to Track
1. **Signal Accuracy**
   - False positive rate < 10%
   - Signal-to-conversion ratio > 30%

2. **Business Impact**
   - Lead response time reduced by 50%
   - Sales qualified leads increased by 40%
   - Deal velocity improved by 25%

3. **System Performance**
   - 99.9% uptime
   - < 1% error rate
   - < 100ms p95 latency

### ROI Calculation
```
Monthly Revenue Impact =
  (Additional Conversions × Average Deal Size) +
  (Time Saved × Sales Rep Hourly Cost) +
  (Improved Win Rate × Pipeline Value)

Expected ROI: 300% within 6 months
```

## Risk Mitigation

### Technical Risks
1. **Data Quality**: Implement validation and confidence scoring
2. **API Rate Limits**: Use queuing and caching strategies
3. **False Positives**: Machine learning model refinement

### Business Risks
1. **Privacy Concerns**: Ensure GDPR/CCPA compliance
2. **Alert Fatigue**: Intelligent filtering and prioritization
3. **Integration Complexity**: Phased rollout approach

## Next Steps

### Immediate Actions (Week 1)
1. Set up signal detection infrastructure
2. Configure web tracking
3. Create database schema
4. Build first API endpoints

### Quick Wins (Week 2-3)
1. Basic web activity tracking
2. Job posting monitoring
3. Simple scoring algorithm
4. Email alerts for high-intent signals

### Full Implementation (Week 4-10)
1. Complete all signal sources
2. ML-based scoring
3. Real-time alerting
4. Dashboard and analytics
5. CRM integration

## Budget Estimate

### Development Resources
- 2 Senior Engineers × 10 weeks = £40,000
- 1 Data Scientist × 6 weeks = £15,000
- 1 UI/UX Designer × 4 weeks = £8,000

### Infrastructure Costs (Monthly)
- API subscriptions: £500
- Additional compute: £300
- Storage: £100
- Monitoring: £200

**Total Investment**: £64,100 (one-time) + £1,100/month

**Expected Return**: £250,000+ additional revenue within 6 months

## Conclusion

The Buying Signals Detection system will transform how OppSpot identifies and engages with high-intent prospects. By implementing this comprehensive solution, we'll provide sales teams with unprecedented visibility into buyer behavior, enabling them to engage at the perfect moment with the right message.

The phased approach ensures quick wins while building toward a sophisticated, AI-powered signal intelligence platform that will become a key competitive advantage.