#!/bin/bash

# Fix duplicate import type { statements caused by sed

find lib -name "*.ts" -type f | while read -r file; do
    # Check if file has duplicate "import type {" pattern
    if grep -q "import type {" "$file"; then
        # Use perl to fix duplicate consecutive "import type {" lines
        perl -i -0pe 's/import type \{\s*\nimport type \{ Row/import type { Row\nimport type {/g' "$file"
       
        perl -i -0pe 's/import type \{\s*\nimport type \{/import type {/g' "$file"
    fi
done

echo "✅ Fixed duplicate import statements"
