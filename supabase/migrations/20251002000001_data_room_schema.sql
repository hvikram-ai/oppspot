-- Data Room Schema Migration
-- Feature: AI-Powered Due Diligence Platform
-- Created: 2025-10-02
-- Tables: data_rooms, documents, document_analysis, data_room_access, activity_logs, document_annotations

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Deal types for data rooms
CREATE TYPE deal_type AS ENUM (
  'acquisition',      -- Buying a company
  'investment',       -- PE/VC investment
  'partnership',      -- Strategic partnership
  'merger',           -- Merger of equals
  'sale',             -- Selling company
  'due_diligence',    -- General DD
  'other'
);

-- Data room status
CREATE TYPE data_room_status AS ENUM (
  'active',           -- Currently in use
  'archived',         -- Deal complete, read-only
  'deleted'           -- Soft deleted
);

-- Document classification types
CREATE TYPE document_type AS ENUM (
  'financial',        -- P&L, balance sheet, cash flow
  'contract',         -- Customer, vendor, employment agreements
  'due_diligence',    -- Pitch decks, memos, presentations
  'legal',            -- Articles of incorporation, legal opinions
  'hr',               -- Org charts, employee lists
  'other'             -- Uncategorized
);

-- Document processing status
CREATE TYPE processing_status AS ENUM (
  'pending',          -- Uploaded, not yet processed
  'processing',       -- AI analysis in progress
  'complete',         -- Successfully analyzed
  'failed'            -- Processing error
);

-- Permission levels for collaboration
CREATE TYPE permission_level AS ENUM (
  'owner',            -- Full access, delete data room, manage permissions
  'editor',           -- Upload, annotate, generate reports
  'viewer',           -- Read-only, download with watermark
  'commenter'         -- Add comments/questions, no download
);

-- Activity action types
CREATE TYPE activity_action AS ENUM (
  'upload',           -- Document uploaded
  'view',             -- Document viewed
  'download',         -- Document downloaded
  'edit',             -- Document or annotation edited
  'delete',           -- Document deleted
  'share',            -- Access granted to user
  'revoke',           -- Access revoked
  'generate_report',  -- AI report generated
  'create_room',      -- Data room created
  'archive_room',     -- Data room archived
  'delete_room'       -- Data room deleted
);

-- Annotation types
CREATE TYPE annotation_type AS ENUM (
  'highlight',        -- Text highlight
  'comment',          -- Text comment with position
  'sticky_note'       -- Floating note
);

-- Analysis types
CREATE TYPE analysis_type AS ENUM (
  'classification',   -- Document type classification
  'financial',        -- Financial statement analysis
  'contract',         -- Contract intelligence
  'risk'              -- Risk assessment
);

-- Confidence levels
CREATE TYPE confidence_level AS ENUM ('high', 'medium', 'low');

-- ============================================================================
-- TABLE: data_rooms
-- ============================================================================

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

  -- Metadata (JSONB for flexibility)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_data_rooms_user_id ON data_rooms(user_id);
CREATE INDEX idx_data_rooms_company_id ON data_rooms(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_data_rooms_status ON data_rooms(status);
CREATE INDEX idx_data_rooms_created_at ON data_rooms(created_at DESC);

-- RLS Policies
ALTER TABLE data_rooms ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- TABLE: documents
-- ============================================================================

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
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  processing_status processing_status NOT NULL DEFAULT 'pending',

  -- Extracted metadata (JSONB)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Error handling
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_documents_data_room_id ON documents(data_room_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_processing_status ON documents(processing_status);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_folder_path ON documents(folder_path);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);

-- RLS Policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Editors can update documents"
  ON documents FOR UPDATE
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

-- ============================================================================
-- TABLE: document_analysis
-- ============================================================================

CREATE TABLE document_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  analysis_type analysis_type NOT NULL,

  -- Analysis results (JSONB for flexible schema)
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

-- Indexes
CREATE INDEX idx_document_analysis_document_id ON document_analysis(document_id);
CREATE INDEX idx_document_analysis_type ON document_analysis(analysis_type);
CREATE INDEX idx_document_analysis_confidence ON document_analysis(confidence);

-- RLS Policies
ALTER TABLE document_analysis ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "System can insert document analysis"
  ON document_analysis FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- TABLE: data_room_access
-- ============================================================================

CREATE TABLE data_room_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_room_id UUID NOT NULL REFERENCES data_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Permission level
  permission_level permission_level NOT NULL,

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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique active access per user per data room
  UNIQUE(data_room_id, user_id, revoked_at)
);

-- Indexes
CREATE INDEX idx_data_room_access_data_room_id ON data_room_access(data_room_id);
CREATE INDEX idx_data_room_access_user_id ON data_room_access(user_id);
CREATE INDEX idx_data_room_access_invite_token ON data_room_access(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX idx_data_room_access_expires_at ON data_room_access(expires_at);

-- RLS Policies
ALTER TABLE data_room_access ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- TABLE: activity_logs
-- ============================================================================

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

-- Indexes
CREATE INDEX idx_activity_logs_data_room_id ON activity_logs(data_room_id);
CREATE INDEX idx_activity_logs_actor_id ON activity_logs(actor_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_document_id ON activity_logs(document_id) WHERE document_id IS NOT NULL;

-- RLS Policies (immutable, append-only)
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- TABLE: document_annotations
-- ============================================================================

CREATE TABLE document_annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Annotation type
  annotation_type annotation_type NOT NULL,

  -- Position (for PDF documents)
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

-- Indexes
CREATE INDEX idx_document_annotations_document_id ON document_annotations(document_id);
CREATE INDEX idx_document_annotations_user_id ON document_annotations(user_id);
CREATE INDEX idx_document_annotations_page_number ON document_annotations(page_number) WHERE page_number IS NOT NULL;

-- RLS Policies
ALTER TABLE document_annotations ENABLE ROW LEVEL SECURITY;

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

-- Function to create a data room with defaults and activity log
CREATE OR REPLACE FUNCTION create_data_room_with_defaults(
  p_user_id UUID,
  p_name TEXT,
  p_company_id UUID DEFAULT NULL,
  p_deal_type TEXT DEFAULT 'due_diligence'
)
RETURNS UUID AS $$
DECLARE
  v_room_id UUID;
  v_actor_name TEXT;
  v_actor_email TEXT;
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

  -- Get actor info
  SELECT name, email INTO v_actor_name, v_actor_email
  FROM profiles
  WHERE id = p_user_id;

  -- Log activity
  INSERT INTO activity_logs (
    data_room_id,
    actor_id,
    actor_name,
    actor_email,
    action,
    details
  ) VALUES (
    v_room_id,
    p_user_id,
    COALESCE(v_actor_name, 'Unknown User'),
    COALESCE(v_actor_email, 'unknown@example.com'),
    'create_room',
    jsonb_build_object('name', p_name, 'deal_type', p_deal_type)
  );

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment document count and storage
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

-- Function to log activity
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
    details
  ) VALUES (
    p_data_room_id,
    p_document_id,
    v_actor_id,
    COALESCE(v_actor_name, 'Unknown User'),
    COALESCE(v_actor_email, 'unknown@example.com'),
    p_action::activity_action,
    p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check data room access
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
      ELSE FALSE
    END
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_data_rooms_updated_at
  BEFORE UPDATE ON data_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_room_access_updated_at
  BEFORE UPDATE ON data_room_access
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_annotations_updated_at
  BEFORE UPDATE ON document_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE data_rooms IS 'Secure workspaces for organizing and analyzing deal documents';
COMMENT ON TABLE documents IS 'Uploaded files with AI classification and metadata';
COMMENT ON TABLE document_analysis IS 'AI-generated insights for documents';
COMMENT ON TABLE data_room_access IS 'Permission grants for team collaboration';
COMMENT ON TABLE activity_logs IS 'Immutable audit trail for compliance';
COMMENT ON TABLE document_annotations IS 'User-generated comments and highlights';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables created
DO $$
DECLARE
  v_table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('data_rooms', 'documents', 'document_analysis', 'data_room_access', 'activity_logs', 'document_annotations');

  IF v_table_count = 6 THEN
    RAISE NOTICE 'Data Room schema migration completed successfully: 6/6 tables created';
  ELSE
    RAISE EXCEPTION 'Schema migration incomplete: only % tables created', v_table_count;
  END IF;
END $$;
