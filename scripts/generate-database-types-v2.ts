#!/usr/bin/env ts-node
/**
 * Generate complete types/database.ts from all migration files
 * Version 2: Improved parser with better column extraction
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  hasDefault: boolean;
}

interface Table {
  name: string;
  columns: Column[];
}

// Map SQL types to TypeScript types
function sqlToTs(sqlType: string): string {
  const type = sqlType.toUpperCase().trim();

  if (type.includes('TEXT') || type.includes('VARCHAR') || type.includes('CHAR') || type.includes('INET')) {
    return 'string';
  }
  if (type.includes('INT') || type.includes('SERIAL') || type.includes('DECIMAL') || type.includes('NUMERIC') || type.includes('REAL') || type.includes('DOUBLE')) {
    return 'number';
  }
  if (type.includes('BOOL')) {
    return 'boolean';
  }
  if (type.includes('TIMESTAMP') || type.includes('DATE') || type.includes('TIME')) {
    return 'string';
  }
  if (type.includes('UUID')) {
    return 'string';
  }
  if (type.includes('JSON')) {
    return 'Json';
  }
  if (type.match(/\[\]$/)) {
    // Array type
    const baseType = sqlToTs(type.replace(/\[\]$/, ''));
    return `${baseType}[]`;
  }

  return 'unknown';
}

// Clean SQL comments from a line
function removeComments(line: string): string {
  // Remove inline comments
  return line.replace(/--.*$/, '').trim();
}

// Parse CREATE TABLE statements from SQL
function parseCreateTable(sql: string): Table | null {
  // Match CREATE TABLE or CREATE TABLE IF NOT EXISTS
  const tableMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\(/i);
  if (!tableMatch) return null;

  const tableName = tableMatch[1];
  const columns: Column[] = [];

  // Extract content between parentheses - handle nested parens
  const bodyStart = sql.indexOf('(', tableMatch.index!) + 1;
  let parenDepth = 1;
  let bodyEnd = bodyStart;

  for (let i = bodyStart; i < sql.length; i++) {
    if (sql[i] === '(') parenDepth++;
    if (sql[i] === ')') parenDepth--;
    if (parenDepth === 0) {
      bodyEnd = i;
      break;
    }
  }

  const body = sql.substring(bodyStart, bodyEnd);

  // Split by newlines and process
  const lines = body.split('\n');
  let currentColumn = '';

  for (let i = 0; i < lines.length; i++) {
    const line = removeComments(lines[i]).trim();
    if (!line) continue;

    // If line doesn't end with comma, it might continue
    if (!line.endsWith(',') && i < lines.length - 1) {
      currentColumn += ' ' + line;
      continue;
    } else {
      currentColumn += ' ' + line;
    }

    // Remove trailing comma
    currentColumn = currentColumn.replace(/,\s*$/, '').trim();

    // Skip constraints
    if (currentColumn.match(/^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE\s*\(|CHECK\s*\(|REFERENCES)/i)) {
      currentColumn = '';
      continue;
    }

    // Parse column: name TYPE [constraints]
    const colMatch = currentColumn.match(/^([a-zA-Z0-9_]+)\s+([A-Z0-9_]+(?:\([^)]+\))?(?:\s*\[\])?)/i);
    if (colMatch) {
      const colName = colMatch[1];
      const colType = colMatch[2];

      // Check for NOT NULL
      const nullable = !currentColumn.toUpperCase().includes('NOT NULL');

      // Check for DEFAULT or PRIMARY KEY (has default)
      const hasDefault = currentColumn.toUpperCase().includes('DEFAULT') ||
                        currentColumn.toUpperCase().includes('PRIMARY KEY');

      columns.push({
        name: colName,
        type: sqlToTs(colType),
        nullable,
        hasDefault,
      });
    }

    currentColumn = '';
  }

  return { name: tableName, columns };
}

// Generate TypeScript type for a table
function generateTableType(table: Table): string {
  const { name, columns } = table;

  if (columns.length === 0) return '';

  let result = `      ${name}: {\n`;

  // Row type
  result += `        Row: {\n`;
  for (const col of columns) {
    const type = col.nullable ? `${col.type} | null` : col.type;
    result += `          ${col.name}: ${type}\n`;
  }
  result += `        }\n`;

  // Insert type
  result += `        Insert: {\n`;
  for (const col of columns) {
    const optional = col.hasDefault || col.nullable;
    const type = col.nullable ? `${col.type} | null` : col.type;
    result += `          ${col.name}${optional ? '?' : ''}: ${type}\n`;
  }
  result += `        }\n`;

  // Update type
  result += `        Update: {\n`;
  for (const col of columns) {
    const type = col.nullable ? `${col.type} | null` : col.type;
    result += `          ${col.name}?: ${type}\n`;
  }
  result += `        }\n`;

  result += `      }\n`;

  return result;
}

// Main function
function main() {
  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
  const outputFile = join(__dirname, '..', 'types', 'database.ts');

  console.log('Reading migrations from:', migrationsDir);

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const tables: Table[] = [];
  const tableNames = new Set<string>();

  for (const file of files) {
    const content = readFileSync(join(migrationsDir, file), 'utf-8');

    // Find all CREATE TABLE statements - improved regex
    const createTablePattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[a-zA-Z0-9_]+\s*\([^;]*?\);/gis;

    // Split by semicolons to handle multi-statement migrations
    const statements = content.split(/;/);

    for (const statement of statements) {
      if (statement.toUpperCase().includes('CREATE TABLE')) {
        // Add semicolon back for parser
        const fullStatement = statement + ';';
        const table = parseCreateTable(fullStatement);
        if (table && !tableNames.has(table.name) && table.columns.length > 0) {
          tables.push(table);
          tableNames.add(table.name);
          console.log(`Found table: ${table.name} (${table.columns.length} columns)`);
        }
      }
    }
  }

  console.log(`\nTotal tables found: ${tables.length}`);

  // Generate TypeScript file
  let output = `export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]\n\n`;
  output += `export interface Database {\n`;
  output += `  public: {\n`;
  output += `    Tables: {\n`;

  // Sort tables alphabetically
  tables.sort((a, b) => a.name.localeCompare(b.name));

  for (const table of tables) {
    output += generateTableType(table);
  }

  output += `    }\n`;
  output += `    Views: {\n`;
  output += `      [_ in never]: never\n`;
  output += `    }\n`;
  output += `    Functions: {\n`;
  output += `      [_ in never]: never\n`;
  output += `    }\n`;
  output += `    Enums: {\n`;
  output += `      [_ in never]: never\n`;
  output += `    }\n`;
  output += `    CompositeTypes: {\n`;
  output += `      [_ in never]: never\n`;
  output += `    }\n`;
  output += `  }\n`;
  output += `}\n`;

  writeFileSync(outputFile, output, 'utf-8');
  console.log(`\nGenerated ${outputFile}`);
  console.log(`Total tables: ${tables.length}`);
  console.log(`Total lines: ${output.split('\n').length}`);
}

main();
