# Phase 3.4 Implementation Complete - API Routes

**Date**: 2025-10-26
**Feature**: Data Room - AI-Powered Due Diligence Platform
**Phase**: 3.4 (Core Implementation - API Routes)

---

## Overview

Successfully implemented complete REST API endpoints for the Data Room feature using Next.js 15 App Router. All endpoints use the repositories from Phase 3.3 and include comprehensive error handling, validation, and activity logging.

---

## Endpoints Created

### Data Room Management (5 endpoints)

#### 1. POST /api/data-room
**Purpose**: Create new data room

**Request**:
```json
{
  "name": "Acme Corp Acquisition",
  "description": "Due diligence for Acme acquisition",
  "company_id": "uuid",
  "deal_type": "acquisition",
  "metadata": {
    "deal_value": 10000000,
    "currency": "USD"
  }
}
```

**Response**: 201 Created
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Acme Corp Acquisition",
  "status": "active",
  ...
}
```

**Features**:
- Validates input with Zod schema
- Automatically sets current user as owner
- Logs 'create_room' activity
- Returns full data room object

---

#### 2. GET /api/data-room
**Purpose**: List data rooms with filters

**Query Parameters**:
- `status` - Filter by status (active, archived, deleted)
- `deal_type` - Filter by deal type
- `search` - Search in name and description
- `sort_by` - Sort field (created_at, updated_at, name, document_count)
- `sort_order` - Sort direction (asc, desc)
- `limit` - Results per page (max 100, default 50)
- `offset` - Pagination offset

**Response**: 200 OK
```json
{
  "data": [...],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 10
  }
}
```

---

#### 3. GET /api/data-room/[id]
**Purpose**: Get single data room with stats

**Response**: 200 OK
```json
{
  "id": "uuid",
  "name": "Acme Corp Acquisition",
  "access_count": 3,
  "recent_activity": [...],
  "owner_name": "John Doe",
  "my_permission": "owner",
  ...
}
```

**Features**:
- Returns data room with statistics
- Includes access count, recent activity, owner info
- Shows current user's permission level
- Logs 'view' activity

---

#### 4. PATCH /api/data-room/[id]
**Purpose**: Update data room

**Request**:
```json
{
  "name": "Updated Name",
  "status": "archived",
  "metadata": {...}
}
```

**Response**: 200 OK

**Features**:
- Validates updates with Zod
- Checks owner permission (RLS)
- Logs 'edit' activity with updated fields
- Returns updated data room

---

#### 5. DELETE /api/data-room/[id]
**Purpose**: Soft delete data room

**Response**: 200 OK
```json
{
  "success": true,
  "message": "Data room deleted"
}
```

**Features**:
- Soft delete (sets status='deleted', deleted_at)
- Checks owner permission
- Logs 'delete_room' activity

---

### Document Management (5 endpoints)

#### 6. POST /api/data-room/documents
**Purpose**: Upload document

**Request**: multipart/form-data
- `file` - File to upload (max 100MB)
- `data_room_id` - UUID of data room
- `folder_path` - Optional folder path (default: /)

**Response**: 201 Created
```json
{
  "id": "uuid",
  "filename": "contract.pdf",
  "storage_path": "dataroom-id/doc-id.pdf",
  "processing_status": "pending",
  ...
}
```

**Flow**:
1. Validate file (size, type)
2. Check user has editor+ permission
3. Create document record
4. Upload to Supabase Storage
5. Update document with storage path
6. Update data room storage metrics
7. Log 'upload' activity
8. Trigger AI analysis (async, fire-and-forget)

**Error Handling**:
- If upload fails, deletes document record
- Comprehensive error messages

---

#### 7. GET /api/data-room/documents
**Purpose**: List documents in data room

**Query Parameters**:
- `data_room_id` - Required, UUID of data room
- `document_type` - Filter by type
- `folder_path` - Filter by folder
- `search` - Search in filename
- `processing_status` - Filter by status
- `sort_by` - Sort field
- `sort_order` - Sort direction
- `limit` - Results per page (max 100, default 50)
- `offset` - Pagination offset

**Response**: 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "filename": "contract.pdf",
      "document_type": "contract",
      "file_size_bytes": 1024000,
      "uploaded_by_name": "John Doe",
      "processing_status": "complete",
      "confidence_score": 0.95
    }
  ],
  "pagination": {...}
}
```

**Features**:
- Returns lightweight DocumentListItem objects
- Batch profile lookups for performance
- Checks access permission

---

#### 8. GET /api/data-room/documents/[id]
**Purpose**: Get document with signed URL

**Response**: 200 OK
```json
{
  "id": "uuid",
  "filename": "contract.pdf",
  "signed_url": "https://...?token=...",
  "analysis": [...],
  "annotation_count": 5,
  ...
}
```

**Features**:
- Generates signed URL (1 hour expiration)
- Includes AI analysis results
- Includes annotation count
- Logs 'view' activity
- Checks access permission

---

#### 9. DELETE /api/data-room/documents/[id]
**Purpose**: Delete document

**Response**: 200 OK
```json
{
  "success": true,
  "message": "Document deleted"
}
```

**Features**:
- Deletes from Supabase Storage (hard delete)
- Soft deletes database record
- Updates data room storage metrics (-bytes, -count)
- Logs 'delete' activity
- Checks editor+ permission

---

### Access Management (4 endpoints)

#### 10. POST /api/data-room/access
**Purpose**: Grant access to user (invite)

**Request**:
```json
{
  "data_room_id": "uuid",
  "invite_email": "user@example.com",
  "permission_level": "editor",
  "expires_in_days": 30
}
```

**Response**: 201 Created
```json
{
  "id": "uuid",
  "invite_token": "jwt-token",
  "invite_url": "https://oppspot.ai/data-room/accept-invite?token=...",
  "expires_at": "2025-11-25T00:00:00Z",
  ...
}
```

**Features**:
- Validates email format
- Checks owner permission
- Prevents duplicate access
- Generates JWT token (30-day expiration)
- Auto-accepts if user already exists
- Logs 'share' activity

---

#### 11. GET /api/data-room/access
**Purpose**: List access grants

**Query Parameters**:
- `data_room_id` - Required, UUID of data room

**Response**: 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "invite_email": "user@example.com",
      "permission_level": "editor",
      "accepted_at": "2025-10-20T...",
      "revoked_at": null,
      ...
    }
  ]
}
```

**Features**:
- Owner-only access
- Returns all grants (active and revoked)

---

#### 12. PATCH /api/data-room/access/[id]
**Purpose**: Revoke access

**Response**: 200 OK
```json
{
  "success": true,
  "message": "Access revoked"
}
```

**Features**:
- Checks owner permission
- Sets revoked_at timestamp
- Logs 'revoke' activity

---

#### 13. POST /api/data-room/accept-invite
**Purpose**: Accept invitation

**Request**:
```json
{
  "token": "jwt-token"
}
```

**Response**: 200 OK
```json
{
  "success": true,
  "data_room_id": "uuid",
  "permission_level": "editor",
  "message": "Invitation accepted successfully"
}
```

**Features**:
- Verifies JWT token
- Checks expiration
- Updates user_id and accepted_at
- Logs 'share' activity

---

### Activity & Stats (4 endpoints)

#### 14. GET /api/data-room/[id]/activity
**Purpose**: Get activity logs

**Query Parameters**:
- `document_id` - Filter by document
- `actor_id` - Filter by user
- `action` - Filter by action type
- `date_from` - Filter by date range
- `date_to` - Filter by date range
- `limit` - Results per page (max 1000, default 100)
- `offset` - Pagination offset

**Response**: 200 OK
```json
{
  "data": [
    {
      "id": "uuid",
      "actor_name": "John Doe",
      "action": "upload",
      "details": {...},
      "created_at": "2025-10-26T..."
    }
  ],
  "pagination": {...}
}
```

---

#### 15. GET /api/data-room/[id]/activity/export
**Purpose**: Export activity logs as CSV

**Response**: 200 OK (text/csv)
```
Timestamp,Actor,Email,Action,Document ID,Details,IP Address
2025-10-26T10:00:00Z,"John Doe","john@example.com",upload,...
```

**Features**:
- Owner-only access
- Exports all activity logs
- CSV format with proper escaping
- Filename includes data room name and date

---

#### 16. GET /api/data-room/[id]/folders
**Purpose**: Get folder structure

**Response**: 200 OK
```json
{
  "data": ["/", "/contracts", "/financials", "/legal"]
}
```

**Features**:
- Returns unique folder paths
- Sorted alphabetically

---

#### 17. GET /api/data-room/[id]/stats
**Purpose**: Get comprehensive statistics

**Response**: 200 OK
```json
{
  "storage_used_bytes": 10240000,
  "document_count": 15,
  "documents_by_type": {
    "financial": 5,
    "contract": 7,
    "legal": 3
  },
  "activities_by_action": {
    "upload": 15,
    "view": 42,
    "download": 8
  }
}
```

---

## File Structure

```
app/
└── api/
    └── data-room/
        ├── route.ts                        (POST, GET)
        ├── [id]/
        │   ├── route.ts                    (GET, PATCH, DELETE)
        │   ├── activity/
        │   │   ├── route.ts                (GET)
        │   │   └── export/
        │   │       └── route.ts            (GET - CSV export)
        │   ├── folders/
        │   │   └── route.ts                (GET)
        │   └── stats/
        │       └── route.ts                (GET)
        ├── documents/
        │   ├── route.ts                    (POST, GET)
        │   └── [id]/
        │       └── route.ts                (GET, DELETE)
        ├── access/
        │   ├── route.ts                    (POST, GET)
        │   └── [id]/
        │       └── route.ts                (PATCH)
        └── accept-invite/
            └── route.ts                    (POST)
```

**Total**: 11 route files, 17 endpoints

---

## Common Patterns

### Authentication Check
All endpoints check authentication:

```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  throw unauthorizedError();
}
```

### Error Handling
All endpoints wrapped with `withErrorHandler`:

```typescript
export const POST = withErrorHandler(async (req: NextRequest) => {
  // Route logic
});
```

### Validation
Request data validated with Zod:

```typescript
const validated = CreateDataRoomSchema.parse(body);
```

### Activity Logging
Important actions logged:

```typescript
await activityRepo.logActivity({
  data_room_id: id,
  action: 'upload',
  details: {...},
});
```

### Permission Checks
Access checked before operations:

```typescript
const hasAccess = await dataRoomRepo.hasAccess(dataRoomId, user.id);
if (!hasAccess) {
  throw forbiddenError('Access denied');
}
```

---

## Response Formats

### Success Response
```json
{
  "data": {...},
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 10
  }
}
```

### Error Response
```json
{
  "error": "User-friendly error message",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-10-26T10:00:00Z",
  "path": "/api/data-room"
}
```

### Simple Success
```json
{
  "success": true,
  "message": "Operation completed"
}
```

---

## Security Features

### RLS Integration
- All repositories use Supabase client with RLS
- Automatic row-level security enforcement
- Graceful RLS error handling (403 Forbidden)

### JWT Tokens
- Invitations use JWT with 30-day expiration
- Token includes: data_room_id, invite_email, permission_level
- Signed with JWT_SECRET environment variable

### File Validation
- Max file size: 100MB
- Allowed types: PDF, DOCX, XLSX, DOC, XLS
- MIME type checking

### Permission Hierarchy
- Owner can do everything
- Editor+ can upload/edit documents
- Viewer can only view
- Automatic permission checking

### Activity Logging
- All significant actions logged
- Immutable audit trail
- Includes: actor, action, details, IP, user agent

---

## Performance Optimizations

### Batch Operations
- Profile lookups batched in document list
- Parallel file uploads supported
- Parallel signed URL generation

### Pagination
- Default: 50 items per page
- Maximum: 100 items per page
- Offset-based pagination

### Async Operations
- AI analysis triggered async (fire-and-forget)
- Doesn't block upload response
- Errors logged but don't fail request

### Selective Queries
- Document list returns lightweight objects
- Only loads what's needed for display
- Reduces data transfer

---

## Testing Examples

### Create Data Room
```bash
curl -X POST http://localhost:3000/api/data-room \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Room",
    "deal_type": "acquisition"
  }'
```

### Upload Document
```bash
curl -X POST http://localhost:3000/api/data-room/documents \
  -F "file=@contract.pdf" \
  -F "data_room_id=uuid" \
  -F "folder_path=/contracts"
```

### Grant Access
```bash
curl -X POST http://localhost:3000/api/data-room/access \
  -H "Content-Type: application/json" \
  -d '{
    "data_room_id": "uuid",
    "invite_email": "user@example.com",
    "permission_level": "editor",
    "expires_in_days": 30
  }'
```

---

## Integration with Phase 3.3

All endpoints use repositories from Phase 3.3:

```typescript
import {
  DataRoomRepository,
  DocumentRepository,
  ActivityRepository,
  AccessRepository,
  DocumentStorage,
} from '@/lib/data-room';
```

**Benefits**:
- Consistent error handling
- Validated inputs
- Type-safe operations
- RLS support
- Activity logging
- Storage management

---

## Next Steps

### Phase 3.5: UI Components

With API routes complete, we can now build:
- **Data room list and cards** (T039-T041)
- **Document upload and grid** (T043-T045)
- **Document viewer with PDF.js** (T046-T048)
- **Permission manager** (T049-T050)
- **Activity timeline** (T051-T052)

**Example UI Integration**:
```typescript
// components/data-room/data-room-list.tsx
import useSWR from 'swr';

const { data } = useSWR('/api/data-room');
// Render data.data array
```

---

## Success Metrics

✅ **17 REST endpoints** covering all CRUD operations
✅ **Complete API coverage** for data rooms, documents, access
✅ **Type-safe** with Zod validation
✅ **Secure** with authentication, permissions, RLS
✅ **Activity logging** for all significant actions
✅ **Error handling** with standardized codes
✅ **File upload** with multipart/form-data support
✅ **Signed URLs** for secure document access
✅ **CSV export** for activity logs
✅ **Pagination** for large datasets
✅ **Async AI** triggering for document analysis

---

## Environment Variables

Required for production:

```bash
# JWT Secret
JWT_SECRET=your-secret-key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Site URL for invite links
NEXT_PUBLIC_SITE_URL=https://oppspot.ai
```

---

## Conclusion

Phase 3.4 provides a complete, production-ready REST API with:

- **17 endpoints** for full data room functionality
- **Type-safe** operations with Zod validation
- **Secure** with RLS, JWT, and permission checks
- **Performant** with batching and pagination
- **Observable** with comprehensive activity logging
- **Error-resilient** with standardized error handling

All endpoints are ready for UI integration in Phase 3.5.

**Status**: ✅ **COMPLETE**
**Next Phase**: 3.5 - UI Components
