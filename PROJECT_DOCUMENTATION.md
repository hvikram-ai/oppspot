# oppSpot - Complete Project Documentation

## 🎯 Project Overview

**oppSpot** is an AI-powered B2B business intelligence platform that helps users discover and analyze UK & Ireland business opportunities. It combines smart search, predictive analytics, real-time monitoring, and competitive intelligence in a modern web application.

### Core Value Proposition
- Discover businesses across UK & Ireland with AI-powered search
- Track competitors and market trends in real-time
- Identify opportunities with predictive analytics
- Streamline lead generation and qualification

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15.1.6 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components, Framer Motion
- **Backend**: Next.js API Routes, Supabase (PostgreSQL + Auth + Realtime)
- **AI/ML**: OpenRouter API for LLM features
- **Maps**: Leaflet + React Leaflet for interactive maps
- **Email**: Resend for transactional emails

### Project Structure
```
oppspot/
├── app/                    # Next.js app router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Main app pages
│   ├── api/               # API endpoints
│   └── demo/              # Demo mode page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── business/         # Business-related components
│   ├── search/           # Search components
│   ├── map/              # Map components
│   ├── analytics/        # Analytics dashboard
│   ├── notifications/    # Notification system
│   └── demo/             # Demo mode components
├── lib/                   # Core libraries
│   ├── supabase/         # Supabase client
│   ├── ai/               # AI/LLM integration
│   ├── analytics/        # Analytics engine
│   ├── notifications/    # Notification service
│   ├── scraping/         # Web scraping
│   └── demo/             # Demo mode logic
├── supabase/             # Database migrations
│   └── migrations/       # SQL migration files
├── public/               # Static assets
└── styles/              # Global styles
```

## 🚀 Features Implemented

### 1. **Authentication System**
- Email/password authentication
- Google OAuth integration
- Role-based access control (admin, user, viewer)
- Protected routes and middleware

### 2. **Business Search & Discovery**
- Natural language search with AI
- Advanced filters (category, location, rating, etc.)
- Real-time search suggestions
- Saved searches and alerts

### 3. **Interactive Maps**
- Leaflet-based map visualization
- Business clustering
- Heat maps for market density
- Custom markers and popups
- Territory visualization

### 4. **Business Profiles**
- Comprehensive business information
- Contact details and opening hours
- Reviews and ratings
- Social media presence
- Competitor analysis
- Updates and news feed

### 5. **List Management**
- Create and manage business lists
- Share lists with team members
- Export to CSV/Excel
- Bulk operations

### 6. **Competitive Intelligence**
- Competitor tracking
- Side-by-side comparisons
- Market positioning analysis
- Strength/weakness assessment
- Competitive alerts

### 7. **Predictive Analytics**
- Market trend analysis
- Demand forecasting (ARIMA, exponential smoothing)
- Opportunity identification
- Risk assessment
- Growth predictions

### 8. **Notification System**
- Real-time in-app notifications
- Email notifications (via Resend)
- Push notifications (browser)
- Customizable preferences
- Notification templates

### 9. **Social Media & Web Scraping**
- Website metadata extraction
- Social media profile discovery
- Technology stack detection
- SEO analysis
- Contact information extraction

### 10. **Demo Mode**
- No-login live demo
- Sample data exploration
- Feature restrictions
- Upgrade prompts
- Full UI experience

## 📊 Database Schema

### Core Tables
- `profiles` - User profiles and roles
- `businesses` - Business entities
- `locations` - Geographic locations
- `business_updates` - Business news/updates
- `saved_businesses` - User's saved businesses
- `saved_searches` - Saved search queries
- `business_lists` - User-created lists
- `competitor_sets` - Competitor groups
- `notifications` - User notifications
- `notification_preferences` - Notification settings

### Analytics Tables
- `market_metrics` - Historical market data
- `trend_analysis` - Trend calculations
- `demand_forecasts` - Demand predictions
- `opportunities` - Identified opportunities
- `anomalies` - Detected anomalies
- `market_signals` - Real-time signals

### Social/Web Tables
- `social_media_profiles` - Social presence
- `website_data` - Scraped website info
- `social_metrics_history` - Social metrics over time

## 🔌 API Endpoints

### Business APIs
- `GET /api/businesses` - Search businesses
- `GET /api/businesses/[id]` - Get business details
- `POST /api/businesses/save` - Save business
- `POST /api/businesses/social` - Scrape social data

### Analytics APIs
- `GET /api/analytics/trends` - Get trend analysis
- `GET /api/analytics/forecasts` - Get demand forecasts
- `GET /api/analytics/opportunities` - Get opportunities
- `POST /api/analytics/collect` - Collect metrics

### Notification APIs
- `GET /api/notifications` - Get notifications
- `POST /api/notifications` - Create notification
- `PATCH /api/notifications` - Mark as read
- `GET /api/notifications/preferences` - Get preferences

### Demo APIs
- `GET /api/demo/businesses` - Get demo businesses
- `GET /api/demo/analytics` - Get demo analytics

## 🔐 Environment Variables

### Required
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenRouter API (for AI features)
OPENROUTER_API_KEY=your_openrouter_api_key

# Google APIs
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
GOOGLE_PLACES_API_KEY=your_places_api_key

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=oppSpot
```

### Optional
```env
# Analytics
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

## 🚦 Current Status

### ✅ Completed Features
- Core authentication system
- Business search and discovery
- Interactive maps
- Business profiles
- List management
- Competitive analysis
- Predictive analytics
- Notification system
- Social media tracking
- Demo mode

### 🚧 In Progress
- Mobile responsiveness improvements
- Performance optimizations
- Additional data sources

### 📋 TODO/Roadmap
1. **AI-Powered Lead Scoring**
   - ML models for lead qualification
   - Conversion probability prediction
   - Custom scoring rules

2. **Email Campaign Integration**
   - Mailchimp/SendGrid integration
   - Campaign management
   - Performance tracking

3. **Review Management**
   - Multi-platform aggregation
   - Sentiment analysis
   - Response templates

4. **Mobile App (PWA)**
   - Progressive Web App
   - Offline functionality
   - Native app features

5. **API & Webhooks**
   - Public API
   - Webhook events
   - Developer documentation

## 🐛 Known Issues

1. **Peer Dependencies**: react-leaflet-cluster has peer dependency conflicts. Always use `npm install --legacy-peer-deps`

2. **TypeScript Warnings**: Some strict mode warnings in components (non-breaking)

3. **Map Performance**: Large datasets (>1000 markers) may cause performance issues

4. **Demo Mode**: Some features may not work perfectly in demo mode

## 🔧 Development Workflow

### Git Branches
- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

### Code Style
- TypeScript with strict mode
- ESLint configuration
- Prettier for formatting
- Conventional commits

### Testing Strategy
- Unit tests (Jest) - TODO
- Integration tests (Playwright) - TODO
- E2E tests - TODO

## 📚 Key Libraries & Their Purpose

- **Supabase**: Backend, auth, database, realtime
- **OpenRouter**: AI/LLM features for search and insights
- **Leaflet**: Interactive maps
- **Cheerio**: Web scraping
- **Resend**: Email notifications
- **Framer Motion**: Animations
- **React Hook Form + Zod**: Form handling and validation
- **Recharts**: Data visualization
- **date-fns**: Date manipulation

## 🎨 Design System

### Colors
- Primary: Blue (#3B82F6)
- Secondary: Purple (#8B5CF6)
- Success: Green (#10B981)
- Warning: Orange (#F59E0B)
- Error: Red (#EF4444)

### Typography
- Font: Inter
- Headings: Bold, various sizes
- Body: Regular, 14-16px

### Components
- shadcn/ui components
- Custom business components
- Consistent spacing (4px grid)
- Dark mode support

## 🚀 Deployment

### Vercel Deployment
- Auto-deploy from main branch
- Environment variables in Vercel dashboard
- Edge functions for API routes

### Supabase Setup
- Create project
- Run migrations
- Configure auth providers
- Set up RLS policies

## 📞 Support & Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)

### Internal Docs
- `/REQUIREMENTS.md` - System requirements
- `/SETUP_GUIDE.md` - Setup instructions
- `/AI_CONTEXT.md` - AI agent context

## 🤝 Contributing

### Setup
1. Clone repository
2. Install dependencies: `npm install --legacy-peer-deps`
3. Copy `.env.example` to `.env.local`
4. Run migrations: `npx supabase db push --local`
5. Start dev server: `npm run dev`

### Making Changes
1. Create feature branch
2. Make changes
3. Test thoroughly
4. Create pull request
5. Review and merge

## 📄 License

Proprietary - All rights reserved