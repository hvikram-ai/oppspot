# Companies House Bulk Import Guide

## Overview

Import 500K-1M UK companies from Companies House free bulk data into oppSpot, staying within Supabase's **500MB free tier** limit.

---

## 🎯 What Gets Imported

### Smart Filtering Applied:
- ✅ **Active companies only** (no dissolved/liquidation)
- ✅ **Tech & Professional Services** (62 SIC code prefixes)
- ✅ **Last 10 years** (more likely to be growing)
- ✅ **UK only** (England, Wales, Scotland, NI)
- ✅ **Common company types** (Ltd, PLC, LLP)

### Expected Results:
- **Companies:** ~500K-1M
- **Database size:** ~200-400MB
- **Import time:** 30-60 minutes
- **Data source:** 100% free from Companies House

---

## 📋 Prerequisites

### 1. Apply Database Migration

**Before importing**, run this SQL in Supabase:

https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new

```sql
-- Paste contents of:
-- supabase/migrations/20251003180000_add_companies_house_fields.sql
```

This adds Companies House specific fields to your `businesses` table.

### 2. Check Current Database Size

```sql
SELECT
  pg_size_pretty(pg_database_size('postgres')) as total_size,
  pg_size_pretty(pg_total_relation_size('businesses')) as businesses_table_size;
```

Make sure you have room within 500MB limit!

---

## 🚀 How to Import

### Step 1: Navigate to Admin Page

Visit: **https://your-app.vercel.app/admin/companies-house**

### Step 2: Start Import

1. Click **"Start Full Import"** for filtered import
2. Or click **"Test Import (Sample)"** for testing

### Step 3: Monitor Progress

The page will show:
- Real-time progress bar
- Rows processed vs total
- Imported / Skipped / Errors counts
- Current batch number
- Estimated database size

### Step 4: Wait for Completion

Import runs in the background. You can:
- Close the browser tab (it continues)
- Check back later
- Cancel anytime with "Cancel Import" button

---

## 🔍 What Data is Imported

For each company:

| Field | Description | Example |
|-------|-------------|---------|
| `company_number` | CH number | 12345678 |
| `name` | Company name | Tech Innovations Ltd |
| `company_status` | Status | Active |
| `company_type` | Type | Private Limited Company |
| `incorporation_date` | Founded | 2020-01-15 |
| `sic_codes` | Industry codes | ["62012", "70220"] |
| `registered_office_address` | Full address | {...} |
| `formatted_address` | Human readable | London, UK |
| `industry` | Mapped category | Technology & Software |
| `companies_house_url` | Direct link | https://find-and-update... |

---

## 📊 Filter Configuration

### Industries Included (SIC Codes):

| Code | Industry |
|------|----------|
| 62 | Computer programming, consultancy |
| 63 | Information services |
| 70 | Management consultancy |
| 71 | Architectural and engineering |
| 72 | Scientific research |
| 73 | Advertising and market research |
| 74 | Professional, scientific, technical |
| 82 | Office administrative |
| 58-61 | Publishing, Media, Telecom |
| 64, 66, 69 | Financial, Insurance, Legal |
| 85-86 | Education, Healthcare |
| 90 | Creative, arts, entertainment |

### Customizing Filters

Edit `lib/companies-house/bulk-importer.ts`:

```typescript
export const DEFAULT_FILTERS: ImportFilters = {
  // Modify these to adjust what gets imported
  allowedStatuses: ['Active'],
  allowedSICCodes: ['62', '63', ...],
  minIncorporationDate: new Date('2014-01-01'),
  // etc...
}
```

---

## 🔄 Monthly Updates

Companies House updates their bulk data monthly.

### To Update Your Database:

1. Navigate to `/admin/companies-house`
2. Click "Start Full Import" again
3. The importer uses `upsert` - it will:
   - Update existing companies
   - Add new companies
   - Skip unchanged records

---

## 🐛 Troubleshooting

### Import Gets Stuck

- **Check:** Browser dev tools console for errors
- **Solution:** Cancel and restart
- **Note:** Import resumes from start (no checkpoints yet)

### Database Size Limit Exceeded

- **Check:** Current database size in Supabase dashboard
- **Solution 1:** Tighten filters (fewer SIC codes, recent dates)
- **Solution 2:** Upgrade to Supabase Pro ($25/month)

### Import Errors

Common errors shown in progress:
- `errorRows` count increasing - batch insert failures
- Check Supabase logs for details
- Usually: duplicate keys, validation errors

### No Progress Updates

- Refresh the page
- Check if import is still running: `/api/admin/companies-house/import`
- Poll interval: 2 seconds

---

## 💡 Tips

### Best Practices:

1. **Test first** - Use "Test Import" with sample data
2. **Monitor closely** - Watch first few batches for errors
3. **Off-peak hours** - Import during low traffic (saves API quota)
4. **Backup first** - Export current businesses table before import

### Performance:

- **Batch size:** 1,000 companies (configurable in code)
- **Processing speed:** ~1,000-2,000 rows/second
- **Network:** Download is slowest part (~5GB file)

### Storage Optimization:

- Companies House data compresses well
- Consider archiving dissolved companies
- Regularly vacuum the database

---

## 🔐 Security

### Data Source:
- 100% official Companies House open data
- Publicly available information
- Free to use commercially
- Updated by Companies House

### API Keys:
- No API key required for bulk data
- Download is HTTP (no authentication)
- For real-time API, get free key at: https://developer.company-information.service.gov.uk

---

## 📈 Next Steps

After import:

1. **Enrichment** - Add data from other sources:
   - LinkedIn company pages (employee counts)
   - Website scraping (tech stack)
   - Google Places (contact info)

2. **Categorization** - Map SIC codes to your industries

3. **Search** - Build full-text search on company names

4. **Analytics** - Industry trends, growth patterns

5. **Opportunities** - Detect buying signals:
   - Recent incorporations
   - Growing employee counts
   - New funding rounds

---

## 🆘 Support

### Having issues?

1. Check Supabase dashboard logs
2. Review browser console errors
3. Check `/api/admin/companies-house/import` endpoint
4. Verify migration was applied
5. Ensure free tier has space

### Want to customize?

All code is in:
- Service: `lib/companies-house/bulk-importer.ts`
- API: `app/api/admin/companies-house/import/route.ts`
- UI: `app/admin/companies-house/page.tsx`

---

## 📚 Resources

- **Companies House Downloads:** http://download.companieshouse.gov.uk/
- **Data Dictionary:** https://resources.companieshouse.gov.uk/
- **SIC Codes:** https://resources.companieshouse.gov.uk/sic/
- **API Docs:** https://developer.company-information.service.gov.uk/

---

**Ready to import?** Visit `/admin/companies-house` and click "Start Import"! 🚀
