-- Data Room - AI-Powered Due Diligence Platform
-- Migration: 20251002000009
-- Created: 2025-10-02

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE deal_type AS ENUM (
    'acquisition',
    'investment',
    'partnership',
    'merger',
    'sale',
    'due_diligence',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE data_room_status AS ENUM (
    'active',
    'archived',
    'deleted'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'financial',
    'contract',
    'due_diligence',
    'legal',
    'hr',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE processing_status AS ENUM (
    'pending',
    'processing',
    'complete',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE permission_level AS ENUM (
    'owner',
    'editor',
    'viewer',
    'commenter'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE activity_action AS ENUM (
    'upload',
    'view',
    'download',
    'edit',
    'delete',
    'share',
    'revoke',
    'generate_report',
    'create_room',
    'archive_room',
    'delete_room'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE annotation_type AS ENUM (
    'highlight',
    'comment',
    'sticky_note'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE analysis_type AS ENUM (
    'classification',
    'financial',
    'contract',
    'risk'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- confidence_level already exists from previous migrations, skip creation

-- ============================================================================
-- TABLES
-- ============================================================================

-- Data Rooms
CREATE TABLE data_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE SET NULL,

  -- Basic information
  name TEXT NOT NULL,
  description TEXT,
  deal_type deal_type NOT NULL DEFAULT 'due_diligence',
  status data_room_status NOT NULL DEFAULT 'active',

  -- Storage metrics
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  document_count INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_room_id UUID NOT NULL REFERENCES data_rooms(id) ON DELETE CASCADE,

  -- File information
  filename TEXT NOT NULL,
  folder_path TEXT NOT NULL DEFAULT '/',
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,

  -- Upload tracking
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  upload_completed BOOLEAN NOT NULL DEFAULT FALSE,

  -- AI classification
  document_type document_type NOT NULL DEFAULT 'other',
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  processing_status processing_status NOT NULL DEFAULT 'pending',

  -- Extracted metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Error handling
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Document Analysis
CREATE TABLE document_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  analysis_type analysis_type NOT NULL,

  -- Analysis results
  findings JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Quality metrics
  confidence confidence_level NOT NULL DEFAULT 'medium',
  risks_identified INTEGER NOT NULL DEFAULT 0,

  -- Processing metadata
  processing_time_ms INTEGER,
  ai_model TEXT,
  ai_tokens_used INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Data Room Access
CREATE TABLE data_room_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_room_id UUID NOT NULL REFERENCES data_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Permission level
  permission_level permission_level NOT NULL DEFAULT 'viewer',

  -- Invitation tracking
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invite_token TEXT UNIQUE,
  invite_email TEXT NOT NULL,

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Status
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity Logs (Immutable)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_room_id UUID NOT NULL REFERENCES data_rooms(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Actor information
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_name TEXT NOT NULL,
  actor_email TEXT NOT NULL,

  -- Action details
  action activity_action NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,

  -- Technical details
  ip_address INET,
  user_agent TEXT,

  -- Timestamp (immutable, no updated_at)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document Annotations
CREATE TABLE document_annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Annotation type
  annotation_type annotation_type NOT NULL DEFAULT 'comment',

  -- Position
  page_number INTEGER,
  position JSONB,

  -- Content
  text TEXT NOT NULL,
  color TEXT DEFAULT '#FFEB3B',

  -- Resolution tracking
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Data Rooms
CREATE INDEX idx_data_rooms_user_id ON data_rooms(user_id);
CREATE INDEX idx_data_rooms_company_id ON data_rooms(company_id);
CREATE INDEX idx_data_rooms_status ON data_rooms(status);
CREATE INDEX idx_data_rooms_created_at ON data_rooms(created_at DESC);

-- Documents
CREATE INDEX idx_documents_data_room_id ON documents(data_room_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_processing_status ON documents(processing_status);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_folder_path ON documents(folder_path);

-- Document Analysis
CREATE INDEX idx_document_analysis_document_id ON document_analysis(document_id);
CREATE INDEX idx_document_analysis_type ON document_analysis(analysis_type);
CREATE INDEX idx_document_analysis_confidence ON document_analysis(confidence);

-- Data Room Access
CREATE INDEX idx_data_room_access_data_room_id ON data_room_access(data_room_id);
CREATE INDEX idx_data_room_access_user_id ON data_room_access(user_id);
CREATE INDEX idx_data_room_access_invite_token ON data_room_access(invite_token);
CREATE INDEX idx_data_room_access_expires_at ON data_room_access(expires_at);

-- Activity Logs
CREATE INDEX idx_activity_logs_data_room_id ON activity_logs(data_room_id);
CREATE INDEX idx_activity_logs_actor_id ON activity_logs(actor_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_document_id ON activity_logs(document_id) WHERE document_id IS NOT NULL;

-- Document Annotations
CREATE INDEX idx_document_annotations_document_id ON document_annotations(document_id);
CREATE INDEX idx_document_annotations_user_id ON document_annotations(user_id);
CREATE INDEX idx_document_annotations_page_number ON document_annotations(page_number) WHERE page_number IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE data_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_room_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_annotations ENABLE ROW LEVEL SECURITY;

-- Data Rooms Policies
CREATE POLICY "Users can view accessible data rooms"
  ON data_rooms FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM data_room_access
      WHERE data_room_access.data_room_id = data_rooms.id
      AND data_room_access.user_id = auth.uid()
      AND data_room_access.revoked_at IS NULL
      AND data_room_access.expires_at > NOW()
    )
  );

CREATE POLICY "Users can create own data rooms"
  ON data_rooms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update data rooms"
  ON data_rooms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete data rooms"
  ON data_rooms FOR DELETE
  USING (auth.uid() = user_id);

-- Documents Policies
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
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

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
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

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

-- Document Analysis Policies
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
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

-- Data Room Access Policies
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

CREATE POLICY "Owners can grant access"
  ON data_room_access FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM data_rooms
      WHERE data_rooms.id = data_room_access.data_room_id
      AND data_rooms.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can revoke access"
  ON data_room_access FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM data_rooms
      WHERE data_rooms.id = data_room_access.data_room_id
      AND data_rooms.user_id = auth.uid()
    )
  );

-- Activity Logs Policies (Read-only for users)
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
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (true);

-- Document Annotations Policies
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
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

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
          AND data_room_access.expires_at > NOW()
        )
      )
    )
  );

CREATE POLICY "Authors can update own annotations"
  ON document_annotations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Authors can delete own annotations"
  ON document_annotations FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update document count trigger
CREATE OR REPLACE FUNCTION increment_document_count()
RETURNS TRIGGER AS $$
BEGIN
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

-- Decrement document count on delete
CREATE OR REPLACE FUNCTION decrement_document_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE data_rooms
  SET
    document_count = document_count - 1,
    storage_used_bytes = storage_used_bytes - OLD.file_size_bytes,
    updated_at = NOW()
  WHERE id = OLD.data_room_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_document_count
  AFTER DELETE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION decrement_document_count();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_data_rooms_updated_at
  BEFORE UPDATE ON data_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_data_room_access_updated_at
  BEFORE UPDATE ON data_room_access
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_document_annotations_updated_at
  BEFORE UPDATE ON document_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE data_rooms IS 'Secure workspaces for organizing and analyzing documents for deals';
COMMENT ON TABLE documents IS 'Uploaded files with AI-extracted metadata';
COMMENT ON TABLE document_analysis IS 'AI-generated insights for documents';
COMMENT ON TABLE data_room_access IS 'Team collaboration permissions';
COMMENT ON TABLE activity_logs IS 'Immutable audit trail of all data room actions';
COMMENT ON TABLE document_annotations IS 'User-generated comments and highlights';
