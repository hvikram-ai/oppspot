#!/usr/bin/env python3
"""
Fix misplaced type assertions in Supabase query chains.

Finds patterns like:
  .eq('id', id) as { data: Row<'table'>[] | null; error: any }
  .single() as { data: Row<'table'> | null; error: any }

And converts to:
  .eq('id', id)
  .single() as { data: Row<'table'> | null; error: any }
"""

import re
import sys
from pathlib import Path

def fix_file(filepath):
    """Fix type assertions in a single file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content
        fixes = 0

        # Pattern 1: Type assertion before .single()
        # Match: ) as { data: Row<'...'>[] | null; error: any }
        #        .single() as { data: Row<'...'> | null; error: any }
        pattern1 = r"(\)) as \{ data: Row<'([^']+)'>(\[\])? \| null; error: any \}\s*\n(\s*)\.single\(\) as \{ data: Row<'\2'> \| null; error: any \}"
        replacement1 = r"\1\n\4.single() as { data: Row<'\2'> | null; error: any }"
        content, count = re.subn(pattern1, replacement1, content)
        fixes += count

        # Pattern 2: Type assertion before other query methods
        # List of methods that can follow
        methods = ['or', 'order', 'limit', 'range', 'gte', 'lte', 'gt', 'lt', 'not', 'in', 'contains', 'filter']

        for method in methods:
            pattern = rf"(\)) as \{{ data: Row<'([^']+)'>(\[\])? \| null; error: any \}}\s*\n(\s*)\.{method}\("
            replacement = rf"\1\n\4.{method}("
            content, count = re.subn(pattern, replacement, content)
            fixes += count

        # Pattern 3: Find any remaining type assertions followed by more query chain
        # This is a broader catch-all
        pattern3 = r"(\)) as \{ data: Row<'([^']+)'>(\[\])? \| null; error: any \}\s*\n(\s*)(\.[a-z_]+\()"

        def check_and_replace(match):
            """Check if this needs fixing."""
            paren = match.group(1)
            table = match.group(2)
            array = match.group(3) or ''
            indent = match.group(4)
            next_method = match.group(5)

            # If it's .single() and array notation, we need the single() type
            if next_method == '.single(' and array:
                return f"{paren}\n{indent}{next_method}"
            # For other methods, just remove the assertion
            elif next_method.startswith(('.or(', '.order(', '.limit(', '.range(',
                                        '.gte(', '.lte(', '.gt(', '.lt(',
                                        '.not(', '.in(', '.contains(', '.filter(')):
                return f"{paren}\n{indent}{next_method}"
            # Keep as is for other cases
            return match.group(0)

        content, count = re.subn(pattern3, check_and_replace, content)
        fixes += count

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, fixes

        return False, 0

    except Exception as e:
        print(f"Error processing {filepath}: {e}", file=sys.stderr)
        return False, 0

def main():
    """Main function."""
    # Get all TypeScript files in lib/
    lib_dir = Path('lib')
    if not lib_dir.exists():
        print("Error: lib/ directory not found", file=sys.stderr)
        return 1

    # Get list of files with TS errors from command line or find all .ts files
    if len(sys.argv) > 1:
        files = [Path(f) for f in sys.argv[1:]]
    else:
        files = list(lib_dir.rglob('*.ts'))

    total_fixed = 0
    total_files = 0

    for filepath in files:
        if not filepath.exists():
            continue

        fixed, count = fix_file(filepath)
        if fixed:
            print(f"✅ {filepath}: Fixed {count} assertion(s)")
            total_fixed += count
            total_files += 1
        elif count == 0:
            pass  # Silently skip files with no changes

    print(f"\n📊 Summary: Fixed {total_fixed} assertions in {total_files} files")
    return 0

if __name__ == '__main__':
    sys.exit(main())
