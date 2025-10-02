# Data Model: Data Room - AI-Powered Due Diligence

**Feature**: Data Room - AI-Powered Due Diligence Platform
**Date**: 2025-10-01
**Source**: Extracted from [spec.md](./spec.md) Key Entities section

---

## Entity Relationship Overview

```
User (profiles)
  └── 1:N → DataRoom
             ├── 1:N → Document
             │         ├── 1:1 → DocumentAnalysis (AI insights)
             │         └── 1:N → DocumentAnnotation (user comments)
             ├── 1:N → DataRoomAccess (team permissions)
             └── 1:N → ActivityLog (audit trail)

Business (businesses)
  └── 1:N → DataRoom (optional link)
```

---

## Core Entities

### 1. DataRoom

**Purpose**: Secure workspace for organizing and analyzing documents for a deal or company.

**Table**: `data_rooms`

**Fields**:
```typescript
interface DataRoom {
  id: string;                         // UUID, primary key
  user_id: string;                    // FK to profiles (owner)
  company_id: string | null;          // FK to businesses (optional link)

  // Basic information
  name: string;                       // "Acme Corp Acquisition"
  description: string | null;         // Optional description
  deal_type: DealType;                // Type of deal
  status: DataRoomStatus;             // Current state

  // Storage metrics
  storage_used_bytes: bigint;         // Total file size
  document_count: number;             // Number of documents

  // Metadata
  metadata: {
    deal_value?: number;              // Expected deal size
    currency?: string;                // GBP, USD, EUR
    target_close_date?: string;       // Expected completion
    retention_days?: number;          // Auto-delete after N days
    tags?: string[];                  // Custom tags
  };

  // Timestamps
  created_at: timestamp;
  updated_at: timestamp;
  deleted_at: timestamp | null;       // Soft delete
}

type DealType =
  | 'acquisition'        // Buying a company
  | 'investment'         // PE/VC investment
  | 'partnership'        // Strategic partnership
  | 'merger'             // Merger of equals
  | 'sale'               // Selling company
  | 'due_diligence'      // General DD
  | 'other';

type DataRoomStatus =
  | 'active'             // Currently in use
  | 'archived'           // Deal complete, read-only
  | 'deleted';           // Soft deleted
```

**Indexes**:
```sql
CREATE INDEX idx_data_rooms_user_id ON data_rooms(user_id);
CREATE INDEX idx_data_rooms_company_id ON data_rooms(company_id);
CREATE INDEX idx_data_rooms_status ON data_rooms(status);
CREATE INDEX idx_data_rooms_created_at ON data_rooms(created_at DESC);
```

**RLS Policies**:
```sql
-- Users can view data rooms they own or have access to
CREATE POLICY "Users can view accessible data rooms"
  ON data_rooms FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM data_room_access
      WHERE data_room_access.data_room_id = data_rooms.id
      AND data_room_access.user_id = auth.uid()
      AND data_room_access.revoked_at IS NULL
    )
  );

-- Users can only create data rooms for themselves
CREATE POLICY "Users can create own data rooms"
  ON data_rooms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only owners can update data rooms
CREATE POLICY "Owners can update data rooms"
  ON data_rooms FOR UPDATE
  USING (auth.uid() = user_id);

-- Only owners can delete data rooms
CREATE POLICY "Owners can delete data rooms"
  ON data_rooms FOR DELETE
  USING (auth.uid() = user_id);
```

---

### 2. Document

**Purpose**: An uploaded file in a data room with AI-extracted metadata.

**Table**: `documents`

**Fields**:
```typescript
interface Document {
  id: string;                         // UUID, primary key
  data_room_id: string;               // FK to data_rooms

  // File information
  filename: string;                   // Original filename
  folder_path: string;                // "/Financials/2024"
  file_size_bytes: bigint;            // File size
  mime_type: string;                  // application/pdf
  storage_path: string;               // Supabase Storage path

  // Upload tracking
  uploaded_by: string;                // FK to profiles
  upload_completed: boolean;          // True when upload finishes

  // AI classification (FR-014 to FR-018)
  document_type: DocumentType;        // AI classification
  confidence_score: number;           // 0-1, classification confidence
  processing_status: ProcessingStatus; // AI analysis state

  // Extracted metadata (FR-015)
  metadata: {
    // Common fields
    dates?: string[];                 // Extracted dates
    amounts?: {                       // Extracted monetary amounts
      value: number;
      currency: string;
      context: string;                // "Revenue: $1.2M"
    }[];
    parties?: {                       // People/companies mentioned
      name: string;
      type: 'person' | 'company';
      role?: string;                  // "CEO", "Vendor"
    }[];

    // Document-specific fields
    document_date?: string;           // Primary document date
    fiscal_period?: string;           // "Q3 2024", "FY 2023"
    contract_parties?: string[];      // For contracts
    contract_value?: number;          // For contracts
    effective_date?: string;          // For contracts
    expiration_date?: string;         // For contracts
  };

  // Error handling
  error_message: string | null;       // If processing failed

  // Timestamps
  created_at: timestamp;
  updated_at: timestamp;
  deleted_at: timestamp | null;       // Soft delete
}

type DocumentType =
  | 'financial'          // P&L, balance sheet, cash flow
  | 'contract'           // Customer, vendor, employment agreements
  | 'due_diligence'      // Pitch decks, memos, presentations
  | 'legal'              // Articles of incorporation, legal opinions
  | 'hr'                 // Org charts, employee lists
  | 'other';             // Uncategorized

type ProcessingStatus =
  | 'pending'            // Uploaded, not yet processed
  | 'processing'         // AI analysis in progress
  | 'complete'           // Successfully analyzed
  | 'failed';            // Processing error
```

**Indexes**:
```sql
CREATE INDEX idx_documents_data_room_id ON documents(data_room_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_processing_status ON documents(processing_status);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_folder_path ON documents(folder_path);
```

**RLS Policies**:
```sql
-- Users can view documents in data rooms they have access to
CREATE POLICY "Users can view accessible documents"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM data_rooms
      WHERE data_rooms.id = documents.data_room_id
      AND (
        data_rooms.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = data_rooms.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.revoked_at IS NULL
        )
      )
    )
  );

-- Users can upload documents to data rooms they have Editor+ access to
CREATE POLICY "Editors can upload documents"
  ON documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM data_rooms
      WHERE data_rooms.id = documents.data_room_id
      AND (
        data_rooms.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = data_rooms.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.permission_level IN ('owner', 'editor')
          AND data_room_access.revoked_at IS NULL
        )
      )
    )
  );

-- Only document uploader or data room owner can delete documents
CREATE POLICY "Uploaders and owners can delete documents"
  ON documents FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM data_rooms
      WHERE data_rooms.id = documents.data_room_id
      AND data_rooms.user_id = auth.uid()
    )
  );
```

---

### 3. DocumentAnalysis

**Purpose**: AI-generated insights for a specific document.

**Table**: `document_analysis`

**Fields**:
```typescript
interface DocumentAnalysis {
  id: string;                         // UUID, primary key
  document_id: string;                // FK to documents
  analysis_type: AnalysisType;        // Type of analysis

  // Analysis results (structure varies by type)
  findings: AnalysisFindings;         // JSONB, see type definitions below

  // Quality metrics
  confidence: ConfidenceLevel;        // Overall confidence
  risks_identified: number;           // Count of high/medium risks

  // Processing metadata
  processing_time_ms: number;         // Performance tracking
  ai_model: string;                   // "claude-sonnet-4"
  ai_tokens_used: number;             // Cost tracking

  // Timestamps
  created_at: timestamp;
}

type AnalysisType =
  | 'classification'     // Document type classification
  | 'financial'          // Financial statement analysis
  | 'contract'           // Contract intelligence
  | 'risk';              // Risk assessment

type ConfidenceLevel = 'high' | 'medium' | 'low';

// Type-specific findings structures

interface ClassificationFindings {
  document_type: DocumentType;
  confidence_score: number;
  reasoning: string;
  alternative_types?: {
    type: DocumentType;
    confidence: number;
  }[];
}

interface FinancialFindings {
  // Financial metrics (FR-020)
  metrics: {
    revenue?: number;
    cogs?: number;
    gross_margin?: number;
    ebitda?: number;
    net_income?: number;
    cash_balance?: number;
    burn_rate?: number;         // Monthly burn
    runway_months?: number;     // Months until cash out
  };

  // Growth rates (FR-021)
  growth_rates: {
    revenue_yoy?: number;       // Year-over-year %
    revenue_mom?: number;       // Month-over-month %
  };

  // Anomalies (FR-022)
  anomalies: {
    type: 'missing_period' | 'unusual_spike' | 'unusual_drop' | 'negative_margin';
    severity: 'high' | 'medium' | 'low';
    description: string;
    period?: string;
    value?: number;
  }[];

  // Time series data for charts (FR-023)
  time_series: {
    period: string;             // "2024-Q1"
    revenue?: number;
    profit?: number;
    cash?: number;
  }[];
}

interface ContractFindings {
  // Contract essentials (FR-027)
  contract_type: ContractType;
  parties: string[];
  effective_date: string | null;
  expiration_date: string | null;
  renewal_terms: string | null;
  payment_terms: string | null;
  termination_clauses: string | null;

  // Risk clauses (FR-028)
  high_risk_clauses: {
    clause_type: 'unlimited_liability' | 'one_sided_terms' | 'auto_renewal' | 'exclusive' | 'non_compete';
    text: string;
    page_number: number;
    risk_level: 'high' | 'medium' | 'low';
    explanation: string;
  }[];

  // Missing clauses (FR-029)
  missing_clauses: {
    clause_type: 'limitation_liability' | 'indemnification' | 'ip_ownership' | 'confidentiality' | 'force_majeure';
    importance: 'critical' | 'recommended';
    recommendation: string;
  }[];

  // Obligations (FR-030)
  obligations: {
    party: string;              // "Company" or "Counterparty"
    obligation: string;
    deadline?: string;
    recurring?: boolean;
  }[];

  // Unusual terms (FR-031)
  unusual_terms: {
    term_type: 'below_market_pricing' | 'unusual_payment_terms' | 'very_long_contract';
    description: string;
    context: string;
  }[];
}

type ContractType =
  | 'customer_agreement'
  | 'vendor_contract'
  | 'employment_agreement'
  | 'nda'
  | 'partnership'
  | 'license'
  | 'other';

interface RiskFindings {
  overall_risk_score: number;         // 1-10 scale
  risk_categories: {
    category: 'financial' | 'legal' | 'operational' | 'compliance' | 'reputational';
    score: number;                    // 1-10
    findings: string[];
  }[];

  top_risks: {
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    mitigation: string;
    source_document_id: string;       // Reference to document
  }[];
}

type AnalysisFindings =
  | ClassificationFindings
  | FinancialFindings
  | ContractFindings
  | RiskFindings;
```

**Indexes**:
```sql
CREATE INDEX idx_document_analysis_document_id ON document_analysis(document_id);
CREATE INDEX idx_document_analysis_type ON document_analysis(analysis_type);
CREATE INDEX idx_document_analysis_confidence ON document_analysis(confidence);
```

**RLS Policies**:
```sql
-- Users can view analysis for documents they have access to
CREATE POLICY "Users can view accessible document analysis"
  ON document_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      JOIN data_rooms ON data_rooms.id = documents.data_room_id
      WHERE documents.id = document_analysis.document_id
      AND (
        data_rooms.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = data_rooms.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.revoked_at IS NULL
        )
      )
    )
  );
```

---

### 4. DataRoomAccess

**Purpose**: Permission grants for team collaboration.

**Table**: `data_room_access`

**Fields**:
```typescript
interface DataRoomAccess {
  id: string;                         // UUID, primary key
  data_room_id: string;               // FK to data_rooms
  user_id: string;                    // FK to profiles

  // Permission level (FR-042 to FR-046)
  permission_level: PermissionLevel;

  // Invitation tracking
  invited_by: string;                 // FK to profiles
  invite_token: string;               // JWT for secure sharing
  invite_email: string;               // Email invitation sent to

  // Expiration (FR-047)
  expires_at: timestamp;              // Token expiration (7 days default)

  // Status
  accepted_at: timestamp | null;      // When user accepted invite
  revoked_at: timestamp | null;       // When access was revoked

  // Timestamps
  created_at: timestamp;
  updated_at: timestamp;
}

type PermissionLevel =
  | 'owner'              // Full access, delete data room, manage permissions
  | 'editor'             // Upload, annotate, generate reports
  | 'viewer'             // Read-only, download with watermark
  | 'commenter';         // Add comments/questions, no download
```

**Indexes**:
```sql
CREATE INDEX idx_data_room_access_data_room_id ON data_room_access(data_room_id);
CREATE INDEX idx_data_room_access_user_id ON data_room_access(user_id);
CREATE INDEX idx_data_room_access_invite_token ON data_room_access(invite_token);
CREATE INDEX idx_data_room_access_expires_at ON data_room_access(expires_at);
```

**RLS Policies**:
```sql
-- Users can view access grants for data rooms they own or have access to
CREATE POLICY "Users can view data room access"
  ON data_room_access FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM data_rooms
      WHERE data_rooms.id = data_room_access.data_room_id
      AND data_rooms.user_id = auth.uid()
    )
  );

-- Only data room owners can grant access
CREATE POLICY "Owners can grant access"
  ON data_room_access FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM data_rooms
      WHERE data_rooms.id = data_room_access.data_room_id
      AND data_rooms.user_id = auth.uid()
    )
  );

-- Only data room owners can revoke access
CREATE POLICY "Owners can revoke access"
  ON data_room_access FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM data_rooms
      WHERE data_rooms.id = data_room_access.data_room_id
      AND data_rooms.user_id = auth.uid()
    )
  );
```

---

### 5. ActivityLog

**Purpose**: Immutable audit trail of all data room actions for compliance.

**Table**: `activity_logs`

**Fields**:
```typescript
interface ActivityLog {
  id: string;                         // UUID, primary key
  data_room_id: string;               // FK to data_rooms
  document_id: string | null;         // FK to documents (if applicable)

  // Actor information (FR-051)
  actor_id: string;                   // FK to profiles
  actor_name: string;                 // Denormalized for history
  actor_email: string;                // Denormalized for history

  // Action details
  action: ActivityAction;
  details: {                          // JSONB, action-specific details
    // For uploads
    filename?: string;
    file_size_bytes?: bigint;

    // For views
    duration_seconds?: number;
    page_count?: number;

    // For downloads
    watermarked?: boolean;

    // For shares
    invited_user_email?: string;
    permission_level?: PermissionLevel;

    // For reports
    report_type?: string;
    report_format?: string;
  };

  // Technical details (FR-051)
  ip_address: string;                 // Actor's IP (inet type)
  user_agent: string;                 // Browser/device info

  // Timestamp (immutable, no updated_at)
  created_at: timestamp;
}

type ActivityAction =
  | 'upload'             // Document uploaded
  | 'view'               // Document viewed
  | 'download'           // Document downloaded
  | 'edit'               // Document or annotation edited
  | 'delete'             // Document deleted
  | 'share'              // Access granted to user
  | 'revoke'             // Access revoked
  | 'generate_report'    // AI report generated
  | 'create_room'        // Data room created
  | 'archive_room'       // Data room archived
  | 'delete_room';       // Data room deleted
```

**Indexes**:
```sql
CREATE INDEX idx_activity_logs_data_room_id ON activity_logs(data_room_id);
CREATE INDEX idx_activity_logs_actor_id ON activity_logs(actor_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_document_id ON activity_logs(document_id) WHERE document_id IS NOT NULL;
```

**RLS Policies**:
```sql
-- Users can view activity logs for data rooms they have access to
CREATE POLICY "Users can view accessible activity logs"
  ON activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM data_rooms
      WHERE data_rooms.id = activity_logs.data_room_id
      AND (
        data_rooms.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = data_rooms.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.revoked_at IS NULL
        )
      )
    )
  );

-- System can insert activity logs (no UPDATE or DELETE)
CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (true);
```

**Immutability**: No UPDATE or DELETE triggers/policies. Activity logs are append-only for compliance (NFR-008).

---

### 6. DocumentAnnotation

**Purpose**: User-generated comments and highlights on documents.

**Table**: `document_annotations`

**Fields**:
```typescript
interface DocumentAnnotation {
  id: string;                         // UUID, primary key
  document_id: string;                // FK to documents
  user_id: string;                    // FK to profiles (author)

  // Annotation type (FR-039)
  annotation_type: AnnotationType;

  // Position (for PDF documents)
  page_number: number | null;         // Page number (1-indexed)
  position: {                         // JSONB
    x: number;                        // X coordinate (pixels or %)
    y: number;                        // Y coordinate
    width: number;                    // Width (for highlights)
    height: number;                   // Height
  } | null;

  // Content
  text: string;                       // Comment text or highlighted content
  color: string;                      // Hex color (e.g., "#FFEB3B" for yellow)

  // Resolution tracking (for comments)
  resolved: boolean;                  // For comment threads
  resolved_by: string | null;         // FK to profiles
  resolved_at: timestamp | null;

  // Timestamps
  created_at: timestamp;
  updated_at: timestamp;
  deleted_at: timestamp | null;       // Soft delete
}

type AnnotationType =
  | 'highlight'          // Text highlight
  | 'comment'            // Text comment with position
  | 'sticky_note';       // Floating note
```

**Indexes**:
```sql
CREATE INDEX idx_document_annotations_document_id ON document_annotations(document_id);
CREATE INDEX idx_document_annotations_user_id ON document_annotations(user_id);
CREATE INDEX idx_document_annotations_page_number ON document_annotations(page_number) WHERE page_number IS NOT NULL;
```

**RLS Policies**:
```sql
-- Users can view annotations on documents they have access to
CREATE POLICY "Users can view accessible annotations"
  ON document_annotations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      JOIN data_rooms ON data_rooms.id = documents.data_room_id
      WHERE documents.id = document_annotations.document_id
      AND (
        data_rooms.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = data_rooms.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.revoked_at IS NULL
        )
      )
    )
  );

-- Users with Editor+ or Commenter access can create annotations
CREATE POLICY "Users can create annotations"
  ON document_annotations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      JOIN data_rooms ON data_rooms.id = documents.data_room_id
      WHERE documents.id = document_annotations.document_id
      AND (
        data_rooms.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = data_rooms.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.permission_level IN ('owner', 'editor', 'commenter')
          AND data_room_access.revoked_at IS NULL
        )
      )
    )
  );

-- Only annotation author can update or delete their annotations
CREATE POLICY "Authors can update own annotations"
  ON document_annotations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Authors can delete own annotations"
  ON document_annotations FOR DELETE
  USING (user_id = auth.uid());
```

---

## Storage Schema: Supabase Storage Buckets

### Bucket: `data-room-documents`

**Purpose**: Store encrypted document files.

**Configuration**:
```typescript
{
  name: 'data-room-documents',
  public: false,                      // Private bucket
  fileSizeLimit: 104857600,           // 100MB per file
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/csv',
    'image/jpeg',
    'image/png',
    'text/plain',
    'text/markdown'
  ]
}
```

**Folder Structure**:
```
data-room-documents/
  {data_room_id}/
    {document_id}_original.pdf      // Original file
    {document_id}_processed.pdf     // With watermark (for Viewer downloads)
```

**RLS Policies** (Storage):
```sql
-- Users can upload to data rooms they have Editor+ access to
CREATE POLICY "Editors can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'data-room-documents'
    AND EXISTS (
      SELECT 1 FROM data_rooms
      WHERE data_rooms.id = (storage.foldername(name))[1]::uuid
      AND (
        data_rooms.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = data_rooms.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.permission_level IN ('owner', 'editor')
          AND data_room_access.revoked_at IS NULL
        )
      )
    )
  );

-- Users can download from data rooms they have Viewer+ access to
CREATE POLICY "Viewers can download documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'data-room-documents'
    AND EXISTS (
      SELECT 1 FROM data_rooms
      WHERE data_rooms.id = (storage.foldername(name))[1]::uuid
      AND (
        data_rooms.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM data_room_access
          WHERE data_room_access.data_room_id = data_rooms.id
          AND data_room_access.user_id = auth.uid()
          AND data_room_access.permission_level IN ('owner', 'editor', 'viewer')
          AND data_room_access.revoked_at IS NULL
        )
      )
    )
  );
```

---

## Database Functions

### 1. `create_data_room_with_defaults()`

**Purpose**: Create a data room with default settings and initial activity log.

```sql
CREATE OR REPLACE FUNCTION create_data_room_with_defaults(
  p_user_id UUID,
  p_name TEXT,
  p_company_id UUID DEFAULT NULL,
  p_deal_type TEXT DEFAULT 'due_diligence'
)
RETURNS UUID AS $$
DECLARE
  v_room_id UUID;
BEGIN
  -- Create data room
  INSERT INTO data_rooms (
    user_id,
    name,
    company_id,
    deal_type,
    status,
    storage_used_bytes,
    document_count
  ) VALUES (
    p_user_id,
    p_name,
    p_company_id,
    p_deal_type::deal_type,
    'active',
    0,
    0
  ) RETURNING id INTO v_room_id;

  -- Log activity
  INSERT INTO activity_logs (
    data_room_id,
    actor_id,
    action,
    details,
    ip_address,
    user_agent
  ) VALUES (
    v_room_id,
    p_user_id,
    'create_room',
    jsonb_build_object('name', p_name),
    inet_client_addr(),
    current_setting('request.headers')::json->>'user-agent'
  );

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 2. `increment_document_count()`

**Purpose**: Trigger to update data room document count and storage used.

```sql
CREATE OR REPLACE FUNCTION increment_document_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update data room metrics
  UPDATE data_rooms
  SET
    document_count = document_count + 1,
    storage_used_bytes = storage_used_bytes + NEW.file_size_bytes,
    updated_at = NOW()
  WHERE id = NEW.data_room_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_document_count
  AFTER INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION increment_document_count();
```

---

### 3. `log_activity()`

**Purpose**: Helper function to create activity log entries.

```sql
CREATE OR REPLACE FUNCTION log_activity(
  p_data_room_id UUID,
  p_document_id UUID DEFAULT NULL,
  p_action TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
DECLARE
  v_actor_id UUID;
  v_actor_name TEXT;
  v_actor_email TEXT;
BEGIN
  -- Get actor info
  v_actor_id := auth.uid();

  SELECT name, email INTO v_actor_name, v_actor_email
  FROM profiles
  WHERE id = v_actor_id;

  -- Insert activity log
  INSERT INTO activity_logs (
    data_room_id,
    document_id,
    actor_id,
    actor_name,
    actor_email,
    action,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_data_room_id,
    p_document_id,
    v_actor_id,
    v_actor_name,
    v_actor_email,
    p_action::activity_action,
    p_details,
    inet_client_addr(),
    current_setting('request.headers')::json->>'user-agent'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 4. `check_data_room_access()`

**Purpose**: Check if a user has specific permission level for a data room.

```sql
CREATE OR REPLACE FUNCTION check_data_room_access(
  p_user_id UUID,
  p_data_room_id UUID,
  p_required_permission TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  -- Check if user is owner
  IF EXISTS (
    SELECT 1 FROM data_rooms
    WHERE id = p_data_room_id
    AND user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user has required permission level
  SELECT EXISTS (
    SELECT 1 FROM data_room_access
    WHERE data_room_id = p_data_room_id
    AND user_id = p_user_id
    AND revoked_at IS NULL
    AND expires_at > NOW()
    AND CASE p_required_permission
      WHEN 'owner' THEN permission_level = 'owner'
      WHEN 'editor' THEN permission_level IN ('owner', 'editor')
      WHEN 'commenter' THEN permission_level IN ('owner', 'editor', 'commenter')
      WHEN 'viewer' THEN permission_level IN ('owner', 'editor', 'viewer', 'commenter')
    END
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Database Migrations

**Migration File**: `supabase/migrations/20251001000002_data_room_schema.sql`

**Migration includes**:
1. Create ENUMs (deal_type, data_room_status, document_type, processing_status, permission_level, activity_action, annotation_type, analysis_type, confidence_level)
2. Create `data_rooms` table with RLS policies
3. Create `documents` table with RLS policies
4. Create `document_analysis` table with RLS policies
5. Create `data_room_access` table with RLS policies
6. Create `activity_logs` table with RLS policies (immutable)
7. Create `document_annotations` table with RLS policies
8. Create indexes for all tables
9. Create Supabase Storage bucket `data-room-documents` with RLS
10. Create helper functions
11. Create triggers for auto-updating metrics

---

## State Machines

### Document Processing Lifecycle

```
[User uploads file]
  ↓
pending → Upload to Supabase Storage (encrypted)
  ↓
pending → Create document record in DB
  ↓
pending → Trigger Supabase Edge Function
  ↓
processing → AI classification (DocumentType)
  ↓
processing → Extract metadata (dates, amounts, parties)
  ↓
processing → Deep analysis (financial/contract/risk)
  ↓
complete (success) OR failed (error)
  ↓
[User views document with AI insights]
```

### Data Room Access Lifecycle

```
[Owner invites user]
  ↓
Created → Send email with invite_token
  ↓
Pending → User clicks link, validates token
  ↓
Active (accepted_at set) → User has access
  ↓
Active → Owner can revoke (revoked_at set)
  ↓
Revoked (user loses access immediately)

OR

Active → Token expires (expires_at passed)
  ↓
Expired (user loses access, can be re-invited)
```

---

## JSONB Schema Validation

All JSONB fields should be validated with Zod schemas:

```typescript
import { z } from 'zod';

// Document metadata schema
const DocumentMetadataSchema = z.object({
  dates: z.array(z.string()).optional(),
  amounts: z.array(z.object({
    value: z.number(),
    currency: z.string(),
    context: z.string()
  })).optional(),
  parties: z.array(z.object({
    name: z.string(),
    type: z.enum(['person', 'company']),
    role: z.string().optional()
  })).optional(),
  document_date: z.string().optional(),
  fiscal_period: z.string().optional(),
  contract_parties: z.array(z.string()).optional(),
  contract_value: z.number().optional(),
  effective_date: z.string().optional(),
  expiration_date: z.string().optional()
});

// Financial findings schema
const FinancialFindingsSchema = z.object({
  metrics: z.object({
    revenue: z.number().optional(),
    cogs: z.number().optional(),
    gross_margin: z.number().optional(),
    ebitda: z.number().optional(),
    net_income: z.number().optional(),
    cash_balance: z.number().optional(),
    burn_rate: z.number().optional(),
    runway_months: z.number().optional()
  }),
  growth_rates: z.object({
    revenue_yoy: z.number().optional(),
    revenue_mom: z.number().optional()
  }),
  anomalies: z.array(z.object({
    type: z.enum(['missing_period', 'unusual_spike', 'unusual_drop', 'negative_margin']),
    severity: z.enum(['high', 'medium', 'low']),
    description: z.string(),
    period: z.string().optional(),
    value: z.number().optional()
  })),
  time_series: z.array(z.object({
    period: z.string(),
    revenue: z.number().optional(),
    profit: z.number().optional(),
    cash: z.number().optional()
  }))
});

// Contract findings schema
const ContractFindingsSchema = z.object({
  contract_type: z.enum(['customer_agreement', 'vendor_contract', 'employment_agreement', 'nda', 'partnership', 'license', 'other']),
  parties: z.array(z.string()),
  effective_date: z.string().nullable(),
  expiration_date: z.string().nullable(),
  renewal_terms: z.string().nullable(),
  payment_terms: z.string().nullable(),
  termination_clauses: z.string().nullable(),
  high_risk_clauses: z.array(z.object({
    clause_type: z.string(),
    text: z.string(),
    page_number: z.number(),
    risk_level: z.enum(['high', 'medium', 'low']),
    explanation: z.string()
  })),
  missing_clauses: z.array(z.object({
    clause_type: z.string(),
    importance: z.enum(['critical', 'recommended']),
    recommendation: z.string()
  })),
  obligations: z.array(z.object({
    party: z.string(),
    obligation: z.string(),
    deadline: z.string().optional(),
    recurring: z.boolean().optional()
  })),
  unusual_terms: z.array(z.object({
    term_type: z.string(),
    description: z.string(),
    context: z.string()
  }))
});
```

---

**Data Model Status**: ✅ COMPLETE - Ready for migration generation
