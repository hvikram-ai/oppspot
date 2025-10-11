#!/usr/bin/env node

/**
 * Script to automatically fix TS2339 "Property does not exist on type 'never'" errors
 * by adding Row type imports and type assertions to Supabase queries
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all lib/ files with TS2339 errors
function getFilesWithErrors() {
  try {
    const output = execSync('npx tsc --noEmit 2>&1 | grep "TS2339" | grep "lib/"', {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });

    const files = {};
    output.split('\n').forEach(line => {
      if (!line.trim()) return;
      const match = line.match(/^([^(]+)\((\d+)/);
      if (match) {
        const file = match[1];
        const lineNum = parseInt(match[2]);
        if (!files[file]) files[file] = [];
        files[file].push({ lineNum, fullLine: line });
      }
    });

    return files;
  } catch (error) {
    console.error('Error getting TypeScript errors:', error.message);
    return {};
  }
}

// Check if file already has Row import
function hasRowImport(content) {
  return /import.*\{.*Row.*\}.*from.*['"]@\/lib\/supabase\/helpers['"]/.test(content);
}

// Add Row import to file
function addRowImport(content) {
  // Find the last import statement
  const importRegex = /^import\s+.*$/gm;
  const imports = content.match(importRegex);

  if (!imports || imports.length === 0) {
    // No imports, add at the top
    return `import type { Row } from '@/lib/supabase/helpers'\n\n` + content;
  }

  const lastImport = imports[imports.length - 1];
  const lastImportIndex = content.lastIndexOf(lastImport);
  const insertPosition = lastImportIndex + lastImport.length;

  return content.slice(0, insertPosition) +
         `\nimport type { Row } from '@/lib/supabase/helpers'` +
         content.slice(insertPosition);
}

// Fix Supabase queries in content
function fixSupabaseQueries(content) {
  // Pattern 1: .single() queries
  content = content.replace(
    /(\bawait\s+(?:this\.)?supabase\s*\n?\s*\.from\(['"]([^'"]+)['"]\)\s*\n?\s*\.select\([^)]+\)(?:\s*\n?\s*\.[^)]+\([^)]*\))*\s*\n?\s*\.single\(\))/g,
    (match, query, table) => {
      if (match.includes(' as {')) return match; // Already typed
      return `${query} as { data: Row<'${table}'> | null; error: any }`;
    }
  );

  // Pattern 2: Array queries with specific columns
  content = content.replace(
    /(\bconst\s*\{\s*data:\s*(\w+)\s*\}\s*=\s*await\s+(?:this\.)?supabase\s*\n?\s*\.from\(['"]([^'"]+)['"]\)\s*\n?\s*\.select\(['"]([^'"]+)['"]\)(?:\s*\n?\s*\.[^)]+\([^)]*\))*)/g,
    (match, query, varName, table, columns) => {
      if (match.includes(' as {')) return match; // Already typed

      // Check if it ends with .single()
      if (match.includes('.single()')) {
        return match; // Will be handled by Pattern 1
      }

      // Check if columns is just '*'
      if (columns === '*') {
        // Check if query ends (no more chained calls after select)
        if (/\)$/.test(match.trim())) {
          return `${query} as { data: Row<'${table}'>[] | null; error: any }`;
        }
      }

      return match;
    }
  );

  // Pattern 3: Simple array queries at end of line
  content = content.replace(
    /(\bawait\s+(?:this\.)?supabase\s*\n?\s*\.from\(['"]([^'"]+)['"]\)(?:\s*\n?\s*\.[a-zA-Z]+\([^)]*\))+)(\s*(?:$|;|\n))/gm,
    (match, query, table, ending) => {
      if (match.includes(' as {')) return match; // Already typed
      if (match.includes('.single()')) return match; // Handled by Pattern 1
      if (match.includes('.insert(')) return match; // Don't type insert
      if (match.includes('.update(')) return match; // Don't type update
      if (match.includes('.delete(')) return match; // Don't type delete
      if (match.includes('.upsert(')) return match; // Don't type upsert

      return `${query} as { data: Row<'${table}'>[] | null; error: any }${ending}`;
    }
  );

  return content;
}

// Process a single file
function processFile(filePath) {
  console.log(`Processing ${filePath}...`);

  try {
    let content = fs.readFileSync(filePath, 'utf-8');

    // Add Row import if missing
    if (!hasRowImport(content)) {
      content = addRowImport(content);
    }

    // Fix Supabase queries
    const originalContent = content;
    content = fixSupabaseQueries(content);

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`  ✓ Updated ${filePath}`);
      return true;
    } else {
      console.log(`  - No changes needed for ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`  ✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
function main() {
  console.log('Finding files with TS2339 errors in lib/ directory...\n');

  const filesWithErrors = getFilesWithErrors();
  const fileList = Object.keys(filesWithErrors).sort();

  console.log(`Found ${fileList.length} files with TS2339 errors\n`);

  let processedCount = 0;
  let updatedCount = 0;

  fileList.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      processedCount++;
      if (processFile(filePath)) {
        updatedCount++;
      }
    } else {
      console.log(`  ⚠ File not found: ${filePath}`);
    }
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Summary:`);
  console.log(`  Files processed: ${processedCount}`);
  console.log(`  Files updated: ${updatedCount}`);
  console.log(`${'='.repeat(60)}\n`);

  console.log('Re-checking TypeScript errors...');
  try {
    const beforeCount = Object.keys(filesWithErrors).reduce((sum, file) => sum + filesWithErrors[file].length, 0);
    const afterOutput = execSync('npx tsc --noEmit 2>&1 | grep "TS2339" | grep "lib/" | wc -l', {
      encoding: 'utf-8'
    });
    const afterCount = parseInt(afterOutput.trim());

    console.log(`\nTS2339 errors in lib/:`);
    console.log(`  Before: ${beforeCount}`);
    console.log(`  After: ${afterCount}`);
    console.log(`  Fixed: ${beforeCount - afterCount}`);
  } catch (error) {
    console.log('Could not count errors');
  }
}

main();
