'use client';

/**
 * Hypothesis List Component
 * Grid/list view of hypotheses with filters
 */

import React, { useState, useEffect } from 'react';
import { HypothesisCard } from './hypothesis-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useHypothesisStore, useHypothesisFilters } from '@/lib/stores/hypothesis-store';
import { HypothesisListItem, HypothesisStatus, HypothesisType } from '@/lib/data-room/types';
import { Plus, Search, Filter, Grid3x3, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HypothesisListProps {
  dataRoomId: string;
  onCreateNew?: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAnalyze?: (id: string) => void;
}

export function HypothesisList({
  dataRoomId,
  onCreateNew,
  onEdit,
  onDelete,
  onAnalyze,
}: HypothesisListProps) {
  const [hypotheses, setHypotheses] = useState<HypothesisListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filters = useHypothesisFilters();
  const { setHypothesisFilters, clearHypothesisFilters } = useHypothesisStore();

  // Fetch hypotheses
  useEffect(() => {
    fetchHypotheses();
  }, [dataRoomId, filters]);

  const fetchHypotheses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        data_room_id: dataRoomId,
        ...(filters.status && { status: filters.status }),
        ...(filters.hypothesis_type && { type: filters.hypothesis_type }),
        ...(filters.confidence_min !== undefined && {
          confidence_min: filters.confidence_min.toString(),
        }),
        ...(filters.confidence_max !== undefined && {
          confidence_max: filters.confidence_max.toString(),
        }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/data-room/hypotheses?${params}`);
      const data = await response.json();

      if (data.success) {
        setHypotheses(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch hypotheses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (search: string) => {
    setHypothesisFilters({ ...filters, search });
  };

  const handleStatusFilter = (status: string) => {
    if (status === 'all') {
      const { status: _, ...rest } = filters;
      setHypothesisFilters(rest);
    } else {
      setHypothesisFilters({ ...filters, status: status as HypothesisStatus });
    }
  };

  const handleTypeFilter = (type: string) => {
    if (type === 'all') {
      const { hypothesis_type: _, ...rest } = filters;
      setHypothesisFilters(rest);
    } else {
      setHypothesisFilters({ ...filters, hypothesis_type: type as HypothesisType });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hypotheses</h2>
          <p className="text-sm text-muted-foreground">
            Track and validate investment hypotheses
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Hypothesis
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hypotheses..."
            value={filters.search || ''}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filters.status || 'all'} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="validated">Validated</SelectItem>
            <SelectItem value="invalidated">Invalidated</SelectItem>
            <SelectItem value="needs_revision">Needs Revision</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.hypothesis_type || 'all'} onValueChange={handleTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="revenue_growth">Revenue Growth</SelectItem>
            <SelectItem value="cost_synergy">Cost Synergy</SelectItem>
            <SelectItem value="market_expansion">Market Expansion</SelectItem>
            <SelectItem value="tech_advantage">Tech Advantage</SelectItem>
            <SelectItem value="team_quality">Team Quality</SelectItem>
            <SelectItem value="competitive_position">Competitive Position</SelectItem>
            <SelectItem value="operational_efficiency">Operational Efficiency</SelectItem>
            <SelectItem value="customer_acquisition">Customer Acquisition</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>

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

        {Object.keys(filters).length > 0 && (
          <Button variant="ghost" onClick={() => clearHypothesisFilters()}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div
          className={cn(
            'grid gap-6',
            viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
          )}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : hypotheses.length === 0 ? (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hypotheses found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {Object.keys(filters).length > 0
              ? 'Try adjusting your filters'
              : 'Create your first hypothesis to get started'}
          </p>
          {Object.keys(filters).length === 0 && onCreateNew && (
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Hypothesis
            </Button>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'grid gap-6',
            viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
          )}
        >
          {hypotheses.map((hypothesis) => (
            <HypothesisCard
              key={hypothesis.id}
              hypothesis={hypothesis}
              dataRoomId={dataRoomId}
              onEdit={onEdit}
              onDelete={onDelete}
              onAnalyze={onAnalyze}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Loading skeleton for the list
export function HypothesisListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[200px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}
