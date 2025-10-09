#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let filesFixed = 0;
let queriesFixed = 0;

/**
 * Add Row import if not present
 */
function addRowImport(content) {
  if (content.includes("import type { Row } from '@/lib/supabase/helpers'")) {
    return content;
  }

  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^import\s/)) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex === -1) {
    return content;
  }

  lines.splice(lastImportIndex + 1, 0, "import type { Row } from '@/lib/supabase/helpers'");
  return lines.join('\n');
}

/**
 * Fix multi-line queries ending with .single() but no type assertion
 */
function fixMultiLineSingleQueries(content) {
  let modified = content;
  let changesMade = 0;

  // Match: const { data: X } = await supabase\n.from(...)\n.select(...)\n...eq(...)\n.single()
  // WITHOUT: as { data: ...}
  const pattern = /(const\s+{\s*data:\s*(\w+)(?:,\s*error:\s*\w+)?\s*}\s*=\s*await\s+supabase\s*\n\s*\.from\('(\w+)'\)\s*\n\s*\.select\('([^']+)'\)(?:\s*\n\s*\.\w+\([^)]*\))*\s*\n\s*\.single\(\))(?!\s*as\s*{)/gm;

  modified = modified.replace(pattern, (match, fullMatch, varName, tableName, fields) => {
    // Parse fields
    const fieldList = fields.split(',').map(f => f.trim().replace(/\s+/g, ' '));
    const pickFields = fieldList
      .filter(f => !f.includes('(') && !f.includes('!') && !f.includes(':'))
      .map(f => f.split('.')[0].trim())
      .filter(f => f && f !== '*');

    const typeAssertion = pickFields.length > 0 && pickFields[0] !== '*'
      ? `Pick<Row<'${tableName}'>, ${pickFields.map(f => `'${f}'`).join(' | ')}>`
      : `Row<'${tableName}'>`;

    changesMade++;
    return `${match} as { data: ${typeAssertion} | null; error: any }`;
  });

  queriesFixed += changesMade;
  return modified;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Skip if no Supabase usage
    if (!content.includes('supabase') || !content.includes('.from(')) {
      return;
    }

    // Add import
    content = addRowImport(content);

    // Fix queries
    content = fixMultiLineSingleQueries(content);

    // Only write if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      filesFixed++;
      console.log(`✓ Fixed: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Walk directory recursively
 */
function walkDirectory(dir, callback) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        walkDirectory(filePath, callback);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      callback(filePath);
    }
  }
}

// Main execution
const targetDir = process.argv[2] || './app/api';
const startDir = path.resolve(process.cwd(), targetDir);

console.log(`🔍 Scanning ${targetDir} for remaining type errors....\n`);

walkDirectory(startDir, processFile);

console.log(`\n✅ Complete!`);
console.log(`   Files fixed: ${filesFixed}`);
console.log(`   Queries fixed: ${queriesFixed}`);
console.log(`\n📊 Run TypeScript to verify: npx tsc --noEmit | grep "does not exist on type 'never'" | wc -l`);
