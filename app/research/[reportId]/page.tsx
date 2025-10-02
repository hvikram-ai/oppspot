/**
 * Research Report Detail Page
 *
 * Displays individual research report
 */

import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { ResearchReport } from '@/components/research/research-report';
import { ResearchProgress } from '@/components/research/research-progress';
import { Skeleton } from '@/components/ui/skeleton';

async function getReport(reportId: string, userId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/research/${reportId}`,
    {
      headers: {
        'Cookie': ``,
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export default async function ReportPage({
  params,
}: {
  params: { reportId: string };
}) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Get report from database directly (server-side)
  const { data: report, error: reportError } = await supabase
    .from('research_reports')
    .select('*')
    .eq('id', params.reportId)
    .eq('user_id', user.id)
    .single();

  if (reportError || !report) {
    notFound();
  }

  // If still generating, show progress
  if (report.status === 'generating' || report.status === 'pending') {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">{report.company_name}</h1>
          <ResearchProgress reportId={report.id} />
        </div>
      </div>
    );
  }

  // Get complete report data with sections
  const { data: sections } = await supabase
    .from('research_sections')
    .select('*')
    .eq('report_id', report.id);

  const { data: sources } = await supabase
    .from('research_sources')
    .select('*')
    .eq('report_id', report.id)
    .order('reliability_score', { ascending: false });

  // Format sections by type
  const sectionsByType: Record<string, any> = {};
  if (sections) {
    for (const section of sections) {
      sectionsByType[section.section_type] = section.content;
    }
  }

  const reportData = {
    id: report.id,
    company_name: report.company_name,
    status: report.status,
    confidence_score: report.confidence_score || 0.7,
    generated_at: report.generated_at || report.created_at,
    cached_until: report.cached_until || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    sections: sectionsByType,
    sources: sources || [],
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <ResearchReport report={reportData} />
      </div>
    </div>
  );
}
