# oppSpot - System Requirements & Dependencies

## System Requirements

### Operating System
- macOS 12.0+ (Monterey or later)
- Linux (Ubuntu 20.04+, Debian 11+)
- Windows 10/11 with WSL2

### Runtime Requirements
- **Node.js**: v18.17.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Git**: v2.30.0 or higher

### Database
- **Supabase CLI**: Latest version
- **PostgreSQL**: v15+ (managed by Supabase)

## Package Dependencies

### Core Dependencies
```json
{
  "next": "15.1.6",
  "react": "19.0.0",
  "react-dom": "19.0.0",
  "typescript": "^5",
  "@supabase/supabase-js": "^2.47.10",
  "@supabase/ssr": "^0.5.2"
}
```

### UI Framework & Components
```json
{
  "@radix-ui/react-*": "Various components",
  "tailwindcss": "^3.4.1",
  "framer-motion": "^11.15.0",
  "lucide-react": "^0.469.0",
  "sonner": "^1.7.1"
}
```

### Data Processing & Utilities
```json
{
  "date-fns": "^4.1.0",
  "recharts": "^2.15.0",
  "react-hook-form": "^7.54.2",
  "zod": "^3.23.8",
  "cheerio": "^1.0.0",
  "resend": "^6.0.2"
}
```

### Mapping & Visualization
```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^5.0.0",
  "react-leaflet-cluster": "^2.1.0"
}
```

### API & Authentication
```json
{
  "@react-oauth/google": "^0.12.1",
  "openai": "^4.73.0"
}
```

## Development Dependencies
```json
{
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/leaflet": "^1.9.15",
  "eslint": "^8",
  "postcss": "^8"
}
```

## Environment Variables Required

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### External APIs
- `OPENROUTER_API_KEY` - For AI features
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - For map features
- `GOOGLE_PLACES_API_KEY` - For business data
- `RESEND_API_KEY` - For email notifications

### App Configuration
- `NEXT_PUBLIC_APP_URL` - Application URL
- `NEXT_PUBLIC_APP_NAME` - Application name

### Optional
- `NEXT_PUBLIC_POSTHOG_KEY` - Analytics
- `NEXT_PUBLIC_POSTHOG_HOST` - Analytics host

## Installation Commands

### 1. Install Node.js dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Install Supabase CLI (macOS)
```bash
brew install supabase/tap/supabase
```

### 3. Install Supabase CLI (Linux/WSL)
```bash
brew install supabase/tap/supabase
# OR
npx supabase --version
```

## Known Issues & Solutions

### Peer Dependency Conflicts
The project has peer dependency conflicts with react-leaflet-cluster. Always use:
```bash
npm install --legacy-peer-deps
```

### Build Warnings
Some TypeScript strict mode warnings exist but don't affect functionality.

## Browser Requirements
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Recommended VS Code Extensions
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features
- Supabase Extension

## Performance Requirements
- Minimum 4GB RAM for development
- 2GB free disk space
- Stable internet connection for Supabase and API calls