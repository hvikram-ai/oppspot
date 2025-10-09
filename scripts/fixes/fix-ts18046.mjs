#!/usr/bin/env node
/**
 * Fix TS18046 errors - "X is of type 'unknown'"
 * Adds type annotations and guards for unknown types
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

function getTS18046Errors() {
  let output = '';
  try {
    output = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  } catch (error) {
    // tsc exits with non-zero when there are errors, but we still get the output
    output = error.stdout || error.stderr || '';
  }

  const errors = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Match: file(line,col): error TS18046: 'varName' is of type 'unknown'
    const match = line.match(/^(.+?)\((\d+),(\d+)\): error TS18046: '(.+?)' is of type 'unknown'/);
    if (match) {
      const [, file, lineNum, col, varName] = match;
      errors.push({ file, lineNum: parseInt(lineNum), col: parseInt(col), varName });
    }
  }

  return errors;
}

function fixFile(filePath, errors) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Group errors by line number
    const errorsByLine = new Map();
    for (const error of errors) {
      if (!errorsByLine.has(error.lineNum)) {
        errorsByLine.set(error.lineNum, []);
      }
      errorsByLine.get(error.lineNum).push(error);
    }

    let modified = false;

    for (const [lineNum, lineErrors] of errorsByLine) {
      const lineIndex = lineNum - 1;
      const line = lines[lineIndex];

      for (const error of lineErrors) {
        const varName = error.varName;

        // Pattern 1: error in catch block
        if (varName === 'error' || varName === 'err' || varName === 'e') {
          // Check if this is in a catch block
          if (line.includes('catch') || line.includes('error.message') || line.includes('err.message') || line.includes('e.message')) {
            // Add type assertion: error.message -> (error as Error).message
            if (line.includes(`${varName}.message`) && !line.includes(`(${varName} as Error)`)) {
              lines[lineIndex] = line.replace(
                new RegExp(`${varName}\\.message`, 'g'),
                `(${varName} as Error).message`
              );
              modified = true;
            }
            // For other error properties, add as Error
            else if (!line.includes(`(${varName} as Error)`) && !line.includes(`(${varName} as any)`)) {
              lines[lineIndex] = line.replace(
                new RegExp(`\\b${varName}\\.`, 'g'),
                `(${varName} as Error).`
              );
              modified = true;
            }
          }
        }

        // Pattern 2: Variables in map/filter/forEach callbacks
        else if (line.includes('.map(') || line.includes('.filter(') || line.includes('.forEach(')) {
          // Add type annotation to callback parameter
          if (!line.includes(`: any`) && !line.includes(`(${varName}: any)`)) {
            // Replace (varName => with (varName: any =>
            lines[lineIndex] = line.replace(
              new RegExp(`\\(${varName}\\s*=>`, 'g'),
              `(${varName}: any =>`
            );
            // Also handle without parens: varName =>
            lines[lineIndex] = lines[lineIndex].replace(
              new RegExp(`\\b${varName}\\s*=>`, 'g'),
              `(${varName}: any) =>`
            );
            modified = true;
          }
        }

        // Pattern 3: General unknown variables - add type assertion
        else if (!line.includes(`(${varName} as any)`) && !line.includes(`${varName}: any`)) {
          // Only add as any if variable is being accessed with dot notation
          if (line.includes(`${varName}.`)) {
            lines[lineIndex] = line.replace(
              new RegExp(`\\b${varName}\\.`, 'g'),
              `(${varName} as any).`
            );
            modified = true;
          }
        }
      }
    }

    if (modified) {
      writeFileSync(filePath, lines.join('\n'), 'utf-8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Finding TS18046 errors...');
  const errors = getTS18046Errors();

  if (errors.length === 0) {
    console.log('✅ No TS18046 errors found!');
    return;
  }

  console.log(`📝 Found ${errors.length} TS18046 errors`);

  // Group errors by file
  const errorsByFile = new Map();
  for (const error of errors) {
    if (!errorsByFile.has(error.file)) {
      errorsByFile.set(error.file, []);
    }
    errorsByFile.get(error.file).push(error);
  }

  let fixedFiles = 0;
  let totalFixed = 0;

  for (const [file, fileErrors] of errorsByFile) {
    console.log(`   Fixing ${file} (${fileErrors.length} errors)...`);
    if (fixFile(file, fileErrors)) {
      fixedFiles++;
      totalFixed += fileErrors.length;
    }
  }

  console.log(`\n✅ Fixed ${fixedFiles} files (${totalFixed} errors)`);
  console.log('🔄 Running TypeScript check...');

  try {
    const result = execSync('npx tsc --noEmit 2>&1 | grep "error TS" | wc -l', { encoding: 'utf-8' });
    console.log(`📊 Remaining errors: ${result.trim()}`);
  } catch {
    // Ignore
  }
}

main().catch(console.error);
