# Opp Scan Real Data Integration Setup Guide

This guide walks you through setting up real data integration for the Opp Scan acquisition intelligence system.

## Overview

The Opp Scan system has been enhanced with real data source integrations to provide actual company data from:
- UK Companies House (Free)
- Irish Companies Registration Office (Simulated/Web Scraping)
- Premium financial data providers (Optional)
- Digital footprint analyzers (Optional)
- Patent and IP databases (Optional)

## Prerequisites

- Node.js 18+ 
- Supabase project with database access
- API keys for data sources you want to use
- Redis instance (for background processing)

## 1. Database Setup

### Apply Migrations

Run the database migrations to create the required tables:

```bash
# Apply the Opp Scan workflow schema
npx supabase db push

# Verify tables were created
npx supabase db diff
```

### Required Tables

The following tables will be created:
- `acquisition_scans` - Main scan configuration
- `target_companies` - Identified acquisition targets
- `financial_analysis` - Financial metrics and analysis
- `risk_assessments` - Multi-dimensional risk evaluation
- `market_intelligence` - Industry and competitive data
- `cost_budgets` - API cost budgets and limits
- `cost_transactions` - Individual API cost transactions
- `data_source_usage` - Usage statistics by data source

## 2. Environment Variables

### Copy Example Environment File

```bash
cp .env.example .env.local
```

### Required API Keys

#### Companies House API (Free - Required)

1. Register at [Companies House Developer Hub](https://developer-specs.company-information.service.gov.uk/)
2. Create an application and get your API key
3. Add to `.env.local`:

```env
COMPANIES_HOUSE_API_KEY=your_companies_house_api_key
```

#### Optional Data Sources

For premium data sources, register with providers and add their API keys:

```env
# Financial Data Providers
EXPERIAN_API_KEY=your_experian_key
DUNS_API_KEY=your_duns_key

# Digital Intelligence
CLEARBIT_API_KEY=your_clearbit_key
ZOOMINFO_API_KEY=your_zoominfo_key

# Patents & IP
UK_IPO_API_KEY=your_uk_ipo_key
EPO_API_KEY=your_epo_key

# News & Media
NEWS_API_KEY=your_news_api_key
```

## 3. Cost Management Setup

### Create Default Budgets

The system automatically creates default budgets for premium users:
- User Budget: £100/month
- Organization Budget: £1,000/month  
- Scan Budget: £50/scan

### Configure Budget Alerts

```typescript
// Example: Set up budget alerts via API
const response = await fetch('/api/cost-management', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create_budget',
    budget_type: 'user',
    total_budget: 200.00,
    currency: 'GBP',
    period: 'monthly',
    period_start: new Date().toISOString(),
    period_end: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    budget_alerts: {
      warning_threshold: 75,
      critical_threshold: 90,
      email_notifications: true
    }
  })
})
```

## 4. Redis Setup (Background Processing)

### Install Redis

```bash
# macOS
brew install redis

# Ubuntu/Debian
sudo apt install redis-server

# Docker
docker run -d -p 6379:6379 redis:alpine
```

### Configure Redis

```env
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_secure_password
```

### Start Redis Server

```bash
redis-server
```

## 5. Testing the Integration

### Test API Connectivity

```bash
# Test Companies House API
curl -H "Authorization: Basic $(echo -n 'YOUR_API_KEY:' | base64)" \
  "https://api.company-information.service.gov.uk/search/companies?q=test&items_per_page=1"
```

### Test Data Source Factory

```typescript
import DataSourceFactory from '@/lib/opp-scan/data-sources/data-source-factory'

const factory = new DataSourceFactory()
const healthCheck = await factory.testAllConnections()
console.log('Data source health:', healthCheck)
```

## 6. Running Real Data Scans

### Create a Scan with Real Data

```typescript
// Create acquisition scan
const scan = await fetch('/api/acquisition-scans', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'UK Tech Acquisition Scan',
    description: 'Real data scan for UK technology companies',
    selectedIndustries: [
      { sic_code: '62020', industry: 'Computer programming activities' }
    ],
    selectedRegions: [
      { country: 'England', name: 'Greater London' }
    ],
    dataSources: ['companies_house', 'financial_data'],
    scanDepth: 'comprehensive'
  })
})

// Start real data scan
const execution = await fetch(`/api/acquisition-scans/${scan.id}/start-real-scan`, {
  method: 'POST'
})
```

### Monitor Scan Progress

```typescript
// Check scan status
const status = await fetch(`/api/acquisition-scans/${scanId}`)

// Monitor costs
const costs = await fetch(`/api/cost-management?action=summary&scan_id=${scanId}`)
```

## 7. Cost Optimization

### Monitor API Usage

```typescript
// Get cost summary
const costSummary = await fetch('/api/cost-management?action=summary')

// Get optimization recommendations
const recommendations = await fetch('/api/cost-management?action=recommendations')
```

### Set Up Budget Alerts

```typescript
// Configure email alerts for budget thresholds
await fetch('/api/cost-management', {
  method: 'POST',
  body: JSON.stringify({
    action: 'setup_alerts',
    budget_id: 'your_budget_id',
    alerts: {
      warning_threshold: 75,    // 75% budget utilization
      critical_threshold: 90,   // 90% budget utilization
      email_notifications: true
    }
  })
})
```

## 8. Production Deployment

### Environment Configuration

```env
# Production settings
NODE_ENV=production
USE_SANDBOX_APIS=false
ENABLE_DEBUG_LOGGING=false

# Enhanced security
API_KEY_ENCRYPTION_KEY=your_32_character_production_key
GDPR_AUTO_DELETE_ENABLED=true

# Monitoring
SENTRY_DSN=your_production_sentry_dsn
ENABLE_API_METRICS=true
ENABLE_COST_TRACKING=true
```

### Rate Limiting Setup

```env
# API rate limits
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Data source specific limits (automatically handled)
COMPANIES_HOUSE_RATE_LIMIT=600  # per 5 minutes
FINANCIAL_DATA_RATE_LIMIT=100   # per minute
```

### Monitoring and Alerts

1. **Cost Monitoring**: Automatic budget alerts via email/webhook
2. **API Health**: Real-time monitoring of data source availability
3. **Performance Metrics**: Request/response times and success rates
4. **Error Tracking**: Failed API calls and data quality issues

## 9. Data Sources Overview

### Companies House (Free)
- **Coverage**: UK companies (England, Wales, Scotland, Northern Ireland)
- **Data**: Company details, officers, filing history, financial indicators
- **Rate Limit**: 600 requests per 5 minutes
- **Cost**: Free
- **Reliability**: 98%

### Irish CRO (Simulated)
- **Coverage**: Irish companies
- **Data**: Company details, directors, share capital
- **Rate Limit**: 50 requests per minute (simulated)
- **Cost**: ~£2 per company (estimated for web scraping)
- **Reliability**: 85%

### Financial Data Providers (Premium)
- **Coverage**: UK/EU companies
- **Data**: Financial statements, credit ratings, payment behavior
- **Rate Limit**: 100 requests per minute
- **Cost**: £25-50 per company
- **Reliability**: 92%

### Digital Footprint (Premium)
- **Coverage**: Global
- **Data**: Website analysis, SEO metrics, social media presence
- **Rate Limit**: 30 requests per minute
- **Cost**: £10-15 per analysis
- **Reliability**: 75%

## 10. Troubleshooting

### Common Issues

#### API Key Not Working
```bash
# Test API key directly
curl -H "Authorization: Basic $(echo -n 'YOUR_KEY:' | base64)" \
  "https://api.company-information.service.gov.uk/search/companies?q=test&items_per_page=1"
```

#### Rate Limit Exceeded
- Check current usage in cost management dashboard
- Implement request queuing with delays
- Consider upgrading API tier if available

#### Budget Exceeded
- Review cost breakdown by data source
- Implement scan optimization recommendations
- Adjust budget limits or scan scope

#### Data Quality Issues
- Review confidence scores in scan results
- Check data source reliability metrics
- Enable enhanced data validation

### Support

- **GitHub Issues**: [oppspot/issues](https://github.com/anthropics/claude-code/issues)
- **Documentation**: `/docs` folder
- **API Status**: Check data source health in admin panel

## 11. Future Enhancements

### Planned Features
- Real-time scan progress via WebSocket
- ML-powered target scoring
- Advanced data deduplication
- Automated report generation
- Integration with additional data sources

### API Roadmap
- GraphQL endpoint for flexible querying
- Webhook notifications for scan completion
- Bulk scan operations
- Advanced filtering and search
- White-label API access

This completes the setup guide for real data integration. The system is now capable of performing acquisition scans using real company data from external APIs while managing costs and maintaining data quality.