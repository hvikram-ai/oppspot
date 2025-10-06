# Saved Searches System

Complete backend and frontend implementation for saving and reusing complex filter configurations.

## Overview

The Saved Searches system allows users to save their advanced filter configurations for quick access later. Each saved search stores the complete filter state and tracks usage metrics.

## Database Schema

### saved_searches Table

```sql
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  description TEXT,
  filters JSONB NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  result_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Columns:**
- `id` - UUID primary key
- `user_id` - References auth.users, cascade delete
- `name` - Search name (1-100 chars, required)
- `description` - Optional notes about the search
- `filters` - JSONB containing complete AdvancedFilters object
- `is_favorite` - User-marked favorite (star icon)
- `execution_count` - Number of times executed
- `last_executed_at` - Timestamp of last execution
- `result_count` - Business count from last execution
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp (auto-updated)

**Indexes:**
- `idx_saved_searches_user_id` - For user lookups
- `idx_saved_searches_is_favorite` - For favorites filtering
- `idx_saved_searches_created_at` - For chronological sorting
- `idx_saved_searches_last_executed` - For recency sorting
- `idx_saved_searches_filters` (GIN) - For JSONB filtering

**RLS Policies:**
- Users can only view/create/update/delete their own searches
- Enforced via `auth.uid() = user_id` checks

## API Endpoints

### GET /api/search/saved

Get all saved searches for the current user.

**Response:**
```json
{
  "success": true,
  "searches": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Tech companies in London",
      "description": "High-growth SaaS companies",
      "filters": { /* AdvancedFilters object */ },
      "is_favorite": true,
      "execution_count": 15,
      "last_executed_at": "2025-02-03T10:30:00Z",
      "result_count": 42,
      "created_at": "2025-01-15T09:00:00Z",
      "updated_at": "2025-02-03T10:30:00Z"
    }
  ],
  "total": 1
}
```

**Sorting:**
- Favorites first (`is_favorite DESC`)
- Recently executed (`last_executed_at DESC`)
- Recently created (`created_at DESC`)

### POST /api/search/saved

Create a new saved search.

**Request:**
```json
{
  "name": "Tech companies in London",
  "description": "High-growth SaaS companies",
  "filters": { /* AdvancedFilters object */ },
  "is_favorite": false
}
```

**Validation:**
- `name` is required (1-100 chars)
- `filters` is required (object)
- Duplicate names are rejected (409 Conflict)

**Response:**
```json
{
  "success": true,
  "search": { /* SavedSearch object */ }
}
```

### GET /api/search/saved/[id]

Get a specific saved search.

**Response:**
```json
{
  "success": true,
  "search": { /* SavedSearch object */ }
}
```

**Errors:**
- 404 if search not found or doesn't belong to user

### PUT /api/search/saved/[id]

Update a saved search.

**Request (partial updates supported):**
```json
{
  "name": "Updated name",
  "description": "Updated description",
  "filters": { /* Updated filters */ },
  "is_favorite": true
}
```

**Response:**
```json
{
  "success": true,
  "search": { /* Updated SavedSearch object */ }
}
```

### DELETE /api/search/saved/[id]

Delete a saved search.

**Response:**
```json
{
  "success": true,
  "message": "Saved search deleted successfully"
}
```

### POST /api/search/saved/[id]/execute

Execute a saved search and increment execution count.

**Request:**
```json
{
  "pagination": {
    "page": 1,
    "perPage": 20
  },
  "sorting": {
    "field": "updated_at",
    "direction": "desc"
  }
}
```

**Response:**
```json
{
  "success": true,
  "savedSearch": {
    "id": "uuid",
    "name": "Tech companies in London",
    "description": "High-growth SaaS companies"
  },
  "results": {
    "businesses": [ /* Array of businesses */ ],
    "total": 42,
    "page": 1,
    "perPage": 20,
    "totalPages": 3,
    "appliedFilters": { /* AdvancedFilters */ },
    "executionTimeMs": 150
  }
}
```

**Side Effects:**
- Increments `execution_count`
- Updates `last_executed_at`
- Updates `result_count`

## Frontend Integration

### AdvancedSearchFilters Component

The main filter panel now includes saved searches functionality:

**Features:**
- ✅ Dropdown to select saved searches
- ✅ Load filters from saved search
- ✅ Star icon for favorites
- ✅ Delete button in dropdown
- ✅ Execution count display
- ✅ Description tooltip
- ✅ Save dialog with name and description
- ✅ Validation and error handling

**Save Dialog:**
```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Save Search</DialogTitle>
      <DialogDescription>
        Save your current filter configuration for quick access later
      </DialogDescription>
    </DialogHeader>
    <Input
      placeholder="e.g., Tech companies in London"
      maxLength={100}
    />
    <Textarea
      placeholder="Add notes about this search..."
      rows={3}
    />
    <Button onClick={handleSaveConfirm}>Save Search</Button>
  </DialogContent>
</Dialog>
```

### Usage Example

```tsx
import { useState, useEffect } from 'react'
import { AdvancedSearchFilters } from '@/components/search/advanced-search-filters'

export default function SearchPage() {
  const [filters, setFilters] = useState({})
  const [savedSearches, setSavedSearches] = useState([])

  // Load saved searches
  useEffect(() => {
    const loadSavedSearches = async () => {
      const response = await fetch('/api/search/saved')
      const data = await response.json()
      if (data.success) {
        setSavedSearches(data.searches)
      }
    }
    loadSavedSearches()
  }, [])

  // Save new search
  const handleSaveSearch = async (name, filters, description) => {
    const response = await fetch('/api/search/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, filters }),
    })
    const data = await response.json()
    if (data.success) {
      setSavedSearches(prev => [...prev, data.search])
    }
  }

  // Delete search
  const handleDeleteSearch = async (searchId) => {
    await fetch(`/api/search/saved/${searchId}`, {
      method: 'DELETE',
    })
    setSavedSearches(prev => prev.filter(s => s.id !== searchId))
  }

  return (
    <AdvancedSearchFilters
      filters={filters}
      onChange={setFilters}
      savedSearches={savedSearches}
      onSaveSearch={handleSaveSearch}
      onDeleteSearch={handleDeleteSearch}
    />
  )
}
```

## Features in Detail

### 1. Save Current Filters

- Click "Save" button in footer
- Dialog opens with name and description fields
- Shows active filter count
- Validates name (required, max 100 chars)
- Prevents duplicate names
- Success/error feedback

### 2. Load Saved Search

- Select from dropdown in header
- Filters immediately applied
- Selection highlighted
- Shows description or execution count
- Clear selection with "Clear all"

### 3. Delete Saved Search

- Trash icon in dropdown item
- Confirmation dialog
- Removes from list
- Clears selection if currently selected
- Permanent deletion from database

### 4. Favorites

- Star icon next to favorite searches
- Favorites sorted to top of list
- Toggle favorite status (future enhancement)

### 5. Execution Tracking

- Auto-increments on execute endpoint
- Shows execution count in UI
- Tracks last execution time
- Stores result count

## Database Functions

### get_saved_search_count()

Returns count of saved searches for a user.

```sql
SELECT get_saved_search_count('user-uuid');
-- Returns: 5
```

### increment_search_execution()

Increments execution count and updates metadata.

```sql
SELECT increment_search_execution('search-uuid', 42);
```

**Parameters:**
- `p_search_id` - UUID of the search
- `p_result_count` - Number of results (optional)

**Updates:**
- `execution_count` +1
- `last_executed_at` = NOW()
- `result_count` = p_result_count (if provided)

## Visual Design

### Saved Search Dropdown
```
┌────────────────────────────────────────┐
│ Saved searches                    [▼] │
├────────────────────────────────────────┤
│ ⭐ Tech companies in London      [🗑] │
│ Manchester SaaS companies        [🗑] │
│ Healthcare providers UK          [🗑] │
└────────────────────────────────────────┘
Tech companies in London
Executed 15 times
```

### Save Dialog
```
┌─────────────────────────────────────────┐
│ Save Search                        [X]  │
├─────────────────────────────────────────┤
│ Save your current filter configuration  │
│ for quick access later                  │
│                                         │
│ Name *                                  │
│ ┌─────────────────────────────────────┐ │
│ │ e.g., Tech companies in London      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Description (optional)                  │
│ ┌─────────────────────────────────────┐ │
│ │ Add notes about this search...      │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 5 filters will be saved                 │
│                                         │
│        [Cancel]  [Save Search]          │
└─────────────────────────────────────────┘
```

## Error Handling

### Name Validation
- Empty name: "Search name is required"
- Too long: "Search name must be 100 characters or less"
- Duplicate: "A search with this name already exists"

### Filters Validation
- Missing filters: "Filters are required"
- Invalid format: "Invalid filters format"

### Not Found
- 404 error when search doesn't exist
- Graceful handling in UI

### Permissions
- 401 Unauthorized if not logged in
- RLS ensures users only access own searches

## Performance Considerations

1. **JSONB Indexing**
   - GIN index on `filters` column
   - Fast JSONB queries
   - Supports filter content search (future)

2. **Query Optimization**
   - Sorted by favorites, execution, creation
   - Indexes on all sorting columns
   - Efficient user_id filtering

3. **Caching**
   - Searches loaded once on mount
   - Cached in component state
   - Refetch only on mutations

4. **Execution Tracking**
   - Fire-and-forget increment
   - Doesn't block search execution
   - Async updates

## Security

1. **Row Level Security (RLS)**
   - All operations scoped to user
   - No cross-user access
   - Enforced at database level

2. **Input Validation**
   - Name length limits
   - JSONB structure validation
   - SQL injection prevention

3. **Authentication**
   - All endpoints require auth
   - 401 for unauthenticated requests
   - User ID from JWT token

## Future Enhancements

1. **Favorites Management**
   - Toggle favorite status
   - Favorite-only view
   - Star/unstar in UI

2. **Search Sharing**
   - Share search with team
   - Public search links
   - Permission levels

3. **Search Templates**
   - Pre-built search templates
   - Industry-specific searches
   - Common patterns

4. **Search History**
   - Track all executions
   - View historical results
   - Compare over time

5. **Smart Suggestions**
   - Suggest similar searches
   - Popular searches
   - Trending filters

6. **Bulk Operations**
   - Delete multiple searches
   - Export/import searches
   - Duplicate search

7. **Search Analytics**
   - Most used searches
   - Result count trends
   - Performance metrics

## Migration Script

To apply the saved searches migration:

```bash
# Connect to Supabase database
psql "your-connection-string"

# Run migration
\i supabase/migrations/20250203000001_create_saved_searches.sql
```

## Testing

### Manual Testing

1. **Save Search:**
   - Apply some filters
   - Click Save button
   - Enter name and description
   - Confirm save
   - Verify appears in dropdown

2. **Load Search:**
   - Select from dropdown
   - Verify filters applied correctly
   - Check description displays

3. **Delete Search:**
   - Click trash icon
   - Confirm deletion
   - Verify removed from list

4. **Execute Search:**
   - Use execute endpoint
   - Check execution count increments
   - Verify result count updates

### API Testing

```bash
# Get all saved searches
curl -X GET http://localhost:3000/api/search/saved \
  -H "Cookie: your-session-cookie"

# Create saved search
curl -X POST http://localhost:3000/api/search/saved \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "name": "Test Search",
    "description": "Testing saved searches",
    "filters": {"options": {"activeCompaniesOnly": true}}
  }'

# Delete saved search
curl -X DELETE http://localhost:3000/api/search/saved/{id} \
  -H "Cookie: your-session-cookie"
```

## Files Created/Modified

```
supabase/migrations/
└── 20250203000001_create_saved_searches.sql  ✨ NEW - Database migration

app/api/search/saved/
├── route.ts                                  ✨ NEW - GET/POST endpoints
├── [id]/
│   ├── route.ts                              ✨ NEW - GET/PUT/DELETE
│   └── execute/
│       └── route.ts                          ✨ NEW - POST execute

app/search/advanced/
└── page.tsx                                  ✏️  UPDATED - Integration

components/search/
├── advanced-search-filters.tsx               ✏️  UPDATED - Save UI
└── SAVED_SEARCHES_README.md                  ✨ NEW - This file
```

## Conclusion

The Saved Searches system provides a complete solution for storing and reusing complex filter configurations. It includes:

- ✅ Database schema with indexes and RLS
- ✅ Full CRUD API endpoints
- ✅ Execution tracking with metrics
- ✅ Beautiful UI with save dialog
- ✅ Load/delete functionality
- ✅ Favorites support
- ✅ Error handling and validation
- ✅ Security and performance optimization

Users can now save their frequently used filters and access them with a single click!
