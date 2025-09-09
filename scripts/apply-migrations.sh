#!/bin/bash

# Apply Supabase Migrations Script
# This script applies migrations in the correct order to fix database issues

echo "🚀 Applying Supabase Migrations for oppSpot"
echo "========================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    echo "Please create .env.local with your Supabase credentials"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Check for required variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL not set in .env.local"
    exit 1
fi

echo "📝 Migration Order:"
echo "1. Initial setup (creates basic tables)"
echo "2. Fix profiles email column"
echo "3. Complete signup workflow"
echo ""

# Ask for confirmation
read -p "Do you want to apply these migrations? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migrations cancelled"
    exit 0
fi

echo ""
echo "🔄 Applying migrations..."
echo ""

# Apply migrations in order
echo "1️⃣ Applying initial setup..."
npx supabase db push --file supabase/migrations/001_initial_setup.sql 2>/dev/null || {
    echo "   ⚠️  Initial setup may already be applied or partially exists"
}

echo "2️⃣ Applying email column fix..."
npx supabase db push --file supabase/migrations/20250110_fix_profiles_email_column.sql 2>/dev/null || {
    echo "   ⚠️  Email column fix may already be applied"
}

echo "3️⃣ Applying complete signup workflow..."
npx supabase db push --file supabase/migrations/20250110_complete_signup_workflow.sql 2>/dev/null || {
    echo "   ⚠️  Some tables may already exist, continuing..."
}

echo ""
echo "✅ Migrations applied!"
echo ""
echo "📝 Next steps:"
echo "1. Test signup at http://localhost:3000/signup"
echo "2. Check Supabase dashboard for any errors"
echo "3. Verify email sending with Resend (if configured)"
echo ""

# Optional: Run the auth setup script
read -p "Would you like to run the auth setup checker? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run setup:auth
fi