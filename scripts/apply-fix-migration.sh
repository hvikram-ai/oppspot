#!/bin/bash

# Apply missing database objects fix
# This script applies the fix migration to create missing RPC functions and tables

echo "🔧 Applying database fixes for missing objects..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Project not linked to Supabase."
    echo "Please run: supabase link --project-ref fuqdbewftdthbjfcecrz"
    exit 1
fi

echo "📦 Applying migration: 20251110_fix_missing_objects.sql"
supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "The following objects have been created/fixed:"
    echo "  - get_user_permissions() function"
    echo "  - has_permission() function"
    echo "  - team_activities table"
    echo "  - Required indexes and RLS policies"
    echo ""
    echo "🎉 Your database is now up to date!"
else
    echo ""
    echo "❌ Migration failed. Please check the errors above."
    echo ""
    echo "Alternative: Apply the migration manually via Supabase Dashboard:"
    echo "1. Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new"
    echo "2. Copy and paste the contents of: supabase/migrations/20251110_fix_missing_objects.sql"
    echo "3. Click 'Run'"
    exit 1
fi
