# Phase 4: Collaboration Features Implementation
## TeamPlay™ (Multiplayer), Knowledge Graph™, SmartSync™

**Timeline**: Months 7-8
**Dependencies**: Phases 1-3 complete
**Complexity**: High (Real-time systems, graph database)
**Impact**: Team productivity + stickiness

---

## Overview

### What We're Building
1. **TeamPlay™** - Figma-like multiplayer collaboration
2. **Knowledge Graph™** - Institutional knowledge capture
3. **SmartSync™** - Intelligent CRM bi-directional sync

### Key Technologies
- Supabase Realtime (presence, broadcast)
- Graph data structures
- WebSocket connections
- CRM APIs (HubSpot, Salesforce, Pipedrive)

---

## TeamPlay™ - Multiplayer Collaboration

### Database Schema

**File**: `supabase/migrations/20250401000001_team_collaboration.sql`

```sql
-- Team Presence Table (who's viewing what)
CREATE TABLE team_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- What they're viewing
  resource_type TEXT NOT NULL CHECK (resource_type IN ('company', 'deal', 'list', 'dashboard')),
  resource_id UUID NOT NULL,

  -- Presence metadata
  cursor_position JSONB, -- { x, y } for cursor tracking
  last_action TEXT, -- 'viewing', 'editing', 'commenting'
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Session
  session_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team Activities (activity feed)
CREATE TABLE team_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Activity details
  activity_type TEXT NOT NULL, -- 'added_company', 'updated_deal', 'left_comment', etc.
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,

  -- Activity data
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Visibility
  is_public BOOLEAN NOT NULL DEFAULT true,
  mentioned_users UUID[], -- For @mentions

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments System (collaborative notes)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- What it's attached to
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,

  -- Comment content
  content TEXT NOT NULL,
  mentions UUID[], -- @mentioned users

  -- Threading
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  thread_id UUID, -- Top-level comment ID for threading

  -- Status
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_presence_resource ON team_presence(resource_type, resource_id, last_seen_at);
CREATE INDEX idx_presence_user ON team_presence(user_id, session_id);
CREATE INDEX idx_activities_org_time ON team_activities(org_id, created_at DESC);
CREATE INDEX idx_activities_resource ON team_activities(resource_type, resource_id);
CREATE INDEX idx_comments_resource ON comments(resource_type, resource_id, created_at);
CREATE INDEX idx_comments_author ON comments(author_id);

-- Auto-cleanup stale presence (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM team_presence
  WHERE last_seen_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run every minute)
SELECT cron.schedule(
  'cleanup-stale-presence',
  '* * * * *',
  $$SELECT cleanup_stale_presence()$$
);
```

### Presence Service

**File**: `lib/collaboration/presence-service.ts`

```typescript
/**
 * Presence Service
 * Manages real-time user presence and multiplayer features
 */

import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface PresenceState {
  user_id: string
  user_name: string
  avatar_url?: string
  cursor?: { x: number; y: number }
  lastAction?: string
}

export class PresenceService {
  private channel: RealtimeChannel | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null

  /**
   * Join a resource's presence channel
   */
  async join(
    resourceType: string,
    resourceId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    const supabase = createClient()

    const channelName = `presence:${resourceType}:${resourceId}`

    this.channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId
        }
      }
    })

    // Track presence state
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel!.presenceState()
        console.log('[Presence] Users online:', Object.keys(state).length)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[Presence] User joined:', key)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Presence] User left:', key)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence
          await this.channel!.track({
            user_id: userId,
            user_name: userName,
            online_at: new Date().toISOString()
          })

          // Start heartbeat
          this.startHeartbeat(resourceType, resourceId, userId)
        }
      })
  }

  /**
   * Update cursor position
   */
  async updateCursor(x: number, y: number): Promise<void> {
    if (!this.channel) return

    await this.channel.track({
      cursor: { x, y }
    })
  }

  /**
   * Leave the presence channel
   */
  async leave(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    if (this.channel) {
      await this.channel.untrack()
      await this.channel.unsubscribe()
      this.channel = null
    }
  }

  /**
   * Get current presence state
   */
  getPresenceState(): Record<string, PresenceState[]> {
    if (!this.channel) return {}
    return this.channel.presenceState()
  }

  /**
   * Start heartbeat to keep presence alive
   */
  private startHeartbeat(
    resourceType: string,
    resourceId: string,
    userId: string
  ): void {
    this.heartbeatInterval = setInterval(async () => {
      const supabase = createClient()

      await supabase
        .from('team_presence')
        .upsert({
          user_id: userId,
          resource_type: resourceType,
          resource_id: resourceId,
          last_seen_at: new Date().toISOString(),
          session_id: this.channel!.topic
        })
    }, 30000) // Every 30 seconds
  }
}
```

---

## Knowledge Graph™

### Database Schema

**File**: `supabase/migrations/20250401000002_knowledge_graph.sql`

```sql
-- Knowledge Graph Nodes (entities)
CREATE TABLE knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Node type and identity
  node_type TEXT NOT NULL CHECK (node_type IN (
    'company',
    'person',
    'conversation',
    'document',
    'insight',
    'pain_point',
    'solution'
  )),
  entity_id UUID, -- Foreign key to actual entity (company_id, person_id, etc.)

  -- Node data
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',

  -- AI-generated insights
  ai_summary TEXT,
  key_points TEXT[],

  -- Status
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 100),
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge Graph Edges (relationships)
CREATE TABLE knowledge_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Connection
  from_node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,

  -- Relationship type
  relationship_type TEXT NOT NULL, -- 'discussed_with', 'works_at', 'mentioned_in', 'leads_to', etc.

  -- Relationship strength
  strength FLOAT DEFAULT 1.0 CHECK (strength >= 0 AND strength <= 1),

  -- Evidence
  evidence_ids UUID[], -- References to conversations, documents, etc.
  evidence_summary TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(from_node_id, to_node_id, relationship_type)
);

-- Indexes
CREATE INDEX idx_knowledge_nodes_org ON knowledge_nodes(org_id, node_type);
CREATE INDEX idx_knowledge_nodes_entity ON knowledge_nodes(node_type, entity_id);
CREATE INDEX idx_knowledge_edges_from ON knowledge_edges(from_node_id);
CREATE INDEX idx_knowledge_edges_to ON knowledge_edges(to_node_id);
CREATE INDEX idx_knowledge_edges_relationship ON knowledge_edges(relationship_type);
```

**File**: `lib/collaboration/knowledge-graph-service.ts`

```typescript
/**
 * Knowledge Graph Service
 * Captures and structures institutional knowledge
 */

import { createClient } from '@/lib/supabase/server'

export interface KnowledgeNode {
  id: string
  node_type: string
  title: string
  description?: string
  metadata: Record<string, any>
}

export interface KnowledgeEdge {
  id: string
  from_node_id: string
  to_node_id: string
  relationship_type: string
  strength: number
}

export class KnowledgeGraphService {
  /**
   * Create a node in the knowledge graph
   */
  async createNode(
    orgId: string,
    nodeType: string,
    title: string,
    options: {
      description?: string
      entityId?: string
      metadata?: Record<string, any>
      aiSummary?: string
    } = {}
  ): Promise<KnowledgeNode> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('knowledge_nodes')
      .insert({
        org_id: orgId,
        node_type: nodeType,
        title,
        description: options.description,
        entity_id: options.entityId,
        metadata: options.metadata || {},
        ai_summary: options.aiSummary
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Create a relationship between nodes
   */
  async createEdge(
    orgId: string,
    fromNodeId: string,
    toNodeId: string,
    relationshipType: string,
    options: {
      strength?: number
      evidence?: string[]
      evidenceSummary?: string
    } = {}
  ): Promise<KnowledgeEdge> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('knowledge_edges')
      .insert({
        org_id: orgId,
        from_node_id: fromNodeId,
        to_node_id: toNodeId,
        relationship_type: relationshipType,
        strength: options.strength || 1.0,
        evidence_ids: options.evidence || [],
        evidence_summary: options.evidenceSummary
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Query the knowledge graph
   */
  async query(
    orgId: string,
    query: {
      nodeTypes?: string[]
      relationshipTypes?: string[]
      entityId?: string
      searchTerm?: string
    }
  ): Promise<{ nodes: KnowledgeNode[]; edges: KnowledgeEdge[] }> {
    const supabase = await createClient()

    // Build node query
    let nodeQuery = supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('org_id', orgId)

    if (query.nodeTypes) {
      nodeQuery = nodeQuery.in('node_type', query.nodeTypes)
    }

    if (query.entityId) {
      nodeQuery = nodeQuery.eq('entity_id', query.entityId)
    }

    if (query.searchTerm) {
      nodeQuery = nodeQuery.or(`title.ilike.%${query.searchTerm}%,description.ilike.%${query.searchTerm}%`)
    }

    const { data: nodes, error: nodesError } = await nodeQuery

    if (nodesError) throw nodesError

    // Get edges for these nodes
    const nodeIds = nodes?.map(n => n.id) || []
    const { data: edges, error: edgesError } = await supabase
      .from('knowledge_edges')
      .select('*')
      .or(`from_node_id.in.(${nodeIds.join(',')}),to_node_id.in.(${nodeIds.join(',')})`)

    if (edgesError) throw edgesError

    return {
      nodes: nodes || [],
      edges: edges || []
    }
  }
}
```

---

## SmartSync™ - Intelligent CRM Integration

**File**: `lib/integrations/hubspot-sync.ts`

```typescript
/**
 * HubSpot SmartSync
 * Intelligent bi-directional CRM synchronization
 */

import { createClient } from '@/lib/supabase/server'

export class HubSpotSync {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Sync company to HubSpot with AI enrichment
   */
  async syncCompanyToHubSpot(companyId: string): Promise<void> {
    const supabase = await createClient()

    // Get company data
    const { data: company } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', companyId)
      .single()

    // Get AI research
    const { data: research } = await supabase
      .from('research_cache')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Get lead score
    const { data: score } = await supabase
      .from('lead_scores')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Get buying signals
    const { data: signals } = await supabase
      .from('buying_signals')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'active')

    // Build enriched HubSpot payload
    const hubspotData = {
      properties: {
        name: company.name,
        domain: company.website,
        industry: company.sic_codes?.[0],

        // oppSpot enrichment
        oppspot_lead_score: score?.overall_score,
        oppspot_buying_signals: signals?.length || 0,
        oppspot_ai_summary: research?.content?.companySnapshot?.description,
        oppspot_last_updated: new Date().toISOString()
      }
    }

    // Sync to HubSpot
    await fetch(`https://api.hubapi.com/crm/v3/objects/companies`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(hubspotData)
    })
  }
}
```

---

## Summary

Phase 4 delivers:
1. ✅ **TeamPlay™** - Real-time multiplayer collaboration
2. ✅ **Knowledge Graph™** - Institutional knowledge system
3. ✅ **SmartSync™** - Intelligent CRM integration

**Next**: Phase 5 (User Experience - ChatSpot, Voice Command)

Would you like me to create Phase 5 now to complete the full implementation suite?