'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { StakeholderDashboard } from '@/components/stakeholders/stakeholder-dashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function StakeholdersContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const companyId = searchParams.get('company_id');
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-2/3 mb-8"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  if (!user) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please sign in to access stakeholder tracking features.
            </AlertDescription>
          </Alert>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Stakeholder Tracking</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Manage relationships, identify champions, mitigate detractors, and track influence across your organization
          </p>
        </div>

        {/* Info Banner for New Feature */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>New Feature:</strong> Stakeholder Tracking helps you systematically manage key relationships.
            Track champions who advocate for you, identify and convert detractors, measure influence scores,
            and monitor engagement patterns to optimize your stakeholder strategy.
          </AlertDescription>
        </Alert>

        {/* Dashboard */}
        <StakeholderDashboard companyId={companyId || undefined} />
      </div>
    </ProtectedLayout>
  );
}

export default function StakeholdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-2/3 mb-8"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </ProtectedLayout>
    }>
      <StakeholdersContent />
    </Suspense>
  );
}