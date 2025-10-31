'use client';

/**
 * Red Flag Filters Component
 *
 * Provides filtering controls for red flag list:
 * - Category filter (multi-select)
 * - Severity filter (multi-select)
 * - Status filter (multi-select)
 * - Search input
 * - Sort dropdown
 * - Clear filters button
 *
 * Integrates with Zustand store for state management.
 */

import { useState, useCallback } from 'react';
import { useRedFlagsStore, useActiveFilterCount } from '@/lib/stores/red-flags-store';
import { FlagCategory, FlagSeverity, FlagStatus } from '@/lib/red-flags/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  FileText,
  Scale,
  Zap,
  Shield,
  Leaf,
} from 'lucide-react';

/**
 * Category options with icons and labels
 */
const CATEGORY_OPTIONS: Array<{ value: FlagCategory; label: string; icon: typeof FileText }> = [
  { value: 'financial', label: 'Financial', icon: FileText },
  { value: 'legal', label: 'Legal', icon: Scale },
  { value: 'operational', label: 'Operational', icon: Zap },
  { value: 'cyber', label: 'Cyber Security', icon: Shield },
  { value: 'esg', label: 'ESG', icon: Leaf },
];

/**
 * Severity options with labels
 */
const SEVERITY_OPTIONS: Array<{ value: FlagSeverity; label: string; color: string }> = [
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'low', label: 'Low', color: 'text-blue-600' },
];

/**
 * Status options with labels
 */
const STATUS_OPTIONS: Array<{ value: FlagStatus; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'mitigating', label: 'Mitigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'false_positive', label: 'False Positive' },
];

/**
 * Sort options
 */
const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'severity', label: 'Severity (High to Low)' },
  { value: '-severity', label: 'Severity (Low to High)' },
  { value: 'first_detected_at', label: 'Date Detected (Oldest)' },
  { value: '-first_detected_at', label: 'Date Detected (Newest)' },
  { value: 'confidence', label: 'Confidence (High to Low)' },
  { value: '-confidence', label: 'Confidence (Low to High)' },
];

/**
 * Red Flag Filters Component
 */
export function RedFlagFilters() {
  const {
    filters,
    setSearch,
    addCategoryFilter,
    removeCategoryFilter,
    addSeverityFilter,
    removeSeverityFilter,
    addStatusFilter,
    removeStatusFilter,
    updateFilters,
    clearFilters,
  } = useRedFlagsStore();

  const activeFilterCount = useActiveFilterCount();

  // Local state for search input (debounced)
  const [searchValue, setSearchValue] = useState(filters.search || '');

  /**
   * Handle search input change (debounced)
   */
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      // Debounce the actual search
      const timeoutId = setTimeout(() => {
        setSearch(value);
      }, 300);
      return () => clearTimeout(timeoutId);
    },
    [setSearch]
  );

  /**
   * Handle category toggle
   */
  const handleCategoryToggle = (category: FlagCategory, checked: boolean) => {
    if (checked) {
      addCategoryFilter(category);
    } else {
      removeCategoryFilter(category);
    }
  };

  /**
   * Handle severity toggle
   */
  const handleSeverityToggle = (severity: FlagSeverity, checked: boolean) => {
    if (checked) {
      addSeverityFilter(severity);
    } else {
      removeSeverityFilter(severity);
    }
  };

  /**
   * Handle status toggle
   */
  const handleStatusToggle = (status: FlagStatus, checked: boolean) => {
    if (checked) {
      addStatusFilter(status);
    } else {
      removeStatusFilter(status);
    }
  };

  /**
   * Handle sort change
   */
  const handleSortChange = (value: string) => {
    updateFilters({ sort: value });
  };

  /**
   * Handle clear filters
   */
  const handleClearFilters = () => {
    setSearchValue('');
    clearFilters();
  };

  return (
    <div className="space-y-4">
      {/* Search and Sort Row */}
      <div className="flex gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search flags..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Sort
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={filters.sort || 'severity'} onValueChange={handleSortChange}>
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filters Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Filters</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <div className="space-y-2">
                  {CATEGORY_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isChecked = filters.category?.includes(option.value) || false;
                    return (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${option.value}`}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleCategoryToggle(option.value, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={`category-${option.value}`}
                          className="text-sm flex items-center cursor-pointer"
                        >
                          <Icon className="h-3 w-3 mr-1.5 text-gray-500" />
                          {option.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Severity Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Severity</Label>
                <div className="space-y-2">
                  {SEVERITY_OPTIONS.map((option) => {
                    const isChecked = filters.severity?.includes(option.value) || false;
                    return (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`severity-${option.value}`}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleSeverityToggle(option.value, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={`severity-${option.value}`}
                          className={`text-sm cursor-pointer ${option.color}`}
                        >
                          {option.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map((option) => {
                    const isChecked = filters.status?.includes(option.value) || false;
                    return (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${option.value}`}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleStatusToggle(option.value, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={`status-${option.value}`}
                          className="text-sm cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filter Pills */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.category?.map((category) => {
            const option = CATEGORY_OPTIONS.find((o) => o.value === category);
            const Icon = option?.icon || FileText;
            return (
              <Badge key={category} variant="secondary" className="pl-2 pr-1">
                <Icon className="h-3 w-3 mr-1" />
                {option?.label}
                <button
                  onClick={() => removeCategoryFilter(category)}
                  className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {filters.severity?.map((severity) => {
            const option = SEVERITY_OPTIONS.find((o) => o.value === severity);
            return (
              <Badge key={severity} variant="secondary" className="pl-2 pr-1">
                {option?.label}
                <button
                  onClick={() => removeSeverityFilter(severity)}
                  className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {filters.status?.map((status) => {
            const option = STATUS_OPTIONS.find((o) => o.value === status);
            return (
              <Badge key={status} variant="secondary" className="pl-2 pr-1">
                {option?.label}
                <button
                  onClick={() => removeStatusFilter(status)}
                  className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
