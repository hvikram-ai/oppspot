-- Red Flag Radar Schema Migration
-- Creates tables for red_flag_runs, red_flags, red_flag_evidence, red_flag_actions
-- Date: 2025-10-29

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create red_flag_runs table
CREATE TABLE public.red_flag_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('company', 'data_room')),
  entity_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  detector_version text,
  stats jsonb,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'error')),

  CONSTRAINT finished_after_started CHECK (finished_at IS NULL OR finished_at >= started_at)
);

-- Create red_flags table
CREATE TABLE public.red_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('company', 'data_room')),
  entity_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('financial', 'legal', 'operational', 'cyber', 'esg')),
  title text NOT NULL CHECK (length(title) <= 255),
  description text,
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'mitigating', 'resolved', 'false_positive')),
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  run_id uuid REFERENCES public.red_flag_runs(id) ON DELETE SET NULL,
  fingerprint text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  owner_id uuid,
  snoozed_until timestamptz,

  CONSTRAINT updated_after_detected CHECK (last_updated_at >= first_detected_at),
  CONSTRAINT unique_fingerprint_per_entity UNIQUE (entity_type, entity_id, fingerprint)
);

-- Create red_flag_evidence table
CREATE TABLE public.red_flag_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id uuid NOT NULL REFERENCES public.red_flags(id) ON DELETE CASCADE,
  evidence_type text NOT NULL CHECK (evidence_type IN ('document', 'alert', 'signal', 'kpi', 'news')),
  source_id uuid,
  title text,
  preview text CHECK (length(preview) <= 200),
  citation jsonb,
  importance numeric CHECK (importance >= 0 AND importance <= 1),
  score numeric,
  url text,
  page_number integer,
  chunk_index integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create red_flag_actions table (immutable audit log)
CREATE TABLE public.red_flag_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id uuid NOT NULL REFERENCES public.red_flags(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('assign', 'note', 'status_change', 'snooze', 'remediation', 'override')),
  actor_id uuid,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent updates/deletes on red_flag_actions (immutable)
CREATE RULE prevent_red_flag_actions_update AS ON UPDATE TO public.red_flag_actions DO INSTEAD NOTHING;
CREATE RULE prevent_red_flag_actions_delete AS ON DELETE TO public.red_flag_actions DO INSTEAD NOTHING;

-- Create indexes

-- red_flag_runs indexes
CREATE INDEX idx_red_flag_runs_entity ON public.red_flag_runs(entity_type, entity_id, started_at DESC);
CREATE INDEX idx_red_flag_runs_status ON public.red_flag_runs(status, started_at DESC);

-- red_flags indexes
CREATE INDEX idx_red_flags_entity ON public.red_flags(entity_type, entity_id, category, severity, status);
CREATE INDEX idx_red_flags_fingerprint ON public.red_flags(fingerprint);
CREATE INDEX idx_red_flags_status_updated ON public.red_flags(status, last_updated_at DESC);
CREATE INDEX idx_red_flags_severity ON public.red_flags(severity) WHERE status != 'resolved' AND status != 'false_positive';
CREATE INDEX idx_red_flags_owner ON public.red_flags(owner_id) WHERE owner_id IS NOT NULL;

-- red_flag_evidence indexes
CREATE INDEX idx_red_flag_evidence_flag ON public.red_flag_evidence(flag_id, evidence_type, importance DESC NULLS LAST);
CREATE INDEX idx_red_flag_evidence_source ON public.red_flag_evidence(evidence_type, source_id);

-- red_flag_actions indexes
CREATE INDEX idx_red_flag_actions_flag ON public.red_flag_actions(flag_id, created_at DESC);
CREATE INDEX idx_red_flag_actions_actor ON public.red_flag_actions(actor_id, created_at DESC);
