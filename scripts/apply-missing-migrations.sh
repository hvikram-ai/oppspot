#!/bin/bash

# Script to apply missing migrations to production database
# This fixes the 404 errors for team_activities, user_presence, and RPC functions

set -e

# Database connection details
DB_HOST="aws-0-eu-west-2.pooler.supabase.com"
DB_USER="postgres.fuqdbewftdthbjfcecrz"
DB_NAME="postgres"
DB_PORT="6543"
DB_PASSWORD="TCLP-oppSpot3"

echo "========================================="
echo "Applying Missing Migrations"
echo "========================================="
echo ""

# Function to execute SQL file
execute_sql_file() {
    local file=$1
    local description=$2

    echo "📄 Applying: $description"
    echo "   File: $file"

    if [ ! -f "$file" ]; then
        echo "   ⚠️  File not found, skipping..."
        return
    fi

    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f "$file" 2>&1; then
        echo "   ✅ Success"
    else
        echo "   ❌ Failed (may already exist)"
    fi
    echo ""
}

# Apply migrations in order
echo "Step 1: RBAC Permissions"
execute_sql_file "supabase/migrations/20251031_rbac_permissions.sql" "RBAC permission functions (get_user_permissions)"

echo "Step 2: TeamPlay™ Collaboration Features"
execute_sql_file "supabase/migrations/20251002000005_teamplay.sql" "TeamPlay tables (team_activities, user_presence, comments)"

echo "Step 3: Collaboration Triggers"
execute_sql_file "supabase/migrations/20251012000001_collaboration_triggers.sql" "Collaboration triggers and functions"

echo "Step 4: Stream Workflow"
execute_sql_file "supabase/migrations/20251031000003_stream_workflow.sql" "Stream workflow tables and functions"

echo "Step 5: Feedback System"
execute_sql_file "supabase/migrations/20251031060948_feedback_system.sql" "Feedback system tables"

echo "Step 6: Competitive Intelligence"
execute_sql_file "supabase/migrations/20251031_competitive_intelligence.sql" "Competitive intelligence features"

echo ""
echo "========================================="
echo "Verifying Tables"
echo "========================================="
echo ""

PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT << 'EOF'
\echo 'Checking for team_activities table:'
SELECT CASE
    WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'team_activities' AND schemaname = 'public')
    THEN '✅ team_activities exists'
    ELSE '❌ team_activities missing'
END;

\echo ''
\echo 'Checking for user_presence table:'
SELECT CASE
    WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_presence' AND schemaname = 'public')
    THEN '✅ user_presence exists'
    ELSE '❌ user_presence missing'
END;

\echo ''
\echo 'Checking for comments table:'
SELECT CASE
    WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'comments' AND schemaname = 'public')
    THEN '✅ comments exists'
    ELSE '❌ comments missing'
END;

\echo ''
\echo 'Checking for get_user_permissions function:'
SELECT CASE
    WHEN EXISTS (SELECT FROM pg_proc WHERE proname = 'get_user_permissions')
    THEN '✅ get_user_permissions exists'
    ELSE '❌ get_user_permissions missing'
END;

\echo ''
\echo 'Checking for upsert_user_presence function:'
SELECT CASE
    WHEN EXISTS (SELECT FROM pg_proc WHERE proname = 'upsert_user_presence')
    THEN '✅ upsert_user_presence exists'
    ELSE '❌ upsert_user_presence missing'
END;
EOF

echo ""
echo "========================================="
echo "Migration Application Complete"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Refresh your browser to clear the 404 errors"
echo "2. Check the browser console for any remaining errors"
echo "3. Test the TeamPlay features (activity feed, presence)"
