#!/bin/bash
# Fix TS18046 errors by adding type annotations

echo "🔍 Processing TS18046 errors..."

# Read errors and fix them
while IFS= read -r line; do
  # Extract file path and line number
  if [[ $line =~ ^([^:]+):([0-9]+):[0-9]+:.*\'([^\']+)\'\ is\ of\ type\ \'unknown\' ]]; then
    file=$(echo "$line" | cut -d'(' -f1)
    linenum=$(echo "$line" | cut -d'(' -f2 | cut -d',' -f1)
    varname=$(echo "$line" | sed "s/.*'\([^']*\)' is of type 'unknown'.*/\1/")

    if [ -f "$file" ]; then
      # Read the actual line
      actual_line=$(sed -n "${linenum}p" "$file")

      # Check if it's an error variable in catch block
      if [[ "$varname" == "error" ]] || [[ "$varname" == "err" ]] || [[ "$varname" == "e" ]]; then
        # Check if line contains error.message or similar
        if [[ "$actual_line" =~ $varname\.message ]]; then
          # Replace error.message with (error as Error).message
          sed -i "${linenum}s/${varname}\.message/(${varname} as Error).message/g" "$file"
          echo "Fixed $file:$linenum - error.message"
        elif [[ "$actual_line" =~ $varname\. ]] && [[ ! "$actual_line" =~ "as Error" ]]; then
          # Replace error. with (error as Error).
          sed -i "${linenum}s/\\b${varname}\\./(&{varname} as Error)./g" "$file"
        fi
      # Check if it's in a map/filter callback
      elif [[ "$actual_line" =~ \.map\(|\.filter\(|\.forEach\( ]]; then
        # Add type annotation to callback
        if [[ ! "$actual_line" =~ "${varname}: any" ]]; then
          # Try to add type annotation
          sed -i "${linenum}s/(${varname} =>/(${varname}: any =>/g" "$file"
          sed -i "${linenum}s/\\b${varname} =>/(${varname}: any) =>/g" "$file"
          echo "Fixed $file:$linenum - callback parameter"
        fi
      # General case - add as any type assertion
      elif [[ "$actual_line" =~ $varname\. ]] && [[ ! "$actual_line" =~ "as any" ]]; then
        sed -i "${linenum}s/\\b${varname}\\./(${varname} as any)./g" "$file"
        echo "Fixed $file:$linenum - type assertion"
      fi
    fi
  fi
done < /tmp/ts18046_errors.txt

echo ""
echo "✅ Fix complete. Running type check..."
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
