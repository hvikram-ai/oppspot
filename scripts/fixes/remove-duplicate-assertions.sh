#!/bin/bash

# Remove duplicate type assertions like:
# .single() as { data: ... } as { data: ... }

echo "Removing duplicate type assertions..."

find ./app/api -name "*.ts" -type f | while read -r file; do
  # Check if file has duplicate assertions
  if grep -q ') as { data:.*} as { data:' "$file" 2>/dev/null; then
    # Remove duplicates - keep only the first assertion
    perl -i -pe 's/(\) as \{ data: [^}]+\})(?: as \{ data: [^}]+\})+/$1/g' "$file"
    echo "✓ Fixed duplicates in: $file"
  fi
done

echo "✓ Done removing duplicates"
