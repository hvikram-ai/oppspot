# AI Command Bar

A powerful, AI-enhanced command bar for oppSpot that provides universal search and quick actions across the entire platform.

## Features

### 🔍 Universal Search
- **Companies**: Search across all businesses by name, company number, or description
- **Streams**: Find active streams and deals
- **Opportunity Scans**: Locate acquisition scans
- **Lists**: Search through your saved lists

### 🤖 AI Natural Language Processing
The command bar understands natural language queries and suggests relevant actions:

**Examples:**
- "create new stream" → Suggests: Create New Stream
- "find companies in london" → Searches companies + suggests: Search Companies
- "start opportunity scan" → Suggests: Start Opportunity Scan
- "show me signals" → Suggests: View Buying Signals
- "analyze acme corp" → Suggests: Run analysis on company
- "go to dashboard" → Navigates to dashboard

### ⚡ Quick Actions
Pre-configured actions for common tasks:
- Create New Stream
- Start Opportunity Scan
- Search Companies
- View Buying Signals
- Ask AI Assistant

### 🕐 Recent Items
Automatically tracks your 10 most recently viewed:
- Companies
- Streams
- Scans
- Lists

### ⌨️ Keyboard Shortcuts
- **⌘K** (Mac) or **Ctrl+K** (Windows/Linux) - Open command bar
- **↑/↓** - Navigate results
- **Enter** - Select item
- **Esc** - Close

## Usage

### Opening the Command Bar
1. Press `⌘K` (Mac) or `Ctrl+K` (Windows/Linux)
2. The command bar appears as a dialog overlay

### Searching
1. Type your query (minimum 2 characters)
2. Results appear in real-time from multiple sources
3. AI suggestions appear at the top based on your intent

### Navigation
- Use arrow keys to navigate through results
- Press Enter to select
- Click on any result to navigate

## API Endpoints

### `/api/command-search`
**GET** - Universal search across all entities

**Query Parameters:**
- `q` - Search query (minimum 2 characters)

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "type": "company|stream|scan|list",
      "title": "Result title",
      "subtitle": "Optional description",
      "href": "/path/to/item"
    }
  ]
}
```

### `/api/command-ai`
**POST** - AI natural language processing

**Request Body:**
```json
{
  "query": "natural language query"
}
```

**Response:**
```json
{
  "intent": "search|create|navigate|analyze|unknown",
  "action": "action_name",
  "target": "target_entity",
  "suggestions": [
    {
      "title": "Suggested action",
      "description": "What this does",
      "href": "/path"
    }
  ]
}
```

## Component Structure

```
components/command-bar/
├── command-bar.tsx       # Main command bar component
├── index.ts             # Barrel export
└── README.md           # This file

hooks/
└── use-command-bar.ts   # Hook for keyboard shortcuts & recent items

app/api/
├── command-search/
│   └── route.ts        # Universal search API
└── command-ai/
    └── route.ts        # AI processing API
```

## Implementation Details

### State Management
- Uses React hooks for local state
- localStorage for recent items persistence
- Real-time search with 300ms debounce

### Search Algorithm
1. Searches across multiple tables in parallel
2. Results sorted by type priority (companies > streams > scans > lists)
3. Limits to 10 total results for performance
4. Case-insensitive fuzzy matching using PostgreSQL `ilike`

### AI Processing
Pattern matching for common intents:
- Create/start operations
- Search/find queries
- Navigation commands
- Analysis requests
- Help queries

### Performance
- Parallel API calls (search + AI processing)
- Debounced search queries (300ms)
- Lazy loading of results
- Optimized database queries with limits

## Customization

### Adding New Quick Actions
Edit `command-bar.tsx`:

```typescript
const quickActions: QuickAction[] = [
  // ... existing actions
  {
    id: 'your-action',
    title: 'Your Action Title',
    subtitle: 'Description',
    icon: <YourIcon className="size-4" />,
    action: () => {
      router.push('/your-path')
      setOpen(false)
    },
    keywords: ['keyword1', 'keyword2'],
  },
]
```

### Adding New Search Sources
Edit `/app/api/command-search/route.ts`:

```typescript
// Add new search query
const { data: yourData } = await supabase
  .from('your_table')
  .select('id, name, description')
  .ilike('name', searchPattern)
  .limit(5)

// Map to results
yourData?.forEach(item => {
  results.push({
    id: item.id,
    type: 'your_type',
    title: item.name,
    subtitle: item.description,
    href: `/your-path/${item.id}`,
  })
})
```

### Adding AI Intent Patterns
Edit `/app/api/command-ai/route.ts`:

```typescript
// Add new pattern matching
if (/^(your|pattern|here)/.test(lowerQuery)) {
  return {
    intent: 'your_intent',
    action: 'your_action',
    suggestions: [{
      title: 'Your Suggestion',
      description: 'What it does',
      href: '/your-path',
    }]
  }
}
```

## Future Enhancements

Potential improvements:
- [ ] Fuzzy search scoring (Levenshtein distance)
- [ ] User-specific search ranking based on usage patterns
- [ ] Voice command integration
- [ ] Custom keyboard shortcuts per user
- [ ] Command history with ↑/↓ navigation
- [ ] Multi-select for batch operations
- [ ] Integration with full AI chat for complex queries
- [ ] Search result previews
- [ ] Bookmarked commands
- [ ] Team-shared quick actions

## Accessibility

- ✅ Keyboard navigation
- ✅ ARIA labels
- ✅ Focus management
- ✅ Screen reader support
- ✅ High contrast mode compatible

## Browser Support

Works in all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

Part of oppSpot platform - Internal use only
