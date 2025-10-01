# Data Model: Command Center Dashboard

**Feature**: Dashboard Redesign
**Date**: 2025-10-01
**Database**: Supabase PostgreSQL

## Overview
This data model extends the existing oppSpot schema with new tables to support the command center dashboard features: AI digest, priority queue, user preferences, and feature spotlight tracking.

---

## Entity Relationship Diagram

```
profiles (existing)
    ├──< dashboard_preferences (1:1)
    ├──< ai_digest (1:many)
    ├──< priority_queue_items (1:many)
    ├──< feature_interactions (1:many)
    └──< dashboard_views (1:many)

research_reports (existing)
    └──> priority_queue_items (many:1)

saved_businesses (existing)
    └──> priority_queue_items (many:1)

business_lists (existing)
    └──> priority_queue_items (many:1)
```

---

## 1. Dashboard Preferences

**Purpose**: Store user-specific dashboard customization and settings

```sql
CREATE TABLE dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- Layout preferences
  card_visibility JSONB DEFAULT '{
    "ai_digest": true,
    "priority_queue": true,
    "impact_metrics": true,
    "stats_grid": true,
    "recent_activity": true,
    "feature_spotlight": true
  }'::jsonb,

  card_order TEXT[] DEFAULT ARRAY[
    'ai_digest',
    'impact_metrics',
    'priority_queue',
    'stats_grid',
    'recent_activity',
    'feature_spotlight'
  ],

  -- Navigation preferences
  default_landing_page TEXT DEFAULT '/dashboard',
  sidebar_collapsed BOOLEAN DEFAULT FALSE,

  -- Display preferences
  metric_format TEXT DEFAULT 'relative', -- 'absolute' or 'relative'
  time_period TEXT DEFAULT 'week', -- 'day', 'week', 'month'
  theme TEXT DEFAULT 'light', -- 'light', 'dark', 'system'

  -- Feature preferences
  digest_frequency TEXT DEFAULT 'daily', -- 'daily', 'realtime', 'off'
  show_empty_state_tutorials BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dashboard_prefs_user ON dashboard_preferences(user_id);

-- RLS Policies
ALTER TABLE dashboard_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON dashboard_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON dashboard_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON dashboard_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Validation Rules**:
- `card_visibility`: Must be valid JSON object with boolean values
- `card_order`: Must contain valid card identifiers
- `metric_format`: Must be 'absolute' or 'relative'
- `time_period`: Must be 'day', 'week', or 'month'
- `theme`: Must be 'light', 'dark', or 'system'
- `digest_frequency`: Must be 'daily', 'realtime', or 'off'

---

## 2. AI Digest

**Purpose**: Store daily AI-generated digest summaries for each user

```sql
CREATE TABLE ai_digest (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Digest metadata
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  digest_date DATE DEFAULT CURRENT_DATE,
  priority_score INTEGER CHECK (priority_score BETWEEN 1 AND 10),

  -- Digest content (JSONB for flexibility)
  digest_data JSONB NOT NULL,
  /* Structure:
  {
    "overnight_discoveries": [
      {
        "type": "opportunity",
        "title": "12 SaaS companies matched your criteria",
        "description": "...",
        "action_url": "/search?id=...",
        "priority": "high"
      }
    ],
    "urgent_alerts": [
      {
        "type": "follow_up",
        "title": "3 hot leads need follow-up",
        "company_ids": ["uuid1", "uuid2"],
        "days_since_contact": 8
      }
    ],
    "completed_work": [
      {
        "type": "research_report",
        "title": "4 research reports completed",
        "report_ids": ["uuid1", "uuid2", "uuid3", "uuid4"]
      }
    ],
    "recommendations": [
      {
        "type": "suggestion",
        "title": "Try ResearchGPT™ on your saved companies",
        "reason": "You have 23 saved companies without research reports"
      }
    ]
  }
  */

  -- User interaction
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,

  -- Generation metadata
  generation_duration_ms INTEGER,
  ai_model TEXT DEFAULT 'gpt-4-turbo',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_digest_user_date ON ai_digest(user_id, digest_date DESC);
CREATE INDEX idx_ai_digest_unread ON ai_digest(user_id, read_at) WHERE read_at IS NULL;

-- RLS Policies
ALTER TABLE ai_digest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digest"
  ON ai_digest FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own digest"
  ON ai_digest FOR UPDATE
  USING (auth.uid() = user_id);
```

**Validation Rules**:
- `priority_score`: Integer between 1-10
- `digest_data`: Must be valid JSONB with required structure
- `digest_date`: Cannot be in future
- One digest per user per day (unique constraint)

**Unique Constraint**:
```sql
CREATE UNIQUE INDEX idx_ai_digest_user_date_unique
  ON ai_digest(user_id, digest_date);
```

---

## 3. Priority Queue Items

**Purpose**: AI-ranked to-do list items for the dashboard

```sql
CREATE TYPE priority_level AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE queue_item_type AS ENUM (
  'lead_follow_up',
  'research_review',
  'signal_alert',
  'list_action',
  'recommendation'
);
CREATE TYPE queue_item_status AS ENUM ('pending', 'in_progress', 'completed', 'dismissed');

CREATE TABLE priority_queue_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Item classification
  item_type queue_item_type NOT NULL,
  status queue_item_status DEFAULT 'pending',
  priority_level priority_level NOT NULL,

  -- Priority scoring
  priority_score NUMERIC(10,2) NOT NULL, -- Calculated score
  urgency_score INTEGER CHECK (urgency_score BETWEEN 1 AND 100),
  value_score INTEGER CHECK (value_score BETWEEN 1 AND 100),
  fit_score INTEGER CHECK (fit_score BETWEEN 1 AND 100),

  -- Item content
  title TEXT NOT NULL,
  description TEXT,
  action_label TEXT DEFAULT 'View',
  action_url TEXT NOT NULL,

  -- Related entities (nullable foreign keys)
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  research_report_id UUID REFERENCES research_reports(id) ON DELETE CASCADE,
  list_id UUID REFERENCES business_lists(id) ON DELETE CASCADE,

  -- Metadata
  metadata JSONB, -- Additional flexible data

  -- Lifecycle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,

  -- Auto-calculated age (for priority decay)
  age_days INTEGER GENERATED ALWAYS AS (
    EXTRACT(DAY FROM (NOW() - created_at))
  ) STORED
);

-- Indexes
CREATE INDEX idx_pq_user_status_priority ON priority_queue_items(
  user_id, status, priority_score DESC
) WHERE status = 'pending';

CREATE INDEX idx_pq_user_created ON priority_queue_items(user_id, created_at DESC);
CREATE INDEX idx_pq_company ON priority_queue_items(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_pq_report ON priority_queue_items(research_report_id) WHERE research_report_id IS NOT NULL;

-- RLS Policies
ALTER TABLE priority_queue_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue items"
  ON priority_queue_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own queue items"
  ON priority_queue_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own queue items"
  ON priority_queue_items FOR DELETE
  USING (auth.uid() = user_id);
```

**Priority Score Calculation**:
```sql
-- Trigger function to calculate priority score
CREATE OR REPLACE FUNCTION calculate_priority_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.priority_score := (
    (COALESCE(NEW.value_score, 50) * 0.4) +
    (COALESCE(NEW.urgency_score, 50) * 0.3) +
    (COALESCE(NEW.fit_score, 50) * 0.2) +
    (100 - LEAST(NEW.age_days * 2, 100)) * 0.1
  ) / NULLIF(LOG(NEW.age_days + 1), 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_priority_score
  BEFORE INSERT OR UPDATE ON priority_queue_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_priority_score();
```

---

## 4. Feature Interactions

**Purpose**: Track user interactions with features for spotlight rotation and analytics

```sql
CREATE TYPE interaction_type AS ENUM (
  'view',
  'click',
  'complete',
  'dismiss',
  'share'
);

CREATE TABLE feature_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Feature identification
  feature_name TEXT NOT NULL, -- e.g., 'research_gpt', 'opp_scan', 'ai_scoring'
  interaction_type interaction_type NOT NULL,

  -- Interaction context
  context JSONB, -- Flexible context data
  /* Example:
  {
    "source": "feature_spotlight",
    "spotlight_position": 1,
    "time_to_interact_ms": 3500
  }
  */

  -- Session tracking
  session_id TEXT,
  page_url TEXT,
  referrer_url TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feature_int_user_feature ON feature_interactions(user_id, feature_name);
CREATE INDEX idx_feature_int_type_created ON feature_interactions(
  interaction_type, created_at DESC
);

-- RLS Policies
ALTER TABLE feature_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interactions"
  ON feature_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions"
  ON feature_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Analytics Views**:
```sql
-- Feature discovery rate
CREATE VIEW feature_discovery_rate AS
SELECT
  feature_name,
  COUNT(DISTINCT user_id) FILTER (WHERE interaction_type = 'click') * 100.0 /
    COUNT(DISTINCT user_id) AS discovery_rate_pct,
  AVG(EXTRACT(EPOCH FROM created_at - (
    SELECT created_at FROM profiles WHERE id = feature_interactions.user_id
  )) / 86400) AS avg_days_to_discover
FROM feature_interactions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY feature_name;

-- Feature usage by user segment
CREATE VIEW feature_usage_by_role AS
SELECT
  p.role,
  fi.feature_name,
  COUNT(*) AS total_interactions,
  COUNT(DISTINCT fi.user_id) AS unique_users,
  AVG(CASE WHEN fi.interaction_type = 'complete' THEN 1 ELSE 0 END) AS completion_rate
FROM feature_interactions fi
JOIN profiles p ON fi.user_id = p.id
WHERE fi.created_at >= NOW() - INTERVAL '7 days'
GROUP BY p.role, fi.feature_name;
```

---

## 5. Dashboard Views (Analytics)

**Purpose**: Track dashboard page views for analytics and personalization

```sql
CREATE TABLE dashboard_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- View metadata
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT,

  -- Device/browser info
  device_type TEXT, -- 'mobile', 'tablet', 'desktop'
  browser TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,

  -- Performance metrics
  time_to_first_byte_ms INTEGER,
  first_contentful_paint_ms INTEGER,
  time_to_interactive_ms INTEGER,
  largest_contentful_paint_ms INTEGER,

  -- Engagement metrics
  time_on_page_seconds INTEGER,
  scroll_depth_percent INTEGER,
  interactions_count INTEGER DEFAULT 0,

  -- Referrer
  referrer_source TEXT,
  utm_campaign TEXT,
  utm_source TEXT,
  utm_medium TEXT
);

-- Indexes
CREATE INDEX idx_dashboard_views_user_date ON dashboard_views(user_id, viewed_at DESC);
CREATE INDEX idx_dashboard_views_device ON dashboard_views(device_type, viewed_at DESC);

-- RLS Policies
ALTER TABLE dashboard_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics"
  ON dashboard_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own views"
  ON dashboard_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## 6. Feature Spotlight Config (Admin)

**Purpose**: Configure which features to spotlight in the dashboard

```sql
CREATE TABLE feature_spotlight_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Feature details
  feature_id TEXT UNIQUE NOT NULL,
  feature_name TEXT NOT NULL,
  description TEXT NOT NULL,
  cta_text TEXT DEFAULT 'Try It Now',
  cta_url TEXT NOT NULL,

  -- Targeting
  target_audience TEXT[] DEFAULT ARRAY['all'], -- ['all', 'new_users', 'power_users', 'role:manager']
  min_account_age_days INTEGER DEFAULT 0,
  exclude_users_who_used BOOLEAN DEFAULT TRUE, -- Hide if user already used this feature

  -- Spotlight priority
  priority INTEGER DEFAULT 50, -- Higher = shown more often
  active BOOLEAN DEFAULT TRUE,

  -- Visual
  icon_name TEXT, -- Lucide icon name
  badge_text TEXT, -- e.g., 'NEW', 'PREMIUM', 'BETA'
  badge_color TEXT DEFAULT 'blue',

  -- Lifecycle
  start_date DATE,
  end_date DATE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_spotlight_active ON feature_spotlight_config(active, priority DESC);

-- RLS: Admin only (no RLS, use app-level permissions)
```

**Spotlight Rotation Logic** (Application Layer):
```typescript
async function getFeatureSpotlight(userId: string): Promise<SpotlightItem[]> {
  // 1. Get all active spotlight configs
  const { data: configs } = await supabase
    .from('feature_spotlight_config')
    .select('*')
    .eq('active', true)
    .gte('end_date', 'TODAY()')
    .lte('start_date', 'TODAY()')
    .order('priority', { ascending: false })

  // 2. Filter by user's interactions (exclude used features if configured)
  const { data: interactions } = await supabase
    .from('feature_interactions')
    .select('feature_name')
    .eq('user_id', userId)
    .eq('interaction_type', 'click')

  const usedFeatures = new Set(interactions?.map(i => i.feature_name))

  const eligibleConfigs = configs?.filter(config => {
    if (config.exclude_users_who_used && usedFeatures.has(config.feature_id)) {
      return false
    }
    // Additional targeting logic...
    return true
  })

  // 3. Return top 3 by priority
  return eligibleConfigs?.slice(0, 3) || []
}
```

---

## Database Migrations

### Migration 1: Create Dashboard Tables
```sql
-- File: supabase/migrations/20251001_dashboard_redesign_schema.sql

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Dashboard Preferences
CREATE TABLE dashboard_preferences (
  -- [full schema from above]
);

-- 2. AI Digest
CREATE TABLE ai_digest (
  -- [full schema from above]
);

-- 3. Priority Queue
CREATE TYPE priority_level AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE queue_item_type AS ENUM (...);
CREATE TYPE queue_item_status AS ENUM (...);

CREATE TABLE priority_queue_items (
  -- [full schema from above]
);

-- 4. Feature Interactions
CREATE TYPE interaction_type AS ENUM (...);

CREATE TABLE feature_interactions (
  -- [full schema from above]
);

-- 5. Dashboard Views
CREATE TABLE dashboard_views (
  -- [full schema from above]
);

-- 6. Feature Spotlight Config
CREATE TABLE feature_spotlight_config (
  -- [full schema from above]
);

-- Create all indexes, RLS policies, triggers...
```

### Migration 2: Seed Default Data
```sql
-- File: supabase/migrations/20251001_dashboard_seed_data.sql

-- Seed feature spotlight config
INSERT INTO feature_spotlight_config (
  feature_id, feature_name, description, cta_text, cta_url,
  target_audience, icon_name, badge_text, priority
) VALUES
  (
    'research_gpt',
    'ResearchGPT™',
    'Generate deep company intelligence in 30 seconds',
    'Try ResearchGPT™',
    '/research',
    ARRAY['all'],
    'brain',
    'NEW',
    100
  ),
  (
    'opp_scan',
    'Opp Scan',
    'Find acquisition opportunities with AI analysis',
    'Start Opp Scan',
    '/opp-scan',
    ARRAY['power_users', 'role:manager'],
    'target',
    'PREMIUM',
    90
  ),
  (
    'ai_scoring',
    'AI Lead Scoring',
    'Predict deal probability and optimal timing',
    'View AI Scores',
    '/ai-scoring',
    ARRAY['all'],
    'sparkles',
    NULL,
    80
  );
```

---

## Data Relationships

### One-to-One
- `profiles` ↔ `dashboard_preferences` (each user has one dashboard config)

### One-to-Many
- `profiles` → `ai_digest` (user has many daily digests)
- `profiles` → `priority_queue_items` (user has many queue items)
- `profiles` → `feature_interactions` (user has many interactions)
- `profiles` → `dashboard_views` (user has many page views)

### Polymorphic Relationships (via nullable FKs)
- `priority_queue_items` can reference:
  - `businesses` (company_id)
  - `research_reports` (research_report_id)
  - `business_lists` (list_id)

---

## State Transitions

### AI Digest Lifecycle
```
[Generated] → [Unread] → [Read] → [Dismissed]
                ↓
           [Auto-expire after 24h]
```

### Priority Queue Item Lifecycle
```
[Created (pending)] → [In Progress] → [Completed]
         ↓                              ↑
    [Dismissed] ←――――――――――――――――――――――――┘
         ↓
    [Auto-archive after 30 days]
```

### Feature Spotlight Lifecycle
```
[Configured] → [Active] → [User Sees] → [User Clicks] → [Hidden (if exclude_used)]
                  ↓                                            ↓
             [End Date] ――――――――――――――――――――――→ [Inactive]
```

---

## Validation & Constraints

### Business Rules
1. **One digest per user per day**: Enforced by unique index `idx_ai_digest_user_date_unique`
2. **Priority score auto-calculated**: Trigger updates `priority_score` on insert/update
3. **Feature interactions append-only**: No UPDATE/DELETE policies (audit trail)
4. **Dashboard preferences initialized on signup**: Trigger creates default row when profile created

### Data Integrity
```sql
-- Ensure priority queue items have at least one entity reference
ALTER TABLE priority_queue_items ADD CONSTRAINT pq_has_entity
  CHECK (
    company_id IS NOT NULL OR
    research_report_id IS NOT NULL OR
    list_id IS NOT NULL OR
    item_type = 'recommendation'
  );

-- Ensure due_date is in future when set
ALTER TABLE priority_queue_items ADD CONSTRAINT pq_due_date_future
  CHECK (due_date IS NULL OR due_date > created_at);

-- Ensure spotlight dates are logical
ALTER TABLE feature_spotlight_config ADD CONSTRAINT spotlight_dates_logical
  CHECK (end_date IS NULL OR end_date >= start_date);
```

---

## Performance Considerations

### Indexes
- **Partial indexes**: Only index active/pending items to reduce index size
- **Composite indexes**: Match query patterns (user_id + status + priority)
- **GIN indexes**: For JSONB columns if querying nested fields

### Query Optimization
```sql
-- Optimized priority queue query
SELECT *
FROM priority_queue_items
WHERE user_id = $1
  AND status = 'pending'
ORDER BY priority_score DESC, created_at DESC
LIMIT 20;
-- Uses index: idx_pq_user_status_priority

-- Optimized digest query
SELECT *
FROM ai_digest
WHERE user_id = $1
  AND digest_date = CURRENT_DATE;
-- Uses index: idx_ai_digest_user_date
```

### Data Retention
```sql
-- Auto-delete old dashboard views (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_dashboard_views()
RETURNS void AS $$
BEGIN
  DELETE FROM dashboard_views
  WHERE viewed_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (if available) or Supabase Edge Function
```

---

## Security

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only see/modify their own data
- Admin tables (feature_spotlight_config) managed at app level

### API Security
- Supabase automatically enforces RLS
- Service role key bypasses RLS (admin operations only)
- Anon key limited to public operations

### Data Privacy
- No PII in analytics tables (user_id only)
- GDPR-compliant: user data deleted on account deletion (CASCADE)

---

**Status**: ✅ Data model complete - Ready for API contract definition
