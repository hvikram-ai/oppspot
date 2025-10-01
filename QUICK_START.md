# Quick Start Guide: Modernization Quick Wins

> **Start here!** These are the highest-impact, easiest-to-implement improvements.

---

## 🎯 Quick Win #1: Enable pgvector for Semantic Search

**Impact**: Find similar companies instantly, improve discovery
**Time**: 2-3 days
**Difficulty**: Medium

### Steps:

1. **Database Migration**
```bash
# Create migration file
npx supabase migration new enable_pgvector
```

```sql
-- In the migration file:
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to companies
ALTER TABLE companies
ADD COLUMN embedding vector(1536);

-- Create index for fast similarity search
CREATE INDEX companies_embedding_idx
ON companies USING hnsw (embedding vector_cosine_ops);
```

2. **Create Embedding Service**
```bash
# File: lib/ai/embedding-service.ts
```
- Integrate OpenAI ada-002 API
- Batch generation function
- Cache in Redis (optional for now)

3. **Build API Endpoint**
```bash
# File: app/api/companies/similar/route.ts
```
- Accept company_id
- Get embedding
- Query similar companies
- Return results with similarity scores

4. **Add UI Component**
```bash
# File: components/companies/similar-companies.tsx
```
- "Find Similar Companies" button
- Display similar companies
- Show similarity percentage

### Test:
- Generate embeddings for 100 companies
- Test similarity search
- Verify results make sense

---

## 🔔 Quick Win #2: Supabase Realtime Notifications

**Impact**: Live notifications, no polling
**Time**: 1-2 days
**Difficulty**: Easy

### Steps:

1. **Enable Realtime on notifications table**
```sql
-- In Supabase dashboard or migration:
ALTER PUBLICATION supabase_realtime
ADD TABLE notifications;
```

2. **Update Frontend to Subscribe**
```typescript
// components/layout/notification-bell.tsx
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setUnreadCount(prev => prev + 1)
          // Show toast notification
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <button className="relative">
      <Bell />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </button>
  )
}
```

3. **Remove Polling**
- Delete any setInterval for notifications
- Remove unnecessary API calls

### Test:
- Create notification from another tab
- Verify bell updates instantly
- Check performance (should be <100ms)

---

## ⌨️ Quick Win #3: Command Palette (⌘K)

**Impact**: Power users love it, faster navigation
**Time**: 2 days
**Difficulty**: Easy

### Steps:

1. **Install cmdk**
```bash
npm install cmdk
```

2. **Create Command Palette Component**
```bash
# File: components/command-palette.tsx
```

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <Command.Dialog open={open} onOpenChange={setOpen}>
      <Command.Input placeholder="Type a command or search..." />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>

        <Command.Group heading="Navigation">
          <Command.Item onSelect={() => router.push('/dashboard')}>
            Dashboard
          </Command.Item>
          <Command.Item onSelect={() => router.push('/companies')}>
            Companies
          </Command.Item>
          <Command.Item onSelect={() => router.push('/stakeholders')}>
            Stakeholders
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Actions">
          <Command.Item>Create New Deal</Command.Item>
          <Command.Item>Add Company</Command.Item>
          <Command.Item>Import Data</Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}
```

3. **Add to Layout**
```typescript
// app/layout.tsx
import { CommandPalette } from '@/components/command-palette'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <CommandPalette />
        {children}
      </body>
    </html>
  )
}
```

4. **Add Search Integration** (optional)
- Include company search
- Include stakeholder search
- Add semantic search results

### Test:
- Press ⌘K (or Ctrl+K)
- Navigate to different pages
- Test search functionality

---

## 📊 Quick Win #4: Better Data Tables

**Impact**: Handle 10k+ rows, smooth scrolling
**Time**: 2-3 days
**Difficulty**: Medium

### Steps:

1. **Install Dependencies**
```bash
npm install @tanstack/react-table @tanstack/react-virtual
```

2. **Create New DataTable Component**
```bash
# File: components/ui/data-table-v2.tsx
```

```typescript
'use client'

import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

export function DataTableV2({ columns, data }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const tableContainerRef = useRef(null)

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 50,
    overscan: 10,
  })

  return (
    <div ref={tableContainerRef} className="h-[600px] overflow-auto">
      <table>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const row = table.getRowModel().rows[virtualRow.index]
            return (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

3. **Replace Old DataTable**
- Find usages of old DataTable
- Replace with DataTableV2
- Test with large datasets

### Test:
- Load 10,000 rows
- Scroll smoothly
- Check memory usage

---

## 🤖 Quick Win #5: AI Chat with Vercel AI SDK

**Impact**: Interactive AI insights
**Time**: 2-3 days
**Difficulty**: Medium

### Steps:

1. **Install Vercel AI SDK**
```bash
npm install ai openai
```

2. **Create Chat API Route**
```typescript
// app/api/chat/route.ts
import { Configuration, OpenAIApi } from 'openai'
import { OpenAIStream, StreamingTextResponse } from 'ai'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const response = await openai.createChatCompletion({
    model: 'gpt-4',
    stream: true,
    messages,
  })

  const stream = OpenAIStream(response)
  return new StreamingTextResponse(stream)
}
```

3. **Create Chat UI Component**
```typescript
// components/ai/company-chat.tsx
'use client'

import { useChat } from 'ai/react'

export function CompanyChat({ companyId }: { companyId: string }) {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    body: { companyId },
  })

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex-1 overflow-auto p-4">
        {messages.map(m => (
          <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div className="inline-block bg-gray-100 rounded-lg p-3 my-2">
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about this company..."
          className="w-full p-2 border rounded"
        />
      </form>
    </div>
  )
}
```

4. **Add to Company Page**
```typescript
// app/business/[id]/page.tsx
import { CompanyChat } from '@/components/ai/company-chat'

export default function CompanyPage({ params }) {
  return (
    <div>
      {/* Existing company details */}

      <Card>
        <CardHeader>
          <CardTitle>Ask AI about this company</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyChat companyId={params.id} />
        </CardContent>
      </Card>
    </div>
  )
}
```

### Test:
- Ask questions about companies
- Verify streaming works
- Check response quality

---

## 🔧 Quick Win #6: Inngest for Background Jobs

**Impact**: Reliable background processing
**Time**: 2 days
**Difficulty**: Easy

### Steps:

1. **Install Inngest**
```bash
npm install inngest
```

2. **Create Inngest Client**
```typescript
// lib/inngest/client.ts
import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'oppspot',
  name: 'oppSpot'
})
```

3. **Create First Function**
```typescript
// app/api/inngest/route.ts
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'

const leadScoringFunction = inngest.createFunction(
  { id: 'lead-scoring' },
  { event: 'company/updated' },
  async ({ event, step }) => {
    // Step 1: Fetch company data
    const company = await step.run('fetch-company', async () => {
      return await fetchCompany(event.data.companyId)
    })

    // Step 2: Calculate score
    const score = await step.run('calculate-score', async () => {
      return await calculateLeadScore(company)
    })

    // Step 3: Update database
    await step.run('update-score', async () => {
      return await updateLeadScore(company.id, score)
    })

    return { score }
  }
)

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [leadScoringFunction],
})
```

4. **Trigger Events**
```typescript
// When company is updated:
await inngest.send({
  name: 'company/updated',
  data: { companyId: '123' }
})
```

### Test:
- Trigger a job
- Check Inngest dashboard
- Verify job completes

---

## 🎉 Success Checklist

After completing all Quick Wins:

- [ ] Semantic search works on companies table
- [ ] Notifications appear in real-time (no polling)
- [ ] Command palette opens with ⌘K
- [ ] Tables handle 10k+ rows smoothly
- [ ] AI chat responds with streaming
- [ ] Background jobs running on Inngest

**Estimated Total Time**: 1-2 weeks
**Total Cost**: $0-10/month

---

## Next Steps

Once Quick Wins are complete:
1. Gather user feedback
2. Measure performance improvements
3. Start Phase 1 of full modernization
4. Continue with semantic search expansion

---

**Questions?** Check MODERNIZATION_PLAN.md for full details.
