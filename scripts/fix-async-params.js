#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all route.ts files with dynamic segments
const routeFiles = glob.sync('app/api/**/*\\[*\\]*/route.ts');

console.log(`Found ${routeFiles.length} dynamic route files to fix`);

routeFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // Pattern 1: Fix function signatures with { params }
  // From: { params: { id: string } }
  // To: { params: Promise<{ id: string }> }
  const paramPattern = /\{\s*params\s*\}\s*:\s*\{\s*params:\s*\{([^}]+)\}\s*\}/g;
  if (paramPattern.test(content)) {
    content = content.replace(paramPattern, '{ params }: { params: Promise<{$1}> }');
    modified = true;
  }

  // Pattern 2: Fix the actual params usage
  // Add await before params usage
  const functionPattern = /(export\s+async\s+function\s+(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*\([^)]*\)\s*\{)/g;
  const matches = content.match(functionPattern);

  if (matches) {
    // Check if params is used without await
    if (content.includes('params.') && !content.includes('await params')) {
      // Add await at the beginning of the function
      content = content.replace(functionPattern, (match) => {
        return match + '\n  const params = await params;';
      });
      modified = true;
    }
  }

  // Pattern 3: Fix destructured params
  // From: const { id } = params;
  // To: const { id } = await params;
  content = content.replace(/const\s+\{([^}]+)\}\s*=\s*params(?!Promise)/g, 'const {$1} = await params');

  // Pattern 4: Fix type definitions in interfaces
  content = content.replace(
    /interface\s+\w+Props\s*\{[^}]*params:\s*\{([^}]+)\}[^}]*\}/g,
    (match) => {
      if (!match.includes('Promise<')) {
        return match.replace(/params:\s*\{/, 'params: Promise<{').replace(/\}([^}]*)$/, '}>$1');
      }
      return match;
    }
  );

  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`✅ Fixed: ${file}`);
  }
});

// Also fix page.tsx files with params
const pageFiles = glob.sync('app/**/\\[*\\]/page.tsx');
console.log(`\nFound ${pageFiles.length} dynamic page files to fix`);

pageFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // Fix page component props
  if (content.includes('params:') && !content.includes('params: Promise<')) {
    content = content.replace(
      /params:\s*\{([^}]+)\}/g,
      'params: Promise<{$1}>'
    );

    // Add await in the component
    content = content.replace(
      /(export\s+(?:default\s+)?(?:async\s+)?function\s+\w+[^{]*\{)/g,
      (match) => {
        if (!content.includes('await params') && !content.includes('await paramsPromise')) {
          return match + '\n  const params = await paramsPromise;';
        }
        return match;
      }
    );

    modified = true;
  }

  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`✅ Fixed: ${file}`);
  }
});

console.log('\n✨ Async params fixing complete!');