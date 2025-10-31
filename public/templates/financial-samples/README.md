# Financial Analytics Sample Data

This directory contains realistic sample CSV files for testing the Financial & Revenue Quality Analytics feature.

## 📊 Sample Data Overview

**Period Covered**: January 2023 - April 2024 (16 months)
**Currency**: GBP (Great British Pounds)
**Customers**: 15 SaaS B2B customers
**Total MRR**: ~£40,000 at peak
**Total ARR**: ~£480,000 at peak

---

## 📁 CSV Files Included

### 1. `customers.csv`
**15 customers** from UK and Ireland with acquisition dates throughout 2023-2024.

**Columns**:
- `customer_id` - Unique customer identifier (e.g., CUST-001)
- `name` - Company name
- `email` - Primary contact email
- `country` - Country code (GB or IE)
- `acquisition_date` - Date customer first subscribed (YYYY-MM-DD)

**Key Metrics**:
- Cohorts: Jan 2023 → Mar 2024 (15 monthly cohorts)
- Customer mix: Technology, Healthcare, Retail, FinTech sectors

---

### 2. `subscriptions.csv`
**18 subscription records** including active subscriptions, churns, and reactivations.

**Columns**:
- `customer_id` - Reference to customer
- `plan` - Subscription tier (Starter/Pro/Business/Enterprise)
- `currency` - Always GBP (single currency)
- `start_date` - Subscription start date
- `end_date` - Subscription end date (empty if active)
- `mrr` - Monthly Recurring Revenue
- `status` - active or churned

**Key Metrics**:
- Plans: Starter (£500), Pro (£1,200), Business (£2,500), Enterprise (£5,000-£7,500)
- Churn: 2 customers churned and 2 reactivated (demonstrating NRR > 100%)
- Expansion: 1 customer upgraded from Enterprise to Enterprise Plus

**Demonstrates**:
- ✅ Logo churn and revenue churn
- ✅ Customer reactivation (winback)
- ✅ Expansion revenue (upsells)
- ✅ Net Revenue Retention > 100%

---

### 3. `invoices.csv`
**48 invoices** covering monthly billing cycles.

**Columns**:
- `customer_id` - Reference to customer
- `invoice_number` - Unique invoice ID (INV-YYYY-NNN)
- `issue_date` - Invoice issue date
- `due_date` - Payment due date (typically 30 days)
- `amount` - Invoice amount in GBP
- `currency` - GBP
- `status` - paid or open

**Key Metrics**:
- Payment terms: Net 30 (due 30 days after issue)
- Outstanding: 3 recent invoices still "open" (April 2024)
- Average invoice: £2,500

**Demonstrates**:
- ✅ Accounts Receivable aging buckets (0-30, 31-60, 61-90, 90+ days)
- ✅ Days Sales Outstanding (DSO) calculation
- ✅ Collection efficiency tracking

---

### 4. `payments.csv`
**45 payment records** matching paid invoices.

**Columns**:
- `invoice_number` - Reference to invoice
- `payment_date` - Date payment received
- `amount` - Payment amount
- `currency` - GBP
- `payment_method` - bank_transfer, credit_card, or direct_debit

**Key Metrics**:
- Payment mix: 40% bank transfer, 40% credit card, 20% direct debit
- Average payment time: 3-7 days after invoice issue (excellent DSO)

**Demonstrates**:
- ✅ Payment reconciliation
- ✅ Collection patterns
- ✅ Payment method preferences

---

### 5. `cogs.csv`
**45 Cost of Goods Sold entries** (monthly aggregated).

**Columns**:
- `date` - End of month date
- `category` - hosting, support, or software_licenses
- `amount` - Cost amount
- `currency` - GBP
- `description` - Cost description

**Key Metrics**:
- Monthly COGS: £6,300 → £15,800 (scales with customer growth)
- Categories: AWS hosting (60%), Support team (30%), API licenses (10%)
- Gross Margin: ~70% (healthy SaaS margin)

**Demonstrates**:
- ✅ Gross Margin calculation
- ✅ Unit economics
- ✅ Cost scaling with revenue

---

### 6. `sales_marketing.csv`
**45 Sales & Marketing cost entries** (monthly aggregated).

**Columns**:
- `date` - End of month date
- `category` - advertising, salaries, events, content, or software
- `amount` - Cost amount
- `currency` - GBP
- `description` - Cost description

**Key Metrics**:
- Monthly S&M: £26,000 → £44,000 (scales with growth targets)
- CAC Payback: 6-8 months (typical SaaS)
- Mix: 40% advertising, 50% salaries, 10% events/content

**Demonstrates**:
- ✅ Customer Acquisition Cost (CAC) calculation
- ✅ LTV:CAC ratio (should be 3:1 or better)
- ✅ S&M efficiency

---

## 🎯 Expected Metrics from This Data

When you upload these files, you should see:

### KPIs (April 2024)
- **MRR**: ~£40,000
- **ARR**: ~£480,000
- **Gross Margin**: ~70%
- **NRR**: 105-110% (net expansion due to upsells)
- **GRR**: 85-90% (good retention)
- **CAC**: £2,500-£3,000
- **LTV**: £15,000-£20,000
- **LTV:CAC Ratio**: 5:1 to 7:1 (excellent)
- **ARPU**: £2,667

### Cohort Analysis
- **Jan 2023 Cohort**: Should show 100% retention (CUST-001 still active)
- **Feb 2023 Cohort**: Shows churn then reactivation (CUST-002)
- **Jun 2023 Cohort**: Shows churn then reactivation (CUST-006)
- **Overall Logo Retention**: ~87% (13% churn with reactivations)

### Revenue Concentration
- **Top 1 Customer**: ~15-18% of revenue (CUST-001 with Enterprise Plus)
- **Top 3 Customers**: ~35-40% of revenue
- **HHI Index**: 1,200-1,500 (moderate concentration, not risky)
- **Risk Flag**: Should NOT trigger (no single customer >25%)

### AR/AP Aging (April 2024)
- **Current (0-30 days)**: £8,700 (3 open April invoices)
- **31-60 days**: £0
- **61-90 days**: £0
- **90+ days**: £0
- **DSO**: ~5-7 days (excellent collection)

---

## 🚀 How to Use These Files

### Step 1: Access the Upload Page
Navigate to: `http://localhost:3000/(dashboard)/companies/[company-id]/financials/upload`

(Replace `[company-id]` with an actual company UUID from your database)

### Step 2: Upload Files in This Order
1. ✅ **customers.csv** (creates customer records first)
2. ✅ **subscriptions.csv** (links to customers)
3. ✅ **invoices.csv** (links to customers)
4. ✅ **payments.csv** (links to invoices)
5. ✅ **cogs.csv** (independent cost data)
6. ✅ **sales_marketing.csv** (independent S&M data)

### Step 3: Wait for Auto-Recalculation
The system will automatically recalculate all metrics for the 16-month period.
**Expected time**: <5 seconds (per FR-040 requirement)

### Step 4: View Results
- **Dashboard**: `/companies/[id]/financials` - See KPI overview
- **Cohorts**: `/companies/[id]/financials/cohorts` - View retention heatmap
- **Export**: Click "Export PDF" for board-ready report

---

## 🎨 Data Story

This dataset tells the story of a **growing SaaS company**:

**2023 Q1**: Started with 1 Enterprise customer, added Pro/Business tiers
**2023 Q2-Q3**: Steady growth, first churn event (CUST-002)
**2023 Q4**: Rapid expansion, 12 active customers by year-end
**2024 Q1**: Continued growth, reactivated churned customers, upgraded CUST-001

**Key Events**:
- ✅ **Feb 2023**: First Pro customer (CUST-002)
- ❌ **Aug 2023**: First churn (CUST-002 leaves)
- ✅ **Apr 2024**: Win-back (CUST-002 returns as Pro)
- ⬆️ **Jun 2024**: Expansion (CUST-001 upgrades to Enterprise Plus)
- ✅ **Dec 2023**: Reactivation (CUST-006 downgrades → churns → returns as Business)

**Financial Health**:
- ✅ Strong gross margins (70%)
- ✅ Excellent LTV:CAC ratio (5:1 to 7:1)
- ✅ Net expansion (NRR > 100%)
- ✅ Fast collections (DSO < 10 days)
- ✅ Diversified revenue (no concentration risk)

---

## ⚠️ Important Notes

### Currency Enforcement
All files use **GBP** (single currency). Mixing currencies (e.g., USD, EUR) will be **rejected** per FR-037.

### Date Formats
All dates use **ISO 8601** format: `YYYY-MM-DD`

### External References
- `customer_id` must match between files
- `invoice_number` must match between invoices and payments

### Idempotency
You can safely re-upload the same files. The system uses checksums to prevent duplicates.

---

## 🧪 Testing Scenarios

### Scenario 1: Happy Path
Upload all 6 files → See healthy SaaS metrics

### Scenario 2: Currency Validation
Edit `subscriptions.csv` to add a USD subscription → Upload rejected with clear error

### Scenario 3: Missing Columns
Remove `customer_id` column from `customers.csv` → Upload rejected with validation error

### Scenario 4: Idempotency Test
Upload `customers.csv` twice → Second upload skips duplicates (0 rows inserted)

### Scenario 5: Partial Upload
Upload only `customers.csv` + `subscriptions.csv` → Limited metrics (no invoices/payments for AR aging)

---

## 📚 Need More Data?

Want to generate larger datasets? You can:
1. Duplicate existing customers with new IDs (CUST-016, CUST-017, etc.)
2. Extend the date range (add 2024-05 through 2024-12)
3. Add more subscription tiers or plan changes
4. Simulate seasonal patterns (Q4 spike, Q1 dip)

---

## 🆘 Troubleshooting

**"Company not found"**
→ Make sure the company UUID exists in the `companies` table

**"Financial Editor role required"**
→ Grant yourself the `editor` role in the `financial_roles` table

**"Mixed currencies detected"**
→ Check all CSV files use GBP consistently

**"Recalculation timed out"**
→ Dataset too large? Try uploading fewer months first

**No data in dashboard**
→ Wait 5-10 seconds after upload for recalculation to complete

---

## 📞 Questions?

This sample data demonstrates all Financial Analytics features:
- ✅ KPI tracking (ARR, MRR, NRR, GRR, CAC, LTV, GM, ARPU)
- ✅ Cohort retention analysis
- ✅ Revenue concentration risk
- ✅ AR/AP aging
- ✅ Benchmark comparisons (when benchmark data seeded)

Enjoy testing the feature! 🎉
