#!/bin/bash
# ================================================
# M&A Predictions Migration Verification Script
# ================================================
# This script verifies that the M&A prediction database
# migration was applied successfully.
#
# Usage: ./scripts/verify-ma-migration.sh
# ================================================

set -e

echo "================================================"
echo "M&A Predictions Migration Verification"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ ERROR: DATABASE_URL not set${NC}"
  echo "Please set DATABASE_URL environment variable or add to .env.local"
  exit 1
fi

echo "✓ Database URL configured"
echo ""

# Function to run SQL and check result
run_check() {
  local description=$1
  local sql=$2
  local expected=$3

  echo -n "Checking: $description... "

  result=$(psql "$DATABASE_URL" -t -c "$sql" 2>&1 || echo "ERROR")

  if [[ "$result" == *"ERROR"* ]] || [[ "$result" == *"error"* ]]; then
    echo -e "${RED}❌ FAILED${NC}"
    echo "  Error: $result"
    return 1
  fi

  result_trimmed=$(echo "$result" | xargs)

  if [ -n "$expected" ] && [ "$result_trimmed" != "$expected" ]; then
    echo -e "${YELLOW}⚠ UNEXPECTED${NC}"
    echo "  Expected: $expected"
    echo "  Got: $result_trimmed"
    return 1
  fi

  echo -e "${GREEN}✓ PASSED${NC}"
  return 0
}

# Check 1: Tables exist
echo "================================================"
echo "1. Checking Tables"
echo "================================================"

tables=(
  "ma_predictions"
  "ma_prediction_factors"
  "ma_valuation_estimates"
  "ma_acquirer_profiles"
  "ma_historical_deals"
  "ma_prediction_queue"
  "ma_prediction_audit_log"
)

table_count=0
for table in "${tables[@]}"; do
  if run_check "Table $table exists" \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='$table' AND table_schema='public'" \
    "1"; then
    ((table_count++))
  fi
done

echo ""
echo "Tables found: $table_count / ${#tables[@]}"
echo ""

# Check 2: RLS enabled
echo "================================================"
echo "2. Checking Row Level Security (RLS)"
echo "================================================"

for table in "${tables[@]}"; do
  run_check "RLS enabled on $table" \
    "SELECT CASE WHEN relrowsecurity THEN 'enabled' ELSE 'disabled' END FROM pg_class WHERE relname='$table'" \
    "enabled" || true
done

echo ""

# Check 3: Indexes
echo "================================================"
echo "3. Checking Indexes"
echo "================================================"

run_check "Index on ma_predictions.company_id" \
  "SELECT COUNT(*) FROM pg_indexes WHERE tablename='ma_predictions' AND indexname='idx_ma_predictions_company'" \
  "1" || true

run_check "Index on ma_predictions.likelihood" \
  "SELECT COUNT(*) FROM pg_indexes WHERE tablename='ma_predictions' AND indexname='idx_ma_predictions_likelihood'" \
  "1" || true

echo ""

# Check 4: Trigger
echo "================================================"
echo "4. Checking Database Trigger"
echo "================================================"

run_check "Trigger function exists" \
  "SELECT COUNT(*) FROM pg_proc WHERE proname='trigger_ma_recalculation'" \
  "1" || true

run_check "Trigger attached to businesses table" \
  "SELECT COUNT(*) FROM pg_trigger WHERE tgname='businesses_update_trigger'" \
  "1" || true

echo ""

# Check 5: RLS Policies
echo "================================================"
echo "5. Checking RLS Policies"
echo "================================================"

run_check "ma_predictions has SELECT policy for authenticated" \
  "SELECT COUNT(*) FROM pg_policies WHERE tablename='ma_predictions' AND policyname='ma_predictions_select_authenticated'" \
  "1" || true

run_check "ma_audit_log prevents updates (immutable)" \
  "SELECT COUNT(*) FROM pg_policies WHERE tablename='ma_prediction_audit_log' AND policyname='ma_audit_no_update'" \
  "1" || true

echo ""

# Check 6: Constraints
echo "================================================"
echo "6. Checking Constraints"
echo "================================================"

run_check "ma_predictions.prediction_score check (0-100)" \
  "SELECT COUNT(*) FROM pg_constraint WHERE conname LIKE '%prediction_score%' AND contype='c'" \
  "1" || true

run_check "ma_predictions unique active constraint" \
  "SELECT COUNT(*) FROM pg_constraint WHERE conname='ma_predictions_unique_active'" \
  "1" || true

echo ""

# Check 7: Sample data structure
echo "================================================"
echo "7. Checking Table Structures"
echo "================================================"

run_check "ma_predictions has 14 columns" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='ma_predictions'" \
  "14" || true

run_check "ma_prediction_factors has 10 columns" \
  "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='ma_prediction_factors'" \
  "10" || true

echo ""

# Summary
echo "================================================"
echo "Verification Summary"
echo "================================================"

if [ $table_count -eq ${#tables[@]} ]; then
  echo -e "${GREEN}✓ All tables created successfully${NC}"
  echo -e "${GREEN}✓ Migration appears to be applied correctly${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Create seed data (T008): supabase/seeds/ma_historical_deals.sql"
  echo "  2. Write contract tests (T010-T012)"
  echo "  3. Implement services and API routes"
else
  echo -e "${RED}❌ Some tables are missing${NC}"
  echo "Please apply the migration: supabase/migrations/20251030_ma_predictions.sql"
  exit 1
fi

echo ""
echo "================================================"
echo "Verification Complete"
echo "================================================"
