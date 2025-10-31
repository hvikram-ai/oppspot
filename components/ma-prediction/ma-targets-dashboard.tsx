/**
 * M&A Targets Dashboard Component
 *
 * Client-side dashboard for browsing M&A predictions with:
 * - Grid/list view of prediction cards
 * - Interactive filters
 * - Sorting controls
 * - Pagination
 * - Bulk export
 *
 * Part of T047 implementation
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import PredictionCard from './prediction-card';
import ExportControls from './export-controls';
import { MAPrediction } from '@/lib/types/ma-prediction';
import {
  Target,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Grid3x3,
  List,
} from 'lucide-react';

/**
 * Props
 */
interface MATargetsDashboardProps {
  predictions: Array<MAPrediction & { company?: { id: string; name: string; company_number: string; sic_codes?: string[]; address?: object } }>;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  filters: {
    likelihood: string[];
    minScore: number;
    maxScore: number;
    sicCode?: string;
    sortBy: string;
  };
}

/**
 * M&A Targets Dashboard Component
 */
export function MATargetsDashboard({
  predictions,
  totalCount,
  currentPage,
  pageSize,
  filters: initialFilters
}: MATargetsDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Local filter state
  const [likelihood, setLikelihood] = useState<string[]>(initialFilters.likelihood);
  const [scoreRange, setScoreRange] = useState<[number, number]>([initialFilters.minScore, initialFilters.maxScore]);
  const [sortBy, setSortBy] = useState(initialFilters.sortBy);

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / pageSize);

  /**
   * Update URL with new filters
   */
  const updateFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('likelihood', likelihood.join(','));
    params.set('min_score', scoreRange[0].toString());
    params.set('max_score', scoreRange[1].toString());
    params.set('sort', sortBy);
    params.set('page', '1'); // Reset to page 1 on filter change
    router.push(`/ma-targets?${params.toString()}`);
  };

  /**
   * Handle page navigation
   */
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/ma-targets?${params.toString()}`);
  };

  /**
   * Toggle company selection
   */
  const toggleCompanySelection = (companyId: string) => {
    setSelectedCompanies(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  /**
   * Select all companies on current page
   */
  const selectAll = () => {
    const companyIds = predictions.map(p => p.company_id).filter(Boolean) as string[];
    setSelectedCompanies(companyIds);
  };

  /**
   * Clear all selections
   */
  const clearSelection = () => {
    setSelectedCompanies([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Target className="h-6 w-6" />
                M&A Target Analysis
              </CardTitle>
              <CardDescription className="mt-2">
                {totalCount} {totalCount === 1 ? 'company' : 'companies'} with high acquisition likelihood
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters & Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Sort by:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Prediction Score</SelectItem>
                    <SelectItem value="name">Company Name</SelectItem>
                    <SelectItem value="valuation">Valuation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedCompanies.length > 0 && (
                <Badge variant="secondary">
                  {selectedCompanies.length} selected
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="space-y-4">
            {/* Likelihood Filter */}
            <div>
              <Label className="mb-2 block">Likelihood Categories</Label>
              <div className="flex flex-wrap gap-4">
                {['Low', 'Medium', 'High', 'Very High'].map((cat) => (
                  <div key={cat} className="flex items-center space-x-2">
                    <Checkbox
                      id={`likelihood-${cat}`}
                      checked={likelihood.includes(cat)}
                      onCheckedChange={(checked) => {
                        setLikelihood(prev =>
                          checked
                            ? [...prev, cat]
                            : prev.filter(l => l !== cat)
                        );
                      }}
                    />
                    <label htmlFor={`likelihood-${cat}`} className="text-sm">
                      {cat}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Range Filter */}
            <div>
              <Label className="mb-2 block">
                Score Range: {scoreRange[0]} - {scoreRange[1]}
              </Label>
              <Slider
                value={scoreRange}
                onValueChange={(value) => setScoreRange(value as [number, number])}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Apply Filters Button */}
            <Button onClick={updateFilters} className="w-full">
              Apply Filters
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Bulk Actions */}
      {selectedCompanies.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button onClick={selectAll} variant="outline" size="sm">
                  Select All ({predictions.length})
                </Button>
                <Button onClick={clearSelection} variant="outline" size="sm">
                  Clear Selection
                </Button>
              </div>
              <ExportControls companyIds={selectedCompanies} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Grid/List */}
      {predictions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No predictions found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters to see more results
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {predictions.map((prediction) => (
            <div key={prediction.id} className="relative">
              <div className="absolute top-4 right-4 z-10">
                <Checkbox
                  checked={selectedCompanies.includes(prediction.company_id)}
                  onCheckedChange={() => toggleCompanySelection(prediction.company_id)}
                />
              </div>
              <PredictionCard
                prediction={prediction}
                compact={viewMode === 'list'}
                onViewDetails={() => {
                  if (prediction.company?.id) {
                    router.push(`/business/${prediction.company.id}`);
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({totalCount} total)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-3">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
