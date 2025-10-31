/**
 * M&A Targets Dashboard Page
 *
 * Displays all High/Very High M&A predictions with:
 * - Grid/list view of prediction cards
 * - Filters: likelihood categories, score range, industry (SIC code)
 * - Sorting: by score (default), by company name, by valuation
 * - Pagination: 50 companies per page
 * - Bulk export functionality
 *
 * Part of T047 implementation
 */

import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { MATargetsDashboard } from '@/components/ma-prediction/ma-targets-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Page metadata
 */
export const metadata = {
  title: 'M&A Target Analysis - OppSpot',
  description: 'AI-powered M&A target prediction dashboard showing companies with high acquisition likelihood',
};

/**
 * Search params type
 */
interface SearchParams {
  page?: string;
  likelihood?: string;
  min_score?: string;
  max_score?: string;
  sic_code?: string;
  sort?: string;
}

/**
 * Page props
 */
interface MATargetsPageProps {
  searchParams: Promise<SearchParams>;
}

/**
 * Loading fallback
 */
function DashboardLoading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * M&A Targets Dashboard Page (Server Component)
 */
export default async function MATargetsPage({ searchParams }: MATargetsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Get user authentication
  const { data: { user } } = await supabase.auth.getUser();

  // Parse query parameters
  const page = parseInt(params.page || '1', 10);
  const likelihood = params.likelihood?.split(',') || ['High', 'Very High'];
  const minScore = parseInt(params.min_score || '51', 10);
  const maxScore = parseInt(params.max_score || '100', 10);
  const sicCode = params.sic_code;
  const sortBy = params.sort || 'score';

  // Calculate pagination
  const limit = 50;
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from('ma_predictions')
    .select(`
      *,
      company:businesses!ma_predictions_company_id_fkey (
        id,
        name,
        company_number,
        sic_codes,
        address
      )
    `, { count: 'exact' })
    .eq('is_active', true)
    .gte('prediction_score', minScore)
    .lte('prediction_score', maxScore)
    .in('likelihood_category', likelihood);

  // Filter by SIC code if provided
  if (sicCode) {
    query = query.filter('company.sic_codes', 'cs', `{${sicCode}}`);
  }

  // Apply sorting
  switch (sortBy) {
    case 'name':
      query = query.order('company.name', { ascending: true });
      break;
    case 'valuation':
      // Join with valuation estimates and sort
      query = query.order('prediction_score', { ascending: false });
      break;
    case 'score':
    default:
      query = query.order('prediction_score', { ascending: false });
      break;
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  // Execute query
  const { data: predictions, error, count } = await query;

  // Handle errors
  if (error) {
    console.error('Error fetching M&A predictions:', error);
  }

  return (
    <ProtectedLayout>
      <div className="container max-w-7xl mx-auto px-4 py-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'M&A Target Analysis' }
          ]}
        />
      </div>

      <div className="container max-w-7xl mx-auto px-4 pb-12">
        <Suspense fallback={<DashboardLoading />}>
          <MATargetsDashboard
            predictions={predictions || []}
            totalCount={count || 0}
            currentPage={page}
            pageSize={limit}
            filters={{
              likelihood,
              minScore,
              maxScore,
              sicCode: sicCode || undefined,
              sortBy
            }}
          />
        </Suspense>
      </div>
    </ProtectedLayout>
  );
}
