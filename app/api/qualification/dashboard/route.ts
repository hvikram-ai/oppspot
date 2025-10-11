import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { QualificationDashboardData } from '@/lib/qualification/types/qualification';

// Type definitions for qualification tables
interface BantQualification {
  budget_score: number | null;
  authority_score: number | null;
  need_score: number | null;
  timeline_score: number | null;
  overall_score: number | null;
  next_review_date?: string;
  lead_id?: string;
  id?: string;
  lead?: {
    company?: {
      name?: string;
    };
  };
}

interface MeddicQualification {
  overall_score: number | null;
  qualification_confidence: number | null;
  forecast_category: string | null;
}

interface LeadAssignment {
  response_time_minutes: number | null;
  status: string | null;
}

interface QualificationChecklist {
  status: string | null;
  completion_percentage: number | null;
  total_items: number | null;
  completed_items: number | null;
}

interface LeadRecyclingHistory {
  outcome: string | null;
}

interface ThresholdAlert {
  id: string;
  status: string;
  triggered_at: string;
  alert_type?: string;
  message?: string;
  severity?: string;
  metadata?: Record<string, unknown>;
}

interface QualificationActivity {
  id: string;
  created_at: string;
  activity_type?: string;
  activity_description?: string;
  score_impact?: number | null;
  lead?: {
    id?: string;
    company?: {
      name?: string;
    };
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('org_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // Build query filters
    let query = supabase.from('lead_scores').select('*', { count: 'exact' });

    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Get total leads
    const { count: totalLeads } = await query;

    // Get qualified leads
    const { count: qualifiedLeads } = await supabase
      .from('lead_scores')
      .select('*', { count: 'exact' })
      .in('qualification_status', ['qualified', 'sales_qualified']);

    // Get BANT scores
    const { data: bantScoresData, error: bantError } = await supabase
      .from('bant_qualifications')
      .select('budget_score, authority_score, need_score, timeline_score, overall_score');

    if (bantError) {
      console.error('Error fetching BANT scores:', bantError);
    }

    const bantScores = (bantScoresData || []) as BantQualification[]

    const bantAverages = {
      average_overall: 0,
      average_budget: 0,
      average_authority: 0,
      average_need: 0,
      average_timeline: 0
    };

    if (bantScores?.length) {
      bantAverages.average_overall = bantScores.reduce((acc, s) => acc + (s.overall_score || 0), 0) / bantScores.length;
      bantAverages.average_budget = bantScores.reduce((acc, s) => acc + (s.budget_score || 0), 0) / bantScores.length;
      bantAverages.average_authority = bantScores.reduce((acc, s) => acc + (s.authority_score || 0), 0) / bantScores.length;
      bantAverages.average_need = bantScores.reduce((acc, s) => acc + (s.need_score || 0), 0) / bantScores.length;
      bantAverages.average_timeline = bantScores.reduce((acc, s) => acc + (s.timeline_score || 0), 0) / bantScores.length;
    }

    // Get MEDDIC scores
    const { data: meddicScoresData, error: meddicError } = await supabase
      .from('meddic_qualifications')
      .select('overall_score, qualification_confidence, forecast_category');

    if (meddicError) {
      console.error('Error fetching MEDDIC scores:', meddicError);
    }

    const meddicScores = (meddicScoresData || []) as MeddicQualification[]

    const meddicData = {
      average_overall: 0,
      forecast_distribution: {
        commit: 0,
        best_case: 0,
        pipeline: 0,
        omitted: 0
      }
    };

    if (meddicScores?.length) {
      meddicData.average_overall = meddicScores.reduce((acc, s) => acc + (s.overall_score || 0), 0) / meddicScores.length;

      for (const score of meddicScores) {
        if (score.forecast_category) {
          meddicData.forecast_distribution[score.forecast_category as keyof typeof meddicData.forecast_distribution]++;
        }
      }
    }

    // Get routing metrics
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('lead_assignments')
      .select('response_time_minutes, status');

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
    }

    const assignments = (assignmentsData || []) as LeadAssignment[]

    const routingMetrics = {
      total_assignments: assignments?.length || 0,
      avg_response_time: 0,
      sla_compliance: 0,
      reassignment_rate: 0
    };

    if (assignments?.length) {
      const responseTimes = assignments
        .filter((a): a is LeadAssignment & { response_time_minutes: number } =>
          a.response_time_minutes !== null
        )
        .map(a => a.response_time_minutes);

      if (responseTimes.length) {
        routingMetrics.avg_response_time = responseTimes.reduce((acc, t) => acc + t, 0) / responseTimes.length;
      }

      const onTime = assignments.filter(a => a.response_time_minutes && a.response_time_minutes <= 60).length;
      routingMetrics.sla_compliance = (onTime / assignments.length) * 100;

      const reassigned = assignments.filter(a => a.status === 'reassigned').length;
      routingMetrics.reassignment_rate = (reassigned / assignments.length) * 100;
    }

    // Get checklist metrics
    const { data: checklistsData, error: checklistsError } = await supabase
      .from('qualification_checklists')
      .select('status, completion_percentage, total_items, completed_items');

    if (checklistsError) {
      console.error('Error fetching checklists:', checklistsError);
    }

    const checklists = (checklistsData || []) as QualificationChecklist[]

    const checklistMetrics = {
      completion_rate: 0,
      avg_items_completed: 0,
      abandoned_rate: 0
    };

    if (checklists?.length) {
      const completed = checklists.filter(c => c.status === 'completed').length;
      checklistMetrics.completion_rate = (completed / checklists.length) * 100;

      const avgCompleted = checklists.reduce((acc, c) => acc + (c.completed_items || 0), 0) / checklists.length;
      checklistMetrics.avg_items_completed = avgCompleted;

      const abandoned = checklists.filter(c => c.status === 'abandoned').length;
      checklistMetrics.abandoned_rate = (abandoned / checklists.length) * 100;
    }

    // Get recycling metrics
    const { data: recyclingHistoryData, error: recyclingError } = await supabase
      .from('lead_recycling_history')
      .select('outcome');

    if (recyclingError) {
      console.error('Error fetching recycling history:', recyclingError);
    }

    const recyclingHistory = (recyclingHistoryData || []) as LeadRecyclingHistory[]

    const recyclingMetrics = {
      total_recycled: recyclingHistory?.length || 0,
      re_qualification_rate: 0,
      nurture_conversion_rate: 0
    };

    if (recyclingHistory?.length) {
      const reQualified = recyclingHistory.filter(r => r.outcome === 're_qualified').length;
      recyclingMetrics.re_qualification_rate = (reQualified / recyclingHistory.length) * 100;

      const converted = recyclingHistory.filter(r => r.outcome === 'converted').length;
      recyclingMetrics.nurture_conversion_rate = (converted / recyclingHistory.length) * 100;
    }

    // Get recent activities
    const { data: recentActivities, error: activitiesError } = await supabase
      .from('qualification_activities')
      .select(`
        *,
        lead:lead_scores(
          id,
          company:businesses(name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (activitiesError) {
      console.error('Error fetching recent activities:', activitiesError);
    }

    // Get upcoming reviews
    const { data: upcomingReviews, error: reviewsError } = await supabase
      .from('bant_qualifications')
      .select(`
        id,
        lead_id,
        next_review_date,
        lead:lead_scores(
          company:businesses(name)
        )
      `)
      .gte('next_review_date', new Date().toISOString())
      .order('next_review_date', { ascending: true })
      .limit(10);

    if (reviewsError) {
      console.error('Error fetching upcoming reviews:', reviewsError);
    }

    // Get active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('threshold_alerts')
      .select('*')
      .eq('status', 'triggered')
      .order('triggered_at', { ascending: false })
      .limit(10);

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
    }

    const dashboardData: QualificationDashboardData = {
      total_leads: totalLeads || 0,
      qualified_leads: qualifiedLeads || 0,
      qualification_rate: totalLeads ? ((qualifiedLeads || 0) / totalLeads) * 100 : 0,
      bant_scores: bantAverages,
      meddic_scores: meddicData,
      routing_metrics: routingMetrics,
      checklist_metrics: checklistMetrics,
      recycling_metrics: recyclingMetrics,
      recent_activities: recentActivities || [],
      upcoming_reviews: upcomingReviews || [],
      alerts: alerts || []
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error in qualification dashboard API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}