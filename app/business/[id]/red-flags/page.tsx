import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { RedFlagRadarPage } from '@/components/red-flags/red-flag-radar-page';

interface RedFlagsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params: paramsPromise }: RedFlagsPageProps) {
  const params = await paramsPromise;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', params.id)
    .single();

  if (!business) {
    return {
      title: 'Red Flag Radar - OppSpot',
      description: 'AI-powered risk detection for due diligence',
    };
  }

  return {
    title: `Red Flag Radar - ${business.name} - OppSpot`,
    description: `View and manage risk flags for ${business.name} using AI-powered detection`,
  };
}

export default async function RedFlagsPage({ params: paramsPromise }: RedFlagsPageProps) {
  const params = await paramsPromise;
  const supabase = await createClient();

  // Fetch business details
  const { data: business, error } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('id', params.id)
    .single();

  if (error || !business) {
    notFound();
  }

  return (
    <ProtectedLayout>
      <div className="container max-w-7xl mx-auto px-4 py-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Search', href: '/search' },
            { label: business.name, href: `/business/${business.id}` },
            { label: 'Red Flag Radar' },
          ]}
        />

        <RedFlagRadarPage companyId={business.id} companyName={business.name} />
      </div>
    </ProtectedLayout>
  );
}
