-- Red Flag Radar RLS Policies
-- Enables Row-Level Security and creates access policies
-- Date: 2025-10-29

-- Enable RLS on all tables
ALTER TABLE public.red_flag_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.red_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.red_flag_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.red_flag_actions ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user has access to entity
CREATE OR REPLACE FUNCTION public.user_has_entity_access(
  p_entity_type text,
  p_entity_id uuid,
  p_user_id uuid
) RETURNS boolean AS $$
BEGIN
  IF p_entity_type = 'company' THEN
    -- Check org membership via companies table
    RETURN EXISTS (
      SELECT 1 FROM public.companies c
      JOIN public.organizations_members om ON om.organization_id = c.organization_id
      WHERE c.id = p_entity_id AND om.user_id = p_user_id
    );
  ELSIF p_entity_type = 'data_room' THEN
    -- Check data room access
    RETURN EXISTS (
      SELECT 1 FROM public.data_room_access dra
      WHERE dra.data_room_id = p_entity_id AND dra.user_id = p_user_id
    );
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if user has role (if not already exists)
-- Note: Modify this function based on your actual role implementation
CREATE OR REPLACE FUNCTION public.user_has_role(
  p_user_id uuid,
  p_role text
) RETURNS boolean AS $$
BEGIN
  -- Check if user has the specified role
  -- This assumes roles are stored in profiles table with a role column
  -- Adjust based on your actual schema
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role = p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for red_flag_runs
CREATE POLICY "Users can view runs for accessible entities"
  ON public.red_flag_runs FOR SELECT
  USING (public.user_has_entity_access(entity_type, entity_id, auth.uid()));

CREATE POLICY "Editors can create runs for accessible entities"
  ON public.red_flag_runs FOR INSERT
  WITH CHECK (
    public.user_has_entity_access(entity_type, entity_id, auth.uid())
    AND public.user_has_role(auth.uid(), 'editor')
  );

-- RLS Policies for red_flags
CREATE POLICY "Users can view flags for accessible entities"
  ON public.red_flags FOR SELECT
  USING (public.user_has_entity_access(entity_type, entity_id, auth.uid()));

CREATE POLICY "Editors can update flags for accessible entities"
  ON public.red_flags FOR UPDATE
  USING (public.user_has_entity_access(entity_type, entity_id, auth.uid()))
  WITH CHECK (
    public.user_has_entity_access(entity_type, entity_id, auth.uid())
    AND public.user_has_role(auth.uid(), 'editor')
  );

-- RLS Policies for red_flag_evidence (inherit from parent flag)
CREATE POLICY "Users can view evidence for accessible flags"
  ON public.red_flag_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.red_flags rf
      WHERE rf.id = red_flag_evidence.flag_id
      AND public.user_has_entity_access(rf.entity_type, rf.entity_id, auth.uid())
    )
  );

-- RLS Policies for red_flag_actions (inherit from parent flag)
CREATE POLICY "Users can view actions for accessible flags"
  ON public.red_flag_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.red_flags rf
      WHERE rf.id = red_flag_actions.flag_id
      AND public.user_has_entity_access(rf.entity_type, rf.entity_id, auth.uid())
    )
  );

CREATE POLICY "Users can create actions for accessible flags"
  ON public.red_flag_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.red_flags rf
      WHERE rf.id = red_flag_actions.flag_id
      AND public.user_has_entity_access(rf.entity_type, rf.entity_id, auth.uid())
    )
    AND actor_id = auth.uid()
  );
