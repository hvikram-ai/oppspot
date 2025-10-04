#!/usr/bin/env tsx

/**
 * Debug Companies House Data
 * Check actual data format to fix filters
 */

import * as Papa from 'papaparse'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

async function debug() {
  const tempDir = path.join(process.cwd(), 'tmp')
  const zipPath = path.join(tempDir, 'companies-house-data.zip')

  console.log('📦 Extracting ZIP...')
  execSync(`unzip -o "${zipPath}" -d "${tempDir}"`, { stdio: 'inherit' })

  const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.csv'))
  const csvPath = path.join(tempDir, files[0])

  console.log(`\n🔍 Analyzing first 10 rows of ${files[0]}...\n`)

  let count = 0
  const fileStream = fs.createReadStream(csvPath, { encoding: 'utf8' })

  Papa.parse(fileStream, {
    header: true,
    skipEmptyLines: true,
    step: (result) => {
      count++
      if (count <= 10) {
        console.log(`\n--- Record ${count} ---`)
        console.log(JSON.stringify(result.data, null, 2))
      } else {
        fileStream.destroy()
      }
    },
    complete: () => {
      console.log('\n✅ Debug complete')
    }
  })
}

debug().catch(console.error)
