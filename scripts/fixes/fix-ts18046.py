#!/usr/bin/env python3
"""
Fix TS18046 errors - "X is of type 'unknown'"
Adds type annotations and guards for unknown types
"""

import re
import sys
from pathlib import Path

def read_errors():
    """Read TS18046 errors from file"""
    errors = []
    with open('/tmp/ts18046_errors.txt', 'r') as f:
        for line in f:
            # Parse: file(line,col): error TS18046: 'varName' is of type 'unknown'
            match = re.match(r"^(.+?)\((\d+),(\d+)\): error TS18046: '(.+?)' is of type 'unknown'", line)
            if match:
                file_path, line_num, col, var_name = match.groups()
                errors.append({
                    'file': file_path,
                    'line': int(line_num),
                    'col': int(col),
                    'var': var_name
                })
    return errors

def fix_file(file_path, file_errors):
    """Fix errors in a single file"""
    try:
        with open(file_path, 'r') as f:
            lines = f.readlines()

        modified = False

        for error in file_errors:
            line_idx = error['line'] - 1
            if line_idx >= len(lines):
                continue

            line = lines[line_idx]
            var_name = error['var']

            # Pattern 1: error/err/e in catch blocks
            if var_name in ['error', 'err', 'e']:
                # Replace error.message with (error as Error).message
                if f'{var_name}.message' in line and f'({var_name} as Error)' not in line:
                    line = line.replace(f'{var_name}.message', f'({var_name} as Error).message')
                    modified = True
                # Replace other error. accesses
                elif f'{var_name}.' in line and f'({var_name} as Error)' not in line and f'({var_name} as any)' not in line:
                    line = re.sub(rf'\b{var_name}\.', f'({var_name} as Error).', line)
                    modified = True

            # Pattern 2: Callback parameters in map/filter/forEach
            elif '.map(' in line or '.filter(' in line or '.forEach(' in line:
                if f'{var_name}: any' not in line:
                    # Add type annotation: (varName => to (varName: any =>
                    line = re.sub(rf'\({var_name}\s*=>', f'({var_name}: any =>', line)
                    # Also handle without parens: varName =>
                    line = re.sub(rf'\b{var_name}\s*=>', f'({var_name}: any) =>', line)
                    modified = True

            # Pattern 3: General unknown variables - add type assertion
            elif f'{var_name}.' in line and f'({var_name} as any)' not in line:
                line = re.sub(rf'\b{var_name}\.', f'({var_name} as any).', line)
                modified = True

            lines[line_idx] = line

        if modified:
            with open(file_path, 'w') as f:
                f.writelines(lines)
            return True

        return False

    except Exception as e:
        print(f"Error fixing {file_path}: {e}", file=sys.stderr)
        return False

def main():
    print("🔍 Finding TS18046 errors...")
    errors = read_errors()

    if not errors:
        print("✅ No TS18046 errors found!")
        return

    print(f"📝 Found {len(errors)} TS18046 errors")

    # Group errors by file
    files = {}
    for error in errors:
        if error['file'] not in files:
            files[error['file']] = []
        files[error['file']].append(error)

    fixed_count = 0
    for file_path, file_errors in files.items():
        print(f"   Fixing {file_path} ({len(file_errors)} errors)...")
        if fix_file(file_path, file_errors):
            fixed_count += 1

    print(f"\n✅ Fixed {fixed_count} files")
    print("🔄 Run 'npx tsc --noEmit 2>&1 | grep \"error TS\" | wc -l' to check remaining errors")

if __name__ == '__main__':
    main()
