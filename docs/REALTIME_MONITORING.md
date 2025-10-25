# Real-time WebSocket Monitoring System

**Date:** 2025-10-22
**Feature:** Live real-time monitoring using Supabase Realtime (WebSocket-based)

---

## 📊 Overview

The real-time monitoring system provides live updates for critical application features using Supabase Realtime subscriptions (WebSocket-based). This enables users to monitor streams, scans, agents, signals, and notifications without page refreshes.

### Key Features

- ✅ **Stream Progress Tracking** - Live updates for workflow progress
- ✅ **Scan Monitoring** - Real-time acquisition scan status
- ✅ **Agent Execution Tracking** - Live AI agent activity
- ✅ **Signal Alerts** - Instant notification of buying signals
- ✅ **Notification Feed** - Real-time user notifications
- ✅ **Connection Status** - Visual indicators for WebSocket health
- ✅ **Auto-reconnection** - Automatic recovery from disconnections

---

## 🏗️ Architecture

### Service Layer

**Location:** `lib/realtime/realtime-service.ts`

The `RealtimeService` class provides:
- Subscription management for multiple channels
- Automatic connection handling
- Status callbacks
- Cleanup on unmount

```typescript
import { getRealtimeService } from '@/lib/realtime/realtime-service'

const service = getRealtimeService()

const subscription = service.subscribeToStreamProgress(
  streamId,
  (update) => console.log('Progress update:', update),
  (status) => console.log('Connection status:', status)
)

// Cleanup
subscription.unsubscribe()
```

### React Hooks

**Location:** `hooks/use-realtime.ts`

Provides easy-to-use React hooks:
- `useStreamProgress(streamId)` - Single stream monitoring
- `useAllStreamsProgress(orgId)` - Organization-wide streams
- `useScanProgress(scanId)` - Scan monitoring
- `useSignalAlerts(userId)` - Signal alerts
- `useAgentExecutions(streamId)` - Agent activity
- `useRealtimeNotifications(userId)` - Notifications
- `useConnectionHeartbeat(interval)` - Connection health

### Components

**Location:** `components/realtime/`

- `connection-status.tsx` - Visual connection indicator
- `live-progress-indicator.tsx` - Animated progress bars
- `live-monitoring-dashboard.tsx` - Comprehensive dashboard
- `stream-card-realtime.tsx` - Stream card with live updates

---

## 🚀 Usage Examples

### 1. Stream Progress Monitoring

```typescript
'use client'

import { useStreamProgress } from '@/hooks/use-realtime'
import { ConnectionStatus } from '@/components/realtime/connection-status'

export function StreamMonitor({ streamId }: { streamId: string }) {
  const { progress, status, error, isConnected } = useStreamProgress(streamId)

  if (error) {
    return <div>Error: {error.message}</div>
  }

  return (
    <div>
      <ConnectionStatus status={status} />
      {progress && (
        <div>
          <p>Progress: {progress.current_progress.percentage}%</p>
          <p>Status: {progress.goal_status}</p>
          <p>Completed: {progress.current_progress.completed} / {progress.current_progress.total}</p>
        </div>
      )}
    </div>
  )
}
```

### 2. Scan Progress Monitoring

```typescript
'use client'

import { useScanProgress } from '@/hooks/use-realtime'
import { LiveProgressIndicator } from '@/components/realtime/live-progress-indicator'

export function ScanMonitor({ scanId }: { scanId: string }) {
  const { progress, status } = useScanProgress(scanId)

  if (!progress) return <div>Waiting for scan data...</div>

  return (
    <LiveProgressIndicator
      title="Acquisition Scan"
      percentage={progress.progress_percentage}
      status={progress.status}
      currentStep={progress.current_step}
      completed={progress.targets_analyzed}
      total={progress.targets_identified}
      lastUpdated={progress.updated_at}
      connectionStatus={status}
    />
  )
}
```

### 3. Signal Alerts

```typescript
'use client'

import { useSignalAlerts } from '@/hooks/use-realtime'
import { Badge } from '@/components/ui/badge'

export function SignalAlertsPanel({ userId }: { userId: string }) {
  const { alerts, unreadCount, markAsRead, isConnected } = useSignalAlerts(userId)

  return (
    <div>
      <div className="flex items-center gap-2">
        <h3>Signal Alerts</h3>
        {unreadCount > 0 && <Badge>{unreadCount} new</Badge>}
        {isConnected && <Badge variant="outline">Live</Badge>}
      </div>
      <div>
        {alerts.map((alert) => (
          <div key={alert.id}>
            <p>{alert.business_name}</p>
            <p>{alert.signal_type}</p>
            <Badge>{alert.priority}</Badge>
          </div>
        ))}
      </div>
      {unreadCount > 0 && (
        <button onClick={markAsRead}>Mark all as read</button>
      )}
    </div>
  )
}
```

### 4. Agent Execution Monitoring

```typescript
'use client'

import { useAgentExecutions } from '@/hooks/use-realtime'

export function AgentMonitor({ streamId }: { streamId: string }) {
  const { executions, runningAgents, isConnected } = useAgentExecutions(streamId)

  return (
    <div>
      <p>Running Agents: {runningAgents.length}</p>
      {runningAgents.map((agent) => (
        <div key={agent.id}>
          <p>Agent: {agent.agent_id}</p>
          <p>Status: {agent.status}</p>
          <p>Started: {new Date(agent.started_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  )
}
```

### 5. Full Dashboard

```typescript
'use client'

import { LiveMonitoringDashboard } from '@/components/realtime/live-monitoring-dashboard'

export function MonitoringPage() {
  return (
    <div className="container mx-auto py-6">
      <LiveMonitoringDashboard />
    </div>
  )
}
```

---

## 🔧 Configuration

### Enable Supabase Realtime

Ensure Realtime is enabled for required tables in your Supabase dashboard:

1. Go to Database → Replication
2. Enable Realtime for these tables:
   - `streams`
   - `acquisition_scans`
   - `agent_executions`
   - `signal_alerts`
   - `notifications`

3. Set appropriate RLS policies for real-time subscriptions

### Environment Variables

Required in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## 🔐 Security

### Row-Level Security (RLS)

All real-time subscriptions respect Supabase RLS policies:

- **Streams**: Users only see streams in their organization
- **Scans**: Users only see their own scans
- **Signals**: Users only receive their own alerts
- **Notifications**: Users only receive their own notifications
- **Agents**: Users only see agents for their streams

### Authentication

All subscriptions require authentication:

```typescript
// Subscriptions automatically use the authenticated user's credentials
const { data: { user } } = await supabase.auth.getUser()
```

---

## 📈 Performance

### Connection Management

- **Automatic cleanup**: Subscriptions are cleaned up on component unmount
- **Connection pooling**: Supabase manages WebSocket connections efficiently
- **Heartbeat monitoring**: `useConnectionHeartbeat()` detects stale connections

### Optimization Tips

1. **Limit active subscriptions**: Only subscribe to what's visible
2. **Use filters**: Filter at the database level (e.g., `filter: 'org_id=eq.${orgId}'`)
3. **Batch updates**: Group updates when possible
4. **Unsubscribe properly**: Always clean up in `useEffect` return

```typescript
useEffect(() => {
  const subscription = service.subscribeToStreamProgress(...)

  return () => {
    subscription.unsubscribe() // Critical!
  }
}, [streamId])
```

---

## 🐛 Debugging

### Check Connection Status

```typescript
import { getRealtimeService } from '@/lib/realtime/realtime-service'

const service = getRealtimeService()

// Get all active subscriptions
const active = service.getActiveSubscriptions()
console.log('Active subscriptions:', active)

// Get specific channel status
const status = service.getChannelStatus('stream:abc123:progress')
console.log('Channel status:', status)
```

### Monitor WebSocket in DevTools

1. Open Chrome DevTools
2. Go to Network tab
3. Filter by "WS" (WebSocket)
4. Look for `realtime` connections
5. Inspect messages in frames

### Common Issues

**Issue:** Connection status stays "connecting"
```typescript
// Solution: Check Supabase Realtime is enabled for the table
// Dashboard → Database → Replication → Enable for table
```

**Issue:** No updates received
```typescript
// Solution: Verify RLS policies allow reads
// Check filter syntax matches column names exactly
```

**Issue:** Memory leaks
```typescript
// Solution: Ensure unsubscribe is called
useEffect(() => {
  const subscription = ...
  return () => subscription.unsubscribe()
}, [deps])
```

---

## 🧪 Testing

### Manual Testing

1. Open two browser windows side by side
2. Navigate to `/monitoring` in both
3. Trigger an update (e.g., update stream progress)
4. Verify both windows update instantly

### Test Connection Resilience

```typescript
// Simulate disconnection
const service = getRealtimeService()
service.unsubscribeAll()

// Reconnect after 5 seconds
setTimeout(() => {
  window.location.reload()
}, 5000)
```

---

## 📝 API Reference

### RealtimeService Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `subscribeToStreamProgress` | `streamId, callback, onStatus?` | `RealtimeSubscription` | Subscribe to single stream |
| `subscribeToAllStreams` | `orgId, callback, onStatus?` | `RealtimeSubscription` | Subscribe to all org streams |
| `subscribeToScanProgress` | `scanId, callback, onStatus?` | `RealtimeSubscription` | Subscribe to scan progress |
| `subscribeToSignalAlerts` | `userId, callback, onStatus?` | `RealtimeSubscription` | Subscribe to signal alerts |
| `subscribeToAgentExecutions` | `streamId, callback, onStatus?` | `RealtimeSubscription` | Subscribe to agent activity |
| `subscribeToNotifications` | `userId, callback, onStatus?` | `RealtimeSubscription` | Subscribe to notifications |
| `unsubscribeAll` | - | `void` | Unsubscribe from all channels |

### Hook Return Values

All hooks return:
- Data (progress, alerts, etc.)
- `status`: `'connecting' | 'connected' | 'disconnected' | 'error'`
- `error`: Error object if connection failed
- `isConnected`: Boolean helper

---

## 🚦 Status Indicators

### Connection States

- **Connected** (Green) - Real-time updates active
- **Connecting** (Yellow) - Establishing connection
- **Disconnected** (Gray) - No active connection
- **Error** (Red) - Connection failed

### Visual Feedback

```typescript
import { ConnectionStatus } from '@/components/realtime/connection-status'

// Compact indicator
<ConnectionStatus status="connected" showText={false} size="sm" />

// Full indicator with text
<ConnectionStatus status="connecting" />

// Multiple connections
<MultiConnectionStatus
  subscriptions={[
    { name: 'Streams', status: 'connected' },
    { name: 'Scans', status: 'connecting' }
  ]}
/>
```

---

## 🔄 Migration Guide

### Existing Components

To add real-time to existing components:

**Before:**
```typescript
const [data, setData] = useState(null)

useEffect(() => {
  fetchData().then(setData)
}, [])
```

**After:**
```typescript
import { useStreamProgress } from '@/hooks/use-realtime'

const { progress, isConnected } = useStreamProgress(streamId)
// Data updates automatically!
```

---

## 📚 Additional Resources

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [WebSocket Protocol](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React useEffect Cleanup](https://react.dev/reference/react/useEffect#disconnecting-from-the-server)

---

## ✅ Checklist for New Real-time Features

- [ ] Enable Realtime for table in Supabase dashboard
- [ ] Add RLS policies for real-time reads
- [ ] Add subscription method to `RealtimeService`
- [ ] Create React hook in `use-realtime.ts`
- [ ] Add UI component with connection status
- [ ] Test with multiple browser windows
- [ ] Verify proper cleanup on unmount
- [ ] Add to monitoring dashboard
- [ ] Update documentation

---

**Status:** ✅ Production Ready
**Last Updated:** 2025-10-22
**Maintained By:** Development Team
