# List and Tag Selectors

Reusable components for selecting business lists and tags in the Workflow filter.

## Overview

These components integrate with oppSpot's existing lists and tags system, allowing users to filter businesses based on their saved lists and applied tags.

## Components

### 1. ListSelector

Displays user's business lists with business counts and allows multi-selection.

**Features:**
- ✅ Loads user's lists from database
- ✅ Shows business count for each list
- ✅ Color-coded list indicators
- ✅ Multi-selection with badges
- ✅ Search/filter lists
- ✅ Clear all button
- ✅ Loading and error states
- ✅ Scrollable list view

### 2. TagSelector

Displays user's tags with usage counts and allows multi-selection.

**Features:**
- ✅ Loads tags from saved businesses
- ✅ Shows usage count for each tag
- ✅ Color-coded tag badges (6 colors)
- ✅ Multi-selection with animated badges
- ✅ Search/filter tags
- ✅ Clear all button
- ✅ Loading and error states
- ✅ Tag cloud view

## Database Schema

### business_lists Table
```sql
CREATE TABLE business_lists (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'folder',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### saved_businesses Table (tags)
```sql
CREATE TABLE saved_businesses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  business_id UUID REFERENCES businesses(id),
  list_id UUID REFERENCES business_lists(id),
  tags TEXT[],  -- Array of tag strings
  notes TEXT,
  saved_at TIMESTAMP
);
```

## API Endpoints

### GET /api/lists

Returns all business lists for the authenticated user with business counts.

**Response:**
```json
{
  "success": true,
  "lists": [
    {
      "id": "list-uuid-1",
      "name": "Potential Clients",
      "description": "High-value prospects",
      "color": "#3b82f6",
      "icon": "folder",
      "is_public": false,
      "business_count": 42,
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-20T15:30:00Z"
    }
  ],
  "total": 1
}
```

### POST /api/lists

Create a new business list.

**Request:**
```json
{
  "name": "New List",
  "description": "Description here",
  "color": "#10b981",
  "icon": "star"
}
```

### GET /api/tags

Returns all unique tags used by the authenticated user with usage counts.

**Response:**
```json
{
  "success": true,
  "tags": [
    {
      "id": "hot-lead",
      "name": "Hot lead",
      "count": 15
    },
    {
      "id": "follow-up",
      "name": "Follow up",
      "count": 8
    }
  ],
  "total": 2
}
```

## Usage

### ListSelector Component

```tsx
import { ListSelector } from '@/components/search/list-selector'
import { useState } from 'react'

function MyComponent() {
  const [selectedListIds, setSelectedListIds] = useState<string[]>([])

  return (
    <ListSelector
      selectedListIds={selectedListIds}
      onListsChange={setSelectedListIds}
      placeholder="Search lists..."
    />
  )
}
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `selectedListIds` | `string[]` | Array of selected list IDs |
| `onListsChange` | `(listIds: string[]) => void` | Callback when selection changes |
| `placeholder` | `string` | Search input placeholder |
| `className` | `string` | Additional CSS classes |

### TagSelector Component

```tsx
import { TagSelector } from '@/components/search/tag-selector'
import { useState } from 'react'

function MyComponent() {
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  return (
    <TagSelector
      selectedTags={selectedTags}
      onTagsChange={setSelectedTags}
      placeholder="Search tags..."
    />
  )
}
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `selectedTags` | `string[]` | Array of selected tag names (lowercase) |
| `onTagsChange` | `(tags: string[]) => void` | Callback when selection changes |
| `placeholder` | `string` | Search input placeholder |
| `className` | `string` | Additional CSS classes |

### Integration in Workflow Filter

```tsx
// In workflow-filter.tsx
import { ListSelector } from '../list-selector'
import { TagSelector } from '../tag-selector'

const selectedListIds = filters.workflow?.onLists || []
const selectedTags = filters.workflow?.hasTags || []

<ListSelector
  selectedListIds={selectedListIds}
  onListsChange={(listIds) => {
    onChange({
      ...filters,
      workflow: {
        ...filters.workflow,
        onLists: listIds,
      },
    })
  }}
/>

<TagSelector
  selectedTags={selectedTags}
  onTagsChange={(tags) => {
    onChange({
      ...filters,
      workflow: {
        ...filters.workflow,
        hasTags: tags,
      },
    })
  }}
/>
```

## Visual Design

### ListSelector
```
┌─────────────────────────────────────────┐
│ [📁 Potential Clients (42)] [X]         │
│ [📁 Hot Leads (15)] [X]                 │
│ [Clear all]                             │
│                                         │
│ [🔍] Search lists...                    │
│ ┌─────────────────────────────────────┐ │
│ │ ☑ 🔵 Marketing Targets          [8] │ │
│ │     Tech companies in London        │ │
│ │ ☐ 🟢 Partnership Leads         [12] │ │
│ │     Strategic partnerships          │ │
│ │ ☐ 🟣 Event Attendees           [23] │ │
│ │     From Q1 2025 events            │ │
│ └─────────────────────────────────────┘ │
│ 2 lists selected                        │
└─────────────────────────────────────────┘
```

### TagSelector
```
┌─────────────────────────────────────────┐
│ [#hot-lead (15)] [X]  [#follow-up (8)] [X] │
│ [Clear all]                             │
│                                         │
│ [🔍] Search tags...                     │
│ ┌─────────────────────────────────────┐ │
│ │ [#qualified (15)]  [#interested (12)]│ │
│ │ [#demo-booked (8)] [#needs-follow (6)]│ │
│ │ [#not-ready (4)]   [#potential (23)] │ │
│ │ [#high-value (9)]  [#competitor (3)] │ │
│ └─────────────────────────────────────┘ │
│ 2 tags selected                         │
└─────────────────────────────────────────┘
```

## Features in Detail

### ListSelector Features

1. **Color-Coded Lists**
   - Each list has a custom color (set when created)
   - Color indicator dot shown next to list name
   - Color border on selected badges

2. **Business Counts**
   - Shows number of businesses in each list
   - Updates dynamically when lists change
   - Displayed as small badge next to list name

3. **Search Functionality**
   - Filter lists by name or description
   - Real-time search as you type
   - Case-insensitive matching

4. **Selection Management**
   - Multi-select with checkboxes
   - Selected lists shown as badges at top
   - Clear individual or all selections
   - Click anywhere in list item to toggle

### TagSelector Features

1. **Color-Coded Tags**
   - 6 different color schemes rotating
   - Blue, Green, Purple, Orange, Pink, Teal
   - Selected tags highlighted with color
   - Unselected tags shown in muted gray

2. **Usage Counts**
   - Shows how many times each tag is used
   - Sorted by most used (descending)
   - Helps identify popular tags

3. **Tag Cloud View**
   - Tags displayed as clickable pills
   - Hover effects with scale animation
   - Compact display fits many tags
   - Responsive wrapping

4. **Selection Management**
   - Click tag to toggle selection
   - Selected tags shown as badges at top
   - Clear individual or all selections
   - Animated transitions

## Error Handling

Both components handle various error scenarios:

1. **Authentication Errors**
   - Redirects to login if not authenticated
   - Shows "Unauthorized" message

2. **Network Errors**
   - Shows error message with retry button
   - Graceful degradation

3. **Empty States**
   - "No lists found" message
   - "No tags found" with helpful tip
   - Search: "No matches" message

4. **Loading States**
   - Spinner while fetching data
   - Prevents interaction during load

## Performance Considerations

1. **Data Loading**
   - Lists/tags loaded once on mount
   - Cached in component state
   - Refresh only on user action

2. **Search**
   - Client-side filtering (no API calls)
   - Case-insensitive matching
   - O(n) complexity for small datasets

3. **Rendering**
   - ScrollArea for long lists
   - Virtual scrolling not needed (typically < 100 items)
   - Efficient re-renders with React keys

## Future Enhancements

1. **List Management**
   - Create new list directly from selector
   - Edit list name/color inline
   - Delete lists with confirmation
   - Drag-and-drop reordering

2. **Tag Management**
   - Create new tags on-the-fly
   - Rename tags (updates all businesses)
   - Merge duplicate tags
   - Tag suggestions/autocomplete

3. **Advanced Features**
   - List operators (AND/OR/NOT)
   - Tag operators (AND/OR/NOT)
   - Recently used lists/tags
   - Favorite lists pinned to top

4. **Bulk Operations**
   - Select all lists
   - Select all tags
   - Invert selection
   - Import/export selections

## Related Components

- `AdvancedSearchFilters` - Main filter panel
- `WorkflowFilterSection` - Uses ListSelector and TagSelector
- `CompanyAutocomplete` - Similar selection pattern
- `LocationAutocomplete` - Similar selection pattern

## Testing

To test the components:

1. **Setup:**
   - Ensure you have some business lists created
   - Save some businesses with tags
   - Navigate to `/search/advanced`

2. **ListSelector:**
   - Open "My Workflow" filter section
   - See your lists loaded
   - Select/deselect lists
   - Search for specific list
   - Clear all selections

3. **TagSelector:**
   - Open "My Workflow" filter section
   - See your tags loaded (sorted by usage)
   - Select/deselect tags
   - Search for specific tag
   - Clear all selections

4. **Integration:**
   - Select both lists and tags
   - Apply filters
   - Verify businesses filtered correctly
   - Check active filter count updates
