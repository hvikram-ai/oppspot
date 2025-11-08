'use client';

/**
 * ResearchGPT Launcher Component
 *
 * Quick access to ResearchGPT from dashboard
 * - Company autocomplete search
 * - Credits display (X/100 remaining)
 * - Generate report CTA
 * - Loading state with status polling
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Brain, Search, Sparkles, Zap } from 'lucide-react';
import useSWR from 'swr';
import { useDemoMode } from '@/lib/demo/demo-context';

interface ResearchQuota {
  researches_used: number;
  researches_limit: number;
  researches_remaining: number;
}

interface Company {
  id: string;
  name: string;
  company_number: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ResearchGPTLauncher() {
  const router = useRouter();
  const { isDemoMode } = useDemoMode();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch quota (with demo mode support)
  const quotaUrl = isDemoMode ? '/api/research/quota?demo=true' : '/api/research/quota';
  const { data: quota, error: quotaError } = useSWR<ResearchQuota>(
    quotaUrl,
    fetcher
  );

  // Search companies (debounced)
  // Only search if we don't have a selected company or if the query differs from selected company name
  const shouldSearch = searchQuery.length >= 2 && (!selectedCompany || searchQuery !== selectedCompany.name);
  const searchUrl = shouldSearch
    ? `/api/businesses/search?q=${encodeURIComponent(searchQuery)}&limit=5${isDemoMode ? '&demo=true' : ''}`
    : null;
  const { data: searchResults, error: searchError } = useSWR<Company[]>(
    searchUrl,
    fetcher
  );

  // Calculate credits before using them
  const creditsRemaining = quota?.researches_remaining ?? 0;
  const creditsLimit = quota?.researches_limit ?? 100;
  const creditsUsed = quota?.researches_used ?? 0;
  const isLowOnCredits = creditsRemaining < 10;
  const isOutOfCredits = creditsRemaining === 0;

  // Debug logging
  if (searchError) {
    console.error('[ResearchGPT] Search error:', searchError);
  }
  if (searchResults) {
    console.log('[ResearchGPT] Search results:', searchResults);
  }
  console.log('[ResearchGPT] State:', {
    searchQuery,
    selectedCompany,
    isGenerating,
    creditsRemaining,
    isOutOfCredits,
    buttonDisabled: !selectedCompany || isGenerating || isOutOfCredits
  });

  const handleGenerate = async () => {
    if (!selectedCompany) return;

    setIsGenerating(true);
    try {
      const response = await fetch(`/api/research/${selectedCompany.id}`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to report or show progress
        router.push(`/research/${data.report_id}`);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to generate research');
      }
    } catch (error) {
      console.error('Failed to generate research:', error);
      alert('Failed to generate research. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                ResearchGPT™
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI-Powered
                </Badge>
              </CardTitle>
              <CardDescription>
                Deep company intelligence in &lt;30 seconds
              </CardDescription>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-muted-foreground">Credits</div>
            <div className={`text-lg font-bold ${isLowOnCredits ? 'text-orange-600' : isOutOfCredits ? 'text-red-600' : 'text-indigo-600'}`}>
              {creditsRemaining}/{creditsLimit}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search company by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            disabled={isGenerating || isOutOfCredits}
          />
        </div>

        {/* Search Results */}
        {searchResults && searchResults.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {searchResults.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => {
                  setSelectedCompany(company);
                  setSearchQuery(company.name);
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
              >
                <div className="font-medium">{company.name}</div>
                {company.company_number && (
                  <div className="text-xs text-muted-foreground">
                    {company.company_number}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Selected Company */}
        {selectedCompany && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
            <div className="text-sm font-medium">{selectedCompany.name}</div>
            {selectedCompany.company_number && (
              <div className="text-xs text-muted-foreground">
                {selectedCompany.company_number}
              </div>
            )}
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!selectedCompany || isGenerating || isOutOfCredits}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Zap className="mr-2 h-4 w-4 animate-pulse" />
              Generating Research...
            </>
          ) : isOutOfCredits ? (
            'No Credits Remaining'
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Generate Research Report
            </>
          )}
        </Button>

        {isOutOfCredits && (
          <div className="text-sm text-center text-muted-foreground">
            <Button variant="link" size="sm" onClick={() => router.push('/billing')}>
              Upgrade to get more credits →
            </Button>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Sources</div>
            <div className="text-sm font-semibold">10+</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Sections</div>
            <div className="text-sm font-semibold">6</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Time</div>
            <div className="text-sm font-semibold">&lt;30s</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
