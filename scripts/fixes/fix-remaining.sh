#!/bin/bash

# Fix remaining type assertion issues using sed

# Pattern: .select('*') as { type } followed by more methods
find lib -name "*.ts" -type f -exec sed -i -E "s/\.select\('([^']*)'\) as \{ data: Row<'([^']+)'>(\[\])? \| null; error: any \}\s*$/\.select('\1')/g" {} \;

# Pattern: Type assertion inside function arguments
find lib -name "*.ts" -type f -exec sed -i -E "s/identifier\.toUpperCase\(\) as \{ data: Row<[^}]+\}/identifier.toUpperCase()/g" {} \;

# Pattern: .select(...) as { type } \n .eq(...)
# Convert to: .select(...) \n .eq(...) 
find lib -name "*.ts" -type f -exec perl -i -pe 's/\.select\(([^\)]+)\) as \{ data: Row<([^>]+)>(\[\])? \| null; error: any \}\s*\n(\s*)\.eq\(/\.select($1)\n$4\.eq(/g' {} \;

# Pattern: .from(...) as { type } \n .select(...)
find lib -name "*.ts" -type f -exec perl -i -pe 's/\.from\(([^\)]+)\) as \{ data: Row<([^>]+)>(\[\])? \| null; error: any \}\s*\n(\s*)\.select\(/\.from($1)\n$4\.select(/g' {} \;

# Pattern: any method as { type } \n any method
find lib -name "*.ts" -type f -exec perl -i -pe 's/\)  as \{ data: Row<([^>]+)>(\[\])? \| null; error: any \}\s*\n(\s*)\./)\n$3\./g' {} \;

echo "✅ Fixed remaining type assertion issues"
