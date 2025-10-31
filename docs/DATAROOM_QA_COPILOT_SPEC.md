# Dataroom Q&A Copilot with Citations — Implementation Spec

Objectives
- Natural‑language Q&A across a selected data room
- Grounded answers with verifiable citations and “open in context” deep‑links
- Guardrails: abstain when evidence is insufficient, RBAC‑aware retrieval, PII hygiene
- Vector store: pgvector on Supabase

Non‑Goals (v1)
- Full OCR for scanned docs (optional extension)
- Cross‑room/global search aggregation
- Complex multimodal reasoning beyond text and basic tables

Architecture
- Ingestion → Chunking → Embedding → Vector store (pgvector)
- Retrieval (RBAC‑scoped + MMR) → Answer synthesis → Citations → Analytics
- Client: data‑room scoped chat UI with “open in context” links

Key Modules (fit to repo)
- Retrieval/Embeddings: `lib/ai/rag` (new helpers), `lib/research-gpt` (prompting/orchestration)
- Supabase access: `lib/supabase/server.ts`, `lib/supabase/client.ts`
- UX: `components/ai-chat` (extend ChatWidget) and `app/data-rooms/[id]/...` pages
- Workers: `workers/` for background indexing (optional v1 can be synchronous for small docs)

Supabase Schema (pgvector)
- Ensure extension
  - CREATE EXTENSION IF NOT EXISTS vector;
- Tables (new)
  - `data_rooms` (if not present): id, org_id, name, created_by
  - `data_room_members`: id, data_room_id, user_id, role ('owner'|'editor'|'viewer')
  - `documents`: id, data_room_id, title, mime_type, storage_path, page_count, checksum, created_at
  - `document_pages`: id, document_id, page_number, text, tokens, bbox_json NULLABLE (for highlights), created_at
  - `document_chunks`: id, document_id, page_number, chunk_index, content, token_count, embedding vector(1536), created_at
  - `qa_queries`: id, data_room_id, user_id, question, used_context_len, model, latency_ms, created_at
  - `qa_citations`: id, qa_query_id, document_id, page_number, chunk_index, score, start_char, end_char, preview, created_at
- Indexes
  - CREATE INDEX ON document_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
  - CREATE INDEX ON document_chunks (document_id, page_number);
  - CREATE INDEX ON data_room_members (data_room_id, user_id);
- RLS (example policies)
  - Enable RLS on all new tables
  - Define helper function `is_member(data_room_id UUID)` that checks current_user against `data_room_members`
  - Policies: `USING (is_member(data_room_id))` for SELECT; `WITH CHECK (is_member(data_room_id))` for INSERT where relevant

Chunking Strategy
- Parse per page; split text into ~800–1200 token chunks with ~15–20% overlap (by tokens or characters)
- Preserve `page_number`, `chunk_index`, and character offsets per chunk for later highlight
- Store optional `bbox_json` on `document_pages` when we compute bounding boxes (PDF text layer); v1 may skip bbox and rely on page‑level anchors

Embedding Pipeline
- Embed model: configurable via env (`EMBED_MODEL`, default `text-embedding-3-large` or equivalent on OpenRouter)
- Generation flow
  1) Extract text (pdf.js or `pdf-parse`), normalize whitespace
  2) Chunk per strategy; compute tokens length for metadata
  3) Call embeddings API in batches; write `document_chunks` rows with `embedding`
  4) Build ivfflat index after bulk insert (or pre‑existing index auto‑updates)
- Retry/backoff and idempotency via `checksum` on `documents`

Retrieval Flow (server)
- Input: `dataRoomId`, `question`, `topK` (default 12), `mmrK` (default 6), `minScore` threshold (e.g., 0.75 cosine)
- Steps
  1) Auth: `createServerClient` → get user; enforce `is_member(dataRoomId)`
  2) Embed question → vector `q`
  3) Query `document_chunks` with filter `document_id IN (SELECT id FROM documents WHERE data_room_id = $1)` using cosine distance
     - ORDER BY embedding <-> q LIMIT topK
  4) Apply MMR/rerank client‑side or via SQL window function to improve diversity
  5) If top evidence score < threshold or evidence coverage too low → abstain
  6) Build prompt from selected chunks with strict instructions for citation format
  7) Call LLM and stream answer; parse and attach citation metadata

Prompting & Citations
- System prompt enforces:
  - Use only provided context; if insufficient, respond: “I don’t have enough information to answer from the data room.”
  - Cite each claim with one or more sources in this format: `[doc:{document_id}|title:{title}|page:{page_number}|chunk:{chunk_index}]`
  - No PII leakage beyond displayed snippets
- Post‑processing
  - Map citation tags back to `qa_citations` rows with scores and preview (first ~240 chars)
  - Truncate/clean previews; dedupe citations

API Endpoints (App Router)
- `POST /api/data-rooms/[id]/qa/query`
  - body: { question: string, topK?: number }
  - returns: { answer: string, citations: Array<{documentId, title, pageNumber, chunkIndex, preview, score}>, abstained?: boolean }
- `GET /api/data-rooms/[id]/qa/history`
  - returns recent `qa_queries` with counts and last 5 citations
- `POST /api/data-rooms/[id]/qa/feedback`
  - body: { queryId: string, helpful: boolean, comment?: string }

UI/UX
- Entry points
  - Data room page `app/data-rooms/[id]`: “Ask this Data Room” button opens chat drawer
  - Integrate with `components/ai-chat/chat-widget` with a `context={ dataRoomId }` prop and source strip
- Answer rendering
  - Inline citation chips; clicking opens document viewer deep‑link: `/data-rooms/[roomId]/documents/[docId]?page=7#chunk-42`
  - Source sidebar lists citations with preview; hover highlight
- Document viewer
  - Basic paged PDF viewer; highlight chunk by matching text range; optional `bbox_json` in v2

Guardrails
- RBAC: SQL filters by data_room_id and `data_room_members`
- Abstention: similarity threshold and “coverage” heuristic (e.g., sum of top M scores)
- PII hygiene: redact emails/IDs in prompts when not needed; cap context size
- Rate limiting: per user/room (e.g., 60 q/h)

Analytics & Monitoring
- Log to `qa_queries` (latency, model, context len) and `qa_citations`
- Basic dashboards: queries/day, abstention rate, avg citations, latency p95
- Error taxonomy: embedding errors, retrieval empty, LLM timeout

Testing Plan
- Unit: chunking, MMR, citation parsing
- Integration: end‑to‑end query over seeded sample room; verify citations resolve to pages/chunks
- E2E (Playwright): run a query, expect abstention on unknowns, expect “open in context” navigates correctly

Performance Targets (v1)
- Retrieval: < 300ms for 50k chunks room (warm)
- Total answer time: < 3s streaming start, < 7s complete for typical queries

Rollout Plan
- Week 1–2: Schema + ingestion + embeddings; seed fixtures; basic retrieval API
- Week 3: Copilot API with citations + abstention; minimal chat UI
- Week 4: Document viewer deep‑links + sidebar citations; analytics + E2E

Supabase SQL (starter)
```sql
-- Enable pgvector
create extension if not exists vector;

-- Documents and chunks (simplified)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  data_room_id uuid not null,
  title text not null,
  mime_type text,
  storage_path text not null,
  page_count int,
  checksum text,
  created_at timestamptz default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  page_number int not null,
  chunk_index int not null,
  content text not null,
  token_count int,
  embedding vector(1536) not null,
  created_at timestamptz default now()
);

create index if not exists document_chunks_embedding_idx
  on public.document_chunks using ivfflat (embedding vector_l2_ops) with (lists = 100);

-- Optional: members table and policy helper
create table if not exists public.data_room_members (
  id uuid primary key default gen_random_uuid(),
  data_room_id uuid not null,
  user_id uuid not null,
  role text check (role in ('owner','editor','viewer')) not null,
  created_at timestamptz default now()
);

-- RLS example (adjust to existing auth schema)
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.data_room_members enable row level security;

create or replace function public.is_member(room_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.data_room_members m
    where m.data_room_id = room_id and m.user_id = auth.uid()
  );
$$;

create policy if not exists documents_select_policy on public.documents
  for select using (public.is_member(data_room_id));

create policy if not exists chunks_select_policy on public.document_chunks
  for select using (public.is_member((select data_room_id from public.documents d where d.id = document_id)));
```

API Route Skeletons
- `app/api/data-rooms/[id]/qa/query/route.ts`
  - SSR handler: auth, embeddings, similarity search (SQL), MMR, abstention, call LLM, return citations
- `app/api/data-rooms/[id]/qa/history/route.ts`
- `app/api/data-rooms/[id]/qa/feedback/route.ts`

Client Integration
- Extend `components/ai-chat/chat-widget.tsx` to accept `context={{ dataRoomId }}`
- Add “Open in context” link builder using doc/page/chunk ids
- Add `components/ai-chat/source-strip.tsx` to render clickable citations

Follow‑ups (v2)
- OCR for image‑only PDFs; bbox highlights using PDF text layer
- Cross‑language retrieval; hybrid re‑ranker
- Team notes pinned to citations; export to memo

