#!/usr/bin/env tsx

/**
 * Database Migration Verification Script
 * Checks if all required tables and columns exist
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

async function verifyDatabase() {
  console.log(`${colors.cyan}🔍 Verifying Database Migration Status${colors.reset}`)
  console.log('=' .repeat(50))
  console.log()

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(`${colors.red}❌ Missing required environment variables${colors.reset}`)
    if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  let totalChecks = 0
  let passedChecks = 0
  const issues: string[] = []

  // Helper function to check if table exists
  async function checkTable(tableName: string, requiredColumns?: string[]) {
    totalChecks++
    try {
      // Try to select from the table
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0)

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`${colors.red}❌ Table '${tableName}' does not exist${colors.reset}`)
          issues.push(`Table '${tableName}' is missing`)
          return false
        } else {
          console.log(`${colors.yellow}⚠️  Table '${tableName}' exists but has issues: ${error.message}${colors.reset}`)
          issues.push(`Table '${tableName}': ${error.message}`)
          return false
        }
      }

      console.log(`${colors.green}✅ Table '${tableName}' exists${colors.reset}`)
      passedChecks++

      // Check for specific columns if provided
      if (requiredColumns && requiredColumns.length > 0) {
        for (const column of requiredColumns) {
          totalChecks++
          try {
            const { error: colError } = await supabase
              .from(tableName)
              .select(column)
              .limit(0)

            if (colError) {
              console.log(`   ${colors.red}❌ Column '${column}' does not exist in '${tableName}'${colors.reset}`)
              issues.push(`Column '${tableName}.${column}' is missing`)
            } else {
              console.log(`   ${colors.green}✅ Column '${column}' exists${colors.reset}`)
              passedChecks++
            }
          } catch (e) {
            console.log(`   ${colors.red}❌ Error checking column '${column}': ${e}${colors.reset}`)
            issues.push(`Error checking '${tableName}.${column}'`)
          }
        }
      }

      return true
    } catch (e) {
      console.log(`${colors.red}❌ Error checking table '${tableName}': ${e}${colors.reset}`)
      issues.push(`Error checking table '${tableName}'`)
      return false
    }
  }

  // Check for specific function
  async function checkFunction(functionName: string) {
    totalChecks++
    try {
      const { data, error } = await supabase.rpc(functionName, {})
      
      if (error && error.message.includes('does not exist')) {
        console.log(`${colors.red}❌ Function '${functionName}' does not exist${colors.reset}`)
        issues.push(`Function '${functionName}' is missing`)
        return false
      }
      
      console.log(`${colors.green}✅ Function '${functionName}' exists${colors.reset}`)
      passedChecks++
      return true
    } catch (e) {
      // If error is about missing parameters, the function exists
      const error = e as Error
      if (error.message && error.message.includes('parameter')) {
        console.log(`${colors.green}✅ Function '${functionName}' exists${colors.reset}`)
        passedChecks++
        return true
      }
      console.log(`${colors.yellow}⚠️  Function '${functionName}' might not exist${colors.reset}`)
      return false
    }
  }

  console.log(`${colors.blue}📊 Checking Core Tables:${colors.reset}`)
  console.log('-'.repeat(30))

  // 1. Check organizations table
  await checkTable('organizations', [
    'id',
    'name',
    'slug',
    'settings',
    'subscription_tier',
    'created_at',
    'updated_at'
  ])

  // 2. Check profiles table with email column
  console.log()
  console.log(`${colors.blue}🔑 Checking Critical Email Column:${colors.reset}`)
  console.log('-'.repeat(30))
  await checkTable('profiles', [
    'id',
    'email',  // This is the critical column that was missing
    'full_name',
    'org_id',
    'role',
    'preferences',
    'email_verified_at',
    'trial_ends_at',
    'created_at',
    'updated_at'
  ])

  // 3. Check events table
  console.log()
  console.log(`${colors.blue}📊 Checking Supporting Tables:${colors.reset}`)
  console.log('-'.repeat(30))
  await checkTable('events', [
    'id',
    'user_id',
    'event_type',
    'metadata',
    'created_at'
  ])

  // 4. Check email_verification_tokens table
  await checkTable('email_verification_tokens', [
    'id',
    'user_id',
    'token',
    'expires_at',
    'used_at',
    'created_at'
  ])

  // 5. Check functions
  console.log()
  console.log(`${colors.blue}⚡ Checking Database Functions:${colors.reset}`)
  console.log('-'.repeat(30))
  await checkFunction('is_email_verified')
  await checkFunction('get_trial_days_remaining')

  // 6. Test a simple query
  console.log()
  console.log(`${colors.blue}🧪 Testing Database Queries:${colors.reset}`)
  console.log('-'.repeat(30))
  
  totalChecks++
  try {
    const { data: profileCount, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.log(`${colors.red}❌ Cannot query profiles table: ${countError.message}${colors.reset}`)
      issues.push('Cannot query profiles table')
    } else {
      console.log(`${colors.green}✅ Can query profiles table successfully${colors.reset}`)
      passedChecks++
    }
  } catch (e) {
    console.log(`${colors.red}❌ Database query failed: ${e}${colors.reset}`)
    issues.push('Database queries failing')
  }

  // Summary
  console.log()
  console.log('=' .repeat(50))
  console.log(`${colors.cyan}📋 MIGRATION VERIFICATION SUMMARY${colors.reset}`)
  console.log('=' .repeat(50))
  
  const successRate = ((passedChecks / totalChecks) * 100).toFixed(1)
  
  if (passedChecks === totalChecks) {
    console.log(`${colors.green}✅ ALL CHECKS PASSED (${passedChecks}/${totalChecks})${colors.reset}`)
    console.log(`${colors.green}🎉 Database migrations successful!${colors.reset}`)
    console.log()
    console.log('Your database is ready for the signup workflow!')
  } else {
    console.log(`${colors.yellow}⚠️  SOME CHECKS FAILED (${passedChecks}/${totalChecks} - ${successRate}%)${colors.reset}`)
    console.log()
    console.log(`${colors.red}Issues found:${colors.reset}`)
    issues.forEach(issue => {
      console.log(`  • ${issue}`)
    })
    console.log()
    console.log(`${colors.yellow}To fix these issues:${colors.reset}`)
    console.log('1. Run: npm run db:migrate')
    console.log('2. Or apply migrations manually in Supabase SQL Editor')
    console.log('3. Check Supabase logs for any errors')
  }

  // Additional helpful information
  console.log()
  console.log(`${colors.blue}📝 Next Steps:${colors.reset}`)
  if (passedChecks === totalChecks) {
    console.log('1. ✅ Test signup at http://localhost:3000/signup')
    console.log('2. ✅ Configure email settings in Supabase dashboard')
    console.log('3. ✅ Set up Resend for email notifications (optional)')
  } else {
    console.log('1. ⚠️  Fix the database issues listed above')
    console.log('2. ⚠️  Re-run this verification: npm run db:verify')
    console.log('3. ⚠️  Contact support if issues persist')
  }

  process.exit(passedChecks === totalChecks ? 0 : 1)
}

// Run verification
verifyDatabase().catch(error => {
  console.error(`${colors.red}Fatal error during verification:${colors.reset}`, error)
  process.exit(1)
})