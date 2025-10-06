# Advanced Search Filters

Comprehensive filter system with 11 filter categories, inspired by SourceScrub's advanced filtering capabilities.

## Components Created

### Main Component
- **`AdvancedSearchFilters`** - Main filter panel component with:
  - Filter search functionality
  - Saved searches dropdown
  - Active filter count badge
  - Clear all filters button
  - Result count display
  - Save search functionality

### Filter Sections (11 Categories)

1. **Keywords Filter** (`keywords-filter.tsx`)
   - Include keywords (multi-entry with badges)
   - Exclude keywords (multi-entry with badges)

2. **Similar Targets Filter** (`similar-targets-filter.tsx`)
   - Company search with autocomplete
   - Similarity threshold slider

3. **Firmographics Filter** (`firmographics-filter.tsx`)
   - Location (multi-select)
   - Ownership type (7 options: Private, Public, VC Backed, etc.)
   - Industry (multi-select)
   - Founded year range

4. **Size Filter** (`size-filter.tsx`)
   - Employee count (min/max)
   - Employee ranges (7 predefined ranges)
   - Revenue (min/max with currency selector)
   - Valuation (min/max)
   - "Include unreported" options

5. **Growth Filter** (`growth-filter.tsx`)
   - Employee growth rates (3mo, 6mo, 12mo)
   - Job openings count
   - Web traffic rank change
   - Tooltips for field explanations

6. **Market Presence Filter** (`market-presence-filter.tsx`)
   - Webpage views
   - Web traffic rank
   - Sources count
   - Conference count
   - Tooltips for field explanations

7. **Funding Filter** (`funding-filter.tsx`)
   - Total funding raised
   - Latest funding amount
   - Currency selector (GBP/USD/EUR)
   - Funding rounds (10 types: Pre-Seed to Debt)
   - Investment date range
   - Include unfunded option

8. **Workflow Filter** (`workflow-filter.tsx`)
   - Lists filter
   - Tags filter
   - Tagged within timeframe
   - Custom score range
   - Last contacted date range
   - Priority (High/Medium/Low)

9. **CRM Filter** (`crm-filter.tsx`)
   - CRM sync status (Synced/Not synced/Pending/Failed)

10. **Options Filter** (`options-filter.tsx`)
    - PROFILE+ only toggle
    - Active companies only toggle (default: ON)
    - Companies with contact info only toggle

11. **Filter Section** (`filter-section.tsx`)
    - Reusable collapsible section wrapper
    - Active filter count badge
    - Expand/collapse functionality

## Usage Example

```tsx
'use client'

import { useState } from 'react'
import { AdvancedSearchFilters } from '@/components/search/advanced-search-filters'
import type { AdvancedFilters } from '@/types/filters'

export default function SearchPage() {
  const [filters, setFilters] = useState<AdvancedFilters>({})
  const [resultCount, setResultCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const handleApplyFilters = async () => {
    setIsLoading(true)
    try {
      // Execute search with filters
      const response = await fetch('/api/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters,
          pagination: { page: 1, perPage: 20 },
          sorting: { field: 'relevance', direction: 'desc' },
        }),
      })
      const data = await response.json()
      setResultCount(data.total)
      // Handle results...
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex gap-4">
      {/* Sidebar with filters */}
      <aside className="w-80 h-screen sticky top-0">
        <AdvancedSearchFilters
          filters={filters}
          onChange={setFilters}
          onApply={handleApplyFilters}
          resultCount={resultCount}
          isLoading={isLoading}
        />
      </aside>

      {/* Main content area */}
      <main className="flex-1">
        {/* Search results here */}
      </main>
    </div>
  )
}
```

## API Integration

The filters integrate with the existing `AdvancedFilterService`:

```typescript
import { advancedFilterService } from '@/lib/search/advanced-filter-service'
import type { FilteredSearchRequest } from '@/types/filters'

// In your API route (app/api/search/advanced/route.ts)
export async function POST(request: Request) {
  const body: FilteredSearchRequest = await request.json()

  // Validate filters
  const validation = advancedFilterService.validateFilters(body.filters)
  if (!validation.valid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  // Execute search
  const results = await advancedFilterService.executeSearch(body)
  return NextResponse.json(results)
}
```

## Features

### Real-time Filter Count
- Active filter count badge in header
- Per-section active filter counts
- Auto-calculation from filter state

### Saved Searches
- Save current filter configuration with custom name
- Load saved searches from dropdown
- Persist across sessions (requires backend integration)

### Filter Search
- Search across filter categories
- Live filtering of visible sections
- Helps users find specific filters quickly

### Validation
- Range validation (min <= max)
- Date validation (from <= to)
- Comprehensive error messages
- Built into `AdvancedFilterService`

### Responsive Design
- Scrollable filter panel
- Fixed header and footer
- Collapsible sections
- Optimized for sidebar layout

## Type Safety

All filters use the comprehensive type system defined in `/types/filters.ts`:
- `AdvancedFilters` - Main filter interface
- `KeywordsFilter`, `FirmographicsFilter`, etc. - Category-specific types
- `FilterValidationResult` - Validation response
- `FilteredSearchRequest` - API request format
- `FilteredSearchResponse` - API response format

## Database Integration

The filters map to database columns defined in the `AdvancedFilterService`:
- Full-text search using PostgreSQL `tsvector`
- Array containment for multi-select filters
- Range queries for numeric fields
- JSON queries for nested data
- Vector similarity for "Similar Targets"

## Implemented Features

✅ **Company Autocomplete** - Full company search with autocomplete in Similar Targets filter
  - Real-time search as you type (300ms debounce)
  - Multi-select with badge display (max 5 companies)
  - Shows company name, number, location, and status
  - Uses Companies House API with caching
  - See `COMPANY_AUTOCOMPLETE_README.md` for details

✅ **Location Autocomplete** - Full location search with autocomplete in Firmographics filter
  - Real-time search for UK & Ireland locations (300ms debounce)
  - Multi-select with badge display (max 10 locations)
  - Color-coded type badges (city, region, country, postcode)
  - Google Places API with 30+ mock location fallback
  - See `LOCATION_AUTOCOMPLETE_README.md` for details

✅ **List & Tag Selectors** - Full integration with existing lists and tags in Workflow filter
  - List selector with business counts and color indicators
  - Tag selector with usage counts and 6-color coding
  - Multi-select with badge display and search
  - Real-time loading from user's saved data
  - See `LIST_TAG_SELECTORS_README.md` for details

✅ **Saved Searches Backend** - Complete system for saving and reusing filter configurations
  - Database table with JSONB filters and RLS
  - Full CRUD API endpoints
  - Execution tracking with metrics
  - Save dialog with name and description
  - Load/delete functionality with favorites
  - See `SAVED_SEARCHES_README.md` for details

## Next Steps

1. ~~**Implement Company Autocomplete**~~ ✅ **COMPLETED** - Add company search in Similar Targets filter
2. ~~**Implement Location Autocomplete**~~ ✅ **COMPLETED** - Add location search in Firmographics filter
3. ~~**Add List Selector**~~ ✅ **COMPLETED** - Integrate with existing lists in Workflow filter
4. ~~**Add Tag Selector**~~ ✅ **COMPLETED** - Integrate with existing tags in Workflow filter
5. ~~**Saved Searches Backend**~~ ✅ **COMPLETED** - Implement API endpoints for saving/loading searches
6. **Advanced Financials** - Add Advanced Financials filter category (from screenshot)
7. **Export Filters** - Add ability to export filter configuration
8. **Filter Presets** - Create common filter presets for quick access

## Styling Notes

- Uses shadcn/ui components throughout
- Follows existing oppSpot design system
- Tailwind CSS for styling
- Lucide React icons
- Responsive and accessible

## Performance

- Debounced filter updates (recommended)
- Lazy loading of dropdown options
- Virtualized lists for large datasets
- Optimized re-renders with React.memo

## Testing

Create E2E tests for:
- Filter application
- Saved searches
- Clear all functionality
- Validation errors
- Result count updates
