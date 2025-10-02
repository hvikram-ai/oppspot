/**
 * Research History Page
 *
 * Shows user's research report history
 */

import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ProtectedLayout } from '@/components/layout/protected-layout'

async function getResearchHistory(userId: string) {
  const supabase = await createClient();

  const { data: reports, error } = await supabase
    .from('research_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Failed to fetch research history:', error);
    return [];
  }

  return reports;
}

export default async function ResearchPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const reports = await getResearchHistory(user.id);

  return (
    <ProtectedLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Research History</h1>
            <p className="text-muted-foreground">
              View and manage your company research reports
            </p>
          </div>

          {/* Reports List */}
          {reports.length === 0 ? (
            <Card className="p-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No research reports yet</h2>
              <p className="text-muted-foreground mb-4">
                Generate your first deep company research report
              </p>
              <Button asChild>
                <Link href="/companies">Browse Companies</Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-4" data-testid="research-history-list">
              {reports.map((report) => (
                <Card key={report.id} className="p-6" data-testid="history-item">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link
                          href={`/research/${report.id}`}
                          className="text-xl font-semibold hover:underline"
                        >
                          {report.company_name}
                        </Link>
                        <Badge
                          variant={
                            report.status === 'complete'
                              ? 'default'
                              : report.status === 'generating'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {report.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDistanceToNow(new Date(report.created_at), {
                            addSuffix: true,
                          })}
                        </div>

                        {report.sections_complete > 0 && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            {report.sections_complete}/6 sections
                          </div>
                        )}

                        {report.confidence_score && (
                          <div>
                            Confidence: {(report.confidence_score * 100).toFixed(0)}%
                          </div>
                        )}

                        {report.total_sources > 0 && (
                          <div>{report.total_sources} sources</div>
                        )}
                      </div>

                      {report.generated_at && report.cached_until && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Valid until{' '}
                          {formatDistanceToNow(new Date(report.cached_until), {
                            addSuffix: true,
                          })}
                        </p>
                      )}
                    </div>

                    <Button asChild variant="outline">
                      <Link href={`/research/${report.id}`}>View Report</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
