# Real-Time Stream Progress Tracking

Complete guide to the real-time progress tracking system for Streams.

## Overview

The real-time progress tracking system provides live updates as AI agents discover and process companies. Users see progress bars animate, activity feeds update instantly, and celebratory notifications when milestones are reached.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Real-Time Progress Flow                       │
└─────────────────────────────────────────────────────────────┘

1. Agent Execution
   ├── OpportunityBot finds company
   ├── Broadcasts progress update
   └── Broadcasts activity message
            │
            ↓
2. Supabase Realtime
   ├── Broadcast Channel: `stream-progress:{streamId}`
   ├── Events: progress-update, agent-activity, milestone
   └── Database triggers: streams.UPDATE, stream_items.INSERT
            │
            ↓
3. Client Subscriptions
   ├── useStreamProgress hook
   ├── Real-time state updates
   └── UI re-renders
            │
            ↓
4. UI Components
   ├── LiveProgressCard (animated progress)
   ├── Activity Feed (real-time updates)
   └── Milestone Toasts (celebrations)
```

## Components

### 1. Progress Broadcasting

#### `ProgressBroadcaster` Class

Utility for broadcasting real-time updates from agents.

**Location:** `/lib/agents/progress-broadcaster.ts`

**Usage:**
```typescript
import { createProgressBroadcaster } from '@/lib/agents/progress-broadcaster'

const broadcaster = createProgressBroadcaster(streamId)

// Broadcast progress update
await broadcaster.broadcastProgress({
  completed: 25,
  total: 50,
  percentage: 50,
  quality_score: 4.2
})

// Broadcast agent activity
await broadcaster.broadcastAgentActivity({
  agent_id: 'agent-123',
  agent_name: 'OpportunityBot',
  agent_type: 'opportunity_bot',
  activity_type: 'progress',
  message: 'Found 5 new companies',
  data: { items_created: 5 }
})

// Broadcast milestone
await broadcaster.broadcastMilestone({
  type: 'target_reached',
  title: 'Target Reached!',
  description: 'Successfully found 50 companies',
  data: { items_created: 50 }
})
```

**Methods:**
- `broadcastProgress()` - Update progress metrics
- `broadcastActivity()` - Agent activity messages
- `broadcastMilestone()` - Milestone achievements
- `broadcastAgentStarted()` - Agent started working
- `broadcastAgentProgress()` - Agent progress update
- `broadcastAgentCompleted()` - Agent completed
- `broadcastAgentFailed()` - Agent failed

### 2. Real-Time Hook

#### `useStreamProgress` Hook

React hook for subscribing to real-time updates.

**Location:** `/hooks/use-stream-progress.ts`

**Usage:**
```typescript
import { useStreamProgress } from '@/hooks/use-stream-progress'

function MyComponent({ streamId }) {
  const {
    progress,          // Current progress metrics
    activities,        // Activity feed (last 50)
    isConnected,       // Connection status
    activeAgents,      // Set of active agent IDs
    broadcastProgress, // Broadcast from client
    broadcastActivity, // Broadcast from client
    refresh           // Manually refresh
  } = useStreamProgress(streamId)

  return (
    <div>
      <p>Progress: {progress?.percentage}%</p>
      <p>Status: {isConnected ? 'Live' : 'Offline'}</p>
    </div>
  )
}
```

**State:**
```typescript
interface StreamProgressState {
  progress: ProgressUpdate | null
  activities: AgentActivity[]
  isConnected: boolean
  activeAgents: Set<string>
}
```

**Subscriptions:**
- Broadcast events via Supabase Realtime
- Database changes on `streams` table
- Database changes on `stream_items` table

### 3. Live Progress Card

#### `LiveProgressCard` Component

Animated progress visualization with activity feed.

**Location:** `/components/streams/live-progress-card.tsx`

**Features:**
- ✅ Animated progress bar
- ✅ Real-time progress counter with +N animations
- ✅ Quality score tracking
- ✅ Active agents display with pulse animations
- ✅ Recent activity feed (last 5 activities)
- ✅ Connection status indicator
- ✅ Color-coded activity types

**Usage:**
```tsx
import { LiveProgressCard } from '@/components/streams/live-progress-card'

<LiveProgressCard
  streamId="stream-123"
  targetMetrics={{
    companies_to_find: 50,
    min_quality_score: 4.0
  }}
/>
```

**Animations:**
- Progress bar: Smooth scale animation
- Counter increment: Bounce animation with green +N indicator
- Activities: Slide-in from left
- Active agents: Pulse animation

### 4. Milestone Toasts

#### `MilestoneToast` Component

Celebratory toast notifications for milestones.

**Location:** `/components/streams/milestone-toast.tsx`

**Milestone Types:**
- `target_reached` 🎯 - Target number of companies found
- `quality_milestone` ⭐ - Quality score threshold reached
- `speed_milestone` ⚡ - Completed faster than expected
- `completion` ✅ - Goal fully completed
- `growth_milestone` 📈 - Significant growth detected

**Usage:**
```tsx
import { MilestoneToast } from '@/components/streams/milestone-toast'

// Add to stream detail page
<MilestoneToast streamId={streamId} />
```

## Integration with Agents

### Example: OpportunityBot with Real-Time Updates

```typescript
// lib/agents/opportunity-bot.ts

import { createProgressBroadcaster } from './progress-broadcaster'

export class OpportunityBot extends BaseAgent {
  async execute(context: AgentExecutionContext) {
    const { stream_id } = context.input
    const broadcaster = createProgressBroadcaster(stream_id)

    // 1. Broadcast agent started
    await broadcaster.broadcastAgentStarted(
      this.config.id,
      this.config.name,
      this.config.type
    )

    // 2. Search for companies
    const companies = await this.searchCompanies(criteria, 100)

    await broadcaster.broadcastAgentProgress(
      this.config.id,
      this.config.name,
      this.config.type,
      `Found ${companies.length} candidates, now qualifying...`,
      { candidates_found: companies.length }
    )

    // 3. Add companies with progress updates
    for (let i = 0; i < qualifiedCompanies.length; i++) {
      await this.addCompanyToStream(stream_id, company, executionId)
      itemsCreated++

      // Broadcast every 5 companies
      if ((i + 1) % 5 === 0) {
        await broadcaster.broadcastProgress({
          completed: itemsCreated,
          total: targetCount,
          percentage: Math.round((itemsCreated / targetCount) * 100),
          quality_score: currentAvgScore
        })
      }
    }

    // 4. Broadcast completion
    await broadcaster.broadcastAgentCompleted(
      this.config.id,
      this.config.name,
      this.config.type,
      `Completed! Added ${itemsCreated} companies`,
      { items_created: itemsCreated }
    )

    // 5. Broadcast milestone if target reached
    if (itemsCreated >= targetCount) {
      await broadcaster.broadcastMilestone({
        type: 'target_reached',
        title: 'Target Reached!',
        description: `Found ${itemsCreated} companies`,
        data: { items_created: itemsCreated }
      })
    }
  }
}
```

## Supabase Realtime Channels

### Channel Names

- **Progress Channel:** `stream-progress:{streamId}`
- **Database Changes:** `stream-updates:{streamId}`, `stream-items:{streamId}`

### Events

#### `progress-update`

```typescript
{
  stream_id: string
  completed: number
  total: number
  percentage: number
  quality_score?: number
  items_by_stage?: Record<string, number>
  last_updated: string
}
```

#### `agent-activity`

```typescript
{
  id: string
  stream_id: string
  agent_id: string
  agent_name: string
  agent_type: string
  activity_type: 'started' | 'progress' | 'completed' | 'failed'
  message: string
  data?: Record<string, any>
  timestamp: string
}
```

#### `milestone`

```typescript
{
  stream_id: string
  type: string
  title: string
  description: string
  data?: Record<string, any>
  timestamp: string
}
```

## Performance Considerations

1. **Broadcast Frequency**
   - OpportunityBot: Every 5 companies
   - EnrichmentAgent: Every 10 companies
   - ScoringAgent: Every 20 companies

2. **Activity Feed Size**
   - Client: Stores last 50 activities
   - Display: Shows last 5 activities
   - Older activities automatically removed

3. **Connection Management**
   - Channels auto-unsubscribe on component unmount
   - Reconnection handled by Supabase client
   - Connection status displayed to user

4. **Optimizations**
   - Batched progress updates (not every single item)
   - Debounced UI re-renders
   - Framer Motion layout animations for smooth transitions

## User Experience

### Visual Feedback

1. **Progress Bar**
   - Animates smoothly from current → target percentage
   - Green color indicates healthy progress
   - Red/orange for at-risk goals

2. **Counter Animation**
   - Shows current count (e.g., "25 / 50")
   - Green "+5" indicator bounces when items added
   - Disappears after 2 seconds

3. **Activity Feed**
   - Activities slide in from left
   - Color-coded by type (green=completed, red=failed, blue=started)
   - Shows agent icon and timestamp
   - Includes data like "items_created: 5"

4. **Active Agents**
   - Badges with pulsing green dot
   - Shows agent name
   - Automatically added/removed as agents start/stop

5. **Connection Status**
   - "Live" badge (green) when connected
   - "Offline" badge (gray) when disconnected
   - Automatic reconnection attempts

### Milestone Celebrations

When a milestone is reached:
1. Toast notification appears (5 seconds)
2. Icon and title specific to milestone type
3. Description with achievement details
4. Optional: Sound effect (configurable)

Example milestones:
- ✅ 25% progress reached
- ✅ 50% progress reached
- ✅ 75% progress reached
- ✅ Target reached (100%)
- ⭐ Average quality score > 4.0
- ⚡ Completed in record time

## Testing

### Manual Testing

1. **Create a goal-oriented stream:**
   ```bash
   POST /api/streams/goal
   {
     "name": "Test Progress Tracking",
     "target_metrics": { "companies_to_find": 20 },
     "goal_criteria": { "industry": ["SaaS"] }
   }
   ```

2. **Assign OpportunityBot to stream**

3. **Execute the agent:**
   ```bash
   POST /api/streams/{streamId}/agents/{agentId}/execute
   ```

4. **Watch the dashboard:**
   - Progress bar should animate
   - Activity feed should update in real-time
   - Counter should increment with +N indicators
   - Toast should appear at milestones

### Debugging

Check browser console for:
```
[useStreamProgress] Subscription status: SUBSCRIBED
[useStreamProgress] Milestone achieved: {...}
[ProgressBroadcaster] Broadcasting progress: {...}
```

Check Supabase logs:
- Realtime connections
- Broadcast messages
- Database triggers

## Troubleshooting

### Issue: Not receiving real-time updates

**Solutions:**
1. Check Supabase Realtime is enabled for your project
2. Verify channel subscription status (should be "SUBSCRIBED")
3. Check browser network tab for WebSocket connection
4. Ensure agent is broadcasting updates

### Issue: Animations not smooth

**Solutions:**
1. Verify framer-motion is installed
2. Check browser performance (reduce activity feed size if needed)
3. Ensure CSS transitions are enabled

### Issue: Milestone toasts not appearing

**Solutions:**
1. Check milestone is being broadcast
2. Verify MilestoneToast component is mounted
3. Check toast hook is working
4. Review browser console for errors

## Future Enhancements

- [ ] Voice notifications for milestones
- [ ] Confetti animation on major milestones
- [ ] Progress prediction based on current rate
- [ ] Time remaining estimation
- [ ] Comparative progress (vs. average/previous streams)
- [ ] Shareable progress links
- [ ] Export progress report

---

**Built with ❤️ for oppSpot**
