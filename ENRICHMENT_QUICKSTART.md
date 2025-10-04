# Enrichment Agents - Quick Start

## What's Been Built

✅ **LinkedIn Scraper Agent** - Extracts company data from LinkedIn profiles
✅ **Website Analyzer Agent** - Analyzes company websites for tech stack, content, signals
✅ **Enrichment Orchestrator** - Coordinates parallel/sequential agent execution
✅ **REST API** - Complete API for managing enrichment jobs
✅ **Database Schema** - Tables for storing enriched data and tracking jobs
✅ **Buying Signal Detection** - Automatic signal creation from enriched data

## Quick Start

### 1. Apply Database Migration

```bash
# PostgreSQL
PGPASSWORD=TCLP-oppSpot3 psql \
  -h aws-0-eu-west-2.pooler.supabase.com \
  -U postgres.fuqdbewftdthbjfcecrz \
  -d postgres \
  -p 6543 \
  -f supabase/migrations/20250204_enrichment_system.sql
```

### 2. Start Enrichment Job (API)

```bash
curl -X POST https://oppspot.vercel.app/api/enrichment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "companyIds": ["company-uuid-1", "company-uuid-2"],
    "enrichmentTypes": ["all"],
    "mode": "sequential"
  }'
```

### 3. Check Job Status

```bash
curl https://oppspot.vercel.app/api/enrichment/JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/enrichment` | Start enrichment job |
| GET | `/api/enrichment` | List all jobs |
| GET | `/api/enrichment/[jobId]` | Get job status |
| DELETE | `/api/enrichment/[jobId]` | Cancel job |

## File Structure

```
lib/ai/
├── agents/
│   ├── base-agent.ts              # Base agent class
│   ├── linkedin-scraper-agent.ts   # LinkedIn scraper
│   └── website-analyzer-agent.ts   # Website analyzer
└── enrichment/
    └── enrichment-orchestrator.ts  # Orchestration service

app/api/enrichment/
├── route.ts                        # POST/GET endpoints
└── [jobId]/route.ts               # GET/DELETE endpoints

supabase/migrations/
└── 20250204_enrichment_system.sql # Database schema

docs/
└── ENRICHMENT_AGENTS.md           # Full documentation
```

## What Each Agent Does

### LinkedIn Scraper
- Scrapes LinkedIn company profiles using Puppeteer
- Extracts: employee count, followers, industry, headquarters, specialties
- Detects: rapid growth (>20%), high engagement (>100 avg)
- Rate limit: 2-5 seconds between requests

### Website Analyzer
- Analyzes company websites using Cheerio
- Extracts: tech stack, products, news, contacts, social links, career pages
- Detects: career pages, active content, modern tech, sales tools
- Rate limit: 1-3 seconds between requests

## Example Usage (Code)

```typescript
// Start enrichment
const response = await fetch('/api/enrichment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    companyIds: ['uuid-1', 'uuid-2'],
    enrichmentTypes: ['linkedin', 'website'],
    mode: 'parallel'
  })
})

const { job } = await response.json()

// Poll for status
const checkStatus = async () => {
  const res = await fetch(`/api/enrichment/${job.id}`)
  const { job: updated } = await res.json()

  console.log(`Progress: ${updated.progress.completed}/${updated.progress.total}`)

  if (updated.status === 'completed') {
    console.log('Enrichment complete!', updated.results)
  }
}
```

## Database Tables

### `enrichment_data`
Stores raw enrichment data from all sources.

```sql
SELECT * FROM enrichment_data WHERE company_id = 'uuid';
```

### `enrichment_jobs`
Tracks job progress and results.

```sql
SELECT * FROM enrichment_jobs ORDER BY created_at DESC LIMIT 10;
```

### `businesses`
Updated with enriched fields:
- `employee_count`
- `linkedin_url`
- `industry`
- `headquarters`
- `technologies`
- `contact_email`
- `contact_phone`

## Buying Signals Created

Enrichment agents automatically create buying signals:

**LinkedIn Signals**:
- `rapid_employee_growth` - Strong signal (85% confidence)
- `high_social_engagement` - Moderate signal (70% confidence)

**Website Signals**:
- `career_page_detected` - Moderate signal (65% confidence)
- `active_blog_content` - Weak signal (50% confidence)
- `modern_tech_stack` - Weak signal (55% confidence)
- `using_sales_tools` - Moderate signal (70% confidence)

## Next Steps

1. **Run Migration**: Apply database schema
2. **Test API**: Start a small enrichment job (1-2 companies)
3. **Monitor**: Check job status and results
4. **Review Data**: Verify enriched data in database
5. **Scale**: Increase batch sizes as needed

## Need Help?

- Full documentation: `docs/ENRICHMENT_AGENTS.md`
- Agent code: `lib/ai/agents/`
- API routes: `app/api/enrichment/`
- Database schema: `supabase/migrations/20250204_enrichment_system.sql`
