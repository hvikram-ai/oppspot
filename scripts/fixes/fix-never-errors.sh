#!/bin/bash

# Fix "Property does not exist on type 'never'" errors in Supabase queries
# This script adds explicit type assertions to common query patterns

set -e

echo "Fixing type 'never' errors in Supabase queries..."

# Find all TypeScript files in app/api
find ./app/api -name "*.ts" -type f | while read -r file; do
  # Check if file already has the Row import
  if ! grep -q "import type { Row } from '@/lib/supabase/helpers'" "$file" 2>/dev/null; then
    # Check if file has supabase imports
    if grep -q "from '@/lib/supabase/" "$file" 2>/dev/null; then
      # Add the import after the last import statement
      last_import_line=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
      if [ -n "$last_import_line" ]; then
        sed -i "${last_import_line}a import type { Row } from '@/lib/supabase/helpers'" "$file"
        echo "✓ Added import to $file"
      fi
    fi
  fi
done

echo "✓ Imports added"
echo "Now run TypeScript compiler to identify remaining errors"
echo "Run: npx tsc --noEmit 2>&1 | grep \"does not exist on type 'never'\" | wc -l"
