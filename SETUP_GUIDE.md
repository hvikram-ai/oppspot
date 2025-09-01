# oppSpot - Setup & Migration Guide

## 🚀 Quick Start (for new Mac machine)

### Prerequisites Check
```bash
# Check Node.js version (should be 18.17.0+)
node --version

# Check npm version (should be 9.0.0+)
npm --version

# Check git
git --version
```

### Step 1: Install Required Software

#### Install Node.js (if not installed)
```bash
# Using Homebrew (recommended for Mac)
brew install node

# Or download from https://nodejs.org/
```

#### Install Supabase CLI
```bash
# macOS
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

### Step 2: Clone and Setup Project

```bash
# Clone the repository
git clone [your-repo-url] oppspot
cd oppspot

# Install dependencies (IMPORTANT: use --legacy-peer-deps)
npm install --legacy-peer-deps

# If you encounter issues, try:
npm cache clean --force
npm install --legacy-peer-deps
```

### Step 3: Environment Configuration

1. Create `.env.local` file:
```bash
cp .env.example .env.local
```

2. Update `.env.local` with your credentials:
```env
# Supabase (from your Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenRouter API (get from https://openrouter.ai/)
OPENROUTER_API_KEY=sk-or-v1-...

# Google APIs (from Google Cloud Console)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
GOOGLE_PLACES_API_KEY=...

# Resend (get from https://resend.com/)
RESEND_API_KEY=re_...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=oppSpot
```

### Step 4: Database Setup

#### Option A: Use Existing Supabase Project
```bash
# Link to existing project
npx supabase link --project-ref [your-project-ref]

# Push migrations
npx supabase db push
```

#### Option B: Create New Supabase Project
1. Go to https://supabase.com/dashboard
2. Create new project
3. Copy connection details to `.env.local`
4. Run migrations:

```bash
# Initialize Supabase
npx supabase init

# Link to project
npx supabase link --project-ref [your-project-ref]

# Run all migrations in order
npx supabase db push
```

### Step 5: Run the Application

```bash
# Development mode
npm run dev

# Open http://localhost:3000
```

## 📦 Migration from Another Machine

### On Source Machine
```bash
# 1. Ensure all changes are committed
git add .
git commit -m "Migration checkpoint"
git push origin main

# 2. Export environment variables (secure transfer)
cat .env.local > env-backup.txt

# 3. Note any local Supabase changes
npx supabase db diff
```

### On Target Machine (Mac)
```bash
# 1. Clone repository
git clone [repo-url] oppspot
cd oppspot

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Setup environment
# Copy env-backup.txt content to .env.local

# 4. Link Supabase
npx supabase link --project-ref [your-project-ref]

# 5. Verify database is up to date
npx supabase db push

# 6. Start development
npm run dev
```

## 🛠️ Common Issues & Solutions

### Issue 1: Peer Dependency Conflicts
```bash
# Always use:
npm install --legacy-peer-deps

# If persists:
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
```

### Issue 2: Supabase Connection Issues
```bash
# Check Supabase status
npx supabase status

# Restart Supabase
npx supabase stop
npx supabase start
```

### Issue 3: Port 3000 Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 [PID]

# Or use different port
PORT=3001 npm run dev
```

### Issue 4: TypeScript Errors
```bash
# Clear TypeScript cache
rm -rf .next
npm run dev
```

### Issue 5: Map Not Loading
- Check Google Maps API key is valid
- Ensure billing is enabled on Google Cloud
- Check browser console for errors

## 📝 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Type checking
npm run typecheck

# Format code
npm run format

# Database migrations
npx supabase migration new [migration_name]
npx supabase db push
npx supabase db reset

# Generate types from database
npx supabase gen types typescript --local > types/supabase.ts
```

## 🔄 Daily Workflow

### Starting Development
```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
npm install --legacy-peer-deps

# 3. Run migrations if needed
npx supabase db push

# 4. Start dev server
npm run dev
```

### Before Committing
```bash
# 1. Run linter
npm run lint

# 2. Run type check
npm run typecheck

# 3. Test build
npm run build

# 4. Commit changes
git add .
git commit -m "feat: your feature description"
git push origin [branch-name]
```

## 🚀 Deployment

### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy from main branch

### Manual Deployment
```bash
# Build application
npm run build

# Preview production build
npm start

# Deploy to Vercel
vercel --prod
```

## 📱 Testing

### Browser Testing
- Chrome DevTools for responsive design
- Network tab for API monitoring
- Console for error checking

### Database Testing
```bash
# Access Supabase Studio
npx supabase studio

# Run SQL queries directly
npx supabase db query "SELECT * FROM businesses LIMIT 10"
```

## 🔑 API Keys & Services Setup

### 1. Supabase
- Create account at https://supabase.com
- Create new project
- Go to Settings > API
- Copy URL and keys

### 2. OpenRouter
- Sign up at https://openrouter.ai
- Create API key
- Add credits ($5 minimum recommended)

### 3. Google APIs
- Go to https://console.cloud.google.com
- Create new project
- Enable Maps JavaScript API
- Enable Places API
- Create credentials (API key)
- Restrict key to your domains

### 4. Resend
- Sign up at https://resend.com
- Verify domain
- Create API key
- Add DNS records

## 🆘 Support

### Resources
- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs
- Project Issues: [GitHub Issues]

### Common Contacts
- Technical Issues: Check PROJECT_DOCUMENTATION.md
- Database Schema: Check supabase/migrations/
- API Documentation: Check app/api/*/route.ts files

## ✅ Setup Checklist

- [ ] Node.js 18.17.0+ installed
- [ ] npm 9.0.0+ installed
- [ ] Git configured
- [ ] Repository cloned
- [ ] Dependencies installed with --legacy-peer-deps
- [ ] .env.local configured
- [ ] Supabase project created
- [ ] Supabase linked
- [ ] Migrations run
- [ ] Development server running
- [ ] Can access http://localhost:3000
- [ ] Can search businesses
- [ ] Map loads correctly
- [ ] Demo mode works
- [ ] Can sign up/login

## 🎉 Success Indicators

You know setup is complete when:
1. Homepage loads at http://localhost:3000
2. Demo mode works (/demo page)
3. Search returns results
4. Map displays properly
5. No console errors
6. All environment variables loaded