-- Technical Foundation Tables for ML, Events, and Data Integration
-- This migration adds tables to support the ML infrastructure, event-driven architecture, and unified data layer

-- ML Predictions table
CREATE TABLE IF NOT EXISTS ml_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id VARCHAR(100) NOT NULL,
  input_data JSONB NOT NULL,
  output_data JSONB NOT NULL,
  confidence FLOAT,
  latency_ms INTEGER,
  user_id UUID REFERENCES auth.users(id),
  org_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_ml_predictions_model (model_id),
  INDEX idx_ml_predictions_user (user_id),
  INDEX idx_ml_predictions_created (created_at DESC)
);

-- Model Performance Metrics table
CREATE TABLE IF NOT EXISTS ml_model_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id VARCHAR(100) NOT NULL,
  metric_date DATE NOT NULL,
  total_predictions INTEGER DEFAULT 0,
  avg_latency_ms FLOAT,
  avg_confidence FLOAT,
  error_count INTEGER DEFAULT 0,
  error_rate FLOAT,
  accuracy FLOAT,
  precision_score FLOAT,
  recall_score FLOAT,
  f1_score FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(model_id, metric_date),
  INDEX idx_model_metrics_date (metric_date DESC)
);

-- Event Log table
CREATE TABLE IF NOT EXISTS event_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id VARCHAR(100) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  source VARCHAR(100) NOT NULL,
  data JSONB,
  metadata JSONB,
  user_id UUID REFERENCES auth.users(id),
  org_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_event_log_type (event_type),
  INDEX idx_event_log_source (source),
  INDEX idx_event_log_user (user_id),
  INDEX idx_event_log_created (created_at DESC)
);

-- Event Processing Results table
CREATE TABLE IF NOT EXISTS event_processing_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id VARCHAR(100) NOT NULL,
  handler_id VARCHAR(100) NOT NULL,
  success BOOLEAN NOT NULL,
  duration_ms INTEGER,
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_processing_event (event_id),
  INDEX idx_processing_handler (handler_id),
  INDEX idx_processing_status (success)
);

-- Data Pipeline Executions table
CREATE TABLE IF NOT EXISTS data_pipeline_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id VARCHAR(100) NOT NULL,
  pipeline_name VARCHAR(255),
  status VARCHAR(50) NOT NULL, -- running, completed, failed
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  records_processed INTEGER,
  error_message TEXT,
  execution_metadata JSONB,

  INDEX idx_pipeline_executions_pipeline (pipeline_id),
  INDEX idx_pipeline_executions_status (status),
  INDEX idx_pipeline_executions_started (started_at DESC)
);

-- Data Source Status table
CREATE TABLE IF NOT EXISTS data_source_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id VARCHAR(100) UNIQUE NOT NULL,
  source_name VARCHAR(255),
  source_type VARCHAR(50), -- database, api, webhook, file, stream
  status VARCHAR(50) NOT NULL, -- active, inactive, error
  last_sync TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  config JSONB,
  metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_source_status_type (source_type),
  INDEX idx_source_status_status (status)
);

-- Workflow Executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id VARCHAR(100) NOT NULL,
  workflow_name VARCHAR(255),
  trigger_event_id VARCHAR(100),
  status VARCHAR(50) NOT NULL, -- pending, running, completed, failed
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER,
  context JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  INDEX idx_workflow_executions_workflow (workflow_id),
  INDEX idx_workflow_executions_status (status),
  INDEX idx_workflow_executions_started (started_at DESC)
);

-- Real-time Subscriptions table
CREATE TABLE IF NOT EXISTS realtime_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  channel VARCHAR(100) NOT NULL,
  event_types TEXT[],
  filters JSONB,
  active BOOLEAN DEFAULT TRUE,
  last_ping TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_subscriptions_user (user_id),
  INDEX idx_subscriptions_channel (channel),
  INDEX idx_subscriptions_active (active)
);

-- Add RLS policies
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_processing_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_pipeline_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_source_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for ml_predictions
CREATE POLICY "Users can view their own ML predictions" ON ml_predictions
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.org_id = ml_predictions.org_id
  ));

CREATE POLICY "System can insert ML predictions" ON ml_predictions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policies for event_log
CREATE POLICY "Users can view their own events" ON event_log
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.org_id = event_log.org_id
  ));

CREATE POLICY "System can insert events" ON event_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policies for realtime_subscriptions
CREATE POLICY "Users can manage their own subscriptions" ON realtime_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Function to clean up old event logs
CREATE OR REPLACE FUNCTION cleanup_old_event_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM event_log WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM event_processing_results WHERE processed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to update model metrics
CREATE OR REPLACE FUNCTION update_model_metrics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ml_model_metrics (
    model_id,
    metric_date,
    total_predictions,
    avg_latency_ms,
    avg_confidence
  )
  SELECT
    NEW.model_id,
    DATE(NEW.created_at),
    1,
    NEW.latency_ms,
    NEW.confidence
  ON CONFLICT (model_id, metric_date) DO UPDATE SET
    total_predictions = ml_model_metrics.total_predictions + 1,
    avg_latency_ms = (ml_model_metrics.avg_latency_ms * ml_model_metrics.total_predictions + NEW.latency_ms) / (ml_model_metrics.total_predictions + 1),
    avg_confidence = (ml_model_metrics.avg_confidence * ml_model_metrics.total_predictions + COALESCE(NEW.confidence, 0)) / (ml_model_metrics.total_predictions + 1),
    updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update model metrics on new predictions
CREATE TRIGGER update_metrics_on_prediction
  AFTER INSERT ON ml_predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_model_metrics();

-- Function to emit events
CREATE OR REPLACE FUNCTION emit_event(
  p_event_type VARCHAR(100),
  p_source VARCHAR(100),
  p_data JSONB DEFAULT '{}'::JSONB,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_event_id VARCHAR(100);
  v_id UUID;
BEGIN
  v_event_id := 'evt_' || extract(epoch from now())::text || '_' || gen_random_uuid()::text;

  INSERT INTO event_log (event_id, event_type, source, data, metadata, user_id)
  VALUES (v_event_id, p_event_type, p_source, p_data, p_metadata, auth.uid())
  RETURNING id INTO v_id;

  -- Trigger real-time notification
  PERFORM pg_notify('system_events', json_build_object(
    'event_id', v_event_id,
    'event_type', p_event_type,
    'source', p_source,
    'data', p_data
  )::text);

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to start workflow execution
CREATE OR REPLACE FUNCTION start_workflow(
  p_workflow_id VARCHAR(100),
  p_workflow_name VARCHAR(255),
  p_trigger_event_id VARCHAR(100) DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO workflow_executions (
    workflow_id,
    workflow_name,
    trigger_event_id,
    status,
    context
  )
  VALUES (
    p_workflow_id,
    p_workflow_name,
    p_trigger_event_id,
    'running',
    p_context
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX idx_ml_predictions_model_date ON ml_predictions(model_id, DATE(created_at));
CREATE INDEX idx_event_log_type_date ON event_log(event_type, created_at DESC);
CREATE INDEX idx_pipeline_executions_recent ON data_pipeline_executions(started_at DESC) WHERE status = 'running';
CREATE INDEX idx_workflow_executions_active ON workflow_executions(workflow_id, started_at DESC) WHERE status IN ('pending', 'running');