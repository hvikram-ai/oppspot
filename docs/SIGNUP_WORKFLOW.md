# Signup Workflow Documentation

## Overview
The oppSpot signup workflow provides a complete user registration experience with email verification, organization creation, and onboarding.

## Features
- ✅ Email/password registration
- ✅ Google OAuth integration  
- ✅ Real-time password strength indicator
- ✅ Email verification system
- ✅ Organization & profile creation
- ✅ Multi-step onboarding wizard
- ✅ 30-day trial activation
- ✅ Demo mode access

## Setup Instructions

### 1. Database Setup

Apply the migration to create necessary tables:

```bash
# Using Supabase CLI
npx supabase db push

# Or apply the migration file directly
psql -h YOUR_DB_HOST -U YOUR_DB_USER -d YOUR_DB_NAME -f supabase/migrations/20250110_complete_signup_workflow.sql
```

### 2. Environment Configuration

Add these to your `.env.local`:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (Optional but recommended)
RESEND_API_KEY=your-resend-api-key

# Site URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000  # https://oppspot.ai in production
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # https://oppspot.ai in production
```

### 3. Supabase Dashboard Configuration

1. **Authentication Settings** (Authentication → Settings):
   - Enable Email Confirmations: ON
   - Confirm Email Change: ON
   - Secure Email Change: ON

2. **Site URL Configuration**:
   - Site URL: `https://oppspot.ai` (production) or `http://localhost:3000` (development)

3. **Redirect URLs** (add all):
   - `http://localhost:3000/**`
   - `https://oppspot.ai/**`
   - `https://www.oppspot.ai/**`

4. **Email Templates** (Authentication → Email Templates):
   - Customize the confirmation email
   - Set verification URL: `{{ .SiteURL }}/auth/verify?token={{ .Token }}&email={{ .Email }}`

### 4. Run Setup Script

```bash
npm run setup:auth
```

This script will:
- Verify database connection
- Check environment variables
- Provide configuration checklist
- Optionally create test data

## User Flow

### Registration Flow
1. User visits `/signup`
2. Fills out registration form:
   - Full Name
   - Email (with validation)
   - Password (with strength indicator)
   - Company Name
   - Role selection
   - Terms acceptance
3. On submit:
   - Supabase auth user created
   - Organization created
   - Profile created
   - Welcome email sent
   - Redirected to `/onboarding`

### Email Verification Flow
1. User receives verification email
2. Clicks verification link
3. Token validated via `/api/email/verify`
4. Profile marked as verified
5. Redirected to success page

### Onboarding Flow
1. **Step 1: Company Info**
   - Industry selection
   - Company size

2. **Step 2: Goals**
   - Select search goals
   - Set preferences

3. **Step 3: Feature Tour**
   - Introduction to key features
   - Trial confirmation

4. Completion redirects to `/dashboard`

## Database Schema

### Core Tables

```sql
organizations
├── id (UUID, primary key)
├── name (text)
├── slug (text, unique)
├── subscription_tier (text)
├── settings (jsonb)
└── timestamps

profiles
├── id (UUID, references auth.users)
├── org_id (UUID, references organizations)
├── full_name (text)
├── email (text)
├── role (text)
├── preferences (jsonb)
├── email_verified_at (timestamp)
├── trial_ends_at (timestamp)
└── timestamps

events
├── id (UUID)
├── user_id (UUID, references profiles)
├── event_type (text)
├── metadata (jsonb)
└── created_at (timestamp)
```

## API Endpoints

### POST `/api/auth/signup`
Creates organization and profile after Supabase auth signup.

**Request:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "fullName": "John Doe",
  "companyName": "Acme Inc",
  "role": "founder"
}
```

### GET/POST `/api/email/verify`
Handles email verification tokens.

### POST `/api/auth/resend-verification`
Resends verification email to user.

## Component Structure

```
components/auth/
├── signup-form.tsx       # Main signup form with validation
├── login-form.tsx        # Login form component
├── forgot-password-form.tsx
└── verify-email-form.tsx

app/
├── signup/page.tsx       # Signup page
├── login/page.tsx        # Login page
├── onboarding/page.tsx   # Onboarding wizard
└── auth/
    ├── verify/page.tsx   # Email verification
    └── verify-success/page.tsx
```

## Security Features

1. **Password Requirements**:
   - Minimum 8 characters
   - Strength indicator
   - Real-time validation

2. **Email Verification**:
   - Token-based verification
   - 24-hour expiry
   - One-time use tokens

3. **Row Level Security (RLS)**:
   - Users can only view/edit own profile
   - Organization members can view each other
   - Events tracked per user

## Testing

### Manual Testing Checklist
- [ ] Signup with email/password
- [ ] Password strength indicator works
- [ ] Email validation works
- [ ] Terms checkbox required
- [ ] Verification email received
- [ ] Verification link works
- [ ] Onboarding flow completes
- [ ] Profile created in database
- [ ] Organization created
- [ ] Trial activated (30 days)

### Test Commands
```bash
# Run E2E tests
npm run test:e2e:auth

# Test signup manually
npm run dev
# Visit http://localhost:3000/signup

# Create test account via script
npm run create-account
```

## Troubleshooting

### Common Issues

1. **"Failed to create organization"**
   - Check Supabase service role key
   - Verify tables exist (run migrations)
   - Check RLS policies

2. **Email not sending**
   - Verify RESEND_API_KEY is set
   - Check Resend domain verification
   - Review email logs in Resend dashboard

3. **Verification link not working**
   - Check Site URL in Supabase
   - Verify redirect URLs configured
   - Check token expiry (24 hours)

4. **OAuth not working**
   - Enable provider in Supabase dashboard
   - Configure OAuth app credentials
   - Add redirect URLs

## Production Deployment

1. **Update environment variables in Vercel**:
   ```
   NEXT_PUBLIC_APP_URL=https://oppspot.ai
   NEXT_PUBLIC_SITE_URL=https://oppspot.ai
   ```

2. **Configure Supabase for production**:
   - Update Site URL to `https://oppspot.ai`
   - Add production redirect URLs
   - Enable email confirmations
   - Configure custom SMTP if needed

3. **Domain configuration**:
   - Verify domain in Resend for custom email sending
   - Configure SPF/DKIM records

## Monitoring

Track these metrics:
- Signup conversion rate
- Email verification rate
- Onboarding completion rate
- Time to first action
- Trial to paid conversion

Use Supabase dashboard for:
- Auth logs
- User growth
- Database metrics
- Failed signups

## Future Enhancements

- [ ] Social login (LinkedIn, Microsoft)
- [ ] Magic link authentication
- [ ] 2FA/MFA support
- [ ] Team invitations
- [ ] SSO for enterprise
- [ ] Progressive profiling
- [ ] Referral system
- [ ] Waitlist mode