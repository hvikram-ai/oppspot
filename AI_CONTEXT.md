# AI Agent Context for oppSpot Development

## 🤖 For AI Assistants Working on This Project

This document provides essential context for AI agents (Claude, GPT-4, etc.) to effectively understand and contribute to the oppSpot project.

## Project Overview

**oppSpot** is a B2B business intelligence SaaS platform for discovering UK & Ireland business opportunities. Think of it as "LinkedIn Sales Navigator meets Google Maps with AI insights."

### Core Purpose
- Help users find and analyze business opportunities
- Provide competitive intelligence and market insights
- Offer predictive analytics for market trends
- Enable efficient lead generation and qualification

## Technical Context

### Stack Summary
- **Framework**: Next.js 15.1.6 with App Router (NOT Pages Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **Styling**: Tailwind CSS + shadcn/ui components
- **AI**: OpenRouter API for LLM features
- **Maps**: Leaflet (NOT Google Maps embedded)

### Critical Patterns to Follow

#### 1. File Structure
```
app/ - Use App Router conventions
  (auth)/ - Auth group routes
  (dashboard)/ - Protected routes
  api/ - API routes with route.ts files
components/ - Reusable components
lib/ - Core business logic
```

#### 2. API Routes Pattern
```typescript
// Always use this pattern in app/api/*/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Implementation
  return NextResponse.json({ data })
}
```

#### 3. Supabase Client Usage
```typescript
// Server components/API routes
import { createClient } from '@/lib/supabase/server'

// Client components
import { createClient } from '@/lib/supabase/client'
```

#### 4. Component Patterns
- Use 'use client' directive for interactive components
- Prefer server components when possible
- Use shadcn/ui components from @/components/ui
- Follow existing component structure

## Important Constraints

### ⚠️ ALWAYS Remember

1. **Peer Dependencies Issue**
   - ALWAYS use `npm install --legacy-peer-deps`
   - react-leaflet-cluster has conflicting peer deps
   - This is a known issue, not a bug to fix

2. **No Pages Router**
   - DON'T create files in `pages/` directory
   - Use `app/` directory with App Router conventions

3. **Database Migrations**
   - Migrations go in `supabase/migrations/`
   - Use timestamp prefix: `20250831000001_name.sql`
   - Include RLS policies in migrations

4. **Component Imports**
   - Import UI components from `@/components/ui/[component]`
   - Don't install separate UI packages

5. **Type Safety**
   - Always define TypeScript interfaces
   - Use Zod for runtime validation
   - Don't use 'any' type unless absolutely necessary

## Current Implementation Status

### ✅ Completed Features
1. Authentication (email/password + Google OAuth)
2. Business search with AI
3. Interactive maps with clustering
4. Business profiles with full details
5. List management system
6. Competitive analysis tools
7. Predictive analytics engine
8. Notification system (in-app + email)
9. Social media tracking
10. Demo mode for prospects

### 🚧 Known Issues
1. Peer dependency warnings (ignore - use --legacy-peer-deps)
2. Some TypeScript strict mode warnings (non-breaking)
3. Map performance with >1000 markers

### 📋 Next Priorities
1. AI-powered lead scoring
2. Email campaign integration
3. Review aggregation system
4. Mobile PWA optimization
5. Public API development

## Code Style Guidelines

### TypeScript
```typescript
// Good
interface BusinessData {
  id: string
  name: string
  rating: number
}

// Bad
const data: any = {}
```

### React Components
```tsx
// Good - Server component by default
export function BusinessCard({ business }: { business: Business }) {
  return <div>...</div>
}

// Good - Client component when needed
'use client'
export function InteractiveMap() {
  const [state, setState] = useState()
  return <div>...</div>
}
```

### API Responses
```typescript
// Good - Consistent response structure
return NextResponse.json({
  data: results,
  error: null,
  pagination: { ... }
})

// Bad
return NextResponse.json(results)
```

## Database Schema Key Tables

### Core Business Tables
- `businesses` - Main business entities
- `locations` - Geographic data
- `profiles` - User profiles
- `saved_businesses` - User's saved items
- `business_lists` - Curated lists

### Analytics Tables
- `market_metrics` - Time-series market data
- `trend_analysis` - Calculated trends
- `opportunities` - Identified opportunities
- `demand_forecasts` - Predictions

### System Tables
- `notifications` - User notifications
- `notification_preferences` - Settings
- `audit_logs` - System audit trail

## Common Tasks & Solutions

### Adding a New Feature
1. Plan database schema first
2. Create migration file
3. Build API endpoint
4. Create UI components
5. Add to navigation if needed

### Debugging Issues
1. Check browser console
2. Check network tab for API calls
3. Verify environment variables
4. Check Supabase logs
5. Ensure migrations are run

### Performance Optimization
1. Use React.memo for expensive components
2. Implement pagination for large lists
3. Use Supabase indexes
4. Lazy load heavy components
5. Optimize images with next/image

## Environment Variables

### Required for Development
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENROUTER_API_KEY
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

### Check `.env.example` for full list

## Testing Approach

### Manual Testing Checklist
- [ ] Feature works in development
- [ ] No console errors
- [ ] API responses are correct
- [ ] UI is responsive
- [ ] Dark mode works
- [ ] Demo mode restrictions apply

### Common Test Scenarios
1. User can search for businesses
2. Map displays search results
3. Filters work correctly
4. Save/unsave businesses works
5. Lists can be created and managed
6. Analytics dashboard loads

## Git Workflow

### Branch Naming
- `feature/[feature-name]`
- `fix/[bug-description]`
- `chore/[task]`

### Commit Messages
```
feat: Add new feature
fix: Fix bug description
chore: Update dependencies
docs: Update documentation
refactor: Refactor code
style: Format code
test: Add tests
```

## Helpful Commands

```bash
# Development
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Database
npx supabase db push
npx supabase migration new [name]
npx supabase studio

# Git
git add .
git commit -m "feat: description"
git push origin [branch]
```

## Common Pitfalls to Avoid

1. **DON'T** create pages in `pages/` directory
2. **DON'T** forget 'use client' for interactive components
3. **DON'T** use regular npm install (use --legacy-peer-deps)
4. **DON'T** commit .env.local file
5. **DON'T** use Google Maps JS (use Leaflet)
6. **DON'T** forget to handle loading and error states
7. **DON'T** make database queries in client components
8. **DON'T** forget TypeScript types
9. **DON'T** ignore accessibility (ARIA labels, etc.)
10. **DON'T** skip error boundaries

## Resources for Context

### Internal Documentation
- `/PROJECT_DOCUMENTATION.md` - Full project details
- `/SETUP_GUIDE.md` - Setup instructions
- `/REQUIREMENTS.md` - System requirements
- `.env.example` - Environment variables

### External Resources
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Questions to Ask Before Making Changes

1. Is this a client or server component?
2. Should this be in app/ or lib/?
3. Do I need to create a migration?
4. Is there an existing pattern to follow?
5. Will this work in demo mode?
6. Have I handled loading/error states?
7. Is this accessible?
8. Will this scale with large datasets?
9. Have I added proper TypeScript types?
10. Does this follow the existing code style?

## Final Notes

- The project is actively developed and production-ready
- Focus on maintaining code quality and consistency
- Always consider performance and user experience
- Test thoroughly before committing changes
- When in doubt, check existing implementations for patterns

Remember: This is a real SaaS product with real users. Quality matters!