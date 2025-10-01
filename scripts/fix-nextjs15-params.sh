#!/bin/bash

echo "🔧 Fixing Next.js 15 async params in route handlers..."

# Find all route.ts files with dynamic segments
FILES=$(find app/api -name "route.ts" -path "*\[*\]*" 2>/dev/null)

for file in $FILES; do
  echo "Processing: $file"

  # Check if file has params in function signature
  if grep -q "{ params }: { params: {" "$file"; then
    # Replace params type to Promise and await params
    sed -i 's/{ params }: { params: {\([^}]*\)} }/{ params }: { params: Promise<{\1}> }/g' "$file"

    # Find all occurrences of params.something and replace with awaited version
    # First add the await statement after user check if not already present
    if ! grep -q "await params" "$file"; then
      # Add await params after the opening of the function
      sed -i '/const scanId = params\./i\  const awaitedParams = await params;' "$file"
      sed -i 's/params\.\([a-zA-Z_][a-zA-Z0-9_]*\)/awaitedParams.\1/g' "$file"

      # Also handle destructured params
      sed -i 's/const { \(.*\) } = params;/const { \1 } = await params;/g' "$file"
      sed -i 's/const \([a-zA-Z_][a-zA-Z0-9_]*\) = params\.\([a-zA-Z_][a-zA-Z0-9_]*\)/const \1 = (await params).\2/g' "$file"
    fi

    echo "  ✅ Fixed: $file"
  fi
done

echo ""
echo "🔧 Fixing Next.js 15 async params in page.tsx files..."

# Find all page.tsx files with dynamic segments
PAGE_FILES=$(find app -name "page.tsx" -path "*\[*\]*" | grep -v ".next" 2>/dev/null)

for file in $PAGE_FILES; do
  echo "Processing: $file"

  # Check if file has params in props
  if grep -q "params:" "$file" && ! grep -q "params: Promise<" "$file"; then
    # Update interface/type definitions
    sed -i 's/params: {/params: Promise<{/g' "$file"
    sed -i 's/params: {\([^}]*\)}/params: Promise<{\1}>/g' "$file"

    # Look for params usage and add await
    if grep -q "const.*=.*await.*paramsPromise" "$file"; then
      echo "  Already has await paramsPromise"
    elif grep -q "const.*params.*=.*await" "$file"; then
      echo "  Already has await params"
    else
      # Add await statement after the function opening
      sed -i '/export.*async.*function.*{/a\  const params = await paramsPromise;' "$file"
    fi

    echo "  ✅ Fixed: $file"
  fi
done

echo ""
echo "✨ Async params fixing complete!"