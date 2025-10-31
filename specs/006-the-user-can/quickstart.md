# Quickstart Guide: Stream-Based Work Organization

**Feature**: 006-the-user-can
**Last Updated**: 2025-10-27

## Prerequisites

- Node.js 18+ and npm installed
- Supabase account and project configured
- oppSpot repository cloned
- Environment variables configured (.env.local)

## Development Setup

### 1. Database Migration

```bash
# Apply the streams migration
npm run db:migrate

# Verify tables created
npx supabase db pull
# Should see: streams, stream_items, stream_access tables
```

### 2. Generate TypeScript Types

```bash
# Regenerate types from updated schema
npx supabase gen types typescript --project-id [your-project-id] > types/database.ts
```

### 3. Start Development Server

```bash
npm run dev
# Server starts on http://localhost:3000
```

### 4. Verify Installation

Visit `http://localhost:3000` and:
1. Sign in with test account
2. Check browser console - should see no stream-related errors
3. Open Supabase dashboard → Check `streams` table has "General" stream for your user

## Testing the Feature

### Manual Testing Flow

**1. Stream CRUD Operations**:
```
1. Go to /streams (or stream manager UI)
2. Create new stream: "Test Deal 2024"
3. Rename stream to "Acme Corp Deal"
4. Archive stream
5. View archived streams
6. Restore stream
7. Verify "General" stream cannot be renamed/archived
```

**2. Save Items to Stream**:
```
1. Go to Discover tool
2. Search for a business
3. Click "Save to Stream" button
4. Select target stream
5. Verify item appears in stream
6. Go to stream view
7. Verify business listed with timestamp
```

**3. Stream Sharing**:
```
1. Create a stream
2. Click "Share" button
3. Enter collaborator email
4. Select permission level (View/Edit/Manage)
5. Invite user
6. Log in as invited user
7. Verify stream appears in "Shared with me"
8. Test permission boundaries
```

**4. Active Stream Session**:
```
1. Select a stream as active
2. Save multiple items from different tools
3. Verify all saved to active stream
4. Refresh browser
5. Verify active stream persisted
```

### Automated E2E Tests

```bash
# Run full streams test suite
npm run test:e2e tests/e2e/streams.spec.ts

# Run specific test
npm run test:e2e tests/e2e/streams.spec.ts -- --grep "create stream"

# Debug mode
npm run test:e2e:debug tests/e2e/streams.spec.ts
```

**Test Coverage**:
- Stream CRUD operations
- Item save/move operations
- Sharing with permissions
- Archive/restore flow
- "General" stream protection
- Active stream persistence
- Cross-tool integration

## API Testing with curl

### Create Stream
```bash
curl -X POST http://localhost:3000/api/streams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Test Stream"}'
```

### List Streams
```bash
curl http://localhost:3000/api/streams \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Add Item to Stream
```bash
curl -X POST http://localhost:3000/api/streams/{STREAM_ID}/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"item_type":"business","item_id":"UUID_HERE"}'
```

### Share Stream
```bash
curl -X POST http://localhost:3000/api/streams/{STREAM_ID}/access \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"user_id":"USER_UUID","permission_level":"edit"}'
```

## Common Issues & Solutions

### Issue: "General" stream not created
**Solution**: Check trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```
If missing, rerun migration.

### Issue: RLS policies blocking queries
**Solution**: Verify user is authenticated:
```sql
SELECT auth.uid(); -- Should return your user UUID
```

### Issue: Items not appearing in stream
**Solution**: Check permissions:
```sql
SELECT * FROM stream_access WHERE user_id = auth.uid();
```

### Issue: Active stream not persisting
**Solution**: Verify profiles table has column:
```sql
\d profiles
-- Should show: active_stream_id | uuid
```

## Development Workflow

1. **Feature Branch**: Already on `006-the-user-can`
2. **Database First**: Migrations before code
3. **TDD Approach**: Write tests → Implement → Pass tests
4. **Integration**: Add to one tool at a time
5. **E2E Testing**: After each tool integration

## Performance Testing

### Load Test: List Streams
```bash
# Using Apache Bench
ab -n 1000 -c 10 -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/streams
```

**Target**: <200ms p95 response time

### Load Test: Add Items
```bash
# Bulk add items script
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/streams/$STREAM_ID/items \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"item_type":"business","item_id":"'$(uuidgen)'"}' &
done
wait
```

**Target**: Handle 100 concurrent saves

## Next Steps

After setup complete:
1. Run `/tasks` to generate implementation tasks
2. Follow tasks.md in TDD order
3. Test each component before moving to next
4. Update CLAUDE.md with new patterns
5. Create PR when feature complete

---

*Quickstart guide complete - Ready for implementation*
