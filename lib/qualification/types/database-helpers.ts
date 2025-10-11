/**
 * Database Entity Type Helpers for Qualification Module
 *
 * These types represent the actual structure of data returned from
 * Supabase queries, preventing the need for 'as any' casts.
 */

// ============= Business/Company Data =============

export interface BusinessWithMetrics {
  id: string;
  name: string;
  industry?: string | null;
  region?: string | null;
  city?: string | null;
  annual_revenue?: number | null;
  revenue?: number | null; // Alias for annual_revenue
  employee_count?: number | null;
  growth_rate?: number | null;
  funding_status?: string | null;
  credit_score?: number | null;
  company_size?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

// ============= Stakeholder Data =============

export interface StakeholderWithEngagement {
  id: string;
  company_id: string;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  linkedin_url?: string | null;
  role_type?: 'economic_buyer' | 'champion' | 'influencer' | 'user' | null;
  influence_level?: number | null; // 1-10 scale
  engagement_score?: number | null; // 0-100 scale
  champion_status?: 'none' | 'potential' | 'active' | 'super' | null;
  budget_authority?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

// ============= Engagement Event Data =============

export interface EngagementEvent {
  id: string;
  lead_id: string;
  company_id?: string | null;
  event_type: 'initial_contact' | 'discovery_call' | 'demo_scheduled' |
              'demo_completed' | 'proposal_sent' | 'contract_sent' |
              'meeting' | 'email' | 'call' | 'content_download' | string;
  event_date: string;
  event_description?: string | null;
  engagement_score?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

// ============= Qualification Activity Data =============

export interface QualificationActivity {
  id?: string;
  lead_id: string;
  company_id: string;
  activity_type: 'bant_calculated' | 'meddic_calculated' | 'checklist_updated' |
                 'lead_routed' | 'stage_changed' | string;
  activity_description: string;
  activity_data?: Record<string, unknown> | null;
  score_impact?: number | null;
  framework_affected?: 'BANT' | 'MEDDIC' | 'CUSTOM' | null;
  created_by?: string | null;
  created_at?: string;
}

// ============= Lead Score Data =============

export interface LeadScoreWithBusiness {
  id: string;
  lead_id?: string;
  company_id: string;
  total_score?: number;
  qualification_stage?: 'unqualified' | 'nurture' | 'qualified' | 'disqualified';
  engagement_level?: 'low' | 'medium' | 'high';
  engagement_score?: number;
  technology_score?: number;
  metadata?: Record<string, unknown> | null;
  businesses?: BusinessWithMetrics;
  created_at?: string;
  updated_at?: string;
}

// ============= Assignment/Routing Data =============

export interface TeamMemberWithCapacity {
  id: string;
  user_id: string;
  name: string;
  email: string;
  current_load: number;
  max_capacity: number;
  skills?: string[] | null;
  territories?: string[] | null;
  availability_status: 'available' | 'busy' | 'unavailable';
  performance_score?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface LeadAssignmentRecord {
  id: string;
  lead_id: string;
  assigned_to?: string | null;
  assigned_by?: string | null;
  status: 'assigned' | 'accepted' | 'working' | 'completed' | 'reassigned' | 'expired';
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  response_time_minutes?: number | null;
  routing_metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

// ============= Type Guards =============

export function isBusinessWithMetrics(data: unknown): data is BusinessWithMetrics {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data
  );
}

export function isStakeholderWithEngagement(data: unknown): data is StakeholderWithEngagement {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'company_id' in data &&
    'name' in data
  );
}

export function isEngagementEvent(data: unknown): data is EngagementEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'lead_id' in data &&
    'event_type' in data &&
    'event_date' in data
  );
}

// ============= Utility Types =============

/**
 * Represents a Supabase select query result with related entities
 */
export type SelectResult<T> = {
  data: T | null;
  error: Error | null;
};

/**
 * Represents a Supabase select query result for multiple records
 */
export type SelectManyResult<T> = {
  data: T[] | null;
  error: Error | null;
};
