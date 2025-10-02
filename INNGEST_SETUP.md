# Inngest Setup Guide

## What is Inngest?

Inngest is a durable workflow engine that handles background jobs, scheduled tasks, and event-driven workflows. We use it for:
- Scheduled agent execution (OpportunityBot, Scout Agent)
- Background embedding generation
- Async task processing
- Reliable job retries

## Local Development Setup

### 1. Install Inngest Dev Server

```bash
# Using npm
npx inngest-cli@latest dev

# Or install globally
npm install -g inngest-cli
inngest dev
```

### 2. Start Your App

```bash
npm run dev
```

### 3. Access Inngest Dashboard

Open http://localhost:8288 to see the Inngest dev dashboard

## Production Setup (Vercel)

### 1. Sign up for Inngest Cloud

Visit https://app.inngest.com and create an account (free tier available)

### 2. Get Your Keys

1. Go to Settings > Keys
2. Copy your **Event Key** and **Signing Key**

### 3. Add Environment Variables to Vercel

```bash
# In Vercel dashboard, add:
INNGEST_EVENT_KEY=your_event_key_here
INNGEST_SIGNING_KEY=your_signing_key_here
```

### 4. Configure Inngest App

In Inngest dashboard:
1. Go to Apps
2. Click "Add App"
3. Set URL to: `https://your-app.vercel.app/api/inngest`
4. Inngest will verify the endpoint

### 5. Deploy

```bash
git push origin main
```

Vercel will auto-deploy and Inngest will start processing jobs!

## Available Functions

### 1. Execute Agent
**Event**: `agent.execute`
```typescript
await inngest.send({
  name: 'agent.execute',
  data: {
    agentId: 'uuid',
    orgId: 'uuid',
    input: {} // optional
  }
})
```

### 2. Generate Embedding
**Event**: `company.embedding.generate`
```typescript
await inngest.send({
  name: 'company.embedding.generate',
  data: {
    companyId: 'uuid',
    model: 'nomic-embed-text' // optional
  }
})
```

### 3. Daily Opportunity Scan
**Cron**: Every day at 9am UTC
- Automatically runs all active OpportunityBot agents
- No manual trigger needed

### 4. Daily Signal Monitor
**Cron**: Every day at 8am UTC
- Runs all active Scout agents
- Cleans up expired signals
- No manual trigger needed

## Testing Functions

### Via API

```bash
# Run agent asynchronously (queues with Inngest)
curl -X POST https://your-app.vercel.app/api/agents/[agent-id]/run \
  -H "Content-Type: application/json" \
  -d '{"async": true}'

# Run agent synchronously (immediate response)
curl -X POST https://your-app.vercel.app/api/agents/[agent-id]/run \
  -H "Content-Type: application/json" \
  -d '{"async": false}'
```

### Via Inngest Dashboard

1. Go to Functions
2. Select a function
3. Click "Test" tab
4. Enter test event data
5. Click "Send Test Event"

## Monitoring

### Inngest Dashboard
- View all function runs
- See execution logs
- Monitor failures and retries
- Track performance metrics

### Local Monitoring
```bash
# View logs in terminal where inngest dev is running
inngest dev
```

## Scheduled Jobs

### Daily Opportunity Scan
- **Runs**: Every day at 9am UTC
- **What it does**: Executes all OpportunityBot agents
- **Configure**: No config needed, automatic

### Daily Signal Monitor
- **Runs**: Every day at 8am UTC
- **What it does**:
  - Executes all Scout agents
  - Cleans up expired buying signals
- **Configure**: No config needed, automatic

### Custom Schedules

To add custom schedules, create an agent with `schedule_cron`:

```bash
curl -X POST /api/agents \
  -d '{
    "agent_type": "scout_agent",
    "name": "Hourly Scout",
    "schedule_cron": "0 * * * *",
    "configuration": {...}
  }'
```

## Troubleshooting

### Function Not Executing

1. Check Inngest dev server is running: `http://localhost:8288`
2. Verify endpoint: `http://localhost:3000/api/inngest`
3. Check logs in Inngest dashboard
4. Ensure event name matches function trigger

### Production Issues

1. Verify environment variables in Vercel
2. Check Inngest app URL is correct
3. Review function logs in Inngest dashboard
4. Ensure signing key is set correctly

### Rate Limits

If hitting rate limits:
1. Check `rateLimit` config in function
2. Increase period or limit
3. Batch operations where possible

## Cost

**Inngest Pricing**:
- **Free Tier**: 50K step runs/month
- **Pro**: $20/month for 250K step runs
- **Scale**: Volume pricing

**Our Usage**:
- Daily scans: ~60 step runs/day = 1,800/month
- Background jobs: Varies by activity
- Well within free tier for MVP

## Architecture

```
User Request → API Route → Inngest Event → Function → Agent → Results → Database
                    ↓
              202 Accepted (async)
                    ↓
         Inngest Dashboard (monitoring)
```

## Next Steps

1. ✅ Install Inngest CLI
2. ✅ Start dev server
3. ✅ Test function execution
4. ✅ Set up Inngest Cloud account
5. ✅ Deploy to production
6. ✅ Monitor scheduled jobs

**Questions?** Check https://www.inngest.com/docs
