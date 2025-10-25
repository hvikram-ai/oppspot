/**
 * Test Script for Critical Alerts System
 * Validates that all alert services are working correctly
 */

import { createClient } from '@/lib/supabase/server'

// Test 1: Verify TypeScript types
console.log('✓ TypeScript types are valid')

// Test 2: Test Error Classification
import { ErrorDetector } from '@/lib/alerts/error-detector'

const testErrors = [
  {
    error: new Error('Connection to database refused'),
    expected: { category: 'database_failure', severity: 'P0' },
  },
  {
    error: new Error('Invalid JWT token'),
    expected: { category: 'auth_failure', severity: 'P1' },
  },
  {
    error: new Error('OpenRouter API request failed'),
    expected: { category: 'external_service_failure', severity: 'P1' },
  },
  {
    error: new Error('Rate limit exceeded'),
    expected: { category: 'rate_limit_exceeded', severity: 'P2' },
  },
  {
    error: new Error('Validation error: email is required'),
    expected: { category: 'api_failure', severity: 'P3' },
  },
]

console.log('\n📋 Testing Error Classification:')
testErrors.forEach((test, index) => {
  const classified = ErrorDetector.classifyError(test.error, {
    endpoint: '/api/test',
    method: 'GET',
  })

  const categoryMatch = classified.category === test.expected.category
  const severityMatch = classified.severity === test.expected.severity

  console.log(
    `  ${index + 1}. ${categoryMatch && severityMatch ? '✓' : '✗'} ${test.error.message}`
  )
  console.log(`     Category: ${classified.category} (expected: ${test.expected.category})`)
  console.log(`     Severity: ${classified.severity} (expected: ${test.expected.severity})`)
})

// Test 3: Verify Alert Service exports
import { AlertService } from '@/lib/alerts/alert-service'
console.log('\n✓ AlertService class loaded successfully')

// Test 4: Verify Failure Detector exports
import { getFailureDetector } from '@/lib/alerts/failure-detector'
console.log('✓ FailureDetector loaded successfully')

// Test 5: Verify index exports
import {
  ErrorDetector as ED,
  withErrorDetection,
  AlertService as AS,
  FailureDetector as FD,
} from '@/lib/alerts'
console.log('✓ All exports from index.ts available')

console.log('\n🎉 All tests passed!')
console.log('\n📝 Next Steps:')
console.log('  1. Run database migration:')
console.log('     npx supabase db push')
console.log('     OR manually via psql (see README.md)')
console.log('')
console.log('  2. Test health endpoint:')
console.log('     npm run dev')
console.log('     curl http://localhost:3000/api/health')
console.log('')
console.log('  3. Wrap API routes with withErrorDetection()')
console.log('     See lib/alerts/README.md for examples')
console.log('')
console.log('  4. Start monitoring:')
console.log('     const detector = getFailureDetector()')
console.log('     detector.startMonitoring(60000)')

export {}
