# Companies House Import Script

Local script to import Companies House bulk data directly to production database.

## Why Local?

Vercel's serverless functions have strict timeout limits (10-60 seconds), but downloading and processing the 5GB Companies House file takes 30-60 minutes. Running this script locally bypasses those limits.

## Prerequisites

1. Environment variables in `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://fuqdbewftdthbjfcecrz.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Stable internet connection (will download ~5GB CSV file)
3. ~10GB free disk space (for temporary files)

## Usage

### Test Import (Sample Data)
Test with a smaller dataset first:
```bash
npm run import:ch:test
```

### Full Import (Production)
Import all filtered companies:
```bash
npm run import:ch
```

## What It Does

1. **Downloads** Companies House bulk CSV (~5GB)
2. **Filters** using smart criteria to stay under 500MB:
   - Active companies only
   - Tech & Professional Services industries (18 SIC codes)
   - Incorporated in last 10 years
   - UK only (England, Wales, Scotland, NI)
3. **Imports** in batches of 1,000 to production database
4. **Updates** existing companies and adds new ones

## Expected Results

- **Input:** ~5 million companies in CSV
- **Output:** ~500K-1M companies imported (~200-400MB)
- **Time:** 30-60 minutes
- **Rate:** ~300-500 rows/second

## Progress Tracking

The script logs progress every 10 seconds:
```
📊 Processed: 125,000 | Imported: 42,500 | Skipped: 82,500
✅ Batch 43: 1000 companies | Total imported: 43,000 | ETA: 25min
```

## Error Handling

- Batch errors are logged but don't stop the import
- Temporary files are cleaned up on completion
- Failed batches are tracked in error count

## Filters Applied

| Filter | Value |
|--------|-------|
| Status | Active, Active - Proposal to Strike off |
| Industries | 18 SIC code prefixes (tech, professional services, etc.) |
| Incorporation | Last 10 years |
| Geography | UK only |
| Company Types | Ltd, PLC, LLP, Unlimited |

## Database Impact

- Uses `upsert` to update existing companies
- Conflict resolution on `company_number`
- Service role key bypasses RLS policies
- Direct insert to `businesses` table

## Troubleshooting

**Error: Missing environment variables**
- Check `.env.local` has both Supabase variables

**Error: Failed to download**
- Check internet connection
- Companies House URL may have changed
- Try test mode first

**Database errors**
- Verify service role key has correct permissions
- Check database has enough storage (Supabase free tier: 500MB)

**Import seems stuck**
- Check console for latest batch number
- Download phase can take 5-10 minutes with no visible progress
- Processing logs every 10 seconds

## Post-Import

After import completes, verify in Supabase dashboard:
```sql
SELECT COUNT(*) FROM businesses WHERE data_source = 'companies_house';
SELECT COUNT(*) * 400 / 1024 as estimated_mb_used FROM businesses;
```

## Cleanup

Temporary files are automatically deleted. To manually clean:
```bash
rm -rf tmp/companies-house-data.csv
```
