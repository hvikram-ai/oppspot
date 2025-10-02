# Quickstart Guide: Data Room Feature

**Feature**: Data Room - AI-Powered Due Diligence Platform
**Date**: 2025-10-01
**For**: Developers implementing this feature

---

## 🎯 Implementation Overview

This guide shows you how to build the Data Room feature in **Phase 1** (Core Infrastructure). The feature consists of:

1. **Secure Document Upload**: Drag-and-drop with encryption
2. **AI Document Classification**: Automatic categorization
3. **Permission System**: Team collaboration with granular access
4. **Activity Logging**: Immutable audit trail
5. **Document Viewer**: PDF viewer with AI insights sidebar

**Estimated Time**: 6-8 weeks for Phase 1

---

## 📋 Prerequisites

Before starting implementation:

- [ ] Review [spec.md](./spec.md) for business requirements
- [ ] Review [data-model.md](./data-model.md) for database schema
- [ ] Ensure Supabase project has sufficient storage quota (1TB recommended)
- [ ] Ensure OpenRouter API key is configured (for AI analysis)
- [ ] Familiarize yourself with existing ResearchGPT™ codebase (`lib/research-gpt/`)

---

## 🗂️ File Structure

```
oppspot/
├── app/
│   └── (dashboard)/
│       └── diligence/
│           └── data-room/
│               ├── page.tsx                    # Data room list
│               ├── [id]/
│               │   ├── page.tsx                # Data room detail view
│               │   ├── documents/
│               │   │   └── [documentId]/
│               │   │       └── page.tsx        # Document viewer
│               │   ├── analysis/
│               │   │   └── page.tsx            # Financial/Contract analysis
│               │   └── activity/
│               │       └── page.tsx            # Activity log
│               └── new/
│                   └── page.tsx                # Create new data room
├── components/
│   └── data-room/
│       ├── data-room-list.tsx                  # List of user's data rooms
│       ├── document-upload.tsx                 # Drag-and-drop upload UI
│       ├── document-grid.tsx                   # Document list with filters
│       ├── document-viewer.tsx                 # PDF viewer component
│       ├── ai-insights-sidebar.tsx             # AI analysis display
│       ├── permission-manager.tsx              # Invite/manage users
│       ├── activity-timeline.tsx               # Activity log UI
│       └── folder-tree.tsx                     # Folder navigation
├── lib/
│   ├── data-room/
│   │   ├── repository/
│   │   │   ├── data-room-repository.ts         # DB queries for data rooms
│   │   │   ├── document-repository.ts          # DB queries for documents
│   │   │   └── activity-repository.ts          # DB queries for activity logs
│   │   ├── storage/
│   │   │   ├── document-storage.ts             # Supabase Storage integration
│   │   │   └── encryption.ts                   # Encryption utilities
│   │   ├── ai/
│   │   │   ├── document-classifier.ts          # AI classification
│   │   │   ├── metadata-extractor.ts           # Extract dates, amounts, parties
│   │   │   ├── financial-analyzer.ts           # Financial statement analysis
│   │   │   └── contract-analyzer.ts            # Contract intelligence
│   │   ├── permissions/
│   │   │   ├── permission-checker.ts           # Check user access
│   │   │   └── invite-manager.ts               # Send invitations
│   │   └── validation/
│   │       └── schemas.ts                      # Zod validation schemas
│   └── supabase/
│       └── storage-client.ts                   # Storage helper functions
├── supabase/
│   ├── migrations/
│   │   └── 20251001000002_data_room_schema.sql # Database migration
│   └── functions/
│       └── analyze-document/
│           └── index.ts                        # Edge Function for AI analysis
└── types/
    └── data-room.ts                            # TypeScript interfaces
```

---

## 🚀 Step-by-Step Implementation

### Step 1: Database Setup (Week 1, Day 1-2)

**1.1 Create Database Migration**

```bash
cd oppspot
touch supabase/migrations/20251001000002_data_room_schema.sql
```

Copy the full schema from [data-model.md](./data-model.md) into this file, including:
- ENUMs (deal_type, document_type, permission_level, etc.)
- Tables (data_rooms, documents, document_analysis, data_room_access, activity_logs, document_annotations)
- Indexes
- RLS Policies
- Functions (create_data_room_with_defaults, log_activity, check_data_room_access)
- Triggers (increment_document_count)

**1.2 Run Migration**

```bash
supabase db push
```

**1.3 Verify Tables Created**

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%data_room%' OR table_name = 'documents';
```

Expected output: `data_rooms`, `documents`, `document_analysis`, `data_room_access`, `activity_logs`, `document_annotations`

**1.4 Create Storage Bucket**

```sql
-- Run in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('data-room-documents', 'data-room-documents', false);
```

**1.5 Add Storage RLS Policies**

See [data-model.md Storage Schema section](./data-model.md#storage-schema-supabase-storage-buckets) for full policies.

---

### Step 2: TypeScript Types (Week 1, Day 3)

**2.1 Create Data Room Types**

```typescript
// types/data-room.ts
export type DealType =
  | 'acquisition'
  | 'investment'
  | 'partnership'
  | 'merger'
  | 'sale'
  | 'due_diligence'
  | 'other';

export type DataRoomStatus = 'active' | 'archived' | 'deleted';

export type DocumentType =
  | 'financial'
  | 'contract'
  | 'due_diligence'
  | 'legal'
  | 'hr'
  | 'other';

export type ProcessingStatus = 'pending' | 'processing' | 'complete' | 'failed';

export type PermissionLevel = 'owner' | 'editor' | 'viewer' | 'commenter';

export interface DataRoom {
  id: string;
  user_id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  deal_type: DealType;
  status: DataRoomStatus;
  storage_used_bytes: number;
  document_count: number;
  metadata: {
    deal_value?: number;
    currency?: string;
    target_close_date?: string;
    retention_days?: number;
    tags?: string[];
  };
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Document {
  id: string;
  data_room_id: string;
  filename: string;
  folder_path: string;
  file_size_bytes: number;
  mime_type: string;
  storage_path: string;
  uploaded_by: string;
  upload_completed: boolean;
  document_type: DocumentType;
  confidence_score: number;
  processing_status: ProcessingStatus;
  metadata: Record<string, any>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Add more interfaces from data-model.md
```

---

### Step 3: Supabase Storage Integration (Week 1, Day 4-5)

**3.1 Create Storage Helper**

```typescript
// lib/data-room/storage/document-storage.ts
import { createClient } from '@/lib/supabase/client';

export class DocumentStorage {
  private supabase = createClient();
  private bucketName = 'data-room-documents';

  /**
   * Upload a document to Supabase Storage
   */
  async uploadDocument(
    dataRoomId: string,
    documentId: string,
    file: File
  ): Promise<{ path: string; error?: Error }> {
    try {
      const filePath = `${dataRoomId}/${documentId}_original.${this.getFileExtension(file.name)}`;

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      return { path: data.path };
    } catch (error) {
      return { path: '', error: error as Error };
    }
  }

  /**
   * Download a document from Supabase Storage
   */
  async downloadDocument(
    storagePath: string
  ): Promise<{ data: Blob | null; error?: Error }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .download(storagePath);

      if (error) throw error;

      return { data };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get signed URL for document viewing (expires in 1 hour)
   */
  async getSignedUrl(storagePath: string): Promise<{ url: string | null; error?: Error }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(storagePath, 3600); // 1 hour

      if (error) throw error;

      return { url: data.signedUrl };
    } catch (error) {
      return { url: null, error: error as Error };
    }
  }

  /**
   * Delete a document from Supabase Storage
   */
  async deleteDocument(storagePath: string): Promise<{ error?: Error }> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([storagePath]);

      if (error) throw error;

      return {};
    } catch (error) {
      return { error: error as Error };
    }
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop() || 'bin';
  }
}
```

---

### Step 4: Database Repositories (Week 2, Day 1-3)

**4.1 Data Room Repository**

```typescript
// lib/data-room/repository/data-room-repository.ts
import { createClient } from '@/lib/supabase/client';
import type { DataRoom } from '@/types/data-room';

export class DataRoomRepository {
  private supabase = createClient();

  /**
   * Get all data rooms for the current user
   */
  async getDataRooms(status: 'active' | 'archived' = 'active'): Promise<DataRoom[]> {
    const { data, error } = await this.supabase
      .from('data_rooms')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get a single data room by ID
   */
  async getDataRoom(id: string): Promise<DataRoom | null> {
    const { data, error } = await this.supabase
      .from('data_rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create a new data room
   */
  async createDataRoom(input: {
    name: string;
    company_id?: string;
    deal_type?: string;
    description?: string;
  }): Promise<DataRoom> {
    const { data, error } = await this.supabase
      .rpc('create_data_room_with_defaults', {
        p_user_id: (await this.supabase.auth.getUser()).data.user?.id,
        p_name: input.name,
        p_company_id: input.company_id || null,
        p_deal_type: input.deal_type || 'due_diligence',
      });

    if (error) throw error;

    // Fetch the created data room
    return this.getDataRoom(data) as Promise<DataRoom>;
  }

  /**
   * Update a data room
   */
  async updateDataRoom(id: string, updates: Partial<DataRoom>): Promise<DataRoom> {
    const { data, error } = await this.supabase
      .from('data_rooms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a data room (soft delete)
   */
  async deleteDataRoom(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('data_rooms')
      .update({ status: 'deleted', deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }
}
```

**4.2 Document Repository**

See full implementation in [data-model.md](./data-model.md). Key methods:
- `getDocuments(dataRoomId: string)`
- `getDocument(id: string)`
- `createDocument(input: CreateDocumentInput)`
- `updateDocument(id: string, updates: Partial<Document>)`
- `deleteDocument(id: string)`

---

### Step 5: Document Upload UI (Week 2, Day 4-5)

**5.1 Create Upload Component**

```typescript
// components/data-room/document-upload.tsx
'use client'

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, CheckCircle, XCircle } from 'lucide-react';
import { DocumentStorage } from '@/lib/data-room/storage/document-storage';
import { DocumentRepository } from '@/lib/data-room/repository/document-repository';

interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  error?: string;
}

export function DocumentUpload({ dataRoomId }: { dataRoomId: string }) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const storage = new DocumentStorage();
  const repository = new DocumentRepository();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Initialize progress tracking
    const initialUploads: UploadProgress[] = acceptedFiles.map(file => ({
      filename: file.name,
      progress: 0,
      status: 'uploading'
    }));
    setUploads(initialUploads);

    // Upload files in parallel (max 5 concurrent)
    const uploadPromises = acceptedFiles.map(async (file, index) => {
      try {
        // 1. Create document record
        const document = await repository.createDocument({
          data_room_id: dataRoomId,
          filename: file.name,
          file_size_bytes: file.size,
          mime_type: file.type,
          folder_path: '/',
        });

        // 2. Upload to Supabase Storage
        const { path, error } = await storage.uploadDocument(
          dataRoomId,
          document.id,
          file
        );

        if (error) throw error;

        // 3. Update document with storage path
        await repository.updateDocument(document.id, {
          storage_path: path,
          upload_completed: true,
        });

        // 4. Trigger AI analysis (Edge Function)
        await fetch('/api/data-room/analyze-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id: document.id }),
        });

        // Update progress
        setUploads(prev =>
          prev.map((u, i) =>
            i === index ? { ...u, progress: 100, status: 'complete' } : u
          )
        );
      } catch (error) {
        setUploads(prev =>
          prev.map((u, i) =>
            i === index
              ? { ...u, status: 'error', error: (error as Error).message }
              : u
          )
        );
      }
    });

    await Promise.all(uploadPromises);
  }, [dataRoomId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 100 * 1024 * 1024, // 100MB
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          PDF, Word, Excel files up to 100MB
        </p>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border rounded-lg"
            >
              <File className="h-5 w-5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{upload.filename}</p>
                {upload.status === 'uploading' && (
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
                {upload.status === 'error' && (
                  <p className="text-xs text-red-500 mt-1">{upload.error}</p>
                )}
              </div>
              {upload.status === 'complete' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {upload.status === 'error' && (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### Step 6: AI Document Classification (Week 3, Day 1-5)

**6.1 Create Edge Function**

```typescript
// supabase/functions/analyze-document/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { document_id } = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError) throw docError;

    // Update processing status
    await supabase
      .from('documents')
      .update({ processing_status: 'processing' })
      .eq('id', document_id);

    // Download document from storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from('data-room-documents')
      .download(document.storage_path);

    if (storageError) throw storageError;

    // Convert to text (OCR for images, text extraction for PDFs)
    const documentText = await extractText(fileData);

    // Call OpenRouter API for classification
    const classification = await classifyDocument(documentText);

    // Extract metadata
    const metadata = await extractMetadata(documentText, classification.document_type);

    // Update document with classification
    await supabase
      .from('documents')
      .update({
        document_type: classification.document_type,
        confidence_score: classification.confidence,
        metadata: metadata,
        processing_status: 'complete',
      })
      .eq('id', document_id);

    // Create document analysis record
    await supabase
      .from('document_analysis')
      .insert({
        document_id: document_id,
        analysis_type: 'classification',
        findings: classification,
        confidence: classification.confidence > 0.8 ? 'high' : 'medium',
        processing_time_ms: Date.now() - startTime,
        ai_model: 'claude-sonnet-4',
      });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function classifyDocument(text: string): Promise<{ document_type: string; confidence: number }> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4',
      messages: [
        {
          role: 'system',
          content: `You are a document classification expert. Classify documents into: financial, contract, due_diligence, legal, hr, other. Return JSON: {"document_type": "...", "confidence": 0.95, "reasoning": "..."}`
        },
        {
          role: 'user',
          content: `Classify this document:\n\n${text.substring(0, 5000)}`
        }
      ]
    })
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function extractText(blob: Blob): Promise<string> {
  // Use pdf.js or Tesseract OCR to extract text
  // Placeholder implementation
  return 'Extracted text from document...';
}

async function extractMetadata(text: string, docType: string): Promise<Record<string, any>> {
  // Extract dates, amounts, parties using regex or AI
  // Placeholder implementation
  return {
    dates: [],
    amounts: [],
    parties: [],
  };
}
```

**6.2 Deploy Edge Function**

```bash
supabase functions deploy analyze-document
```

---

### Step 7: Permission System (Week 4, Day 1-3)

See [data-model.md](./data-model.md) for DataRoomAccess table schema.

**Key Implementation**:
- `PermissionChecker` class to verify user access
- `InviteManager` to send email invitations with JWT tokens
- RLS policies automatically enforce permissions

---

### Step 8: Activity Logging (Week 4, Day 4-5)

**8.1 Create Activity Logger**

```typescript
// lib/data-room/repository/activity-repository.ts
export class ActivityRepository {
  async logActivity(input: {
    data_room_id: string;
    document_id?: string;
    action: string;
    details?: Record<string, any>;
  }): Promise<void> {
    const supabase = createClient();

    await supabase.rpc('log_activity', {
      p_data_room_id: input.data_room_id,
      p_document_id: input.document_id || null,
      p_action: input.action,
      p_details: input.details || {},
    });
  }

  async getActivityLogs(dataRoomId: string): Promise<ActivityLog[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('data_room_id', dataRoomId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
```

---

### Step 9: Document Viewer (Week 5-6)

**9.1 Install PDF.js**

```bash
npm install react-pdf pdfjs-dist
```

**9.2 Create Viewer Component**

```typescript
// components/data-room/document-viewer.tsx
'use client'

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { AIInsightsSidebar } from './ai-insights-sidebar';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export function DocumentViewer({ document }: { document: Document }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  return (
    <div className="flex h-screen">
      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <Document
          file={document.storage_path}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        >
          <Page pageNumber={pageNumber} />
        </Document>

        {/* Page Controls */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber === 1}
          >
            Previous
          </button>
          <span>
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
            disabled={pageNumber === numPages}
          >
            Next
          </button>
        </div>
      </div>

      {/* AI Insights Sidebar */}
      <AIInsightsSidebar document={document} />
    </div>
  );
}
```

---

## 🧪 Testing Checklist

### Manual Testing

- [ ] **Create Data Room**: Create a new data room, verify in database
- [ ] **Upload Documents**: Upload PDF, Word, Excel files
- [ ] **AI Classification**: Verify documents are classified correctly (financial, contract, etc.)
- [ ] **View Document**: Open a document, verify PDF viewer works
- [ ] **AI Insights**: Verify AI-extracted metadata is displayed
- [ ] **Permissions**: Invite a user, verify they can access with correct permission level
- [ ] **Activity Log**: Verify all actions are logged correctly
- [ ] **Delete Data Room**: Soft delete a data room, verify it's hidden but not hard-deleted

### E2E Tests (Playwright)

```typescript
// tests/e2e/data-room.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Data Room', () => {
  test('create data room and upload document', async ({ page }) => {
    await page.goto('/diligence/data-room');

    // Create data room
    await page.click('text=Create Data Room');
    await page.fill('input[name="name"]', 'Test Acquisition');
    await page.selectOption('select[name="deal_type"]', 'acquisition');
    await page.click('button:has-text("Create")');

    // Verify data room created
    await expect(page.locator('h1')).toContainText('Test Acquisition');

    // Upload document
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/sample-financial.pdf');

    // Wait for upload to complete
    await expect(page.locator('text=Upload complete')).toBeVisible({ timeout: 30000 });

    // Verify document appears in list
    await expect(page.locator('text=sample-financial.pdf')).toBeVisible();

    // Verify AI classification badge
    await expect(page.locator('text=Financial')).toBeVisible();
  });
});
```

---

## 🚨 Common Pitfalls

1. **RLS Policies**: Ensure RLS is enabled on all tables. Test with different users to verify access control.
2. **Storage Permissions**: Storage RLS is separate from table RLS. Test file uploads/downloads with different permission levels.
3. **Large Files**: Files >50MB may timeout on Edge Functions. Consider using background jobs (Supabase Storage triggers).
4. **AI Timeouts**: OpenRouter API may take 10-30 seconds for complex documents. Use async processing.
5. **Activity Logs**: Don't forget to log EVERY action. This is critical for compliance.

---

## 📚 Resources

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [React PDF Docs](https://react-pdf.org/)
- [ResearchGPT™ Codebase](../003-researchgpt™-deep-company/) (for AI patterns)

---

## 🎯 Next Steps

After completing Phase 1, proceed to:

- **Phase 2**: Financial & Contract Intelligence (advanced AI analysis)
- **Phase 3**: Multi-document synthesis and ResearchGPT™ integration
- **Phase 4**: Real-time collaboration and compliance features

---

**Questions?** Review [spec.md](./spec.md) for business context or [data-model.md](./data-model.md) for technical details.
