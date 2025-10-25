# Agent Analytics Dashboard

**Status:** ✅ Production Ready
**Created:** 2025-10-22
**Location:** `/agents/analytics`

---

## Overview

The Agent Analytics Dashboard provides comprehensive visibility into AI agent performance, reliability, and costs. It enables data-driven optimization of the multi-agent system through real-time metrics, historical analysis, and error tracking.

---

## Features

### 📊 Overview Metrics
- **Total Executions** - Agent runs in selected time period
- **Success Rate** - Percentage of successful executions
- **Average Duration** - Mean execution time across all agents
- **Active Agents** - Number of agents ready to execute

### 🎯 Agent Performance Tracking
- Individual agent success rates and execution counts
- Average response times per agent
- Token usage and estimated costs per agent
- Last execution timestamp
- Visual comparison across all agents

### 📝 Execution History
- Detailed log of recent agent executions (last 50)
- Status tracking (queued, running, completed, failed, cancelled)
- Duration metrics
- Items processed per execution
- Token consumption per run

### ⚠️ Error Analysis
- Error patterns and frequency
- Affected agents breakdown
- Last occurrence timestamps
- Error message details
- Failure trend identification

### 💰 Cost Tracking
- Total token usage across all agents
- Estimated costs (Claude 3.5 Sonnet pricing: $9/1M tokens avg)
- Cost breakdown by agent
- Daily cost trends

---

## Architecture

### Service Layer
**File:** `lib/agents/analytics-service.ts`

```typescript
AgentAnalyticsService
├── getOverviewMetrics()     // Overall system metrics
├── getAgentPerformance()    // Per-agent statistics
├── getExecutionHistory()    // Recent execution logs
├── getErrorAnalysis()       // Error patterns
├── getTimeSeriesData()      // Trends over time
└── getCostMetrics()         // Token usage & costs
```

### API Endpoint
**Endpoint:** `GET /api/agents/analytics`

**Query Parameters:**
- `timeRange`: `24h` | `7d` | `30d` (default: `7d`)
- `metric`: `all` | `overview` | `performance` | `history` | `errors` | `timeseries` | `costs`
- `limit`: Number (for history pagination, default: 50)
- `agentId`: UUID (filter history by specific agent)

**Example:**
```bash
GET /api/agents/analytics?timeRange=7d&metric=all
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": { /* overview metrics */ },
    "performance": [ /* per-agent stats */ ],
    "history": [ /* execution logs */ ],
    "errors": [ /* error analysis */ ],
    "costs": { /* cost metrics */ }
  },
  "timeRange": "7d"
}
```

### UI Components
**Location:** `components/agents/analytics/`

- `overview-cards.tsx` - Metric cards for key KPIs
- `agent-performance-chart.tsx` - Agent comparison view
- `execution-history.tsx` - Execution log table
- `error-analysis.tsx` - Error tracking component

---

## Database Tables

### `agent_executions`
Stores execution history with metrics:
```sql
- id (UUID)
- agent_id (FK to ai_agents)
- org_id (FK to organizations)
- status (queued|running|completed|failed|cancelled)
- started_at, completed_at
- duration_ms
- metrics (JSONB) - { tokens_used, items_processed, cost }
- error_message, error_stack
```

### `ai_agents`
Agent configurations:
```sql
- id (UUID)
- org_id (FK)
- agent_type (opportunity_bot|research_gpt|etc.)
- name, description
- is_active
- last_run_at
```

---

## Usage

### Accessing the Dashboard

1. **Via Sidebar Navigation:**
   - Admin users only
   - Located in Admin section: "Agent Analytics"
   - Requires premium access

2. **Direct URL:**
   ```
   /agents/analytics
   ```

### Time Range Selection
- **Last 24 hours** - Recent activity, useful for debugging
- **Last 7 days** - Default, balances recency with trend visibility
- **Last 30 days** - Long-term performance analysis

### Exporting Data
Click "Export CSV" button to download execution history as CSV file for external analysis.

---

## Token Cost Calculation

**Pricing Model:** Claude 3.5 Sonnet (via OpenRouter)
- Input tokens: $3 per 1M tokens
- Output tokens: $15 per 1M tokens
- **Average used:** $9 per 1M tokens (weighted average)

**Formula:**
```javascript
estimatedCost = (totalTokens / 1_000_000) * 9.0
```

**Example:**
- 50,000 tokens used → $0.45 estimated cost
- 1 million tokens → $9.00

---

## Performance Optimization

### Best Practices

1. **Monitor Success Rates**
   - Target: >95% success rate
   - Investigate agents with <80% success rate
   - Review error patterns for failing agents

2. **Track Response Times**
   - Fast agents: <5 seconds
   - Standard: 5-30 seconds
   - Slow: >30 seconds (may need optimization)

3. **Cost Management**
   - Review token usage weekly
   - Optimize prompts for high-cost agents
   - Consider caching for repetitive queries

4. **Error Monitoring**
   - Address recurring errors immediately
   - Set up alerts for critical failures
   - Track error trends over time

---

## Security & Access Control

### Row-Level Security (RLS)
- All analytics data scoped to user's organization
- Admin-only access via RBAC checks
- API endpoints validate org membership

### Data Privacy
- No PII exposed in analytics
- Error messages sanitized
- Execution logs limited to 50 most recent

---

## Monitoring & Alerts

### Key Metrics to Watch

**🔴 Critical Alerts:**
- Success rate drops below 80%
- More than 5 consecutive failures for any agent
- Average duration increases >50% week-over-week

**🟡 Warnings:**
- Success rate 80-90%
- Cost increase >25% week-over-week
- Execution queue backlog >100 tasks

**🟢 Healthy:**
- Success rate >95%
- Average duration stable
- Cost within budget

---

## Troubleshooting

### Dashboard Not Loading
1. Check API endpoint: `GET /api/agents/analytics?timeRange=7d&metric=all`
2. Verify user has admin role and org_id
3. Check browser console for errors
4. Ensure RLS policies allow access

### Missing Execution Data
1. Verify agents have `metrics` field in executions
2. Check `agent_executions` table has data
3. Confirm time range includes execution period
4. Review RLS policies on `agent_executions`

### Incorrect Cost Calculations
1. Verify `metrics.tokens_used` is populated
2. Check token cost formula ($9 per 1M tokens)
3. Ensure executions have completed status
4. Review agent execution metrics JSONB structure

---

## Future Enhancements

### Planned Features
- [ ] Real-time WebSocket updates for live execution tracking
- [ ] Agent comparison charts (side-by-side performance)
- [ ] Custom date range picker (beyond presets)
- [ ] Alert configuration UI (set custom thresholds)
- [ ] Cost budget limits with auto-notifications
- [ ] A/B testing framework for agent configurations
- [ ] Execution timeline visualization
- [ ] Agent health score calculation
- [ ] Automated performance reports (weekly email)
- [ ] Integration with external monitoring (Datadog, etc.)

---

## API Integration Examples

### Fetch Overview Metrics
```typescript
const response = await fetch('/api/agents/analytics?metric=overview&timeRange=7d')
const { data } = await response.json()

console.log(`Success Rate: ${data.overview.successRate}%`)
console.log(`Total Executions: ${data.overview.totalExecutions}`)
```

### Get Agent Performance
```typescript
const response = await fetch('/api/agents/analytics?metric=performance&timeRange=30d')
const { data } = await response.json()

data.performance.forEach(agent => {
  console.log(`${agent.agentName}: ${agent.successRate}% success, $${agent.estimatedCost}`)
})
```

### Filter Execution History by Agent
```typescript
const agentId = 'abc-123'
const response = await fetch(
  `/api/agents/analytics?metric=history&agentId=${agentId}&limit=10`
)
const { data } = await response.json()

console.log(`Last 10 executions for agent ${agentId}:`, data.history)
```

---

## Related Documentation

- [Multi-Agent System](/MULTI_AGENT_SYSTEM.md)
- [Agent Execution System](/lib/agents/README.md)
- [RBAC System](/docs/RBAC_GUIDE.md)

---

**Built with ❤️ for oppSpot**
