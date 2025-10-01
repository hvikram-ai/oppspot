# Phase 3: Predictive Intelligence Implementation
## TimeTravel™, DealSignals™, ICP Learning Engine

**Timeline**: Months 5-6
**Dependencies**: Phase 1 (Foundation), Phase 2 (AI Agents)
**Complexity**: Very High (ML/AI predictions)
**Impact**: Core differentiation - predict buying intent before competitors

---

## Overview

### What We're Building
1. **TimeTravel™** - Predict who will buy 60-90 days before they search
2. **DealSignals™** - Real-time buying intent dashboard with WebSocket updates
3. **ICP Learning Engine™** - Auto-refining Ideal Customer Profile from won/lost deals

### Key Technologies
- Machine Learning (regression/classification models)
- Time-series analysis
- Pattern recognition
- Real-time data streaming (Supabase Realtime)
- Predictive analytics

---

## TimeTravel™ - Predictive Buying Intent

### Architecture

```
Signal Collection Layer
  ├─ Funding events (Crunchbase, Companies House)
  ├─ Job postings (aggregated)
  ├─ Executive changes (LinkedIn, Companies House)
  ├─ Tech stack changes (BuiltWith, website monitoring)
  ├─ Website activity (if user has tracking installed)
  └─ Social media mentions

           ↓

Feature Engineering Layer
  ├─ Time-series features (trend over 30/60/90 days)
  ├─ Composite signals (funding + hiring = strong signal)
  ├─ Industry benchmarks (compare to peer companies)
  └─ Historical patterns (signals that preceded past deals)

           ↓

ML Prediction Model
  ├─ Input: 50+ engineered features
  ├─ Model: XGBoost or Random Forest
  ├─ Output: Probability (0-100%) + timeline (30/60/90 days)
  └─ Confidence: Based on feature quality

           ↓

Alert System
  ├─ High probability (>80%) → Immediate alert
  ├─ Medium (60-80%) → Add to monitoring
  └─ Low (<60%) → Background tracking
```

### Database Schema

**File**: `supabase/migrations/20250301000001_predictive_intelligence.sql`

```sql
-- Predictive Scores Table
CREATE TABLE predictive_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Prediction
  buying_probability FLOAT NOT NULL CHECK (buying_probability >= 0 AND buying_probability <= 100),
  predicted_timeline_days INTEGER, -- 30, 60, 90
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('high', 'medium', 'low')),

  -- Features used
  features_used JSONB NOT NULL,
  signal_count INTEGER NOT NULL DEFAULT 0,
  strongest_signals TEXT[],

  -- Model metadata
  model_version TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'xgboost', 'random_forest', 'neural_network'
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Outcome tracking (for model improvement)
  actual_purchase_date TIMESTAMPTZ,
  prediction_accuracy FLOAT, -- Calculated after outcome known

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ICP (Ideal Customer Profile) Table
CREATE TABLE icp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,

  -- Profile definition
  profile_data JSONB NOT NULL, -- Dynamic schema based on what's learned
  confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),

  -- Learning metadata
  based_on_deals INTEGER NOT NULL DEFAULT 0, -- Number of deals used for learning
  win_rate FLOAT, -- Success rate of deals matching this ICP

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  activated_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(org_id, version)
);

-- ICP Learning History (track changes over time)
CREATE TABLE icp_learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  icp_id UUID REFERENCES icp_profiles(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'deal_won',
    'deal_lost',
    'pattern_discovered',
    'feature_added',
    'feature_removed',
    'threshold_adjusted'
  )),

  deal_id UUID, -- If related to a specific deal
  changes JSONB NOT NULL, -- What changed and why
  impact_score FLOAT, -- How much this changed the ICP

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Real-Time Deal Signals (for DealSignals™ dashboard)
CREATE TABLE deal_signals_realtime (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Signal information
  signal_type TEXT NOT NULL,
  signal_strength TEXT NOT NULL CHECK (signal_strength IN ('hot', 'warm', 'cold')),
  priority_score INTEGER NOT NULL CHECK (priority_score >= 0 AND priority_score <= 100),

  -- Signal details
  signal_data JSONB NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Signals can expire (e.g., job posting filled)

  -- Actions
  actioned BOOLEAN NOT NULL DEFAULT false,
  actioned_at TIMESTAMPTZ,
  actioned_by UUID REFERENCES profiles(id),
  action_taken TEXT,

  -- Dashboard display
  dashboard_visible BOOLEAN NOT NULL DEFAULT true,
  dismissed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_predictive_scores_company_id ON predictive_scores(company_id);
CREATE INDEX idx_predictive_scores_probability ON predictive_scores(buying_probability DESC);
CREATE INDEX idx_predictive_scores_org_id ON predictive_scores(org_id);

CREATE INDEX idx_icp_profiles_org_active ON icp_profiles(org_id) WHERE is_active = true;
CREATE INDEX idx_icp_learning_events_org ON icp_learning_events(org_id, created_at DESC);

CREATE INDEX idx_deal_signals_company ON deal_signals_realtime(company_id);
CREATE INDEX idx_deal_signals_strength ON deal_signals_realtime(signal_strength);
CREATE INDEX idx_deal_signals_visible ON deal_signals_realtime(dashboard_visible, signal_strength);

-- RLS policies
ALTER TABLE predictive_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE icp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE icp_learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_signals_realtime ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their org's predictions"
  ON predictive_scores FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users view their org's ICP"
  ON icp_profiles FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
```

### Predictive Model Service

**File**: `lib/ai/predictive/timetravel-engine.ts`

```typescript
/**
 * TimeTravel Prediction Engine
 * Predicts buying intent 60-90 days before companies start actively searching
 */

import { createClient } from '@/lib/supabase/server'

export interface PredictionInput {
  companyId: string
  featureSet?: 'basic' | 'advanced' | 'comprehensive'
}

export interface PredictionOutput {
  companyId: string
  buyingProbability: number // 0-100
  predictedTimelineDays: number // 30, 60, 90
  confidenceLevel: 'high' | 'medium' | 'low'
  strongestSignals: Signal[]
  recommendedActions: string[]
  explanations: Explanation[]
}

export interface Signal {
  type: string
  value: any
  weight: number
  description: string
}

export interface Explanation {
  feature: string
  contribution: number // -100 to +100
  reasoning: string
}

export class TimeTravelEngine {
  /**
   * Predict buying intent for a company
   */
  async predict(input: PredictionInput): Promise<PredictionOutput> {
    // Step 1: Gather features
    const features = await this.gatherFeatures(input.companyId)

    // Step 2: Engineer features (create derived features)
    const engineeredFeatures = this.engineerFeatures(features)

    // Step 3: Run prediction model
    const prediction = await this.runPredictionModel(engineeredFeatures)

    // Step 4: Generate explanations (SHAP-like)
    const explanations = this.generateExplanations(engineeredFeatures, prediction)

    // Step 5: Save prediction to database
    await this.savePrediction(input.companyId, prediction, engineeredFeatures)

    // Step 6: Trigger alerts if high probability
    if (prediction.buyingProbability > 80) {
      await this.triggerHighProbabilityAlert(input.companyId, prediction)
    }

    return prediction
  }

  /**
   * Gather raw features from various sources
   */
  private async gatherFeatures(companyId: string): Promise<Record<string, any>> {
    const supabase = await createClient()

    // Get company data
    const { data: company } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', companyId)
      .single()

    // Get recent buying signals
    const { data: signals } = await supabase
      .from('buying_signals')
      .select('*')
      .eq('company_id', companyId)
      .gte('detected_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

    // Get historical scores
    const { data: scores } = await supabase
      .from('lead_scores')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(5)

    // Get Companies House filings (if available)
    const filings = company?.filing_history || []

    return {
      company,
      signals,
      scores,
      filings
    }
  }

  /**
   * Engineer features from raw data
   */
  private engineerFeatures(raw: Record<string, any>): Record<string, any> {
    const features: Record<string, any> = {}

    // Signal-based features
    features.signal_count_30d = raw.signals?.filter((s: any) =>
      new Date(s.detected_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length || 0

    features.signal_count_60d = raw.signals?.filter((s: any) =>
      new Date(s.detected_at) > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    ).length || 0

    features.signal_velocity = features.signal_count_30d / (features.signal_count_60d || 1)

    // Specific signal types
    const signalTypes = ['funding_round', 'job_posting', 'executive_change', 'expansion']
    signalTypes.forEach(type => {
      features[`has_${type}`] = raw.signals?.some((s: any) => s.signal_type === type) ? 1 : 0
    })

    // Company size (normalized)
    features.company_age_years = raw.company?.incorporation_date ?
      (new Date().getFullYear() - new Date(raw.company.incorporation_date).getFullYear()) : 0

    // Score trends
    if (raw.scores && raw.scores.length >= 2) {
      const latest = raw.scores[0].overall_score
      const previous = raw.scores[1].overall_score
      features.score_trend = latest - previous
    } else {
      features.score_trend = 0
    }

    // Filing activity (UK specific - Companies House)
    features.filings_last_90d = raw.filings?.filter((f: any) =>
      new Date(f.date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    ).length || 0

    return features
  }

  /**
   * Run prediction model (simplified - would be ML model in production)
   */
  private async runPredictionModel(features: Record<string, any>): Promise<PredictionOutput> {
    // In production, this would load a trained XGBoost/RandomForest model
    // For now, use rule-based heuristics

    let probability = 50 // Base probability

    // Strong signals boost probability
    if (features.signal_count_30d >= 3) probability += 20
    if (features.has_funding_round) probability += 15
    if (features.has_job_posting) probability += 10
    if (features.has_executive_change) probability += 10
    if (features.signal_velocity > 1.5) probability += 10 // Accelerating signals
    if (features.score_trend > 10) probability += 10 // Improving fit
    if (features.filings_last_90d >= 2) probability += 5 // Active company

    // Clamp to 0-100
    probability = Math.min(Math.max(probability, 0), 100)

    // Determine timeline based on signal strength
    let timeline = 90 // Default: 90 days
    if (probability > 85) timeline = 30
    else if (probability > 70) timeline = 60

    // Confidence based on data quality
    const confidenceLevel =
      features.signal_count_60d >= 5 ? 'high' :
      features.signal_count_60d >= 2 ? 'medium' : 'low'

    // Strongest signals
    const strongestSignals: Signal[] = []
    if (features.has_funding_round) {
      strongestSignals.push({
        type: 'funding_round',
        value: true,
        weight: 0.15,
        description: 'Recently raised funding - budget available'
      })
    }
    if (features.signal_count_30d >= 3) {
      strongestSignals.push({
        type: 'signal_velocity',
        value: features.signal_count_30d,
        weight: 0.20,
        description: `${features.signal_count_30d} signals in last 30 days`
      })
    }

    return {
      companyId: '', // Will be set by caller
      buyingProbability: probability,
      predictedTimelineDays: timeline,
      confidenceLevel,
      strongestSignals,
      recommendedActions: this.generateRecommendations(probability, timeline),
      explanations: []
    }
  }

  /**
   * Generate explanations for prediction
   */
  private generateExplanations(
    features: Record<string, any>,
    prediction: PredictionOutput
  ): Explanation[] {
    const explanations: Explanation[] = []

    // Top contributing features
    if (features.signal_count_30d > 0) {
      explanations.push({
        feature: 'Recent Signal Activity',
        contribution: features.signal_count_30d * 5,
        reasoning: `${features.signal_count_30d} buying signals detected in last 30 days`
      })
    }

    if (features.has_funding_round) {
      explanations.push({
        feature: 'Funding Round',
        contribution: 15,
        reasoning: 'Recent funding indicates budget availability'
      })
    }

    if (features.has_job_posting) {
      explanations.push({
        feature: 'Hiring Activity',
        contribution: 10,
        reasoning: 'Hiring suggests growth and need for tools/services'
      })
    }

    return explanations
  }

  /**
   * Generate recommended actions
   */
  private generateRecommendations(probability: number, timeline: number): string[] {
    const recommendations: string[] = []

    if (probability >= 80) {
      recommendations.push('🔥 HIGH PRIORITY: Reach out within 7 days')
      recommendations.push('Book a discovery call to understand their needs')
      recommendations.push('Prepare a customized demo')
    } else if (probability >= 60) {
      recommendations.push('⚠️ MEDIUM PRIORITY: Add to nurture sequence')
      recommendations.push('Monitor for additional signals')
      recommendations.push(`Expected to be in-market in ~${timeline} days`)
    } else {
      recommendations.push('👀 WATCH: Continue monitoring')
      recommendations.push('Add to long-term nurture campaign')
    }

    return recommendations
  }

  /**
   * Save prediction to database
   */
  private async savePrediction(
    companyId: string,
    prediction: PredictionOutput,
    features: Record<string, any>
  ): Promise<void> {
    const supabase = await createClient()

    await supabase.from('predictive_scores').insert({
      company_id: companyId,
      buying_probability: prediction.buyingProbability,
      predicted_timeline_days: prediction.predictedTimelineDays,
      confidence_level: prediction.confidenceLevel,
      features_used: features,
      signal_count: features.signal_count_60d || 0,
      strongest_signals: prediction.strongestSignals.map(s => s.type),
      model_version: '1.0.0',
      model_type: 'rule_based' // In production: 'xgboost' or 'random_forest'
    })
  }

  /**
   * Trigger alert for high-probability predictions
   */
  private async triggerHighProbabilityAlert(
    companyId: string,
    prediction: PredictionOutput
  ): Promise<void> {
    // Emit event for notification system
    const { eventBus } = await import('@/lib/events/event-bus')

    eventBus.emit({
      type: 'prediction.high_probability',
      source: 'timetravel-engine',
      data: {
        companyId,
        probability: prediction.buyingProbability,
        timeline: prediction.predictedTimelineDays
      }
    })
  }
}

// Export singleton
export const timeTravelEngine = new TimeTravelEngine()
```

---

## DealSignals™ - Real-Time Dashboard

**File**: `components/dashboard/deal-signals-dashboard.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface DealSignal {
  id: string
  company_id: string
  signal_type: string
  signal_strength: 'hot' | 'warm' | 'cold'
  priority_score: number
  signal_data: any
  detected_at: string
  company?: {
    name: string
    website?: string
  }
}

export function DealSignalsDashboard() {
  const [signals, setSignals] = useState<DealSignal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSignals()
    subscribeToRealtime()
  }, [])

  async function loadSignals() {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('deal_signals_realtime')
      .select(`
        *,
        company:businesses(name, website)
      `)
      .eq('dashboard_visible', true)
      .order('priority_score', { ascending: false })
      .limit(20)

    if (!error && data) {
      setSignals(data)
    }
    setLoading(false)
  }

  function subscribeToRealtime() {
    const supabase = createClient()

    const channel = supabase
      .channel('deal-signals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deal_signals_realtime'
        },
        (payload) => {
          // Add new signal to top of list
          setSignals(prev => [payload.new as DealSignal, ...prev])

          // Show browser notification if HOT
          if (payload.new.signal_strength === 'hot') {
            showNotification(payload.new as DealSignal)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  function showNotification(signal: DealSignal) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🔥 Hot Deal Signal!', {
        body: `${signal.company?.name || 'Company'} showing strong buying signals`,
        icon: '/favicon.ico'
      })
    }
  }

  const hotSignals = signals.filter(s => s.signal_strength === 'hot')
  const warmSignals = signals.filter(s => s.signal_strength === 'warm')

  return (
    <div className="space-y-6">
      {/* HOT Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔥 HOT Signals
            <Badge variant="destructive">{hotSignals.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hotSignals.map(signal => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </CardContent>
      </Card>

      {/* WARM Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🌟 WARM Signals
            <Badge variant="secondary">{warmSignals.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {warmSignals.map(signal => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function SignalCard({ signal }: { signal: DealSignal }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{signal.company?.name}</h3>
          <p className="text-sm text-muted-foreground">
            Score: {signal.priority_score}/100
          </p>
          <div className="mt-2 space-y-1">
            {Object.entries(signal.signal_data).map(([key, value]) => (
              <p key={key} className="text-sm">
                • {key}: {String(value)}
              </p>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm">View Details</Button>
          <Button size="sm" variant="outline">Dismiss</Button>
        </div>
      </div>
    </div>
  )
}
```

---

## Summary

Phase 3 delivers:
1. ✅ **TimeTravel™** - Predictive buying intent engine
2. ✅ **DealSignals™** - Real-time WebSocket dashboard
3. ✅ **ICP Learning** - Auto-refining customer profiles
4. ✅ **ML Infrastructure** - Feature engineering + prediction models

**Next**: Phase 4 (Collaboration Features)

Would you like me to continue with Phase 4 (TeamPlay, Knowledge Graph) and Phase 5 (ChatSpot, Voice Command)?