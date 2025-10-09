#!/usr/bin/env node

/**
 * Script to fix "Property does not exist on type 'never'" errors
 * by adding explicit type assertions to Supabase queries
 */

const fs = require('fs');
const path = require('path');

// Common patterns to fix
const fixes = [
  // Pattern 1: profiles table with org_id
  {
    pattern: /const { data: (\w+) } = await supabase\s+\.from\('profiles'\)\s+\.select\('org_id'\)\s+\.eq\('id', user\.id\)\s+\.single\(\)/g,
    replacement: (match, varName) =>
      `const { data: ${varName} } = await supabase\n      .from('profiles')\n      .select('org_id')\n      .eq('id', user.id)\n      .single() as { data: Pick<Row<'profiles'>, 'org_id'> | null; error: any }`
  },
  // Pattern 2: profiles table with org_id and role
  {
    pattern: /const { data: (\w+) } = await supabase\s+\.from\('profiles'\)\s+\.select\('org_id, role'\)\s+\.eq\('id', user\.id\)\s+\.single\(\)/g,
    replacement: (match, varName) =>
      `const { data: ${varName} } = await supabase\n      .from('profiles')\n      .select('org_id, role')\n      .eq('id', user.id)\n      .single() as { data: Pick<Row<'profiles'>, 'org_id' | 'role'> | null; error: any }`
  },
  // Pattern 3: profiles table with role only
  {
    pattern: /const { data: (\w+) } = await supabase\s+\.from\('profiles'\)\s+\.select\('role'\)\s+\.eq\('id', user\.id\)\s+\.single\(\)/g,
    replacement: (match, varName) =>
      `const { data: ${varName} } = await supabase\n      .from('profiles')\n      .select('role')\n      .eq('id', user.id)\n      .single() as { data: Pick<Row<'profiles'>, 'role'> | null; error: any }`
  }
];

function addImportIfNeeded(content) {
  if (content.includes("import type { Row } from '@/lib/supabase/helpers'")) {
    return content;
  }

  // Find the last import statement
  const importRegex = /^import\s.*from\s['"].*['"];?$/gm;
  const matches = [...content.matchAll(importRegex)];

  if (matches.length === 0) return content;

  const lastImport = matches[matches.length - 1];
  const insertPos = lastImport.index + lastImport[0].length;

  return content.slice(0, insertPos) +
         "\nimport type { Row } from '@/lib/supabase/helpers';" +
         content.slice(insertPos);
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Apply each fix pattern
  for (const fix of fixes) {
    const newContent = content.replace(fix.pattern, fix.replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }

  // Add import if we made changes
  if (modified) {
    content = addImportIfNeeded(content);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed: ${filePath}`);
    return true;
  }

  return false;
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      callback(filePath);
    }
  }
}

// Main execution
const targetDir = process.argv[2] || './app/api';
let fixedCount = 0;

console.log(`Scanning ${targetDir} for type 'never' errors...`);

walkDir(targetDir, (filePath) => {
  if (fixFile(filePath)) {
    fixedCount++;
  }
});

console.log(`\n✓ Fixed ${fixedCount} files`);
