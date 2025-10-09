#!/usr/bin/env python3
"""Fix remaining broken import statements."""

import re
from pathlib import Path

def fix_file(filepath):
    """Fix import statements in a file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # Pattern: import {\nimport type { Row } from '@/lib/supabase/helpers'
        # Replace with: import type { Row } from '@/lib/supabase/helpers'\nimport {
        pattern1 = r"import \{\s*\nimport type \{ Row \} from '@/lib/supabase/helpers'"
        replacement1 = r"import type { Row } from '@/lib/supabase/helpers'\nimport {"
        content = re.sub(pattern1, replacement1, content)

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True

        return False

    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    """Main function."""
    lib_dir = Path('lib')
    if not lib_dir.exists():
        print("Error: lib/ directory not found")
        return 1

    files = list(lib_dir.rglob('*.ts'))
    fixed_count = 0

    for filepath in files:
        if fix_file(filepath):
            print(f"✅ Fixed {filepath}")
            fixed_count += 1

    print(f"\n📊 Fixed {fixed_count} files")
    return 0

if __name__ == '__main__':
    import sys
    sys.exit(main())
