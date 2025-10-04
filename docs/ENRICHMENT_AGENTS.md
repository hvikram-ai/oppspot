# Enrichment Agents Documentation

## Overview

The oppSpot enrichment system provides automated data enrichment for company records using multiple AI-powered agents. This system scrapes and analyzes external data sources to enhance company profiles and detect buying signals.

## Architecture

### Components

1. **Enrichment Agents**
   - `LinkedInScraperAgent` - Scrapes LinkedIn company profiles
   - `WebsiteAnalyzerAgent` - Analyzes company websites

2. **Enrichment Orchestrator**
   - Coordinates agent execution
   - Manages job queuing and tracking
   - Handles parallel/sequential execution

3. **API Routes**
   - `POST /api/enrichment` - Start enrichment job
   - `GET /api/enrichment` - List enrichment jobs
   - `GET /api/enrichment/[jobId]` - Get job status
   - `DELETE /api/enrichment/[jobId]` - Cancel job

## Agents

### LinkedIn Scraper Agent

**Purpose**: Enriches company data with LinkedIn insights

**Data Extracted**:
- Employee count
- Follower count
- Industry
- Headquarters location
- Specialties
- Employee growth trends
- Recent posts and engagement
- Leadership information

**Buying Signals Detected**:
- Rapid employee growth (>20% growth)
- High social engagement (>100 avg engagement)

**Configuration**:
```typescript
{
  companyIds?: string[]        // Specific companies to scrape
  maxCompanies?: number         // Max companies per run (default: 10)
  includeEmployeeGrowth?: boolean
  includeRecentPosts?: boolean
  includeLeadership?: boolean
  headless?: boolean           // Browser headless mode (default: true)
}
```

**Rate Limiting**: 2-5 seconds between requests

**Technology**: Puppeteer (browser automation)

### Website Analyzer Agent

**Purpose**: Analyzes company websites for enrichment data and buying signals

**Data Extracted**:
- Technology stack (React, Next.js, WordPress, etc.)
- Product/service offerings
- News and blog posts
- Contact information (email, phone, address)
- SEO metadata
- Social media links
- Career/hiring pages
- Keywords

**Buying Signals Detected**:
- Career pages detected (moderate signal - hiring = growth)
- Active blog content (>3 posts = active company)
- Modern tech stack (React, Next.js, Vue = investment in development)
- Using sales tools (Stripe, HubSpot, Salesforce = sales-ready)

**Configuration**:
```typescript
{
  companyIds?: string[]        // Specific companies to analyze
  maxCompanies?: number         // Max companies per run (default: 20)
  analyzeTechStack?: boolean
  analyzeContent?: boolean
  analyzeCareerPages?: boolean
  followLinks?: boolean         // Crawl additional pages
  maxPagesPerSite?: number     // Max pages to crawl per site
}
```

**Rate Limiting**: 1-3 seconds between requests

**Technology**: Cheerio (HTML parsing), Axios (HTTP requests)

## Usage

### 1. Database Setup

First, run the migration to create required tables:

```bash
# Apply migration
psql -h [host] -U [user] -d [database] -f supabase/migrations/20250204_enrichment_system.sql
```

This creates:
- `enrichment_data` - Stores enriched company data
- `enrichment_jobs` - Tracks enrichment job progress

### 2. Starting an Enrichment Job

**API Request**:
```bash
POST /api/enrichment
Content-Type: application/json

{
  "companyIds": ["uuid-1", "uuid-2", "uuid-3"],
  "enrichmentTypes": ["linkedin", "website"], // or ["all"]
  "mode": "sequential", // or "parallel"
  "priority": "normal"  // or "high", "low"
}
```

**Response**:
```json
{
  "success": true,
  "job": {
    "id": "job-uuid",
    "status": "pending",
    "companyIds": ["uuid-1", "uuid-2", "uuid-3"],
    "enrichmentTypes": ["linkedin", "website"],
    "progress": {
      "total": 6,
      "completed": 0,
      "failed": 0
    }
  }
}
```

### 3. Checking Job Status

**API Request**:
```bash
GET /api/enrichment/[jobId]
```

**Response**:
```json
{
  "success": true,
  "job": {
    "id": "job-uuid",
    "status": "running",
    "companyIds": ["uuid-1", "uuid-2"],
    "enrichmentTypes": ["linkedin", "website"],
    "progress": {
      "total": 4,
      "completed": 2,
      "failed": 0
    },
    "results": [
      {
        "companyId": "uuid-1",
        "enrichmentType": "linkedin",
        "status": "success",
        "data": { ... },
        "duration": 5234
      }
    ],
    "startedAt": "2025-02-04T10:00:00Z",
    "completedAt": null,
    "error": null
  }
}
```

### 4. Listing All Jobs

**API Request**:
```bash
GET /api/enrichment?limit=20
```

**Response**:
```json
{
  "success": true,
  "jobs": [
    {
      "id": "job-uuid-1",
      "status": "completed",
      "companyIds": ["uuid-1"],
      "enrichmentTypes": ["all"],
      "progress": { "total": 2, "completed": 2, "failed": 0 },
      "startedAt": "2025-02-04T10:00:00Z",
      "completedAt": "2025-02-04T10:05:00Z"
    }
  ]
}
```

### 5. Canceling a Job

**API Request**:
```bash
DELETE /api/enrichment/[jobId]
```

**Response**:
```json
{
  "success": true,
  "message": "Job cancelled successfully"
}
```

## Programmatic Usage

### Using the Orchestrator Directly

```typescript
import { createEnrichmentOrchestrator } from '@/lib/ai/enrichment/enrichment-orchestrator'

// Create orchestrator
const orchestrator = await createEnrichmentOrchestrator('org-uuid')

// Start enrichment
const job = await orchestrator.enrichCompanies({
  companyIds: ['company-uuid-1', 'company-uuid-2'],
  enrichmentTypes: ['linkedin', 'website'],
  mode: 'parallel'
})

// Check status
const status = await orchestrator.getJobStatus(job.id)

// List jobs
const jobs = await orchestrator.getJobs(20)

// Cancel job
await orchestrator.cancelJob(job.id)
```

### Using Agents Directly

```typescript
import { createLinkedInScraperAgent } from '@/lib/ai/agents/linkedin-scraper-agent'
import { createWebsiteAnalyzerAgent } from '@/lib/ai/agents/website-analyzer-agent'

// LinkedIn scraper
const linkedInAgent = await createLinkedInScraperAgent('agent-uuid')
const linkedInResult = await linkedInAgent.run({
  companyIds: ['company-uuid'],
  maxCompanies: 1
})

// Website analyzer
const websiteAgent = await createWebsiteAnalyzerAgent('agent-uuid')
const websiteResult = await websiteAgent.run({
  companyIds: ['company-uuid'],
  maxCompanies: 1
})
```

## Data Storage

### Enriched Data

Enriched data is stored in two places:

1. **`enrichment_data` table** - Raw enrichment data
```sql
SELECT * FROM enrichment_data
WHERE company_id = 'uuid'
ORDER BY enriched_at DESC;
```

2. **`businesses` table** - Key fields updated directly
   - `employee_count`
   - `linkedin_url`
   - `industry`
   - `headquarters`
   - `technologies`
   - `contact_email`
   - `contact_phone`

### Accessing Enrichment Data

```typescript
const supabase = await createClient()

// Get all enrichment data for a company
const { data } = await supabase
  .from('enrichment_data')
  .select('*')
  .eq('company_id', companyId)
  .order('enriched_at', { ascending: false })

// Get LinkedIn data specifically
const { data: linkedInData } = await supabase
  .from('enrichment_data')
  .select('enriched_data')
  .eq('company_id', companyId)
  .eq('source', 'linkedin')
  .single()

// Get website analysis data
const { data: websiteData } = await supabase
  .from('enrichment_data')
  .select('enriched_data')
  .eq('company_id', companyId)
  .eq('source', 'website_analysis')
  .single()
```

## Buying Signals

Enrichment agents automatically detect and create buying signals:

### LinkedIn Signals

| Signal Type | Strength | Confidence | Trigger |
|------------|----------|------------|---------|
| rapid_employee_growth | strong | 85% | >20% growth |
| high_social_engagement | moderate | 70% | >100 avg engagement |

### Website Signals

| Signal Type | Strength | Confidence | Trigger |
|------------|----------|------------|---------|
| career_page_detected | moderate | 65% | Career page found |
| active_blog_content | weak | 50% | >3 blog posts |
| modern_tech_stack | weak | 55% | React/Next.js/Vue detected |
| using_sales_tools | moderate | 70% | Stripe/HubSpot/Salesforce detected |

Signals are stored in the `buying_signals` table and expire after 30 days.

## Best Practices

### Rate Limiting
- LinkedIn: Max 10 companies per job (2-5s delay between requests)
- Website: Max 20 companies per job (1-3s delay between requests)
- Use `sequential` mode for smaller batches
- Use `parallel` mode for faster processing (higher resource usage)

### Error Handling
- Agents automatically retry failed requests
- Failed enrichments are tracked in job results
- Check `job.progress.failed` to see failure count

### Performance
- LinkedIn scraping: ~5-10 seconds per company
- Website analysis: ~2-5 seconds per company
- Parallel mode: 2-3x faster but higher resource usage

### Monitoring
- Monitor job status via GET /api/enrichment/[jobId]
- Check agent execution logs in `agent_executions` table
- Review buying signals in `buying_signals` table

## Troubleshooting

### LinkedIn Scraping Issues

**Problem**: "Browser not initialized" error
**Solution**: Ensure Puppeteer dependencies are installed:
```bash
npm install puppeteer --legacy-peer-deps
```

**Problem**: LinkedIn blocks requests
**Solution**:
- Increase delay between requests (default: 2-5s)
- Reduce batch size (maxCompanies)
- Use headless: false for debugging

### Website Analysis Issues

**Problem**: Timeout errors
**Solution**: Increase timeout in axios config (default: 15s)

**Problem**: No data extracted
**Solution**:
- Check website URL is valid and accessible
- Review HTML structure (some sites use dynamic rendering)
- Consider using Puppeteer-based agent for JavaScript-heavy sites

### General Issues

**Problem**: Jobs stuck in "running" status
**Solution**:
- Check agent execution logs
- Restart the job or cancel and retry
- Ensure database connections are stable

## Future Enhancements

Planned improvements:
- [ ] Twitter/X scraper agent
- [ ] Crunchbase integration agent
- [ ] GitHub activity analyzer
- [ ] Job board scraper (Indeed, LinkedIn Jobs)
- [ ] News sentiment analyzer
- [ ] Competitor analysis agent
- [ ] Email enrichment (Clearbit, Hunter.io)
- [ ] Phone enrichment
- [ ] Scheduled automatic enrichment
- [ ] Enrichment quality scoring
- [ ] Deduplication and data merging

## Support

For issues or questions:
1. Check agent execution logs in database
2. Review error messages in job results
3. Test agents individually before orchestrating
4. Contact dev team with job ID for debugging
