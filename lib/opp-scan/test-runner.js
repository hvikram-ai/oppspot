#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Test Runner Script for Opp Scan
 * Provides convenient commands to run different types of tests
 */

const { spawn } = require('child_process')
const path = require('path')

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
}

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`
}

function printHeader(title) {
  console.log('')
  console.log(colorize('cyan', '='.repeat(60)))
  console.log(colorize('cyan', `  ${title}`))
  console.log(colorize('cyan', '='.repeat(60)))
  console.log('')
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code)
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })
  })
}

async function runTests(type, description) {
  printHeader(description)
  
  try {
    const jestCommand = 'npx'
    const args = ['jest', '--config', 'jest.config.js']
    
    switch (type) {
      case 'unit':
        args.push('--selectProjects', 'unit')
        break
      case 'integration':
        args.push('--selectProjects', 'integration')
        break
      case 'e2e':
        args.push('--selectProjects', 'e2e')
        break
      case 'domain':
        args.push('__tests__/domain/')
        break
      case 'application':
        args.push('__tests__/application/')
        break
      case 'infrastructure':
        args.push('__tests__/infrastructure/')
        break
      case 'compatibility':
        args.push('__tests__/compatibility/')
        break
      case 'coverage':
        args.push('--coverage', '--coverageReporters', 'text', 'html')
        break
      case 'watch':
        args.push('--watch', '--selectProjects', 'unit')
        break
      case 'ci':
        args.push('--ci', '--coverage', '--watchAll=false')
        break
      default:
        // Run all tests
        break
    }

    await runCommand(jestCommand, args)
    console.log(colorize('green', `\n✅ ${description} completed successfully!`))
    
  } catch (error) {
    console.log(colorize('red', `\n❌ ${description} failed!`))
    console.log(colorize('red', error.message))
    process.exit(1)
  }
}

function printUsage() {
  console.log(colorize('yellow', '\nOpp Scan Test Runner'))
  console.log(colorize('white', '\nUsage: node test-runner.js [command]'))
  console.log(colorize('white', '\nCommands:'))
  console.log(colorize('white', '  all           Run all tests'))
  console.log(colorize('white', '  unit          Run unit tests only'))
  console.log(colorize('white', '  integration   Run integration tests only'))
  console.log(colorize('white', '  e2e           Run end-to-end tests only'))
  console.log(colorize('white', '  domain        Run domain layer tests'))
  console.log(colorize('white', '  application   Run application layer tests'))
  console.log(colorize('white', '  infrastructure Run infrastructure layer tests'))
  console.log(colorize('white', '  compatibility Run compatibility tests'))
  console.log(colorize('white', '  coverage      Run all tests with coverage report'))
  console.log(colorize('white', '  watch         Run tests in watch mode'))
  console.log(colorize('white', '  ci            Run tests in CI mode'))
  console.log(colorize('white', '  lint          Run linting'))
  console.log(colorize('white', '  type-check    Run TypeScript type checking'))
  console.log(colorize('white', '  validate      Run all validation (lint + type-check + tests)'))
  console.log(colorize('white', '  help          Show this help message'))
  console.log('')
}

async function runLinting() {
  printHeader('Running ESLint')
  
  try {
    await runCommand('npx', ['eslint', '.', '--ext', '.ts,.js'])
    console.log(colorize('green', '\n✅ Linting passed!'))
  } catch (error) {
    console.log(colorize('red', '\n❌ Linting failed!'))
    throw error
  }
}

async function runTypeCheck() {
  printHeader('Running TypeScript Type Check')
  
  try {
    await runCommand('npx', ['tsc', '--noEmit'])
    console.log(colorize('green', '\n✅ Type checking passed!'))
  } catch (error) {
    console.log(colorize('red', '\n❌ Type checking failed!'))
    throw error
  }
}

async function runValidation() {
  printHeader('Running Complete Validation Suite')
  
  try {
    await runLinting()
    await runTypeCheck()
    await runTests('all', 'All Tests')
    
    console.log(colorize('green', '\n🎉 All validations passed!'))
    console.log(colorize('green', 'Code is ready for deployment.'))
    
  } catch (error) {
    console.log(colorize('red', '\n💥 Validation failed!'))
    process.exit(1)
  }
}

function printTestSummary() {
  console.log('')
  console.log(colorize('magenta', '📊 Test Suite Summary'))
  console.log(colorize('white', '━'.repeat(40)))
  console.log(colorize('white', '• Domain Layer:        Business logic & entities'))
  console.log(colorize('white', '• Application Layer:   Use cases & services'))
  console.log(colorize('white', '• Infrastructure:      External integrations'))
  console.log(colorize('white', '• Compatibility:       Legacy API compatibility'))
  console.log(colorize('white', '• End-to-End:         Complete workflows'))
  console.log('')
  console.log(colorize('cyan', '🎯 Coverage Targets'))
  console.log(colorize('white', '━'.repeat(40)))
  console.log(colorize('white', '• Domain Entities:     95% functions, 90% lines'))
  console.log(colorize('white', '• Domain Events:       90% functions, 85% lines'))
  console.log(colorize('white', '• Overall:             85% functions, 85% lines'))
  console.log('')
}

async function main() {
  const command = process.argv[2] || 'help'

  switch (command) {
    case 'all':
      await runTests('all', 'All Tests')
      break
      
    case 'unit':
      await runTests('unit', 'Unit Tests')
      break
      
    case 'integration':
      await runTests('integration', 'Integration Tests')
      break
      
    case 'e2e':
      await runTests('e2e', 'End-to-End Tests')
      break
      
    case 'domain':
      await runTests('domain', 'Domain Layer Tests')
      break
      
    case 'application':
      await runTests('application', 'Application Layer Tests')
      break
      
    case 'infrastructure':
      await runTests('infrastructure', 'Infrastructure Layer Tests')
      break
      
    case 'compatibility':
      await runTests('compatibility', 'API Compatibility Tests')
      break
      
    case 'coverage':
      await runTests('coverage', 'All Tests with Coverage')
      break
      
    case 'watch':
      await runTests('watch', 'Tests (Watch Mode)')
      break
      
    case 'ci':
      await runTests('ci', 'Tests (CI Mode)')
      break
      
    case 'lint':
      await runLinting()
      break
      
    case 'type-check':
      await runTypeCheck()
      break
      
    case 'validate':
      await runValidation()
      break
      
    case 'summary':
      printTestSummary()
      break
      
    case 'help':
    default:
      printUsage()
      if (command !== 'help') {
        console.log(colorize('red', `Unknown command: ${command}`))
        process.exit(1)
      }
      break
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error(colorize('red', '\n💥 Unhandled rejection:'))
  console.error(error)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error(colorize('red', '\n💥 Uncaught exception:'))
  console.error(error)
  process.exit(1)
})

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error(colorize('red', '\n💥 Test runner failed:'))
    console.error(error)
    process.exit(1)
  })
}

module.exports = { runTests, runLinting, runTypeCheck, runValidation }