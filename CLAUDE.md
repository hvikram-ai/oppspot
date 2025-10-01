# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**oppSpot** is a production SaaS B2B business intelligence platform for discovering UK & Ireland business opportunities. It's built with Next.js 15, TypeScript, Supabase, and AI-powered features.

## Development Commands

```bash
# Development server (uses Turbopack for faster builds)
npm run dev

# Production build
npm run build
npm run start

# Linting
npm run lint

# Testing (Playwright E2E tests)
npm run test:e2e              # Run all tests
npm run test:e2e:headed       # Run with browser UI
npm run test:e2e:debug        # Debug mode
npm run test:e2e:ui           # Interactive UI mode
npm run test:e2e:auth         # Run auth tests only
npm run test:e2e:search       # Run search tests only
npm run test:e2e:map          # Run map tests only
npm run test:e2e:business     # Run business detail tests only

# Utility scripts
npm run create-account        # Create premium account via script
npm run demo-login            # Demo login script
```

## Critical Installation Note

**Always use `npm install --legacy-peer-deps`** due to react-leaflet-cluster peer dependency conflicts. This is a known issue, not a bug to fix.

The `.npmrc` file is configured with `legacy-peer-deps=true` to handle this automatically in deployment environments like Vercel.

## Build Configuration & Technical Debt

**Current Build Status**: The project has temporary configuration changes to enable deployment while technical debt is being addressed.

### Temporary Build Settings (next.config.ts):
- `eslint.ignoreDuringBuilds: true` - ESLint errors ignored during builds
- `typescript.ignoreBuildErrors: true` - TypeScript errors ignored during builds  
- `output: 'standalone'` - Disables static optimization
- Standard webpack build (Turbopack temporarily disabled)

### Known Technical Debt:
1. **TypeScript Issues**: ~100+ `@typescript-eslint/no-explicit-any` errors across codebase
2. **React Issues**: Multiple `react/no-unescaped-entities` errors in JSX  
3. **Hook Dependencies**: Missing dependencies in useEffect arrays
4. **Unused Variables**: Various unused imports and variables
5. **Next.js 15 Compatibility**: Some route handlers need async params updates

### Priority Technical Debt Cleanup:
1. **High Priority**: Fix async await syntax errors (blocking builds)
2. **Medium Priority**: Replace `any` types with proper TypeScript interfaces
3. **Low Priority**: Clean up unused variables and fix React warnings

**Note**: These configuration changes prioritize deployment stability while maintaining code functionality. Re-enable strict checking after systematic cleanup.

## Architecture Overview

### Next.js App Router Structure
- **`app/`**: Next.js 15 App Router (NOT Pages Router)
  - **`(auth)/`**: Auth route group for login/signup pages
  - **`(dashboard)/`**: Protected dashboard routes
  - **`api/`**: API routes with route.ts files
  - **`business/[id]/`**: Dynamic business detail pages
- **`components/`**: Reusable React components organized by domain
  - **`auth/`**: Authentication components
  - **`ui/`**: shadcn/ui components (DO NOT replace)
  - **`map/`**: Leaflet map components
- **`lib/`**: Core business logic and utilities
  - **`supabase/`**: Database client configurations
  - **`ai/`**: OpenRouter AI integration
  - **`analytics/`**: Predictive analytics engine
  - **`notifications/`**: Real-time notification system

### Key Patterns

#### Supabase Client Usage
```typescript
// Server components/API routes
import { createClient } from '@/lib/supabase/server'

// Client components
import { createClient } from '@/lib/supabase/client'
```

#### API Route Pattern
```typescript
// app/api/*/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ data })
}
```

#### Component Structure
- Use 'use client' directive for interactive components
- Prefer server components when possible
- Import UI components from `@/components/ui/[component]`

## Technology Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Database**: Supabase (PostgreSQL + Auth + Realtime subscriptions)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Maps**: Leaflet (NOT Google Maps embedded)
- **AI**: OpenRouter API for LLM capabilities
- **Email**: Resend for transactional emails
- **State**: Zustand for client state management
- **Testing**: Playwright for E2E tests

## Critical Constraints

### DO NOT:
1. Create files in `pages/` directory (use `app/` with App Router)
2. Use regular `npm install` (always use `--legacy-peer-deps`)
3. Install separate UI packages (use existing shadcn/ui components)
4. Use Google Maps JavaScript API (use Leaflet)
5. Ignore TypeScript strict mode
6. Forget 'use client' for interactive components
7. Make database queries in client components

### Environment Variables
Required for development:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- `RESEND_API_KEY`

## Database Schema Overview

Core tables include:
- `businesses`: Main business entities
- `locations`: Geographic data
- `profiles`: User profiles
- `saved_businesses`: User's saved items
- `business_lists`: Curated business lists
- `market_metrics`: Time-series analytics data
- `notifications`: User notifications system

## Development Workflow

### Adding New Features
1. Plan database schema changes first
2. Create migration in `supabase/migrations/` with timestamp prefix
3. Build API endpoint in `app/api/`
4. Create UI components following existing patterns
5. Add to navigation if needed
6. Run tests before committing

### Type Safety
- Always define TypeScript interfaces
- Use Zod for runtime validation
- Leverage `types/database.ts` for Supabase types
- Never use 'any' type unless absolutely necessary

### Testing Approach
- E2E tests with Playwright
- Tests run on Chromium, Firefox, WebKit, and mobile viewports
- Base URL: `http://localhost:3001` (configurable via PLAYWRIGHT_BASE_URL)
- Test files in `tests/` directory

## Performance Considerations

- Uses Turbopack for faster development builds
- Leaflet clustering for map performance with 1000+ markers
- React.memo for expensive components
- Supabase RLS for security and performance
- Lazy loading for heavy components

## Key Features Implemented

- AI-powered business search with natural language
- Interactive maps with clustering
- Real-time notifications
- Email notification system
- Demo mode for prospects
- Social media tracking
- Predictive analytics engine
- Competitive analysis tools

This is a production SaaS application with real users - maintain high code quality and test thoroughly before making changes.

## Testing & Demo Access

### Demo Mode (Recommended for Testing)
**One-Click Demo Access:**
- Visit `/login` page 
- Click "Try Demo (No Registration)" button
- Instantly access full application with sample data
- Demo banner will appear indicating test mode
- No authentication required

### Manual Test Credentials (Alternative)
If you prefer manual login testing:
```
Email: demo@oppspot.com
Password: Demo123456!
```
- Creates actual test user in database
- Use command: `npm run demo-login` (CLI method)
- Or use credentials manually in login form

### Demo Features
- ✅ Full application access with sample business data
- ✅ Interactive dashboard with metrics and insights  
- ✅ Search functionality with demo results
- ✅ Map visualization with sample locations
- ✅ Business detail views and analytics
- ✅ Visual demo mode indicators
- ✅ Safe testing environment (no real data affected)

**Note**: Demo mode uses static sample data and disables certain destructive actions to protect the testing environment.

## Deployment Information

### Production URLs
- **Primary Vercel Deployment**: https://oppspot-git-main-hirendra-vikrams-projects-5145f119.vercel.app/
- **Vercel Project Dashboard**: https://vercel.com/vikhs-projects/oppspot
- **Custom Domain**: Not yet configured (would be https://oppspot.vercel.app/ or https://oppspot.ai/)
- **Note**: OAuth uses `window.location.origin` dynamically - works with any deployment URL

### Deployment Platform
- **Hosting**: Vercel (automatic deployment on push to main branch)
- **Repository**: https://github.com/hvikram-ai/oppspot
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install --legacy-peer-deps`

### Authentication Configuration

#### Supabase Project
- **Project URL**: https://fuqdbewftdthbjfcecrz.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz

#### Google OAuth Setup
- **Google Cloud Project**: oppspot-auth
- **Client ID**: `263810366717-fq7h33gqehburgsmujusuudqfqkk67ch.apps.googleusercontent.com`
- **OAuth Callback**: `https://fuqdbewftdthbjfcecrz.supabase.co/auth/v1/callback`
- **Setup Guide**: See `GOOGLE_OAUTH_SETUP.md` for complete configuration

### Important URLs for OAuth Configuration
When configuring OAuth providers, use these URLs:

**Authorized JavaScript Origins:**
```
http://localhost:3000
http://localhost:3001
https://oppspot.vercel.app
https://oppspot-git-main-hirendra-vikrams-projects-5145f119.vercel.app
https://oppspot.ai
```

**Authorized Redirect URIs:**
```
https://fuqdbewftdthbjfcecrz.supabase.co/auth/v1/callback
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
https://oppspot.vercel.app/auth/callback
https://oppspot-git-main-hirendra-vikrams-projects-5145f119.vercel.app/auth/callback
https://oppspot.ai/auth/callback
```
