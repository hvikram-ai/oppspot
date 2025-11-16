# Q1 2025 Design Specifications & Wireframes

**Project**: oppSpot Feature Roadmap
**Version**: 1.0
**Last Updated**: 2025-01-13
**Design System**: shadcn/ui + Tailwind CSS

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Advanced Search Interface](#advanced-search-interface)
3. [Funding Timeline UI](#funding-timeline-ui)
4. [Investor Profile Pages](#investor-profile-pages)
5. [Saved Searches & Alerts](#saved-searches--alerts)
6. [Export & Bulk Actions](#export--bulk-actions)
7. [Component Library](#component-library)
8. [Responsive Design Guidelines](#responsive-design-guidelines)

---

## Design Principles

### Core Principles for oppSpot UI/UX

1. **Speed First**: All interactions should feel instant (<200ms perceived latency)
2. **Progressive Disclosure**: Show simple options first, advanced filters on demand
3. **Data Density**: Pack information efficiently without overwhelming users
4. **Consistent Patterns**: Reuse shadcn/ui components across features
5. **Mobile-Ready**: All features must work on tablet/mobile (responsive breakpoints)

### Visual Design System

**Colors** (Tailwind):
- Primary: `blue-600` (CTA buttons, links)
- Success: `green-600` (positive metrics, growth)
- Warning: `amber-600` (alerts, pending states)
- Danger: `red-600` (delete, negative metrics)
- Neutral: `slate-700` (text), `slate-200` (borders), `slate-50` (backgrounds)

**Typography**:
- Headings: `font-semibold` (Inter font family)
- Body: `font-normal` (Inter)
- Numbers/Metrics: `font-mono` for alignment

**Spacing**:
- Tight: `p-2` (8px) - Compact lists
- Default: `p-4` (16px) - Standard cards
- Relaxed: `p-6` (24px) - Hero sections

---

## Advanced Search Interface

### Overview

The Advanced Search is the primary discovery tool. It must handle 100+ filters without overwhelming users. Design uses progressive disclosure with collapsible filter groups.

### Wireframe: Desktop Search Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ oppSpot                    [Search Bar: "e.g., SaaS companies in London"]  │
│                            [🔍 Search]  [🎛️ Advanced Filters]  [💾 Save]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──── Filters (Sidebar) ────┐  ┌──── Search Results ────────────────────┐ │
│  │                            │  │                                         │ │
│  │ 🌍 LOCATION               │  │  Showing 1,234 companies                │ │
│  │ ☑ United Kingdom          │  │  Sort by: [Relevance ▾] [⬇️ Export]    │ │
│  │ ☐ United States           │  │  ┌─────────────────────────────────┐   │ │
│  │ ☐ Germany                 │  │  │ TechCorp Ltd  [⭐ Save] [📊 GPT]│   │ │
│  │ [+ Add region/city]       │  │  │ London, UK • SaaS • 120 employees│   │ │
│  │                            │  │  │ Revenue: £15M • Founded: 2018    │   │ │
│  │ 🏢 INDUSTRY ▾             │  │  │ "AI-powered analytics platform..." │ │
│  │ ☑ Software & IT Services  │  │  └─────────────────────────────────┘   │ │
│  │   ☑ SaaS                  │  │  ┌─────────────────────────────────┐   │ │
│  │   ☐ FinTech               │  │  │ DataFlow Systems [⭐] [📊]       │   │ │
│  │   ☐ HealthTech            │  │  │ Manchester, UK • Data Analytics  │   │ │
│  │ [+ Browse taxonomy]       │  │  │ Revenue: £8M • 45 employees      │   │ │
│  │                            │  │  │ "Real-time data processing..."   │   │ │
│  │ 💰 COMPANY SIZE ▾         │  │  └─────────────────────────────────┘   │ │
│  │ Revenue: [£10M — £50M]    │  │  ┌─────────────────────────────────┐   │ │
│  │ └──────────────────┘      │  │  │ CloudNet Inc [⭐] [📊]           │   │ │
│  │ Employees: [50 — 500]     │  │  │ Leeds, UK • Cloud Infrastructure │   │ │
│  │ └──────────────────┘      │  │  │ Revenue: £22M • 180 employees    │   │ │
│  │                            │  │  │ "Enterprise cloud solutions..."  │   │ │
│  │ 📊 FINANCIAL HEALTH       │  │  └─────────────────────────────────┘   │ │
│  │ ☑ Profitable              │  │                                         │ │
│  │ ☐ Break-even              │  │  [← Prev]  Page 1 of 25  [Next →]      │ │
│  │ ☐ Loss-making             │  │                                         │ │
│  │                            │  └─────────────────────────────────────────┘ │
│  │ [Show 5 more filters ▾]   │                                              │
│  │                            │                                              │
│  │ ┌────────────────────────┐ │                                              │
│  │ │ [🗑️ Clear All]          │ │                                              │
│  │ │ [💾 Save Search]        │ │                                              │
│  │ └────────────────────────┘ │                                              │
│  └────────────────────────────┘                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key UI Components

#### 1. Filter Sidebar (Left Column)

**Component**: `components/search/filter-sidebar.tsx`

**Structure**:
- Width: `w-80` (320px) on desktop, full-width drawer on mobile
- Height: `h-screen` with `overflow-y-auto`
- Background: `bg-white` with `border-r border-slate-200`
- Sticky position: `sticky top-0`

**Filter Groups** (Collapsible Accordions):
```tsx
<Accordion type="multiple" defaultValue={["location", "industry", "size"]}>
  <AccordionItem value="location">
    <AccordionTrigger className="text-sm font-semibold">
      🌍 LOCATION
    </AccordionTrigger>
    <AccordionContent>
      {/* Filter content */}
    </AccordionContent>
  </AccordionItem>
  {/* More filter groups... */}
</Accordion>
```

**Filter Types**:
1. **Checkbox Group** (Location, Industry, Ownership)
   - Component: shadcn `Checkbox` + `Label`
   - Show count: "United Kingdom (1,234)"
   - Multi-select support

2. **Range Slider** (Revenue, Employees)
   - Component: shadcn `Slider`
   - Dual handles for min/max
   - Display current values: "£10M - £50M"

3. **Radio Group** (Profitability)
   - Component: shadcn `RadioGroup`
   - Single selection only

4. **Date Picker** (Events, Funding rounds)
   - Component: shadcn `DatePicker` with range
   - Presets: "Last 3 months", "Last 6 months", "Last year"

**Applied Filters Display** (Above results):
```
[🌍 UK ×] [🏢 SaaS ×] [💰 £10M-£50M ×] [Clear all]
```

---

#### 2. Search Results Grid (Right Column)

**Component**: `components/search/search-results.tsx`

**Result Card Structure**:
```tsx
<Card className="p-4 hover:shadow-lg transition-shadow">
  <div className="flex justify-between items-start">
    {/* Left: Company info */}
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-900">
          {company.name}
        </h3>
        <Badge variant="outline">{company.industry}</Badge>
      </div>

      <p className="text-sm text-slate-600 mt-1">
        {company.location} • {company.employee_count} employees
      </p>

      <div className="flex gap-4 mt-2 text-sm text-slate-700">
        <span>💰 Revenue: {formatCurrency(company.revenue)}</span>
        <span>📅 Founded: {company.founded_year}</span>
      </div>

      <p className="text-sm text-slate-600 mt-3 line-clamp-2">
        {company.description}
      </p>
    </div>

    {/* Right: Actions */}
    <div className="flex gap-2">
      <Button variant="ghost" size="sm">
        <Star className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm">
        📊 ResearchGPT
      </Button>
    </div>
  </div>
</Card>
```

**Key Features**:
- Hover effect: `hover:shadow-lg transition-shadow`
- Line clamp description: `line-clamp-2` (max 2 lines)
- Click anywhere on card → Navigate to business detail page
- Quick actions: Save, Generate ResearchGPT

---

#### 3. Advanced Filters Modal

Triggered by "🎛️ Advanced Filters" button. Shows rarely-used filters.

**Wireframe**:
```
┌────────── Advanced Filters ──────────┐
│                                       │
│  📈 GROWTH METRICS                   │
│  Revenue Growth Rate (YoY):          │
│  [0% ─────●────────── 200%]          │
│  Currently: 20% - 100%               │
│                                       │
│  Employee Growth:                    │
│  ○ High (>50% YoY)                   │
│  ○ Medium (10-50%)                   │
│  ○ Low (<10%)                        │
│                                       │
│  💼 EVENTS & SIGNALS                 │
│  ☐ Recent funding (last 6 months)    │
│  ☐ Leadership change (last 3 months) │
│  ☐ Office expansion                  │
│  ☐ Product launch                    │
│                                       │
│  🔗 INTEGRATIONS                     │
│  Technology Stack:                   │
│  [Search tech: e.g., Salesforce...]  │
│  ☐ AWS  ☐ Azure  ☐ Google Cloud     │
│                                       │
│  [ Cancel ]        [ Apply Filters ] │
└───────────────────────────────────────┘
```

**Component**: `components/search/advanced-filters-modal.tsx`

**Implementation**:
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Advanced Filters</DialogTitle>
      <DialogDescription>
        Fine-tune your search with additional criteria
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-6">
      {/* Growth metrics section */}
      <div>
        <h4 className="font-semibold mb-3">📈 Growth Metrics</h4>
        <Label>Revenue Growth Rate (YoY)</Label>
        <Slider
          min={0}
          max={200}
          step={5}
          value={growthRange}
          onValueChange={setGrowthRange}
        />
        <p className="text-sm text-slate-600 mt-1">
          Currently: {growthRange[0]}% - {growthRange[1]}%
        </p>
      </div>

      {/* Event filters */}
      <div>
        <h4 className="font-semibold mb-3">💼 Events & Signals</h4>
        <div className="space-y-2">
          <div className="flex items-center">
            <Checkbox id="recent-funding" />
            <Label htmlFor="recent-funding" className="ml-2">
              Recent funding (last 6 months)
            </Label>
          </div>
          {/* More checkboxes... */}
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleApplyFilters}>
        Apply Filters
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

#### 4. Mobile Filter Drawer

On mobile (`<768px`), filters slide up from bottom as a drawer.

**Wireframe**:
```
┌─────────────────────┐
│                     │
│  [Search: SaaS...]  │
│  [🎛️ Filters (3)]   │
│                     │
│  ┌───────────────┐  │
│  │ TechCorp Ltd  │  │
│  │ London • SaaS │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ DataFlow Sys  │  │
│  │ Manchester    │  │
│  └───────────────┘  │
│                     │
└─────────────────────┘

[Tap "Filters" →]

┌─────────────────────┐
│ ╔═════════════════╗ │
│ ║ Filters     [×] ║ │
│ ╠═════════════════╣ │
│ ║ 🌍 Location     ║ │
│ ║ ☑ UK            ║ │
│ ║                 ║ │
│ ║ 🏢 Industry     ║ │
│ ║ ☑ SaaS          ║ │
│ ║                 ║ │
│ ║ 💰 Revenue      ║ │
│ ║ [£10M - £50M]   ║ │
│ ║                 ║ │
│ ║ [Clear]  [Apply]║ │
│ ╚═════════════════╝ │
└─────────────────────┘
```

**Component**: shadcn `Sheet` (drawer)

```tsx
<Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
  <SheetTrigger asChild>
    <Button variant="outline" className="w-full">
      🎛️ Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
    </Button>
  </SheetTrigger>

  <SheetContent side="bottom" className="h-[80vh]">
    <SheetHeader>
      <SheetTitle>Filters</SheetTitle>
    </SheetHeader>

    <div className="overflow-y-auto h-[calc(100%-8rem)] py-4">
      {/* Same filter components as desktop sidebar */}
    </div>

    <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleClearFilters}>
          Clear
        </Button>
        <Button className="flex-1" onClick={handleApplyFilters}>
          Apply Filters
        </Button>
      </div>
    </div>
  </SheetContent>
</Sheet>
```

---

## Funding Timeline UI

### Overview

Display funding history as an interactive vertical timeline. Each round is a card with investor details, amounts, and valuation.

### Wireframe: Funding Tab on Business Detail Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TechCorp Ltd                                                    [⭐ Save]    │
│ ─────────────────────────────────────────────────────────────────────────── │
│ [Overview] [Financials] [💰 Funding] [Team] [Documents]                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  💰 Total Funding Raised: £45M across 4 rounds                         │ │
│  │  📊 Post-Money Valuation: £200M (Series B, March 2024)                 │ │
│  │  📅 Last Funding: 8 months ago                                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─── Funding History ──────────────────────────────────────────────────┐   │
│  │                                                                        │   │
│  │  ┌─●─ Series B • £20M • March 2024 ────────────────────────────────┐ │   │
│  │  │  🎯 Lead: Sequoia Capital                                        │ │   │
│  │  │  👥 Investors: Sequoia Capital, Index Ventures, Balderton       │ │   │
│  │  │  💵 Pre-Money: £180M → Post-Money: £200M                        │ │   │
│  │  │  🔗 Source: TechCrunch Press Release                            │ │   │
│  │  └──────────────────────────────────────────────────────────────────┘ │   │
│  │  │                                                                       │
│  │  ┌─●─ Series A • £15M • June 2022 ─────────────────────────────────┐ │   │
│  │  │  🎯 Lead: Index Ventures                                         │ │   │
│  │  │  👥 Investors: Index Ventures, LocalGlobe, Passion Capital      │ │   │
│  │  │  💵 Pre-Money: £50M → Post-Money: £65M                          │ │   │
│  │  └──────────────────────────────────────────────────────────────────┘ │   │
│  │  │                                                                       │
│  │  ┌─●─ Seed • £8M • January 2020 ───────────────────────────────────┐ │   │
│  │  │  🎯 Lead: Balderton Capital                                      │ │   │
│  │  │  👥 Investors: Balderton, LocalGlobe, 5 angels                  │ │   │
│  │  │  💵 Valuation: £25M post-money                                   │ │   │
│  │  └──────────────────────────────────────────────────────────────────┘ │   │
│  │  │                                                                       │
│  │  ┌─●─ Pre-Seed • £2M • May 2018 ───────────────────────────────────┐ │   │
│  │  │  👥 Investors: Y Combinator, 8 angel investors                   │ │   │
│  │  │  💵 Valuation: £8M post-money                                    │ │   │
│  │  └──────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                        │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─── Funding Chart ────────────────────────────────────────────────────┐   │
│  │  Amount Raised by Round                                              │   │
│  │  £20M ┤                                            ███               │   │
│  │  £15M ┤                        ███                 ███               │   │
│  │  £10M ┤                        ███                 ███               │   │
│  │   £5M ┤          ███           ███                 ███               │   │
│  │   £0M ┼──────────███───────────███─────────────────███───────────   │   │
│  │       └─────────────────────────────────────────────────────────┐   │   │
│  │           Pre-Seed    Seed      Series A         Series B           │   │
│  │            2018       2020        2022             2024              │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Funding Summary Cards (Top)

**Component**: `components/funding/funding-summary.tsx`

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  <Card className="p-4">
    <div className="flex items-center gap-2">
      <DollarSign className="h-5 w-5 text-green-600" />
      <span className="text-sm text-slate-600">Total Raised</span>
    </div>
    <p className="text-2xl font-bold mt-2">
      {formatCurrency(totalRaised)}
    </p>
    <p className="text-sm text-slate-600 mt-1">
      across {roundCount} rounds
    </p>
  </Card>

  <Card className="p-4">
    <div className="flex items-center gap-2">
      <TrendingUp className="h-5 w-5 text-blue-600" />
      <span className="text-sm text-slate-600">Valuation</span>
    </div>
    <p className="text-2xl font-bold mt-2">
      {formatCurrency(postMoneyValuation)}
    </p>
    <p className="text-sm text-slate-600 mt-1">
      {latestRound.round_type} • {formatDate(latestRound.announced_date)}
    </p>
  </Card>

  <Card className="p-4">
    <div className="flex items-center gap-2">
      <Calendar className="h-5 w-5 text-amber-600" />
      <span className="text-sm text-slate-600">Last Funding</span>
    </div>
    <p className="text-2xl font-bold mt-2">
      {monthsAgo} months ago
    </p>
    <p className="text-sm text-slate-600 mt-1">
      {latestRound.round_type} • {formatCurrency(latestRound.amount_raised_usd)}
    </p>
  </Card>
</div>
```

---

#### 2. Funding Timeline (Vertical)

**Component**: `components/funding/funding-timeline.tsx`

**CSS for Timeline Connector**:
```css
/* Vertical line connecting rounds */
.timeline-item::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 24px;
  bottom: -24px;
  width: 2px;
  background: linear-gradient(to bottom, #3b82f6, #e2e8f0);
}

.timeline-item:last-child::before {
  display: none;
}
```

**Round Card Structure**:
```tsx
<div className="relative pl-8 pb-8 timeline-item">
  {/* Timeline dot */}
  <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-md" />

  {/* Round card */}
  <Card className="p-4">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="font-semibold text-lg">
          {round.round_type} • {formatCurrency(round.amount_raised_usd)}
        </h3>
        <p className="text-sm text-slate-600">
          {formatDate(round.announced_date)}
        </p>
      </div>

      <Badge
        variant={round.round_type === 'Series A' ? 'default' : 'outline'}
        className="capitalize"
      >
        {round.round_type}
      </Badge>
    </div>

    {/* Lead investor */}
    {round.lead_investor && (
      <div className="mt-3 flex items-center gap-2">
        <Target className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium">Lead:</span>
        <Link
          href={`/investors/${round.lead_investor.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          {round.lead_investor.name}
        </Link>
      </div>
    )}

    {/* All investors */}
    <div className="mt-2 flex items-start gap-2">
      <Users className="h-4 w-4 text-slate-600 mt-0.5" />
      <div className="flex-1">
        <span className="text-sm font-medium">Investors:</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {round.investors.map(investor => (
            <Link
              key={investor.id}
              href={`/investors/${investor.id}`}
              className="text-sm text-slate-700 hover:text-blue-600"
            >
              {investor.name}
            </Link>
          ))}
        </div>
      </div>
    </div>

    {/* Valuation */}
    {round.pre_money_valuation_usd && (
      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        <DollarSign className="h-4 w-4" />
        <span>
          Pre-Money: {formatCurrency(round.pre_money_valuation_usd)}
          {' → '}
          Post-Money: {formatCurrency(round.post_money_valuation_usd)}
        </span>
      </div>
    )}

    {/* Source link */}
    {round.press_release_url && (
      <div className="mt-3">
        <a
          href={round.press_release_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" />
          Source: Press Release
        </a>
      </div>
    )}
  </Card>
</div>
```

**Round Type Color Coding**:
- Pre-Seed: `bg-emerald-600`
- Seed: `bg-green-600`
- Series A: `bg-blue-600`
- Series B: `bg-indigo-600`
- Series C+: `bg-purple-600`
- IPO: `bg-amber-600`

---

#### 3. Funding Chart (Bar Chart)

**Component**: `components/funding/funding-chart.tsx`

Use Recharts library (already in project for analytics):

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function FundingChart({ rounds }: { rounds: FundingRound[] }) {
  const data = rounds.map(round => ({
    name: round.round_type,
    amount: round.amount_raised_usd / 1000000, // Convert to millions
    date: format(new Date(round.announced_date), 'MMM yyyy')
  }));

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Amount Raised by Round</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(value) => `£${value}M`}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value) => `£${value}M`}
            labelFormatter={(label, payload) =>
              `${label} • ${payload[0]?.payload?.date}`
            }
          />
          <Bar
            dataKey="amount"
            fill="#3b82f6"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
```

---

## Investor Profile Pages

### Overview

Investor profile pages show portfolio companies, investment activity, and sector focus. Key feature: "Follow investor" to receive alerts on new investments.

### Wireframe: Investor Profile

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  [LOGO]  Sequoia Capital                           [🔔 Follow]       │   │
│  │          Venture Capital • Menlo Park, CA, USA                       │   │
│  │          🌐 sequoiacap.com  💼 LinkedIn                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─── Stats ─────────────────────────────────────────────────────────────┐   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │ Portfolio   │  │ Avg Check   │  │ Active (2Y) │  │ AUM         │ │   │
│  │  │ 247 cos     │  │ £12M        │  │ 34 deals    │  │ $85B        │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─── About ─────────────────────────────────────────────────────────────┐   │
│  │  Sequoia Capital is a venture capital firm focused on energy,         │   │
│  │  financial, enterprise, healthcare, internet, and mobile companies.   │   │
│  │  The firm prefers to invest in Series A financing rounds and beyond.  │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─── Investment Focus ──────────────────────────────────────────────────┐   │
│  │  Sectors:                                                             │   │
│  │  [SaaS: 45%] [FinTech: 22%] [HealthTech: 18%] [Other: 15%]          │   │
│  │                                                                        │   │
│  │  Stage:                                                                │   │
│  │  [Series A: 35%] [Series B: 40%] [Series C+: 25%]                    │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─── Portfolio Companies ───────────────────────────────────────────────┐   │
│  │  Sort by: [Most Recent ▾]  Filter: [All Sectors ▾]  [Search...]      │   │
│  │                                                                        │   │
│  │  ┌────────────────────────────────────────────────────────────────┐   │   │
│  │  │ Stripe                             Series B • March 2024        │   │   │
│  │  │ FinTech • San Francisco, CA        £20M invested                │   │   │
│  │  │ "Online payment processing..."      [View Company →]            │   │   │
│  │  └────────────────────────────────────────────────────────────────┘   │   │
│  │  ┌────────────────────────────────────────────────────────────────┐   │   │
│  │  │ Databricks                         Series C • Nov 2023          │   │   │
│  │  │ SaaS • San Francisco, CA           £50M invested                │   │   │
│  │  │ "Unified analytics platform..."     [View Company →]            │   │   │
│  │  └────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                        │   │
│  │  [Load More]                                                          │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Investor Header

**Component**: `components/investors/investor-header.tsx`

```tsx
<div className="bg-white border-b border-slate-200">
  <div className="max-w-7xl mx-auto px-4 py-6">
    <div className="flex items-start justify-between">
      <div className="flex gap-4">
        {/* Logo */}
        {investor.logo_url ? (
          <img
            src={investor.logo_url}
            alt={investor.name}
            className="w-16 h-16 rounded-lg object-cover border border-slate-200"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-slate-400" />
          </div>
        )}

        {/* Info */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {investor.name}
          </h1>
          <p className="text-slate-600 mt-1">
            {investor.type} • {investor.location_city}, {investor.location_country}
          </p>
          <div className="flex gap-4 mt-2">
            {investor.website_url && (
              <a
                href={investor.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <Globe className="h-4 w-4" />
                {new URL(investor.website_url).hostname}
              </a>
            )}
            {investor.linkedin_url && (
              <a
                href={investor.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Follow button */}
      <Button
        variant={isFollowing ? "outline" : "default"}
        onClick={handleFollowToggle}
      >
        {isFollowing ? (
          <>
            <BellOff className="h-4 w-4 mr-2" />
            Following
          </>
        ) : (
          <>
            <Bell className="h-4 w-4 mr-2" />
            Follow
          </>
        )}
      </Button>
    </div>
  </div>
</div>
```

---

#### 2. Stats Cards

Same component as funding summary (reusable):

```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <StatsCard
    icon={Briefcase}
    label="Portfolio Companies"
    value={investor.stats.total_investments}
    iconColor="text-blue-600"
  />
  <StatsCard
    icon={DollarSign}
    label="Avg Check Size"
    value={formatCurrency(investor.stats.avg_check_size_usd)}
    iconColor="text-green-600"
  />
  <StatsCard
    icon={TrendingUp}
    label="Active Investments (2Y)"
    value={investor.stats.active_investments_2y}
    iconColor="text-amber-600"
  />
  <StatsCard
    icon={PieChart}
    label="AUM"
    value={formatCurrency(investor.aum_usd)}
    iconColor="text-purple-600"
  />
</div>
```

---

#### 3. Portfolio Table

**Component**: `components/investors/portfolio-table.tsx`

```tsx
<Card className="p-6">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-semibold">Portfolio Companies</h2>
    <div className="flex gap-2">
      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Most Recent</SelectItem>
          <SelectItem value="amount">Largest Investment</SelectItem>
          <SelectItem value="name">Alphabetical</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sectorFilter} onValueChange={setSectorFilter}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sectors</SelectItem>
          <SelectItem value="saas">SaaS</SelectItem>
          <SelectItem value="fintech">FinTech</SelectItem>
          <SelectItem value="healthtech">HealthTech</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Search companies..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-48"
      />
    </div>
  </div>

  <div className="space-y-3">
    {portfolio.map(investment => (
      <Card key={investment.business_id} className="p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">
                {investment.business_name}
              </h3>
              <Badge variant="outline">
                {investment.sector}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              {investment.location} • {investment.employee_count} employees
            </p>
            <p className="text-sm text-slate-600 mt-2 line-clamp-2">
              {investment.description}
            </p>
          </div>

          <div className="text-right ml-4">
            <div className="text-sm font-medium text-slate-900">
              {investment.round_type}
            </div>
            <div className="text-sm text-slate-600">
              {formatDate(investment.announced_date)}
            </div>
            {investment.amount_invested && (
              <div className="text-sm font-semibold text-green-600 mt-1">
                {formatCurrency(investment.amount_invested)} invested
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => router.push(`/business/${investment.business_id}`)}
            >
              View Company →
            </Button>
          </div>
        </div>
      </Card>
    ))}
  </div>

  {hasMore && (
    <Button
      variant="outline"
      className="w-full mt-4"
      onClick={handleLoadMore}
    >
      Load More
    </Button>
  )}
</Card>
```

---

## Saved Searches & Alerts

### Overview

Users can save complex search criteria and receive email alerts when new companies match. Design emphasizes easy management and clear alert settings.

### Wireframe: Saved Searches Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ My Saved Searches                                       [+ New Search]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ UK SaaS £10-50M                                        [Edit] [Delete] │ │
│  │ 🌍 United Kingdom • 🏢 SaaS • 💰 £10M-£50M revenue                     │ │
│  │ 🔔 Alerts: Daily at 8:00 AM                                            │ │
│  │ 📊 234 companies currently match    [🔍 View Results]                  │ │
│  │ Last updated: 2 hours ago • 5 new matches today                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ London FinTech Series A                                [Edit] [Delete] │ │
│  │ 🌍 London • 🏢 FinTech • 💰 Recent Series A funding                    │ │
│  │ 🔔 Alerts: Weekly on Mondays                                           │ │
│  │ 📊 47 companies currently match     [🔍 View Results]                  │ │
│  │ Last updated: 1 day ago • 2 new matches this week                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ HealthTech High Growth                                 [Edit] [Delete] │ │
│  │ 🏢 HealthTech • 📈 >50% revenue growth • 💰 £20M+ revenue              │ │
│  │ 🔔 Alerts: Off                                                         │ │
│  │ 📊 12 companies currently match     [🔍 View Results]                  │ │
│  │ Last updated: 3 days ago                                               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Saved Search Card

**Component**: `components/search/saved-search-card.tsx`

```tsx
<Card className="p-4 hover:shadow-md transition-shadow">
  <div className="flex justify-between items-start">
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{search.name}</h3>
        {search.alert_frequency !== 'off' && (
          <Badge variant="default" className="flex items-center gap-1">
            <Bell className="h-3 w-3" />
            Alerts On
          </Badge>
        )}
      </div>

      {/* Filter tags */}
      <div className="flex flex-wrap gap-2 mt-2">
        {Object.entries(search.search_criteria).map(([key, value]) => (
          <Badge key={key} variant="outline">
            {formatFilterLabel(key, value)}
          </Badge>
        ))}
      </div>

      {/* Alert settings */}
      <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
        <div className="flex items-center gap-1">
          <Bell className="h-4 w-4" />
          <span>
            Alerts: {search.alert_frequency === 'off'
              ? 'Off'
              : `${capitalize(search.alert_frequency)} at 8:00 AM`
            }
          </span>
        </div>
        <div className="flex items-center gap-1">
          <BarChart3 className="h-4 w-4" />
          <span>{search.result_count} companies currently match</span>
        </div>
      </div>

      {/* Last update */}
      <p className="text-sm text-slate-500 mt-2">
        Last updated: {formatDistanceToNow(search.updated_at)} ago
        {search.new_matches_today > 0 && (
          <span className="text-green-600 font-medium ml-2">
            • {search.new_matches_today} new matches today
          </span>
        )}
      </p>
    </div>

    {/* Actions */}
    <div className="flex gap-2 ml-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleViewResults(search.id)}
      >
        🔍 View Results
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleEdit(search.id)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Search
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleToggleAlerts(search.id)}>
            <Bell className="h-4 w-4 mr-2" />
            {search.alert_frequency === 'off' ? 'Enable' : 'Configure'} Alerts
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDuplicate(search.id)}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleDelete(search.id)}
            className="text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</Card>
```

---

#### 2. Alert Settings Dialog

**Component**: `components/search/alert-settings-dialog.tsx`

```
┌────────── Alert Settings ──────────┐
│                                     │
│ UK SaaS £10-50M                     │
│                                     │
│ Email Frequency:                    │
│ ○ Off (no emails)                   │
│ ● Daily at 8:00 AM                  │
│ ○ Weekly on Mondays                 │
│ ○ Custom...                         │
│                                     │
│ What to include:                    │
│ ☑ New companies matching criteria   │
│ ☑ Significant changes to existing   │
│ ☐ Companies leaving criteria        │
│                                     │
│ Alert threshold:                    │
│ Only send if [≥ 1 ▾] new matches    │
│                                     │
│ Email preview:                      │
│ ┌─────────────────────────────────┐ │
│ │ Subject: "5 new UK SaaS companies│ │
│ │ │ matching your search"           │ │
│ │ Body:                            │ │
│ │ │ • TechCorp Ltd (London)         │ │
│ │ │ • DataFlow Systems (Manchester) │ │
│ │ │ • ...                           │ │
│ │ [View Full Results →]            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [ Cancel ]          [ Save Settings]│
└─────────────────────────────────────┘
```

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>Alert Settings</DialogTitle>
      <DialogDescription>{savedSearch.name}</DialogDescription>
    </DialogHeader>

    <div className="space-y-6">
      {/* Frequency */}
      <div>
        <Label className="text-base font-semibold">Email Frequency</Label>
        <RadioGroup value={frequency} onValueChange={setFrequency} className="mt-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="off" id="off" />
            <Label htmlFor="off">Off (no emails)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="daily" id="daily" />
            <Label htmlFor="daily">Daily at 8:00 AM</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="weekly" id="weekly" />
            <Label htmlFor="weekly">Weekly on Mondays</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Inclusions */}
      <div>
        <Label className="text-base font-semibold">What to include</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox id="new-matches" checked={includeNew} onCheckedChange={setIncludeNew} />
            <Label htmlFor="new-matches">New companies matching criteria</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="changes" checked={includeChanges} onCheckedChange={setIncludeChanges} />
            <Label htmlFor="changes">Significant changes to existing companies</Label>
          </div>
        </div>
      </div>

      {/* Threshold */}
      <div>
        <Label className="text-base font-semibold">Alert threshold</Label>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm">Only send if</span>
          <Select value={threshold} onValueChange={setThreshold}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">≥ 1</SelectItem>
              <SelectItem value="5">≥ 5</SelectItem>
              <SelectItem value="10">≥ 10</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm">new matches</span>
        </div>
      </div>

      {/* Preview */}
      <div>
        <Label className="text-base font-semibold">Email preview</Label>
        <Card className="mt-2 p-3 bg-slate-50">
          <p className="text-sm font-medium">
            Subject: "5 new UK SaaS companies matching your search"
          </p>
          <div className="mt-2 text-sm text-slate-600">
            <p>Body:</p>
            <ul className="list-disc list-inside mt-1">
              <li>TechCorp Ltd (London)</li>
              <li>DataFlow Systems (Manchester)</li>
              <li>...</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSave}>
        Save Settings
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Export & Bulk Actions

### Overview

Enable users to export search results and perform bulk ResearchGPT generation. Design focuses on clear progress feedback and quota awareness.

### Wireframe: Export Modal

```
┌──────────── Export Search Results ────────────┐
│                                                 │
│ Export 234 companies to spreadsheet            │
│                                                 │
│ Format:                                         │
│ ○ CSV (.csv)                                    │
│ ● Excel (.xlsx) - Recommended                   │
│                                                 │
│ Columns to include:                             │
│ ☑ Company Name                                  │
│ ☑ Industry / Sector                             │
│ ☑ Location (City, Country)                     │
│ ☑ Revenue                                       │
│ ☑ Employee Count                                │
│ ☑ Founded Year                                  │
│ ☑ Website                                       │
│ ☑ Description                                   │
│ ☐ Funding History (if available)                │
│ ☐ Contact Information                           │
│                                                 │
│ ⚠️ Note: Export limited to 1,000 rows          │
│    Current results: 234 companies               │
│                                                 │
│ [ Cancel ]                    [ Export (234) ]  │
└─────────────────────────────────────────────────┘
```

### Wireframe: Bulk ResearchGPT Modal

```
┌────────── Bulk Generate ResearchGPT Reports ──────────┐
│                                                         │
│ Generate reports for 20 selected companies              │
│                                                         │
│ 📊 Your Quota:                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 80 / 100 reports remaining this month               │ │
│ │ ████████████████░░░░  80%                           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ⚠️ This will use 20 reports (20% of monthly quota)     │
│                                                         │
│ Options:                                                │
│ ☑ Email when complete                                   │
│ ☑ Download as ZIP of PDFs                              │
│                                                         │
│ Selected companies:                                     │
│ • TechCorp Ltd                                          │
│ • DataFlow Systems                                      │
│ • CloudNet Inc                                          │
│ • ... and 17 more                                       │
│                                                         │
│ ⏱️ Estimated time: 5-10 minutes                         │
│                                                         │
│ [ Cancel ]           [ Generate Reports (20) ]          │
└─────────────────────────────────────────────────────────┘

[After clicking "Generate Reports" →]

┌────────── Generating Reports... ──────────┐
│                                            │
│ Progress: 5 / 20 complete                  │
│ ████████░░░░░░░░░░░░░░░░░░░░  25%        │
│                                            │
│ ✅ TechCorp Ltd                            │
│ ✅ DataFlow Systems                        │
│ ✅ CloudNet Inc                            │
│ ✅ StartupXYZ                              │
│ ⏳ Processing: InnovateCo...               │
│ ⏸️ Queued: 15 companies                    │
│                                            │
│ [ Close (continue in background) ]         │
└────────────────────────────────────────────┘
```

### Key Components

#### 1. Export Dialog

**Component**: `components/search/export-dialog.tsx`

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Export Search Results</DialogTitle>
      <DialogDescription>
        Export {resultCount} companies to spreadsheet
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      {/* Format */}
      <div>
        <Label className="text-sm font-semibold">Format</Label>
        <RadioGroup value={format} onValueChange={setFormat} className="mt-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="csv" id="csv" />
            <Label htmlFor="csv">CSV (.csv)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="xlsx" id="xlsx" />
            <Label htmlFor="xlsx">
              Excel (.xlsx) <Badge variant="secondary" className="ml-2">Recommended</Badge>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Columns */}
      <div>
        <Label className="text-sm font-semibold">Columns to include</Label>
        <ScrollArea className="h-48 border rounded-md p-3 mt-2">
          <div className="space-y-2">
            {EXPORT_COLUMNS.map(col => (
              <div key={col.key} className="flex items-center space-x-2">
                <Checkbox
                  id={col.key}
                  checked={selectedColumns.includes(col.key)}
                  onCheckedChange={(checked) => handleColumnToggle(col.key, checked)}
                />
                <Label htmlFor={col.key} className="text-sm font-normal">
                  {col.label}
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Limits */}
      {resultCount > 1000 && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Export limited to 1,000 rows</AlertTitle>
          <AlertDescription>
            Current results: {resultCount} companies. Only the first 1,000 will be exported.
          </AlertDescription>
        </Alert>
      )}
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleExport} disabled={isExporting}>
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Exporting...
          </>
        ) : (
          <>Export ({Math.min(resultCount, 1000)})</>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

#### 2. Bulk ResearchGPT Dialog

**Component**: `components/research/bulk-research-dialog.tsx`

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>Bulk Generate ResearchGPT Reports</DialogTitle>
      <DialogDescription>
        Generate reports for {selectedCompanies.length} selected companies
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      {/* Quota display */}
      <Card className="p-4 bg-slate-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Your Quota</span>
          <span className="text-sm text-slate-600">
            {quota.remaining} / {quota.total} remaining this month
          </span>
        </div>
        <Progress value={(quota.remaining / quota.total) * 100} className="h-2" />
      </Card>

      {/* Warning if exceeds quota */}
      {selectedCompanies.length > quota.remaining && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Insufficient Quota</AlertTitle>
          <AlertDescription>
            You need {selectedCompanies.length} reports but only have {quota.remaining} remaining.
            Please select fewer companies or upgrade your plan.
          </AlertDescription>
        </Alert>
      )}

      {/* Usage warning */}
      {selectedCompanies.length <= quota.remaining && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This will use {selectedCompanies.length} reports (
            {Math.round((selectedCompanies.length / quota.total) * 100)}% of monthly quota)
          </AlertDescription>
        </Alert>
      )}

      {/* Options */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="email-complete"
            checked={emailWhenComplete}
            onCheckedChange={setEmailWhenComplete}
          />
          <Label htmlFor="email-complete">Email when complete</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="download-zip"
            checked={downloadAsZip}
            onCheckedChange={setDownloadAsZip}
          />
          <Label htmlFor="download-zip">Download as ZIP of PDFs</Label>
        </div>
      </div>

      {/* Company list preview */}
      <div>
        <Label className="text-sm font-semibold">Selected companies</Label>
        <ScrollArea className="h-32 border rounded-md p-3 mt-2">
          <ul className="text-sm space-y-1">
            {selectedCompanies.slice(0, 3).map(company => (
              <li key={company.id}>• {company.name}</li>
            ))}
            {selectedCompanies.length > 3 && (
              <li className="text-slate-600">
                ... and {selectedCompanies.length - 3} more
              </li>
            )}
          </ul>
        </ScrollArea>
      </div>

      {/* Time estimate */}
      <p className="text-sm text-slate-600">
        ⏱️ Estimated time: {Math.ceil(selectedCompanies.length * 0.5)}-{selectedCompanies.length} minutes
      </p>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button
        onClick={handleGenerate}
        disabled={selectedCompanies.length > quota.remaining || isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>Generate Reports ({selectedCompanies.length})</>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

#### 3. Progress Tracker

**Component**: `components/research/bulk-progress-dialog.tsx`

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
    <DialogHeader>
      <DialogTitle>Generating Reports...</DialogTitle>
      <DialogDescription>
        Progress: {completed} / {total} complete
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      {/* Progress bar */}
      <div>
        <Progress value={(completed / total) * 100} className="h-3" />
        <p className="text-sm text-slate-600 text-center mt-1">
          {Math.round((completed / total) * 100)}%
        </p>
      </div>

      {/* Status list */}
      <ScrollArea className="h-64 border rounded-md p-3">
        <div className="space-y-2">
          {jobs.map(job => (
            <div key={job.companyId} className="flex items-center gap-2 text-sm">
              {job.status === 'completed' && (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-slate-700">{job.companyName}</span>
                </>
              )}
              {job.status === 'in_progress' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="font-medium">Processing: {job.companyName}...</span>
                </>
              )}
              {job.status === 'pending' && (
                <>
                  <Circle className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">{job.companyName}</span>
                </>
              )}
              {job.status === 'failed' && (
                <>
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">{job.companyName} (failed)</span>
                </>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Time remaining */}
      {completed < total && (
        <p className="text-sm text-slate-600 text-center">
          ⏱️ Estimated time remaining: {estimatedMinutesRemaining} minutes
        </p>
      )}

      {/* Complete message */}
      {completed === total && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>All reports generated!</AlertTitle>
          <AlertDescription>
            {downloadAsZip && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleDownloadZip}
              >
                <Download className="h-4 w-4 mr-2" />
                Download ZIP
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => setIsOpen(false)}
        disabled={completed === 0}
      >
        {completed === total ? 'Close' : 'Close (continue in background)'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Component Library

### Reusable Components for Q1 Features

#### 1. Filter Group Accordion

```tsx
// components/search/filter-group.tsx
export function FilterGroup({
  title,
  icon,
  children,
  defaultOpen = false
}: FilterGroupProps) {
  return (
    <AccordionItem value={title.toLowerCase()}>
      <AccordionTrigger className="text-sm font-semibold hover:no-underline">
        <div className="flex items-center gap-2">
          {icon}
          <span className="uppercase tracking-wide">{title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-2 pb-4">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}
```

#### 2. Stats Card

```tsx
// components/ui/stats-card.tsx
export function StatsCard({
  icon: Icon,
  label,
  value,
  iconColor,
  trend
}: StatsCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-5 w-5", iconColor)} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-sm mt-1",
          trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
        )}>
          {trend.direction === 'up' ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span>{trend.value}</span>
        </div>
      )}
    </Card>
  );
}
```

#### 3. Applied Filter Badge

```tsx
// components/search/applied-filter-badge.tsx
export function AppliedFilterBadge({
  label,
  value,
  onRemove
}: AppliedFilterBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className="gap-1 pr-1"
    >
      <span className="text-xs">
        {label}: {value}
      </span>
      <button
        onClick={onRemove}
        className="ml-1 rounded-full hover:bg-slate-300 p-0.5"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}
```

---

## Responsive Design Guidelines

### Breakpoints (Tailwind Default)

- **Mobile**: `<640px` (base styles)
- **Tablet**: `640px - 768px` (`sm:`)
- **Desktop**: `768px - 1024px` (`md:`)
- **Large Desktop**: `>1024px` (`lg:`)

### Mobile Adaptations

#### Search Results

**Desktop**: 2-column layout (sidebar + results)
**Mobile**: Stacked layout with drawer for filters

```tsx
<div className="flex flex-col md:flex-row gap-6">
  {/* Sidebar - hidden on mobile, drawer instead */}
  <aside className="hidden md:block md:w-80">
    <FilterSidebar />
  </aside>

  {/* Results - full width on mobile */}
  <main className="flex-1">
    <SearchResults />
  </main>
</div>
```

#### Company Cards

**Desktop**: Full horizontal card
**Mobile**: Vertical compact card

```tsx
<Card className="p-3 md:p-4">
  <div className="flex flex-col md:flex-row justify-between gap-3">
    <div className="flex-1">
      {/* Company info */}
    </div>
    <div className="flex md:flex-col gap-2">
      {/* Actions - horizontal on mobile, vertical on desktop */}
    </div>
  </div>
</Card>
```

#### Tables → Cards on Mobile

Portfolio tables should become cards on mobile:

```tsx
{isMobile ? (
  <div className="space-y-3">
    {portfolio.map(item => (
      <PortfolioCard key={item.id} {...item} />
    ))}
  </div>
) : (
  <Table>
    <TableHeader>...</TableHeader>
    <TableBody>...</TableBody>
  </Table>
)}
```

---

## Design Tokens & Theme

### Color Palette

```typescript
// tailwind.config.ts additions
export default {
  theme: {
    extend: {
      colors: {
        // Funding round types
        'round-preseed': '#10b981', // green-600
        'round-seed': '#22c55e', // green-500
        'round-a': '#3b82f6', // blue-600
        'round-b': '#6366f1', // indigo-600
        'round-c': '#8b5cf6', // purple-600
        'round-ipo': '#f59e0b', // amber-600

        // Investor types
        'investor-vc': '#3b82f6',
        'investor-pe': '#6366f1',
        'investor-angel': '#10b981',
        'investor-corporate': '#f59e0b',
      }
    }
  }
}
```

### Typography Scale

- **Headings**: `text-3xl` (30px), `text-2xl` (24px), `text-xl` (20px)
- **Body**: `text-base` (16px), `text-sm` (14px)
- **Small**: `text-xs` (12px)
- **Line Heights**: `leading-tight` (1.25), `leading-normal` (1.5), `leading-relaxed` (1.625)

---

## Animation Guidelines

### Hover States

- **Cards**: `hover:shadow-lg transition-shadow`
- **Buttons**: `hover:bg-blue-700 transition-colors`
- **Links**: `hover:text-blue-600 transition-colors`

### Loading States

- **Skeleton Loaders**: Use shadcn `Skeleton` component
- **Spinners**: Use `Loader2` icon with `animate-spin`
- **Progress Bars**: Smooth animation with `transition-all`

```tsx
// Skeleton for loading search results
<div className="space-y-3">
  {[1, 2, 3].map(i => (
    <Card key={i} className="p-4">
      <Skeleton className="h-6 w-48 mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4" />
    </Card>
  ))}
</div>
```

### Micro-interactions

- **Checkbox check**: `transition-all duration-200`
- **Accordion expand**: `transition-all duration-300`
- **Modal open**: `animate-in fade-in-50 zoom-in-95`

---

## Accessibility (a11y) Requirements

### Keyboard Navigation

- All interactive elements must be focusable via `Tab`
- Modal traps focus (use shadcn Dialog's built-in focus trap)
- Escape key closes modals/drawers
- Arrow keys navigate lists

### Screen Reader Support

- All images have `alt` text
- Form inputs have associated `<Label>` elements
- ARIA labels for icon-only buttons:
  ```tsx
  <Button variant="ghost" aria-label="Save company">
    <Star className="h-4 w-4" />
  </Button>
  ```
- ARIA live regions for dynamic content:
  ```tsx
  <div role="status" aria-live="polite" aria-atomic="true">
    {resultCount} companies found
  </div>
  ```

### Color Contrast

- Text on white: Minimum `slate-700` (WCAG AA)
- Links: `blue-600` passes WCAG AA
- Error messages: `red-600` with icon (not color alone)

---

## Next Steps

### Design Review Checklist

- [ ] Review wireframes with product team
- [ ] Validate filter taxonomy with users
- [ ] Test mobile layouts on real devices
- [ ] Conduct accessibility audit
- [ ] Create Figma high-fidelity mockups (optional)
- [ ] Build component library Storybook (optional)

### Handoff to Engineering

1. **Prioritize components**: Start with FilterSidebar and SearchResults
2. **Create feature branches**: One per epic (search, funding, exports)
3. **Implement incrementally**: Ship FilterSidebar → Saved Searches → Funding Timeline
4. **User testing**: Beta test with 5-10 users after each component

---

**Design Spec Version**: 1.0
**Last Updated**: 2025-01-13
**Status**: Ready for Implementation
**Owner**: Design & Product Teams
