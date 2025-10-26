# Data Room Integration Guide

This guide explains how to integrate and use the Data Room feature components in your application.

## Table of Contents

1. [State Management](#state-management)
2. [Error Handling](#error-handling)
3. [Loading States](#loading-states)
4. [AI Utilities](#ai-utilities)
5. [API Integration](#api-integration)
6. [Component Usage](#component-usage)

---

## State Management

The Data Room uses Zustand for client-side state management with localStorage persistence.

### Basic Usage

```typescript
import { useDataRoomStore } from '@/lib/stores/data-room-store';

function MyComponent() {
  // Access state
  const currentDataRoomId = useDataRoomStore((state) => state.currentDataRoomId);
  const documentFilters = useDataRoomStore((state) => state.documentFilters);

  // Access actions
  const setCurrentDataRoom = useDataRoomStore((state) => state.setCurrentDataRoom);
  const updateUploadProgress = useDataRoomStore((state) => state.updateUploadProgress);

  // Use in your component
  const handleSelectDataRoom = (id: string) => {
    setCurrentDataRoom(id);
  };
}
```

### Selectors (Optimized)

Use specialized selectors to avoid unnecessary re-renders:

```typescript
import {
  useCurrentDataRoom,
  useDocumentFilters,
  useSelectedDocuments,
  useUploadProgress,
  useActiveUploads,
  useHasActiveUploads,
} from '@/lib/stores/data-room-store';

function MyComponent() {
  const currentDataRoomId = useCurrentDataRoom();
  const filters = useDocumentFilters();
  const hasUploads = useHasActiveUploads();
}
```

### Upload Progress Tracking

```typescript
import { useDataRoomStore } from '@/lib/stores/data-room-store';

function UploadComponent() {
  const updateProgress = useDataRoomStore((state) => state.updateUploadProgress);
  const uploadProgress = useDataRoomStore((state) => state.uploadProgress);

  const handleUpload = async (file: File) => {
    // Initialize progress
    updateProgress(file.name, {
      filename: file.name,
      progress: 0,
      status: 'uploading',
    });

    // Simulate upload with progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      updateProgress(file.name, {
        filename: file.name,
        progress: i,
        status: 'uploading',
      });
    }

    // Mark as processing
    updateProgress(file.name, {
      filename: file.name,
      progress: 100,
      status: 'processing',
    });

    // After AI analysis completes
    updateProgress(file.name, {
      filename: file.name,
      progress: 100,
      status: 'complete',
    });
  };
}
```

### Persisted State

The following state is persisted to localStorage:
- `documentFilters`
- `documentSort`
- `documentView` (grid/list/table)
- `sidebarCollapsed`
- `currentFolder`

Temporary state (NOT persisted):
- `uploadProgress`
- `selectedDocuments`
- `currentDocumentId`
- `currentPage`
- `zoomLevel`

---

## Error Handling

Comprehensive error handling utilities for consistent error responses.

### API Route Error Handling

```typescript
// app/api/data-room/route.ts
import { withErrorHandler, DataRoomError, DataRoomErrorCode } from '@/lib/data-room/utils';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Validation error
  if (!body.name) {
    throw new DataRoomError(
      'Name is required',
      DataRoomErrorCode.VALIDATION_ERROR,
      400
    );
  }

  // Not found error
  const dataRoom = await getDataRoom(id);
  if (!dataRoom) {
    throw new DataRoomError(
      'Data room not found',
      DataRoomErrorCode.NOT_FOUND,
      404
    );
  }

  // Forbidden error
  if (dataRoom.user_id !== userId) {
    throw new DataRoomError(
      'Access denied',
      DataRoomErrorCode.FORBIDDEN,
      403
    );
  }

  return NextResponse.json({ success: true });
});
```

### Client-Side Error Parsing

```typescript
import { parseApiError, getUserFriendlyMessage } from '@/lib/data-room/utils';

async function createDataRoom(data: CreateDataRoomRequest) {
  try {
    const response = await fetch('/api/data-room', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }

    return await response.json();
  } catch (error) {
    const parsed = parseApiError(error);
    const message = getUserFriendlyMessage(parsed.code);

    // Show to user
    toast.error(message);

    // Log for debugging
    console.error('Error details:', parsed);
  }
}
```

### Error Helper Functions

```typescript
import {
  validationError,
  notFoundError,
  forbiddenError,
  unauthorizedError,
  fileUploadError,
  quotaExceededError,
} from '@/lib/data-room/utils';

// Usage
throw validationError('Invalid file type', { allowedTypes: ['pdf', 'docx'] });
throw notFoundError('Document', documentId);
throw forbiddenError('Only owners can delete data rooms');
throw unauthorizedError('Please sign in to continue');
throw fileUploadError('File too large', DataRoomErrorCode.FILE_TOO_LARGE);
throw quotaExceededError('Storage', 10 * 1024 * 1024 * 1024); // 10GB
```

---

## Loading States

Pre-built loading skeletons for all Data Room components.

### Component-Level Loading

```typescript
import { DataRoomListSkeleton, DocumentGridSkeleton } from '@/components/data-room/loading-states';

function DataRoomPage() {
  const { data, isLoading } = useSWR('/api/data-room');

  if (isLoading) {
    return <DataRoomListSkeleton count={6} />;
  }

  return <DataRoomList dataRooms={data} />;
}
```

### Available Loading Components

```typescript
import {
  DataRoomCardSkeleton,
  DataRoomListSkeleton,
  DocumentCardSkeleton,
  DocumentGridSkeleton,
  DocumentTableSkeleton,
  DocumentViewerSkeleton,
  AIInsightsSkeleton,
  ActivityTimelineSkeleton,
  UploadProgressSkeleton,
  FullPageLoader,
  InlineLoader,
  ProcessingIndicator,
  EmptyState,
} from '@/components/data-room/loading-states';

// Full page loading
<FullPageLoader message="Loading data rooms..." />

// Inline spinner
<InlineLoader size={16} />

// Processing indicator
<ProcessingIndicator status="Analyzing document..." />

// Empty state
<EmptyState
  title="No documents yet"
  description="Upload your first document to get started"
  action={<UploadButton />}
/>
```

### With Suspense Boundaries

```typescript
import { Suspense } from 'react';
import { DocumentGridSkeleton } from '@/components/data-room/loading-states';

function DataRoomDetailPage() {
  return (
    <Suspense fallback={<DocumentGridSkeleton count={12} />}>
      <DocumentGrid dataRoomId={id} />
    </Suspense>
  );
}
```

---

## AI Utilities

### Text Extraction

```typescript
import { extractTextFromPDF, cleanText, splitTextIntoChunks } from '@/lib/data-room/ai';

async function handleFileUpload(file: File) {
  const buffer = await file.arrayBuffer();

  // Extract text
  const result = await extractTextFromPDF(Buffer.from(buffer));

  console.log('Text:', result.text);
  console.log('Pages:', result.pageCount);
  console.log('Is scanned?', result.isScanned);

  // Clean and normalize
  const cleaned = cleanText(result.text);

  // Split for AI processing (if text is very long)
  const chunks = splitTextIntoChunks(cleaned, 4000);
}
```

### Document Classification

```typescript
import { DocumentClassifier } from '@/lib/data-room/ai';

const classifier = new DocumentClassifier(process.env.OPENROUTER_API_KEY);

const result = await classifier.classify(text, 'financial_statement.pdf');

console.log('Type:', result.document_type); // 'financial'
console.log('Confidence:', result.confidence_score); // 0.95
console.log('Reasoning:', result.reasoning);

// Check if needs human review
if (DocumentClassifier.needsHumanReview(result)) {
  console.log('⚠️ Low confidence - flag for human review');
}
```

### Metadata Extraction

```typescript
import { MetadataExtractor } from '@/lib/data-room/ai';

const extractor = new MetadataExtractor(process.env.OPENROUTER_API_KEY);

const metadata = await extractor.extract(text, 'contract');

console.log('Parties:', metadata.contract_parties);
console.log('Effective Date:', metadata.effective_date);
console.log('Contract Value:', metadata.contract_value);
console.log('Amounts:', metadata.amounts);
```

### Batch Processing

```typescript
import { DocumentClassifier, MetadataExtractor } from '@/lib/data-room/ai';

const classifier = new DocumentClassifier();

// Classify multiple documents
const documents = [
  { text: 'Document 1 text...', filename: 'doc1.pdf' },
  { text: 'Document 2 text...', filename: 'doc2.pdf' },
];

const results = await classifier.classifyBatch(documents);
```

---

## API Integration

### Creating a Data Room API Route

```typescript
// app/api/data-room/route.ts
import { withErrorHandler, notFoundError } from '@/lib/data-room/utils';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw unauthorizedError();
  }

  // Parse and validate request
  const body = await req.json();
  // ... validation logic

  // Create data room
  const { data, error } = await supabase
    .from('data_rooms')
    .insert({
      user_id: user.id,
      name: body.name,
      // ... other fields
    })
    .select()
    .single();

  if (error) {
    throw new DataRoomError(
      'Failed to create data room',
      DataRoomErrorCode.DATABASE_ERROR,
      500
    );
  }

  return NextResponse.json(data, { status: 201 });
});
```

### Triggering AI Analysis

```typescript
// After document upload
const response = await fetch(`${supabaseUrl}/functions/v1/analyze-document`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseServiceKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ document_id: documentId }),
});

if (!response.ok) {
  console.error('AI analysis failed');
}
```

---

## Component Usage

### Error Boundary

```typescript
import { DataRoomErrorBoundary } from '@/components/data-room/error-boundary';

function DataRoomPage() {
  return (
    <DataRoomErrorBoundary
      onError={(error, errorInfo) => {
        // Optional: Log to error tracking service
        console.error('Error in Data Room:', error, errorInfo);
      }}
    >
      <DataRoomContent />
    </DataRoomErrorBoundary>
  );
}
```

### Next.js Error Page

```typescript
// app/(dashboard)/data-room/error.tsx
'use client';

import { DataRoomError } from '@/components/data-room/error-boundary';

export default DataRoomError;
```

---

## Best Practices

### 1. Always Use Error Handlers

```typescript
// ❌ Bad
export async function POST(req: NextRequest) {
  try {
    // ... your code
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ Good
export const POST = withErrorHandler(async (req: NextRequest) => {
  // ... your code
  return NextResponse.json(result);
});
```

### 2. Use Specialized Selectors

```typescript
// ❌ Bad - subscribes to entire store
const store = useDataRoomStore();
const hasUploads = Object.keys(store.uploadProgress).length > 0;

// ✅ Good - only subscribes to what you need
const hasUploads = useHasActiveUploads();
```

### 3. Show Loading States

```typescript
// ❌ Bad - blank screen while loading
if (isLoading) return null;

// ✅ Good - show skeleton
if (isLoading) return <DataRoomListSkeleton />;
```

### 4. Handle Errors Gracefully

```typescript
// ❌ Bad - show raw error to user
toast.error(error.message);

// ✅ Good - show user-friendly message
const parsed = parseApiError(error);
toast.error(getUserFriendlyMessage(parsed.code));
```

### 5. Wrap Components in Error Boundaries

```typescript
// ❌ Bad - entire app crashes on error
<DataRoomContent />

// ✅ Good - graceful error handling
<DataRoomErrorBoundary>
  <DataRoomContent />
</DataRoomErrorBoundary>
```

---

## Testing

### Testing State Management

```typescript
import { renderHook, act } from '@testing-library/react';
import { useDataRoomStore } from '@/lib/stores/data-room-store';

test('updates current data room', () => {
  const { result } = renderHook(() => useDataRoomStore());

  act(() => {
    result.current.setCurrentDataRoom('test-id');
  });

  expect(result.current.currentDataRoomId).toBe('test-id');
});
```

### Testing Error Handling

```typescript
import { DataRoomError, DataRoomErrorCode } from '@/lib/data-room/utils';

test('creates validation error', () => {
  const error = validationError('Invalid input');

  expect(error).toBeInstanceOf(DataRoomError);
  expect(error.code).toBe(DataRoomErrorCode.VALIDATION_ERROR);
  expect(error.statusCode).toBe(400);
});
```

---

## Troubleshooting

### Issue: State not persisting

**Solution**: Check localStorage is enabled and not full. Clear storage if needed:

```typescript
localStorage.removeItem('data-room-storage');
```

### Issue: AI analysis failing

**Solution**: Check environment variables:

```bash
echo $OPENROUTER_API_KEY
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Issue: Upload progress not updating

**Solution**: Ensure you're calling `updateUploadProgress` with correct status:

```typescript
updateProgress(filename, { filename, progress: 50, status: 'uploading' });
```

---

## Support

For issues or questions:
1. Check the [README](./README.md) for AI utilities
2. Review example implementations in `components/data-room/`
3. Check error logs in browser console and server logs
