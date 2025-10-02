-- SmartSync™ - AI-Powered CRM Integration
-- Migration: CRM Integration Tables
-- Created: 2025-10-02

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CRM Integration Configurations
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  crm_type TEXT NOT NULL CHECK (crm_type IN ('hubspot', 'salesforce', 'pipedrive')),

  -- Authentication
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  instance_url TEXT, -- For Salesforce

  -- Configuration
  config JSONB NOT NULL DEFAULT '{}', -- CRM-specific settings
  field_mappings JSONB NOT NULL DEFAULT '{}', -- Custom field mappings

  -- Sync Settings
  sync_direction TEXT NOT NULL DEFAULT 'bidirectional' CHECK (sync_direction IN ('to_crm', 'from_crm', 'bidirectional')),
  sync_frequency TEXT NOT NULL DEFAULT 'realtime' CHECK (sync_frequency IN ('realtime', 'hourly', 'daily', 'manual')),

  -- AI Features
  auto_enrich BOOLEAN NOT NULL DEFAULT true,
  auto_score BOOLEAN NOT NULL DEFAULT true,
  auto_assign BOOLEAN NOT NULL DEFAULT true,
  auto_create_tasks BOOLEAN NOT NULL DEFAULT true,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  sync_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one active integration per CRM type per org
  UNIQUE(organization_id, crm_type)
);

-- =====================================================
-- Sync History & Audit Log
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES crm_integrations(id) ON DELETE CASCADE,

  -- Sync details
  sync_type TEXT NOT NULL CHECK (sync_type IN ('contact', 'company', 'deal', 'task', 'note')),
  direction TEXT NOT NULL CHECK (direction IN ('to_crm', 'from_crm')),
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete', 'skip')),

  -- Data
  oppspot_entity_id UUID, -- Company, contact, or deal ID in oppSpot
  oppspot_entity_type TEXT, -- 'business', 'contact', 'deal'
  crm_entity_id TEXT, -- Entity ID in external CRM
  payload JSONB, -- Data that was synced

  -- AI Enrichments Applied
  enrichments JSONB, -- What AI enrichments were added
  enrichment_time_ms INTEGER, -- How long enrichment took

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'skipped')),
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- =====================================================
-- Field Mapping Templates
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES crm_integrations(id) ON DELETE CASCADE,

  -- Entity type
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company', 'deal', 'task')),

  -- Mapping
  oppspot_field TEXT NOT NULL,
  crm_field TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'custom' CHECK (field_type IN ('standard', 'custom', 'computed')),

  -- Transformation
  transform_function TEXT, -- Optional: JS function to transform value
  default_value TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,

  -- Sync control
  sync_direction TEXT NOT NULL DEFAULT 'bidirectional' CHECK (sync_direction IN ('to_crm', 'from_crm', 'bidirectional')),
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique mappings per integration + entity type
  UNIQUE(integration_id, entity_type, oppspot_field)
);

-- =====================================================
-- Sync Queue (for async processing)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES crm_integrations(id) ON DELETE CASCADE,

  -- Job details
  job_type TEXT NOT NULL CHECK (job_type IN ('sync_contact', 'sync_company', 'sync_deal', 'enrich_and_sync', 'bulk_sync')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1-10 (10 = highest)
  payload JSONB NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  result JSONB, -- Result of the sync operation

  -- Timing
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CRM Entity Mappings (Track oppSpot <-> CRM IDs)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_entity_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES crm_integrations(id) ON DELETE CASCADE,

  -- oppSpot side
  oppspot_entity_id UUID NOT NULL,
  oppspot_entity_type TEXT NOT NULL CHECK (oppspot_entity_type IN ('business', 'contact', 'deal', 'task')),

  -- CRM side
  crm_entity_id TEXT NOT NULL,
  crm_entity_type TEXT NOT NULL, -- contact, company, deal, etc.

  -- Metadata
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_count INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique mappings
  UNIQUE(integration_id, oppspot_entity_id, oppspot_entity_type)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- crm_integrations
CREATE INDEX IF NOT EXISTS idx_crm_integrations_org ON crm_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_integrations_active ON crm_integrations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_crm_integrations_type ON crm_integrations(crm_type);

-- crm_sync_logs
CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_integration ON crm_sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_status ON crm_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_created ON crm_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_oppspot_entity ON crm_sync_logs(oppspot_entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_crm_entity ON crm_sync_logs(crm_entity_id);

-- crm_field_mappings
CREATE INDEX IF NOT EXISTS idx_crm_field_mappings_integration ON crm_field_mappings(integration_id);
CREATE INDEX IF NOT EXISTS idx_crm_field_mappings_entity_type ON crm_field_mappings(entity_type);
CREATE INDEX IF NOT EXISTS idx_crm_field_mappings_active ON crm_field_mappings(is_active) WHERE is_active = true;

-- crm_sync_queue
CREATE INDEX IF NOT EXISTS idx_crm_sync_queue_status ON crm_sync_queue(status) WHERE status IN ('queued', 'processing');
CREATE INDEX IF NOT EXISTS idx_crm_sync_queue_scheduled ON crm_sync_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_crm_sync_queue_priority ON crm_sync_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_crm_sync_queue_integration ON crm_sync_queue(integration_id);

-- crm_entity_mappings
CREATE INDEX IF NOT EXISTS idx_crm_entity_mappings_integration ON crm_entity_mappings(integration_id);
CREATE INDEX IF NOT EXISTS idx_crm_entity_mappings_oppspot ON crm_entity_mappings(oppspot_entity_id, oppspot_entity_type);
CREATE INDEX IF NOT EXISTS idx_crm_entity_mappings_crm ON crm_entity_mappings(crm_entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_entity_mappings_active ON crm_entity_mappings(is_active) WHERE is_active = true;

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE crm_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_entity_mappings ENABLE ROW LEVEL SECURITY;

-- crm_integrations policies
CREATE POLICY "Users can view their org's CRM integrations"
  ON crm_integrations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their org's CRM integrations"
  ON crm_integrations FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- crm_sync_logs policies
CREATE POLICY "Users can view their org's sync logs"
  ON crm_sync_logs FOR SELECT
  USING (
    integration_id IN (
      SELECT id FROM crm_integrations
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert sync logs"
  ON crm_sync_logs FOR INSERT
  WITH CHECK (true);

-- crm_field_mappings policies
CREATE POLICY "Users can view their org's field mappings"
  ON crm_field_mappings FOR SELECT
  USING (
    integration_id IN (
      SELECT id FROM crm_integrations
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their org's field mappings"
  ON crm_field_mappings FOR ALL
  USING (
    integration_id IN (
      SELECT id FROM crm_integrations
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- crm_sync_queue policies
CREATE POLICY "Users can view their org's sync queue"
  ON crm_sync_queue FOR SELECT
  USING (
    integration_id IN (
      SELECT id FROM crm_integrations
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage sync queue"
  ON crm_sync_queue FOR ALL
  WITH CHECK (true);

-- crm_entity_mappings policies
CREATE POLICY "Users can view their org's entity mappings"
  ON crm_entity_mappings FOR SELECT
  USING (
    integration_id IN (
      SELECT id FROM crm_integrations
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage entity mappings"
  ON crm_entity_mappings FOR ALL
  WITH CHECK (true);

-- =====================================================
-- Functions for automatic updates
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_crm_integrations_updated_at
  BEFORE UPDATE ON crm_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER update_crm_field_mappings_updated_at
  BEFORE UPDATE ON crm_field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER update_crm_sync_queue_updated_at
  BEFORE UPDATE ON crm_sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER update_crm_entity_mappings_updated_at
  BEFORE UPDATE ON crm_entity_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_updated_at();

-- =====================================================
-- Helper Functions
-- =====================================================

-- Get next queued sync job
CREATE OR REPLACE FUNCTION get_next_sync_job()
RETURNS TABLE (
  job_id UUID,
  integration_id UUID,
  job_type TEXT,
  payload JSONB
) AS $$
BEGIN
  RETURN QUERY
  UPDATE crm_sync_queue
  SET
    status = 'processing',
    started_at = NOW(),
    attempts = attempts + 1,
    updated_at = NOW()
  WHERE id = (
    SELECT id FROM crm_sync_queue
    WHERE status = 'queued'
      AND scheduled_for <= NOW()
      AND attempts < max_attempts
    ORDER BY priority DESC, scheduled_for ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING
    crm_sync_queue.id as job_id,
    crm_sync_queue.integration_id,
    crm_sync_queue.job_type,
    crm_sync_queue.payload;
END;
$$ LANGUAGE plpgsql;

-- Mark sync job as completed
CREATE OR REPLACE FUNCTION complete_sync_job(
  job_id UUID,
  job_status TEXT,
  job_result JSONB DEFAULT NULL,
  error_msg TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE crm_sync_queue
  SET
    status = job_status,
    completed_at = NOW(),
    processing_time_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
    result = COALESCE(job_result, result),
    error_message = error_msg,
    updated_at = NOW()
  WHERE id = job_id;
END;
$$ LANGUAGE plpgsql;

-- Increment sync count on integration
CREATE OR REPLACE FUNCTION increment_sync_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' THEN
    UPDATE crm_integrations
    SET
      sync_count = sync_count + 1,
      last_sync_at = NOW(),
      last_error = NULL,
      updated_at = NOW()
    WHERE id = NEW.integration_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE crm_integrations
    SET
      last_error = NEW.error_message,
      updated_at = NOW()
    WHERE id = NEW.integration_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_integration_sync_stats
  AFTER INSERT OR UPDATE ON crm_sync_logs
  FOR EACH ROW
  WHEN (NEW.status IN ('success', 'failed'))
  EXECUTE FUNCTION increment_sync_count();

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE crm_integrations IS 'Stores CRM integration configurations and credentials';
COMMENT ON TABLE crm_sync_logs IS 'Audit log of all sync operations';
COMMENT ON TABLE crm_field_mappings IS 'Custom field mapping configurations';
COMMENT ON TABLE crm_sync_queue IS 'Queue for async sync operations';
COMMENT ON TABLE crm_entity_mappings IS 'Maps oppSpot entities to CRM entities';

COMMENT ON COLUMN crm_integrations.auto_enrich IS 'Automatically enrich data with AI before syncing';
COMMENT ON COLUMN crm_integrations.auto_score IS 'Automatically score leads using AI';
COMMENT ON COLUMN crm_integrations.auto_assign IS 'Automatically assign leads to reps';
COMMENT ON COLUMN crm_sync_logs.enrichments IS 'JSON containing AI enrichments added during sync';
COMMENT ON COLUMN crm_sync_queue.priority IS '1-10, where 10 is highest priority';
