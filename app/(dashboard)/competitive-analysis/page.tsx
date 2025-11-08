'use client';

import { AnalysisList, StaleDataAlert } from '@/components/competitive-analysis';
import { useRouter } from 'next/navigation';

/**
 * Competitive Analysis List Page
 * Main landing page showing all user's analyses
 */
export default function CompetitiveAnalysisPage() {
  const router = useRouter();

  const handleCreateNew = () => {
    router.push('/competitive-analysis/new');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Stale Data Alert */}
      <StaleDataAlert />

      {/* Analysis List */}
      <AnalysisList onCreateNew={handleCreateNew} />
    </div>
  );
}
