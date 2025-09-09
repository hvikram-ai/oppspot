import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkBusinessesTable() {
  console.log('Checking businesses table columns...\n')
  
  try {
    // Get one row to see structure
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Error querying businesses:', error)
      return
    }
    
    if (data && data.length > 0) {
      console.log('Found existing business, columns:')
      console.log(Object.keys(data[0]))
    } else {
      // Insert a test record to see what columns are accepted
      console.log('No businesses found. Testing with minimal insert...')
      
      const testBusiness = {
        name: 'Test Business',
        latitude: 51.5074,
        longitude: -0.1278
      }
      
      const { data: insertData, error: insertError } = await supabase
        .from('businesses')
        .insert(testBusiness)
        .select()
      
      if (insertError) {
        console.error('Insert error:', insertError)
        
        // Try without rating
        console.log('\nTrying insert without any optional fields...')
        const { data: minimalData, error: minimalError } = await supabase
          .from('businesses')
          .select('*')
          .limit(1)
        
        if (minimalError) {
          console.error('Minimal query error:', minimalError)
        } else if (minimalData && minimalData.length === 0) {
          console.log('Table exists but is empty')
        }
      } else {
        console.log('Successfully inserted test business')
        if (insertData && insertData.length > 0) {
          console.log('Columns:', Object.keys(insertData[0]))
          
          // Clean up test data
          await supabase
            .from('businesses')
            .delete()
            .eq('name', 'Test Business')
        }
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

checkBusinessesTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })