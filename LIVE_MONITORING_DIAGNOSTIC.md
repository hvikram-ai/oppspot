# Live Monitoring Diagnostic & Fix Guide

**Issue**: Live monitoring dashboard not showing real-time updates
**Date**: 2025-11-10
**Status**: Diagnosing

---

## System Architecture

### Components
1. **Frontend**: `/app/monitoring/page.tsx` - Live Monitoring Dashboard
2. **UI Component**: `/components/realtime/live-monitoring-dashboard.tsx`
3. **Hooks**: `/hooks/use-realtime.ts` - React hooks for subscriptions
4. **Service**: `/lib/realtime/realtime-service.ts` - Supabase Realtime wrapper
5. **Supabase**: PostgreSQL database with Realtime enabled

### Data Flow
```
Database UPDATE → Supabase Realtime → WebSocket → RealtimeService → React Hooks → UI Components
```

---

## Common Issues & Fixes

### Issue 1: Supabase Realtime Not Enabled

**Symptoms**:
- Connection status shows "disconnected" or "error"
- No updates appear in the dashboard
- Browser console shows WebSocket connection errors

**Fix**:
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz
2. Navigate to **Database** → **Replication** (or **Publications**)
3. Ensure the following tables have Realtime enabled:
   - `streams` ✅
   - `acquisition_scans` ✅
   - `signal_alerts` ✅
   - `agent_executions` ✅
   - `notifications` ✅
4. If not enabled, click "Enable Realtime" for each table

**Verification**:
```sql
-- Run in Supabase SQL Editor
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

Should return the tables listed above.

---

### Issue 2: Missing Database Tables

**Symptoms**:
- Specific subscriptions fail (e.g., signal_alerts)
- Console errors about missing tables

**Fix**:
Check if tables exist:
```sql
-- Run in Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'streams',
  'acquisition_scans',
  'signal_alerts',
  'agent_executions',
  'notifications',
  'stream_members'
);
```

If tables are missing:
1. Check migration files in `/supabase/migrations/`
2. Run migrations: `npx supabase db push` (if using Supabase CLI)
3. Or manually create tables using SQL scripts

---

### Issue 3: RLS Policies Blocking Realtime

**Symptoms**:
- Connection establishes but no data flows
- Empty arrays in dashboard despite data in database
- No errors in console

**Fix**:
Verify RLS policies allow SELECT for authenticated users:

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('streams', 'acquisition_scans', 'signal_alerts', 'agent_executions', 'notifications');
```

**Required policies**:
- `streams`: Users can SELECT streams they are members of
- `acquisition_scans`: Users can SELECT their own scans
- `signal_alerts`: Users can SELECT their own alerts
- `agent_executions`: Users can SELECT executions for their streams
- `notifications`: Users can SELECT their own notifications

**Add missing policies**:
```sql
-- Example: Enable SELECT on streams for members
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view streams they are members of"
ON streams FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM stream_members
    WHERE stream_members.stream_id = streams.id
    AND stream_members.user_id = auth.uid()
  )
);

-- Example: Enable SELECT on signal_alerts
ALTER TABLE signal_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own signal alerts"
ON signal_alerts FOR SELECT
USING (user_id = auth.uid());
```

---

### Issue 4: org_id Missing from User Profile

**Symptoms**:
- Dashboard loads but shows "No active streams"
- Connection status: connected
- Empty data despite having streams

**Fix**:
1. Check if profiles table has org_id column:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name = 'org_id';
```

2. If missing, add org_id column:
```sql
ALTER TABLE profiles ADD COLUMN org_id UUID REFERENCES organizations(id);

-- Update existing users (example)
UPDATE profiles SET org_id = (SELECT id FROM organizations LIMIT 1)
WHERE org_id IS NULL;
```

3. Verify user has org_id set:
```sql
SELECT id, email, org_id
FROM profiles
WHERE id = auth.uid();
```

---

### Issue 5: No Active Data to Monitor

**Symptoms**:
- Connection status: connected
- Dashboard shows zeros but no errors

**Solution**:
This is actually correct behavior if there's no active data. To test:

1. **Create a test stream**:
   - Go to `/streams` page
   - Click "Create Stream"
   - Set goal_status to "in_progress"

2. **Update stream progress**:
```sql
-- Manually update a stream to trigger realtime event
UPDATE streams
SET current_progress = jsonb_set(
  current_progress,
  '{percentage}',
  '50'::jsonb
),
updated_at = now()
WHERE id = 'your-stream-id';
```

3. **Create test signal alert**:
```sql
INSERT INTO signal_alerts (
  id,
  user_id,
  signal_id,
  business_id,
  business_name,
  signal_type,
  priority
) VALUES (
  gen_random_uuid(),
  auth.uid(),
  gen_random_uuid(),
  gen_random_uuid(),
  'Test Company',
  'funding_event',
  'high'
);
```

---

### Issue 6: Browser WebSocket Blocked

**Symptoms**:
- All connections fail
- Console error: "WebSocket connection failed"
- Network tab shows blocked wss:// requests

**Fix**:
1. Check browser extensions (ad blockers, privacy tools)
2. Disable extensions temporarily
3. Check browser console for CORS errors
4. Verify Supabase URL is correct in `.env.local`

---

## Quick Diagnostic Checklist

Run this checklist to identify the issue:

- [ ] **Step 1**: Open browser console (F12)
- [ ] **Step 2**: Navigate to `/monitoring`
- [ ] **Step 3**: Check for errors in console
- [ ] **Step 4**: Check Network tab for WebSocket connections (wss://)
- [ ] **Step 5**: Verify connection status indicators on page
- [ ] **Step 6**: Check Supabase Dashboard → Database → Replication
- [ ] **Step 7**: Run SQL verification queries above

---

## Testing Real-time Updates

### Test 1: Stream Progress
```typescript
// Run in browser console on /monitoring page
const testStreamUpdate = async () => {
  const response = await fetch('/api/streams/YOUR_STREAM_ID', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_progress: {
        completed: 5,
        total: 10,
        percentage: 50,
        last_updated: new Date().toISOString()
      }
    })
  });
  console.log('Update sent:', response.ok);
};
testStreamUpdate();
```

You should see the progress update in real-time on the dashboard.

### Test 2: Manual Database Update
```sql
-- Run in Supabase SQL Editor
UPDATE streams
SET current_progress = jsonb_build_object(
  'completed', 7,
  'total', 10,
  'percentage', 70,
  'last_updated', now()
),
updated_at = now()
WHERE org_id = 'your-org-id'
LIMIT 1;
```

Watch the dashboard for immediate updates.

---

## Enable Realtime via Supabase CLI (Alternative)

If you have Supabase CLI installed:

```bash
# Enable realtime for all tables
npx supabase realtime enable --table streams
npx supabase realtime enable --table acquisition_scans
npx supabase realtime enable --table signal_alerts
npx supabase realtime enable --table agent_executions
npx supabase realtime enable --table notifications

# Verify
npx supabase realtime list
```

---

## Code-Level Debugging

### Add Debug Logging

Edit `/lib/realtime/realtime-service.ts` to add logging:

```typescript
subscribeToStreamProgress(
  streamId: string,
  callback: (update: StreamProgressUpdate) => void,
  onStatus?: (status: SubscriptionStatus) => void
): RealtimeSubscription {
  const channelName = `stream:${streamId}:progress`

  console.log('[Realtime] Subscribing to', channelName) // ADD THIS

  if (onStatus) {
    this.statusCallbacks.set(channelName, onStatus)
    onStatus('connecting')
  }

  const channel = this.supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'streams',
        filter: `id=eq.${streamId}`
      },
      (payload) => {
        console.log('[Realtime] Received update:', payload) // ADD THIS
        if (payload.new) {
          callback(payload.new as StreamProgressUpdate)
        }
      }
    )
    .subscribe((status) => {
      console.log('[Realtime] Status changed:', status) // ADD THIS
      const statusCallback = this.statusCallbacks.get(channelName)
      if (statusCallback) {
        statusCallback(status as unknown as SubscriptionStatus)
      }
    })

  return {
    channel,
    unsubscribe: () => this.unsubscribe(channelName)
  }
}
```

### Check Hook Status

Edit `/components/realtime/live-monitoring-dashboard.tsx` to log hook status:

```typescript
const streamsProgress = useAllStreamsProgress(currentOrgId)

useEffect(() => {
  console.log('[Dashboard] Streams Progress:', {
    status: streamsProgress.status,
    isConnected: streamsProgress.isConnected,
    updateCount: streamsProgress.updates.length,
    error: streamsProgress.error
  })
}, [streamsProgress])
```

---

## Expected Behavior

When working correctly:

1. **Connection Status**: Green "Connected" badge
2. **Active Streams**: Shows count of in_progress/on_track streams
3. **Running Agents**: Shows count of agents with status=running
4. **Signal Alerts**: Shows count of unread alerts
5. **Live Updates**: Progress bars update automatically without page refresh
6. **Latency**: Updates appear within 1-2 seconds of database changes

---

## Fallback: Polling-Based Monitoring

If Realtime continues to fail, implement polling as fallback:

```typescript
// Add to useAllStreamsProgress hook
useEffect(() => {
  if (status === 'error') {
    // Fallback to polling every 5 seconds
    const interval = setInterval(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('streams')
        .select('*')
        .eq('org_id', orgId)
        .in('goal_status', ['in_progress', 'on_track'])

      if (data) {
        data.forEach(stream => updateStream(stream as StreamProgressUpdate))
      }
    }, 5000)

    return () => clearInterval(interval)
  }
}, [status, orgId])
```

---

## Next Steps

1. **Identify the exact issue** using the diagnostic checklist
2. **Apply the appropriate fix** from the sections above
3. **Test real-time updates** using the test procedures
4. **Monitor for 5-10 minutes** to ensure stability
5. **Document any custom fixes** if issue was unique

---

## Support Resources

- **Supabase Realtime Docs**: https://supabase.com/docs/guides/realtime
- **Project Dashboard**: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz
- **Code Location**: `/app/monitoring/page.tsx`, `/lib/realtime/`

---

## Most Likely Fixes (Ordered by Probability)

1. **Realtime not enabled on tables** (80% of issues) → Go to Supabase Dashboard
2. **Missing org_id on user profile** (10%) → Check/update profiles table
3. **No active data to monitor** (5%) → Create test streams
4. **RLS policies too restrictive** (3%) → Add SELECT policies
5. **Browser/network issue** (2%) → Check console/network tab
