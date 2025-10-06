# Company Autocomplete Component

A reusable autocomplete component for searching and selecting companies using the Companies House API.

## Features

- **Real-time Search** - Searches as you type (300ms debounce)
- **Multi-Selection** - Select multiple companies with badge display
- **Max Selections** - Optional limit on number of selections
- **Cache Support** - Uses cached data when available
- **Rich Display** - Shows company name, number, location, and status
- **Keyboard Accessible** - Full keyboard navigation support
- **Click Outside to Close** - Dropdown closes when clicking outside
- **Loading States** - Shows spinner during search
- **Error Handling** - Graceful error messages

## Usage

### Basic Usage

```tsx
import { CompanyAutocomplete } from '@/components/search/company-autocomplete'
import { useState } from 'react'

function MyComponent() {
  const [companies, setCompanies] = useState([])

  return (
    <CompanyAutocomplete
      selectedCompanies={companies}
      onCompaniesChange={setCompanies}
      placeholder="Search for companies..."
    />
  )
}
```

### With Max Selections

```tsx
<CompanyAutocomplete
  selectedCompanies={companies}
  onCompaniesChange={setCompanies}
  placeholder="Select up to 5 companies..."
  maxSelections={5}
/>
```

### Integration Example (Similar Targets Filter)

```tsx
// In similar-targets-filter.tsx
const [selectedCompanies, setSelectedCompanies] = useState<Company[]>([])

const handleCompaniesChange = (companies: Company[]) => {
  setSelectedCompanies(companies)

  // Extract IDs for the filter
  const companyIds = companies.map(c => c.id)
  onChange({
    ...filters,
    similarTargets: {
      ...filters.similarTargets,
      similarToCompanyIds: companyIds,
    },
  })
}

<CompanyAutocomplete
  selectedCompanies={selectedCompanies}
  onCompaniesChange={handleCompaniesChange}
  placeholder="Type to search companies..."
  maxSelections={5}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedCompanies` | `Company[]` | Required | Array of currently selected companies |
| `onCompaniesChange` | `(companies: Company[]) => void` | Required | Callback when selection changes |
| `placeholder` | `string` | `'Type to search companies...'` | Input placeholder text |
| `maxSelections` | `number \| undefined` | `undefined` | Maximum number of companies that can be selected |
| `className` | `string \| undefined` | `undefined` | Additional CSS classes |

## Company Interface

```typescript
interface Company {
  id: string
  company_number?: string
  name: string
  company_status?: string
  registered_office_address?: {
    locality?: string
    postal_code?: string
  }
}
```

## API Integration

The component uses the existing `/api/companies/search` endpoint:

**Request:**
```json
{
  "query": "google",
  "limit": 10,
  "useCache": true
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "company-03977902",
      "company_number": "03977902",
      "name": "GOOGLE UK LIMITED",
      "company_status": "active",
      "registered_office_address": {
        "locality": "London",
        "postal_code": "WC2H 8AG"
      }
    }
  ],
  "sources": {
    "cache": 1,
    "api": 0
  }
}
```

## Features in Detail

### Debounced Search
- 300ms delay after typing stops
- Minimum 2 characters required
- Automatic API call on query change

### Selected Companies Display
- Badge-style display with company name
- Building icon for visual clarity
- Remove button on each badge
- Truncated names for long company names

### Results Dropdown
- Scrollable list (max 300px height)
- Rich company information display
- Company number, location, and status
- Active status highlighted in green
- Hover effects for better UX

### Error Handling
- Network errors shown to user
- API warnings displayed
- Graceful fallback to cached results
- Loading states during search

## Styling

Uses shadcn/ui components:
- `Input` - Search input field
- `Badge` - Selected company tags
- `ScrollArea` - Scrollable results
- Tailwind CSS for styling

## Performance

- Debounced search (300ms)
- Maximum 10 results per search
- Filters out already-selected companies
- Click outside handled via refs (no polling)

## Accessibility

- Keyboard navigation (Tab, Enter)
- Focus management
- Screen reader friendly
- Clear visual feedback
- Disabled state when max reached

## Future Enhancements

1. **Keyboard Navigation** - Arrow keys to navigate results
2. **Clear All Button** - Quick way to clear all selections
3. **Recent Searches** - Show recently selected companies
4. **Favorites** - Star/save frequently used companies
5. **Advanced Filters** - Filter by status, location, etc.
6. **Bulk Import** - Paste multiple company numbers
7. **Export Selection** - Export selected companies as CSV

## Related Components

- `AdvancedSearchFilters` - Main filter panel
- `SimilarTargetsFilterSection` - Uses CompanyAutocomplete
- `FirmographicsFilterSection` - Could use similar pattern for location

## Testing

To test the component:

1. Navigate to `/search/advanced`
2. Open "Similar Targets" filter section
3. Type a company name (e.g., "Google")
4. Select from results
5. Verify badge appears
6. Remove using X button
7. Test max selections limit

## Demo Mode

The API supports demo mode with mock data:

```typescript
const response = await fetch('/api/companies/search', {
  method: 'POST',
  body: JSON.stringify({
    query: 'google',
    demo: true // Returns mock companies
  })
})
```

Mock companies available:
- Google UK Limited
- Amazon UK Services Ltd
- Microsoft Limited
- Apple UK Limited
- Meta Platforms Ireland Limited
