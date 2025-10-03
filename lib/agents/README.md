# Agent Execution System

Comprehensive agent task runner for autonomous AI agents in oppSpot.

## Overview

The Agent Execution System provides a robust framework for running AI agents that automate business intelligence tasks. Agents can discover opportunities, enrich data, score leads, and more.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Execution Flow                      │
└─────────────────────────────────────────────────────────────┘

1. Trigger
   ├── Manual (User clicks "Execute")
   ├── Scheduled (Cron schedule)
   └── Dependent (After another agent completes)
            │
            ↓
2. Task Queue
   ├── agent_tasks table
   ├── Priority-based ordering
   └── Retry logic with exponential backoff
            │
            ↓
3. Task Runner
   ├── Polls for pending tasks (every 5s)
   ├── Executes up to 3 concurrent tasks
   └── Handles errors and retries
            │
            ↓
4. Agent Execution
   ├── Fetch agent configuration
   ├── Run agent-specific logic
   ├── Track metrics and results
   └── Update stream progress
            │
            ↓
5. Results & Insights
   ├── Log execution to agent_executions
   ├── Create stream insights
   ├── Update stream progress
   └── Trigger dependent agents
```

## Components

### 1. Agent Task Runner (`agent-task-runner.ts`)

Main service that processes queued agent tasks.

**Features:**
- Polls `agent_tasks` table for pending tasks
- Executes up to 3 concurrent tasks
- Handles retries with exponential backoff
- Updates execution logs and metrics
- Triggers dependent agents

**Usage:**
```typescript
import { startTaskRunner, stopTaskRunner } from '@/lib/agents/agent-task-runner'

// Start the task runner
await startTaskRunner()

// Stop the task runner
stopTaskRunner()
```

### 2. Agent Implementations

#### OpportunityBot (`opportunity-bot.ts`)

Discovers new business opportunities based on goal criteria.

**Capabilities:**
- Searches for companies matching ICP criteria
- Qualifies leads based on target metrics
- Adds qualified companies to streams
- Detects buying signals

**Configuration:**
```typescript
{
  agent_type: 'opportunity_bot',
  configuration: {
    // No special config required
  }
}
```

**Execution Input:**
```typescript
{
  stream_id: 'uuid',
  goal_context: {
    goal_criteria: {
      industry: ['SaaS', 'FinTech'],
      location: ['UK', 'Ireland'],
      employee_count: { min: 10, max: 500 }
    },
    target_metrics: {
      companies_to_find: 50,
      min_quality_score: 4.0
    }
  }
}
```

**Output:**
```typescript
{
  companies_found: 100,
  items_created: 50,
  qualified_count: 50,
  avg_quality_score: 4.2,
  high_quality_count: 25
}
```

#### EnrichmentAgent (`enrichment-agent.ts`)

Enriches companies with additional data from external sources.

**Capabilities:**
- Fetches Companies House data
- Detects tech stack
- Estimates employee growth
- Calculates social media presence score

**Configuration:**
```typescript
{
  agent_type: 'enrichment_agent',
  configuration: {
    // No special config required
  }
}
```

**Execution Input:**
```typescript
{
  stream_id: 'uuid'
}
```

**Output:**
```typescript
{
  items_updated: 50,
  enriched_count: 50
}
```

#### ScoringAgent (`scoring-agent.ts`)

Scores and prioritizes companies based on goal criteria.

**Capabilities:**
- Calculates quality scores (0-5)
- Evaluates criteria match
- Assesses data completeness
- Scores enrichment quality
- Evaluates buying signals
- Reorders stream items by priority

**Scoring Algorithm:**
```
Quality Score =
  (Criteria Match × 2.0) +
  (Data Completeness × 1.0) +
  (Enrichment Quality × 1.0) +
  (Buying Signals × 1.0)

Normalized to 0-5 scale
```

**Priority Levels:**
- `critical`: Score >= 4.5
- `high`: Score >= 4.0
- `medium`: Score >= 3.0
- `low`: Score < 3.0

**Configuration:**
```typescript
{
  agent_type: 'scoring_agent',
  configuration: {
    // No special config required
  }
}
```

**Execution Input:**
```typescript
{
  stream_id: 'uuid',
  goal_context: {
    goal_criteria: { ... },
    target_metrics: { ... }
  }
}
```

**Output:**
```typescript
{
  items_updated: 50,
  avg_quality_score: 4.2,
  high_quality_count: 25
}
```

## Database Schema

### agent_tasks

Queue for async agent execution.

```sql
CREATE TABLE agent_tasks (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES ai_agents(id),
  org_id UUID REFERENCES organizations(id),
  task_type TEXT NOT NULL,
  priority INTEGER (1-10),
  payload JSONB,
  status TEXT, -- 'pending', 'processing', 'completed', 'failed'
  retry_count INTEGER,
  max_retries INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ
)
```

### agent_executions

Execution history with metrics.

```sql
CREATE TABLE agent_executions (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES ai_agents(id),
  org_id UUID REFERENCES organizations(id),
  stream_id UUID REFERENCES streams(id),
  status TEXT, -- 'queued', 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  input_data JSONB,
  output_data JSONB,
  goal_context JSONB,
  results_summary JSONB,
  error_message TEXT,
  metrics JSONB
)
```

### stream_agent_assignments

Links agents to streams with workflow configuration.

```sql
CREATE TABLE stream_agent_assignments (
  id UUID PRIMARY KEY,
  stream_id UUID REFERENCES streams(id),
  agent_id UUID REFERENCES ai_agents(id),
  assignment_role TEXT, -- 'primary', 'enrichment', 'scoring', etc.
  execution_order INTEGER,
  is_active BOOLEAN,
  auto_execute BOOLEAN,
  execution_frequency TEXT,
  depends_on_agent_ids UUID[],
  total_executions INTEGER,
  last_executed_at TIMESTAMPTZ
)
```

## API Endpoints

### Execute Agent

```
POST /api/streams/[id]/agents/[agentId]/execute
```

**Request Body:**
```json
{
  "execution_config": {},
  "force_execute": false
}
```

**Response:**
```json
{
  "execution": {
    "id": "uuid",
    "status": "queued",
    "created_at": "2025-10-03T12:00:00Z"
  },
  "message": "Agent execution queued successfully"
}
```

### Task Runner Status

```
GET /api/agents/task-runner
```

**Response:**
```json
{
  "success": true,
  "runner": {
    "status": "running",
    "polling_interval": 5000,
    "max_concurrent_tasks": 3
  },
  "stats": {
    "pending": 5,
    "processing": 2,
    "completed": 100,
    "failed": 3,
    "total": 110
  },
  "recent_tasks": [...]
}
```

### Control Task Runner

```
POST /api/agents/task-runner
```

**Request Body:**
```json
{
  "action": "start" // or "stop"
}
```

## Agent Workflow Examples

### Example 1: Discovery → Enrichment → Scoring

```typescript
// 1. Assign agents to stream
await assignAgentsToStream(streamId, [
  {
    agent_id: 'opportunity-bot-id',
    assignment_role: 'primary',
    execution_order: 1,
    auto_execute: true
  },
  {
    agent_id: 'enrichment-agent-id',
    assignment_role: 'enrichment',
    execution_order: 2,
    auto_execute: true,
    depends_on_agent_ids: ['opportunity-bot-id']
  },
  {
    agent_id: 'scoring-agent-id',
    assignment_role: 'scoring',
    execution_order: 3,
    auto_execute: true,
    depends_on_agent_ids: ['enrichment-agent-id']
  }
])

// 2. Trigger first agent
await triggerAgent(streamId, 'opportunity-bot-id')

// 3. Task runner automatically executes:
//    - OpportunityBot finds 50 companies
//    - EnrichmentAgent enriches them
//    - ScoringAgent scores and prioritizes them
```

### Example 2: Scheduled Monitoring

```typescript
// Create scout agent with daily schedule
const agent = await createAgent({
  agent_type: 'scout_agent',
  name: 'Daily Signal Scout',
  schedule_cron: '0 9 * * *', // 9 AM daily
  configuration: {
    signals: ['job_posting', 'funding_round'],
    threshold: 0.7
  }
})

// Agent will run automatically every day at 9 AM
```

## Performance Considerations

1. **Concurrent Execution**: Max 3 tasks run simultaneously
2. **Polling Interval**: 5 seconds between polls
3. **Retry Strategy**: Exponential backoff (1s, 2s, 4s, max 60s)
4. **Task Prioritization**: Higher priority (1-10) tasks execute first

## Error Handling

Agents use comprehensive error handling:

```typescript
try {
  // Agent execution
} catch (error) {
  // 1. Log error to agent_executions table
  // 2. Update task status to 'failed'
  // 3. Retry if retry_count < max_retries
  // 4. Send notification if critical
}
```

## Monitoring & Debugging

### View Agent Executions

```sql
SELECT
  ae.id,
  aa.name as agent_name,
  ae.status,
  ae.duration_ms,
  ae.metrics,
  ae.created_at
FROM agent_executions ae
JOIN ai_agents aa ON ae.agent_id = aa.id
WHERE ae.org_id = 'your-org-id'
ORDER BY ae.created_at DESC
LIMIT 50;
```

### View Pending Tasks

```sql
SELECT
  at.id,
  aa.name as agent_name,
  at.task_type,
  at.priority,
  at.status,
  at.retry_count,
  at.created_at
FROM agent_tasks at
JOIN ai_agents aa ON at.agent_id = aa.id
WHERE at.status = 'pending'
ORDER BY at.priority DESC, at.created_at ASC;
```

### View Failed Tasks

```sql
SELECT
  at.*,
  aa.name as agent_name
FROM agent_tasks at
JOIN ai_agents aa ON at.agent_id = aa.id
WHERE at.status = 'failed'
ORDER BY at.created_at DESC;
```

## Future Enhancements

- [ ] Add more agent types (relationship_agent, writer_agent)
- [ ] Implement real-time progress tracking via WebSockets
- [ ] Add agent health checks and auto-recovery
- [ ] Implement agent chaining and workflows
- [ ] Add cost tracking and budget limits
- [ ] Implement agent A/B testing
- [ ] Add agent performance analytics dashboard

## Troubleshooting

### Task Runner Not Processing Tasks

1. Check task runner status: `GET /api/agents/task-runner`
2. Verify task runner is initialized in app startup
3. Check for pending tasks in database
4. Review server logs for errors

### Agent Execution Failing

1. Check agent configuration
2. Verify agent dependencies are met
3. Review execution error logs in `agent_executions` table
4. Check RLS policies on database tables

### Tasks Stuck in Processing

1. Check for crashed processes
2. Review task timeout settings
3. Manually update stuck tasks to 'pending' to retry

---

**Built with ❤️ for oppSpot**
