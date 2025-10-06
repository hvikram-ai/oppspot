# Location Autocomplete Component

A reusable autocomplete component for searching and selecting locations (cities, regions, countries) in the UK & Ireland.

## Features

- **Real-time Search** - Searches as you type (300ms debounce)
- **Multi-Selection** - Select multiple locations with badge display
- **Location Types** - Cities, regions, countries, and postcodes
- **Type Badges** - Color-coded badges for different location types
- **Google Places Integration** - Uses Google Places Autocomplete API
- **Fallback Data** - 30+ mock UK/Ireland locations when API unavailable
- **Keyboard Accessible** - Full keyboard navigation support
- **Click Outside to Close** - Dropdown closes when clicking outside
- **Loading States** - Shows spinner during search
- **Error Handling** - Graceful fallback to mock data

## Usage

### Basic Usage

```tsx
import { LocationAutocomplete } from '@/components/search/location-autocomplete'
import { useState } from 'react'

function MyComponent() {
  const [locations, setLocations] = useState([])

  return (
    <LocationAutocomplete
      selectedLocations={locations}
      onLocationsChange={setLocations}
      placeholder="Search for locations..."
    />
  )
}
```

### With Max Selections

```tsx
<LocationAutocomplete
  selectedLocations={locations}
  onLocationsChange={setLocations}
  placeholder="Select up to 10 locations..."
  maxSelections={10}
/>
```

### Integration Example (Firmographics Filter)

```tsx
// In firmographics-filter.tsx
const [selectedLocations, setSelectedLocations] = useState<Location[]>([])

const handleLocationsChange = (locations: Location[]) => {
  setSelectedLocations(locations)

  // Extract formatted strings for the filter
  const locationStrings = locations.map(l => l.formatted)
  onChange({
    ...filters,
    firmographics: {
      ...filters.firmographics,
      locations: locationStrings,
    },
  })
}

<LocationAutocomplete
  selectedLocations={selectedLocations}
  onLocationsChange={handleLocationsChange}
  placeholder="City, region, or country"
  maxSelections={10}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedLocations` | `Location[]` | Required | Array of currently selected locations |
| `onLocationsChange` | `(locations: Location[]) => void` | Required | Callback when selection changes |
| `placeholder` | `string` | `'Type to search locations...'` | Input placeholder text |
| `maxSelections` | `number \| undefined` | `undefined` | Maximum number of locations that can be selected |
| `className` | `string \| undefined` | `undefined` | Additional CSS classes |

## Location Interface

```typescript
interface Location {
  id: string
  name: string
  type: 'city' | 'region' | 'country' | 'postcode'
  country: string
  region?: string
  formatted: string
}
```

## API Integration

The component uses the `/api/locations/autocomplete` endpoint:

**Request:**
```
GET /api/locations/autocomplete?q=London
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "ChIJdd4hrwug2EcRmSrV3Vo6llI",
      "name": "London",
      "type": "city",
      "country": "United Kingdom",
      "region": "Greater London",
      "formatted": "London, Greater London, United Kingdom"
    }
  ],
  "source": "google_places",
  "message": "Found 1 locations"
}
```

### Google Places Autocomplete API

When `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is configured, the API uses:
- Google Places Autocomplete API
- Restricted to UK (`country:gb`) and Ireland (`country:ie`)
- Type filter: `(cities)`
- Returns place IDs for detailed lookups

### Fallback Mock Data

When API is unavailable, returns 30+ pre-configured UK/Ireland locations:

**Major Cities:**
- London, Manchester, Birmingham, Glasgow, Liverpool
- Leeds, Edinburgh, Bristol, Cardiff, Belfast
- Newcastle, Sheffield, Nottingham, Southampton, Cambridge, Oxford
- Dublin, Cork, Galway, Limerick (Ireland)

**Regions:**
- England, Scotland, Wales, Northern Ireland
- Greater London, South East England, North West England

**Countries:**
- United Kingdom, Ireland

## Features in Detail

### Location Type Badges

Each location shows a color-coded badge:
- 🔵 **City** - Blue badge
- 🟣 **Region** - Purple badge
- 🟢 **Country** - Green badge
- 🟠 **Postcode** - Orange badge

### Selected Locations Display
- Badge-style display with location name
- MapPin icon for visual clarity
- Region shown for cities (e.g., "London, Greater London")
- Remove button on each badge
- Truncated names for long locations

### Results Dropdown
- Scrollable list (max 300px height)
- Rich location information
- Type badge for each result
- Full formatted address
- Hover effects for better UX

### Error Handling
- Network errors: Falls back to mock data
- API unavailable: Shows mock locations
- No results: Clear message to user
- Graceful degradation

## Mock Data Mode

Force mock data usage (useful for testing):

```typescript
const response = await fetch(
  '/api/locations/autocomplete?q=london&mock=true'
)
```

## Styling

Uses shadcn/ui components:
- `Input` - Search input field
- `Badge` - Selected location tags and type indicators
- `ScrollArea` - Scrollable results
- Tailwind CSS for responsive design
- Color-coded type badges with dark mode support

## Performance

- Debounced search (300ms delay)
- Maximum 10 results per search
- Filters out already-selected locations
- Click outside handled via refs
- Lightweight mock data fallback

## Accessibility

- Keyboard navigation support
- Focus management
- Screen reader friendly
- Clear visual feedback
- Disabled state when max reached
- Semantic HTML

## Location Type Colors

```tsx
const getLocationTypeColor = (type: string) => {
  switch (type) {
    case 'city':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
    case 'region':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
    case 'country':
      return 'bg-green-500/10 text-green-700 dark:text-green-400'
    case 'postcode':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
  }
}
```

## API Configuration

### Environment Variables

```bash
# Required for Google Places Autocomplete
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Google Cloud Setup

1. Enable **Places API** in Google Cloud Console
2. Enable **Geocoding API** (optional, for future features)
3. Restrict API key to your domain
4. Set API quotas as needed

## Future Enhancements

1. **Postcode Search** - Enhanced postcode autocomplete
2. **Distance Filters** - Filter by radius from selected location
3. **Map Preview** - Show location on map in dropdown
4. **Recent Locations** - Remember recently selected locations
5. **Location Hierarchy** - Show parent/child relationships
6. **Custom Locations** - Allow users to add custom locations
7. **Bulk Import** - Import multiple locations from CSV

## Related Components

- `AdvancedSearchFilters` - Main filter panel
- `FirmographicsFilterSection` - Uses LocationAutocomplete
- `CompanyAutocomplete` - Similar pattern for companies

## Testing

To test the component:

1. Navigate to `/search/advanced`
2. Open "Firmographics" filter section
3. Type a location (e.g., "London", "Manchester", "Dublin")
4. Select from results
5. Verify badge appears with correct type
6. Remove using X button
7. Test max selections limit (10)
8. Test with/without Google Maps API key

## Example Searches

**Cities:**
- "London" → London, Greater London, United Kingdom
- "Dublin" → Dublin, Leinster, Ireland
- "Manchester" → Manchester, Greater Manchester, United Kingdom

**Regions:**
- "Scotland" → Scotland, United Kingdom
- "Wales" → Wales, United Kingdom
- "South East" → South East England, United Kingdom

**Countries:**
- "United Kingdom" → United Kingdom
- "Ireland" → Ireland

## API Response Examples

### Successful Response (Google Places)
```json
{
  "success": true,
  "results": [
    {
      "id": "ChIJdd4hrwug2EcRmSrV3Vo6llI",
      "name": "London",
      "type": "city",
      "country": "United Kingdom",
      "region": "Greater London",
      "formatted": "London, Greater London, United Kingdom"
    }
  ],
  "source": "google_places",
  "message": "Found 1 locations"
}
```

### Fallback Response (Mock Data)
```json
{
  "success": true,
  "results": [
    {
      "id": "london",
      "name": "London",
      "type": "city",
      "country": "United Kingdom",
      "region": "Greater London",
      "formatted": "London, Greater London, United Kingdom"
    }
  ],
  "source": "mock",
  "warning": "Using fallback location data",
  "message": "Found 1 locations"
}
```

## Visual Example

```
┌─────────────────────────────────────────────────┐
│ [📍 London, Greater London] [X]                 │
│ [📍 Manchester, Greater Manchester] [X]         │
│                                                 │
│ [🔍] Search for cities, regions...         [⟳] │
│ ┌───────────────────────────────────────────┐   │
│ │ 📍 Birmingham [🔵 city]                   │   │
│ │    Birmingham, West Midlands, UK          │   │
│ │ 📍 Scotland [🟣 region]                   │   │
│ │    Scotland, United Kingdom               │   │
│ │ 📍 Ireland [🟢 country]                   │   │
│ │    Ireland                                │   │
│ └───────────────────────────────────────────┘   │
│ 2 of 10 locations selected                      │
└─────────────────────────────────────────────────┘
```
