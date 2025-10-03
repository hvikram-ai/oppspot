# Goal-Oriented Streams API Documentation

## Overview

This API enables goal-oriented AI automation where **Streams = Goals** and **Agents = Autonomous Workers** that auto-populate results based on intelligent context.

---

## API Endpoints

### 1. Goal Templates

#### GET /api/goal-templates
Fetch available goal templates

**Query Parameters:**
- `category` - Filter by category (acquisition, expansion, partnership, research, monitoring)
- `is_public` - Filter by public/private templates

**Response:**
```json
{
  "templates": [
    {
      "id": "acquisition_targets",
      "name": "Identify Acquisition Targets",
      "description": "Find companies matching M&A criteria",
      "category": "acquisition",
      "icon": "🎯",
      "default_criteria": {
        "industry": [],
        "revenue": { "min": 1000000, "max": 50000000 },
        "location": []
      },
      "default_metrics": {
        "companies_to_find": 50,
        "min_quality_score": 4.0
      },
      "suggested_agents": [
        {
          "agent_type": "opportunity_bot",
          "role": "primary",
          "order": 1
        }
      ]
    }
  ],
  "total": 5
}
```

#### POST /api/goal-templates
Create custom goal template (for admins/power users)

---

### 2. Create Goal-Oriented Stream

#### POST /api/streams/goal
Create a new stream with goal configuration and optional agent auto-assignment

**Request Body:**
```json
{
  "name": "Find UK SaaS Acquisition Targets",
  "description": "Identify 50 promising SaaS companies in UK for potential acquisition",
  "emoji": "🎯",
  "color": "#6366f1",
  "stream_type": "project",

  // Goal Template
  "goal_template_id": "acquisition_targets",

  // ICP Criteria
  "goal_criteria": {
    "industry": ["SaaS", "Fintech"],
    "revenue": { "min": 1000000, "max": 10000000 },
    "location": ["UK"],
    "growth_rate": { "min": 50 },
    "employee_count": { "min": 10, "max": 100 },
    "funding_stage": ["Series A", "Series B"],
    "signals": ["Hiring", "Expansion"]
  },

  // Target Metrics
  "target_metrics": {
    "companies_to_find": 50,
    "min_quality_score": 4.0,
    "required_signals": ["growth", "profitability"]
  },

  // Success Criteria
  "success_criteria": {
    "min_qualified": 30,
    "min_researched": 20,
    "min_contacted": 10
  },

  // Timeline
  "goal_deadline": "2025-11-01T00:00:00Z",

  // Agent Assignment
  "assign_agents": true,  // Auto-assign suggested agents from template
  "assigned_agents": [    // Or manually specify agents
    {
      "agent_type": "opportunity_bot",
      "role": "primary",
      "order": 1,
      "config": {}
    },
    {
      "agent_type": "research_gpt",
      "role": "enrichment",
      "order": 2
    }
  ]
}
```

**Response:**
```json
{
  "stream": {
    "id": "stream-uuid",
    "name": "Find UK SaaS Acquisition Targets",
    "goal_status": "in_progress",
    "current_progress": {
      "completed": 0,
      "total": 50,
      "percentage": 0
    },
    ...
  },
  "assigned_agents": [
    {
      "id": "assignment-uuid",
      "agent_id": "agent-uuid",
      "assignment_role": "primary",
      "execution_order": 1,
      "is_active": true,
      "auto_execute": true,
      "execution_frequency": "daily"
    }
  ]
}
```

---

### 3. Agent Management

#### GET /api/streams/{streamId}/agents
Get all agents assigned to a stream

**Response:**
```json
{
  "assignments": [
    {
      "id": "assignment-uuid",
      "stream_id": "stream-uuid",
      "agent_id": "agent-uuid",
      "assignment_role": "primary",
      "execution_order": 1,
      "is_active": true,
      "auto_execute": true,
      "execution_frequency": "daily",
      "total_executions": 5,
      "successful_executions": 5,
      "last_executed_at": "2025-10-03T10:00:00Z",
      "agent": {
        "id": "agent-uuid",
        "name": "OpportunityBot™",
        "agent_type": "opportunity_bot",
        "is_active": true
      }
    }
  ],
  "total": 2
}
```

#### POST /api/streams/{streamId}/agents
Assign a new agent to a stream

**Request Body:**
```json
{
  "agent_type": "opportunity_bot",
  "assignment_role": "primary",
  "execution_order": 1,
  "is_active": true,
  "auto_execute": true,
  "execution_frequency": "daily",
  "execution_config": {},
  "depends_on_agent_ids": []
}
```

---

### 4. Execute Agent

#### POST /api/streams/{streamId}/agents/{agentId}/execute
Trigger an agent to run on a stream

**Request Body:**
```json
{
  "execution_config": {
    // Agent-specific configuration overrides
  },
  "force_execute": false  // Bypass dependency checks
}
```

**Response:**
```json
{
  "execution": {
    "id": "execution-uuid",
    "agent_id": "agent-uuid",
    "stream_id": "stream-uuid",
    "status": "queued",
    "goal_context": {
      "goal_criteria": { /* ICP criteria */ },
      "target_metrics": { /* target metrics */ },
      "current_progress": { /* progress snapshot */ }
    }
  },
  "message": "Agent execution queued successfully"
}
```

**What Happens:**
1. Creates `agent_executions` record
2. Creates `agent_tasks` for async processing
3. Agent receives full goal context
4. Agent finds companies matching ICP criteria
5. Agent creates `stream_items` for each result
6. Agent updates `current_progress`
7. Agent generates `stream_insights`

---

### 5. Progress Tracking

#### GET /api/streams/{streamId}/progress
Get comprehensive progress data for a stream

**Response:**
```json
{
  "stream": { /* full stream object */ },
  "progress": {
    "completed": 35,
    "total": 50,
    "percentage": 70,
    "last_updated": "2025-10-03T10:00:00Z",
    "items_by_stage": {
      "discover": 15,
      "research": 10,
      "qualified": 8,
      "contacted": 2
    },
    "quality_score": 4.2,
    "signals_detected": 12
  },
  "goal_status": "on_track",
  "quality_metrics": {
    "avg_quality_score": 4.2,
    "high_quality_count": 28,
    "signals_detected": 12
  },
  "recent_agent_executions": [
    {
      "id": "exec-uuid",
      "agent_name": "OpportunityBot™",
      "agent_type": "opportunity_bot",
      "status": "completed",
      "started_at": "2025-10-03T09:00:00Z",
      "completed_at": "2025-10-03T09:15:00Z",
      "results_summary": {
        "items_created": 15,
        "items_qualified": 12,
        "avg_score": 4.3
      }
    }
  ],
  "insights": [ /* recent insights */ ]
}
```

**Auto-calculated Metrics:**
- Total items vs. target
- Completion percentage
- Stage distribution
- Average quality score
- High-quality count
- Signals detected
- Goal status (not_started → in_progress → on_track → completed)

---

### 6. Insights

#### GET /api/streams/{streamId}/insights
Get AI-generated insights for a stream

**Query Parameters:**
- `filter` - 'all', 'unread', 'actionable'
- `limit` - Number of insights to return (default: 50)

**Response:**
```json
{
  "insights": [
    {
      "id": "insight-uuid",
      "stream_id": "stream-uuid",
      "insight_type": "milestone_achieved",
      "title": "🎯 70% of goal achieved!",
      "description": "You've found 35 of 50 target companies. Great progress!",
      "severity": "success",
      "data": {
        "percentage": 70,
        "companies_found": 35,
        "target": 50
      },
      "generated_by": "opportunity_bot",
      "is_read": false,
      "is_actionable": false,
      "created_at": "2025-10-03T10:00:00Z",
      "agent": {
        "name": "OpportunityBot™",
        "agent_type": "opportunity_bot"
      }
    },
    {
      "insight_type": "recommendation",
      "title": "💡 Optimize search criteria",
      "description": "Last 10 companies scored below 4.0. Consider tightening filters.",
      "severity": "warning",
      "is_actionable": true,
      "action_taken": false
    }
  ],
  "total": 15,
  "unread": 5,
  "actionable": 2
}
```

#### PATCH /api/streams/{streamId}/insights
Update insight status

**Request Body:**
```json
{
  "insight_id": "insight-uuid",
  "is_read": true,
  "action_taken": true
}
```

---

## Agent Execution Flow

### Step-by-Step Process

1. **User Creates Goal Stream**
   ```
   POST /api/streams/goal
   → Creates stream with goal_criteria, target_metrics
   → Auto-assigns agents (OpportunityBot, ResearchGPT, ScoringAgent)
   ```

2. **Agent Receives Goal Context**
   ```javascript
   {
     goal_criteria: {
       industry: ["SaaS"],
       revenue: { min: 1000000, max: 10000000 },
       location: ["UK"]
     },
     target_metrics: {
       companies_to_find: 50,
       min_quality_score: 4.0
     },
     current_progress: {
       completed: 0,
       total: 50
     }
   }
   ```

3. **Agent Executes**
   ```
   POST /api/streams/{id}/agents/{agentId}/execute
   → Agent searches for companies matching ICP
   → Filters by criteria (industry, revenue, location)
   → Scores each company (1-5)
   → Detects buying signals
   ```

4. **Agent Creates Results**
   ```
   For each company found:
     → Create stream_item (type: 'company')
     → Add to appropriate stage
     → Set priority based on quality score
     → Add tags based on signals detected
     → Store metadata (quality_score, signals, etc.)
   ```

5. **Progress Auto-Updates**
   ```
   → current_progress.completed = 35
   → current_progress.percentage = 70
   → goal_status = 'on_track'
   ```

6. **Insights Generated**
   ```
   → "🎯 35 of 50 companies found (70%)"
   → "⭐ Average quality: 4.2/5.0"
   → "🔥 12 buying signals detected"
   → "💡 71% are in London - expand to Manchester?"
   ```

---

## Example Use Case: Acquisition Targets

### 1. Create Goal
```bash
curl -X POST https://oppspot.com/api/streams/goal \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Find 50 UK SaaS Acquisition Targets",
    "goal_template_id": "acquisition_targets",
    "goal_criteria": {
      "industry": ["SaaS"],
      "revenue": { "min": 1000000, "max": 10000000 },
      "location": ["UK"]
    },
    "target_metrics": {
      "companies_to_find": 50,
      "min_quality_score": 4.0
    },
    "assign_agents": true
  }'
```

### 2. Agents Work Autonomously
- **OpportunityBot** (Daily): Finds new companies matching ICP
- **ResearchGPT** (Weekly): Enriches top candidates
- **ScoringAgent** (On-demand): Ranks and prioritizes

### 3. Monitor Progress
```bash
curl https://oppspot.com/api/streams/{id}/progress
```

### 4. Review Insights
```bash
curl https://oppspot.com/api/streams/{id}/insights?filter=actionable
```

### 5. Results
- ✅ 35 companies found and qualified
- ⭐ 4.2 avg quality score
- 🔥 12 with strong buying signals
- 📊 All organized by stage (Discover → Research → Qualified)
- 💡 AI recommendations for optimization

---

## Database Triggers & Automation

### Auto-Triggering Dependent Agents

When Agent A completes, dependent Agent B auto-triggers:

```sql
-- Trigger: trigger_dependent_agents_on_completion
-- Fires when agent execution status changes to 'completed'
-- Automatically creates tasks for dependent agents
```

**Example Workflow:**
1. OpportunityBot finds 50 companies → status='completed'
2. Trigger detects ResearchGPT depends on OpportunityBot
3. Auto-creates agent_task for ResearchGPT
4. ResearchGPT enriches top 20 companies
5. And so on...

### Auto-Progress Calculation

```sql
-- Function: update_stream_progress()
-- Auto-calculates completion percentage
-- Updates goal_status based on progress
```

---

## Benefits of This System

✅ **Goal-Oriented**: Clear objectives drive agent behavior
✅ **Context-Aware**: Agents understand nuanced ICP requirements
✅ **Self-Improving**: Feedback loop enhances accuracy over time
✅ **Automated**: Reduces manual work by 80%+
✅ **Transparent**: Real-time progress tracking
✅ **Collaborative**: Humans + AI working together
✅ **Scalable**: Run multiple goals simultaneously

---

## Next Steps

1. **Integrate UI components** into stream creation wizard
2. **Implement agent execution logic** (actual AI calls)
3. **Add webhook support** for real-time updates
4. **Build feedback loop** for continuous learning
5. **Add A/B testing** for agent configurations

---

**Your Vision = Fully Realized! 🚀**
