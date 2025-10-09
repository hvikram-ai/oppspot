#!/usr/bin/env node

/**
 * Automated script to fix "Property does not exist on type 'never'" errors
 *
 * This script:
 * 1. Finds files with 'never' type errors
 * 2. Adds the Row type import if missing
 * 3. Adds type assertions to Supabase queries
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all files with 'never' errors
function getFilesWithErrors() {
  try {
    const output = execSync('npx tsc --noEmit 2>&1 | grep "Property.*does not exist on type \'never\'" | sed "s/(.*//" | sort -u', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });

    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

// Check if file already has Row import
function hasRowImport(content) {
  return content.includes("import type { Row } from '@/lib/supabase/helpers'");
}

// Add Row import after other imports
function addRowImport(content) {
  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, "import type { Row } from '@/lib/supabase/helpers'");
    return lines.join('\n');
  }

  return content;
}

// Add type assertions to Supabase queries
function addTypeAssertions(content) {
  // Pattern 1: .single() without type assertion
  content = content.replace(
    /\.single\(\)(?!\s+as\s+\{)/g,
    ".single() as { data: Row<'TABLE'> | null; error: any }"
  );

  // Pattern 2: Query ending with order() without type assertion for arrays
  content = content.replace(
    /\.order\([^)]+\)(?!\s+as\s+\{)/g,
    (match) => `${match} as { data: Row<'TABLE'>[] | null; error: any }`
  );

  // Pattern 3: Simple select queries without order or single
  content = content.replace(
    /\.select\([^)]+\)[\s\n]*(?:\.eq\([^)]+\)|\.in\([^)]+\)|\.neq\([^)]+\)|\.gt\([^)]+\)|\.lt\([^)]+\)|\.gte\([^)]+\)|\.lte\([^)]+\)|\.like\([^)]+\)|\.ilike\([^)]+\)|\.is\([^)]+\)|\.filter\([^)]+\))*[\s\n]*(?!\.(single|order|limit|as))/g,
    (match) => `${match} as { data: Row<'TABLE'>[] | null; error: any }`
  );

  return content;
}

// Try to infer table name from context
function inferTableName(content, queryMatch) {
  // Look for .from('table_name') before the query
  const fromMatch = queryMatch.match(/\.from\(['"]([\w_]+)['"]\)/);
  if (fromMatch) {
    return fromMatch[1];
  }
  return null;
}

// Replace TABLE placeholder with actual table names
function replaceTablePlaceholders(content) {
  const lines = content.split('\n');
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("Row<'TABLE'>")) {
      // Look backwards to find the table name
      let tableName = null;
      for (let j = i; j >= 0 && j >= i - 10; j--) {
        const prevLine = lines[j];
        const fromMatch = prevLine.match(/\.from\(['"]([\w_]+)['"]\)/);
        if (fromMatch) {
          tableName = fromMatch[1];
          break;
        }
      }

      if (tableName) {
        result.push(line.replace(/Row<'TABLE'>/g, `Row<'${tableName}'>`));
      } else {
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

// Process a single file
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = content;

    // Add Row import if missing
    if (!hasRowImport(modified)) {
      modified = addRowImport(modified);
    }

    // Add type assertions
    modified = addTypeAssertions(modified);

    // Replace TABLE placeholders
    modified = replaceTablePlaceholders(modified);

    // Only write if content changed
    if (modified !== content) {
      fs.writeFileSync(filePath, modified, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
function main() {
  console.log('🔍 Finding files with "never" type errors...');
  const files = getFilesWithErrors();

  if (files.length === 0) {
    console.log('✅ No files with "never" errors found!');
    return;
  }

  console.log(`📝 Found ${files.length} files with errors`);

  let processed = 0;
  let modified = 0;

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${file}`);
      continue;
    }

    console.log(`Processing: ${file}`);
    const wasModified = processFile(fullPath);

    processed++;
    if (wasModified) {
      modified++;
      console.log(`  ✓ Modified`);
    } else {
      console.log(`  - No changes needed`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Total files processed: ${processed}`);
  console.log(`  Files modified: ${modified}`);
  console.log('\n✅ Done! Run "npx tsc --noEmit" to verify fixes.');
}

main();
