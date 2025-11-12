#!/bin/bash

# Fix shebang errors by moving #!/usr/bin/env node to line 1
# and moving ESLint disable comments after the shebang

FILES=(
  "/home/vik/oppspot/lib/opp-scan/test-runner.js"
  "/home/vik/oppspot/scripts/apply-companies-house-migration.cjs"
  "/home/vik/oppspot/scripts/check-profiles-columns.cjs"
  "/home/vik/oppspot/scripts/check-user-profiles.cjs"
  "/home/vik/oppspot/scripts/create-account.cjs"
  "/home/vik/oppspot/scripts/fix-database.cjs"
  "/home/vik/oppspot/scripts/fix-rls-policies.cjs"
  "/home/vik/oppspot/scripts/quick-test-signup.cjs"
  "/home/vik/oppspot/scripts/reset-user-password.cjs"
  "/home/vik/oppspot/scripts/run-all-migrations.cjs"
  "/home/vik/oppspot/scripts/run-migrations.cjs"
  "/home/vik/oppspot/scripts/setup-complete-user.cjs"
  "/home/vik/oppspot/scripts/test-auth-simple.cjs"
  "/home/vik/oppspot/scripts/test-ch-full.cjs"
  "/home/vik/oppspot/scripts/test-ch-integration.cjs"
  "/home/vik/oppspot/scripts/test-companies-house-simple.cjs"
  "/home/vik/oppspot/scripts/test-companies-house.cjs"
  "/home/vik/oppspot/scripts/test-login-api.cjs"
  "/home/vik/oppspot/scripts/test-login.cjs"
  "/home/vik/oppspot/scripts/test-opp-scan.cjs"
  "/home/vik/oppspot/scripts/test-saved-businesses.cjs"
  "/home/vik/oppspot/scripts/test-signup-api.cjs"
  "/home/vik/oppspot/scripts/test-signup-insert.cjs"
  "/home/vik/oppspot/scripts/test-supabase-auth.cjs"
  "/home/vik/oppspot/scripts/verify-org-id.cjs"
)

echo "Fixing shebang errors in 25 files..."

for file in "${FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo "Processing: $file"

    # Check if file has shebang on line 2
    if sed -n '2p' "$file" | grep -q '^#!/usr/bin/env node'; then
      # Get first line (usually ESLint comment)
      first_line=$(sed -n '1p' "$file")

      # Create temp file with correct order:
      # 1. Shebang
      # 2. ESLint comment (if it exists)
      # 3. Rest of file (skip first 2 lines)

      if [[ "$first_line" == "/* eslint-disable"* ]]; then
        # Has ESLint comment on line 1
        {
          echo "#!/usr/bin/env node"
          echo "$first_line"
          tail -n +3 "$file"
        } > "${file}.tmp"
      else
        # No ESLint comment, just move shebang up
        {
          echo "#!/usr/bin/env node"
          tail -n +2 "$file"
        } > "${file}.tmp"
      fi

      # Replace original file
      mv "${file}.tmp" "$file"
      echo "  ✓ Fixed shebang in $file"
    else
      echo "  ⊘ Shebang not on line 2, skipping"
    fi
  else
    echo "  ✗ File not found: $file"
  fi
done

echo ""
echo "✅ Shebang fix complete! Run 'npm run lint' to verify."
