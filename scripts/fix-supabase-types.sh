#!/bin/bash

###############################################################################
# Supabase Type Assertion Fix Script
#
# This script adds type assertions to Supabase queries to fix
# "Property does not exist on type 'never'" errors
#
# Usage:
#   ./scripts/fix-supabase-types.sh [file_or_directory]
#
# Examples:
#   ./scripts/fix-supabase-types.sh app/api
#   ./scripts/fix-supabase-types.sh lib/analytics/trend-analyzer.ts
#   ./scripts/fix-supabase-types.sh  # fixes all files
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
files_processed=0
files_modified=0
errors_before=0
errors_after=0

echo "🔍 Supabase Type Assertion Fix Script"
echo "======================================"
echo ""

# Get initial error count
echo "📊 Counting initial errors..."
errors_before=$(npx tsc --noEmit 2>&1 | grep -c "Property.*does not exist on type 'never'" || true)
echo "Initial errors: $errors_before"
echo ""

# Determine target path
target_path="${1:-.}"

if [ ! -e "$target_path" ]; then
  echo -e "${RED}Error: Path '$target_path' does not exist${NC}"
  exit 1
fi

# Find all TypeScript files
if [ -f "$target_path" ]; then
  files=("$target_path")
else
  mapfile -t files < <(find "$target_path" -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -path "*/.next/*")
fi

total_files=${#files[@]}
echo "Found $total_files TypeScript files to process"
echo ""

# Process each file
for file in "${files[@]}"; do
  echo "Processing: $file"
  files_processed=$((files_processed + 1))

  # Skip if file doesn't contain Supabase queries
  if ! grep -q "\.from\|createClient" "$file"; then
    echo "  ⏭️  Skipping (no Supabase code)"
    continue
  fi

  # Create backup
  cp "$file" "$file.bak"

  modified=false

  # Check if Row import is missing
  if ! grep -q "import type { Row } from '@/lib/supabase/helpers'" "$file"; then
    # Find last import line
    last_import_line=$(grep -n "^import " "$file" | tail -1 | cut -d: -f1)

    if [ -n "$last_import_line" ]; then
      # Add import after last import
      sed -i "${last_import_line}a\\import type { Row } from '@/lib/supabase/helpers'" "$file"
      echo "  ✅ Added Row import"
      modified=true
    fi
  fi

  # Check if file has type errors
  if npx tsc --noEmit "$file" 2>&1 | grep -q "Property.*does not exist on type 'never'"; then
    echo "  ⚠️  File has 'never' errors - manual review recommended"
    echo "     Run: code $file"

    # Restore backup if user wants
    # For now, keep the import we added
  fi

  if [ "$modified" = true ]; then
    files_modified=$((files_modified + 1))
    echo "  ✓ Modified"
  else
    echo "  - No changes"
    # Remove backup if no changes
    rm "$file.bak"
  fi

  echo ""
done

echo "======================================"
echo "✅ Processing complete!"
echo ""
echo "📊 Summary:"
echo "  Files processed: $files_processed"
echo "  Files modified: $files_modified"
echo ""

# Get final error count
echo "📊 Counting remaining errors..."
errors_after=$(npx tsc --noEmit 2>&1 | grep -c "Property.*does not exist on type 'never'" || true)
echo "Remaining errors: $errors_after"

if [ $errors_after -lt $errors_before ]; then
  errors_fixed=$((errors_before - errors_after))
  echo -e "${GREEN}Fixed $errors_fixed errors! 🎉${NC}"
else
  echo -e "${YELLOW}No errors fixed. Manual intervention required.${NC}"
fi

echo ""
echo "⚠️  Important: Type assertions must still be added manually!"
echo "   See TYPESCRIPT_NEVER_ERRORS_FIX.md for patterns and examples"
echo ""
echo "Next steps:"
echo "  1. Review modified files (*.bak are backups)"
echo "  2. Add type assertions using the pattern:"
echo "     .single() as { data: Row<'table_name'> | null; error: any }"
echo "  3. Run: npx tsc --noEmit to verify"
echo "  4. Remove backups: find . -name '*.bak' -delete"
