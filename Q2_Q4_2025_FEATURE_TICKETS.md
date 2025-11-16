# Q2-Q4 2025 Feature Tickets - oppSpot Product Roadmap

**Strategic Focus**: Enterprise Readiness + AI Differentiation + Price-Performance
**Target Customer**: Mid-market PE firms (£10-500M AUM)
**Competitive Strategy**: Beat PitchBook on price (1/10th cost) + superior AI features

---

## Table of Contents

- [Q2 2025: Differentiation & CRM Integration](#q2-2025-differentiation--crm-integration)
- [Q3 2025: AI & Automation](#q3-2025-ai--automation)
- [Q4 2025: Financial Data & Enterprise](#q4-2025-financial-data--enterprise)
- [Jira/Linear Import Format](#jiralinear-import-format)

---

# Q2 2025: Differentiation & CRM Integration

**Quarter Goal**: Build unique features that competitors lack + embed into customer workflows
**Success Metrics**:
- 60% of Team/Enterprise customers connect CRM
- Relationship Intelligence drives 30% of warm intros
- Browser extension adopted by 40% of users

---

## Epic 5: Relationship Intelligence & Network Mapping

**Epic Description**: Build LinkedIn/email network mapping to show "who knows who" and enable warm introductions. This is a **unique differentiator** - only Harmonic.ai has this for VC; no one has it for PE deal sourcing.

**Business Value**: Warm intros have 10x higher conversion than cold outreach. Relationship intelligence makes oppSpot indispensable by turning data into actionable connections.

**Acceptance Criteria**:
- Users can connect LinkedIn and email accounts
- Network graph visualizes 1st/2nd/3rd degree connections
- "Warm intro finder" suggests shortest path to target company contacts
- Relationship strength scoring (frequency, recency, mutual connections)
- Privacy controls (users control what data is shared)

**Estimated Effort**: 16 weeks (2 engineers)
**Priority**: P0 (Must-Have)
**Dependencies**: None

---

### Story 5.1: LinkedIn OAuth Integration

**As a** user
**I want to** connect my LinkedIn account
**So that** oppSpot can map my professional network and find warm intro paths

**Acceptance Criteria**:
- [ ] LinkedIn OAuth 2.0 authentication flow
- [ ] Permission scopes: `r_basicprofile`, `r_emailaddress`, `r_network` (if available)
- [ ] Store encrypted access tokens in database
- [ ] Refresh token handling (tokens expire)
- [ ] Settings page: Disconnect LinkedIn, view permissions
- [ ] Handle LinkedIn API rate limits gracefully
- [ ] Privacy notice: "We only read connection data, never post on your behalf"

**Technical Notes**:
- **LinkedIn API Limitations**:
  - As of 2024, LinkedIn heavily restricts `r_network` (connections) API access
  - Only available to partners in LinkedIn's "Partner Program"
  - **Workaround**: Use LinkedIn Sales Navigator API (if customer has SN license) OR scrape public profile connections (with consent)
  - **Alternative**: Email signature parsing + manual connection imports via CSV

- **OAuth Flow**:
  ```typescript
  // app/api/auth/linkedin/route.ts
  export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get('code');

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code!,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!
      })
    });

    const { access_token, expires_in, refresh_token } = await tokenResponse.json();

    // Fetch user profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    const profile = await profileResponse.json();

    // Store in database (encrypted)
    await supabase.from('linkedin_connections').insert({
      user_id: userId,
      linkedin_id: profile.id,
      access_token: encrypt(access_token),
      refresh_token: encrypt(refresh_token),
      expires_at: new Date(Date.now() + expires_in * 1000)
    });

    return NextResponse.redirect('/settings/integrations?success=linkedin');
  }
  ```

- **Database Schema**:
  ```sql
  CREATE TABLE linkedin_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    linkedin_id VARCHAR(50) UNIQUE,
    access_token TEXT NOT NULL, -- Encrypted
    refresh_token TEXT, -- Encrypted
    expires_at TIMESTAMP NOT NULL,
    profile_url TEXT,
    headline TEXT,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE network_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_name VARCHAR(200) NOT NULL,
    connection_linkedin_id VARCHAR(50),
    connection_email VARCHAR(255),
    connection_title VARCHAR(200),
    connection_company VARCHAR(200),
    connection_degree INTEGER, -- 1=direct, 2=2nd degree, 3=3rd degree
    relationship_strength DECIMAL(3,2), -- 0.00-1.00
    last_interaction_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, connection_linkedin_id)
  );

  CREATE INDEX idx_network_connections_user ON network_connections(user_id);
  CREATE INDEX idx_network_connections_company ON network_connections(connection_company);
  ```

**Test Cases**:
1. Click "Connect LinkedIn" → OAuth flow → Redirects to LinkedIn → Grants permissions → Returns to oppSpot → Shows success message
2. Token expires → Automatically refreshes using refresh_token
3. User revokes permissions → Shows error "LinkedIn connection lost. Please reconnect."
4. Rate limit exceeded → Shows "LinkedIn API limit reached. Try again in 1 hour."
5. Disconnect LinkedIn → Deletes tokens, stops syncing

**Estimated Effort**: 10 days
**Priority**: P0
**Labels**: `relationship-intelligence`, `linkedin`, `oauth`, `backend`, `frontend`

---

### Story 5.2: Email Integration (Gmail/Outlook)

**As a** user
**I want to** connect my Gmail or Outlook account
**So that** oppSpot can analyze email signatures and meeting attendees to map my network

**Acceptance Criteria**:
- [ ] Gmail OAuth integration (read-only scope)
- [ ] Outlook OAuth integration (Microsoft Graph API)
- [ ] Parse email signatures to extract contacts (name, title, company, email, phone)
- [ ] Parse meeting invitations to identify relationships
- [ ] Calculate relationship strength (email frequency, recency)
- [ ] Settings: Choose which email accounts to analyze
- [ ] Privacy: Never read email content, only metadata and signatures

**Technical Notes**:
- **Gmail API**:
  - Scope: `https://www.googleapis.com/auth/gmail.readonly`
  - Use Gmail API to fetch messages: `GET /gmail/v1/users/me/messages`
  - Extract signature from last message in thread
  - Parse using regex for email, phone, LinkedIn URL

- **Outlook API** (Microsoft Graph):
  - Scope: `Mail.Read`
  - Endpoint: `GET /me/messages`
  - Similar parsing logic

- **Email Signature Parsing**:
  ```typescript
  // lib/relationship-intelligence/email-parser.ts
  export function parseEmailSignature(emailBody: string): Contact | null {
    const signatureRegex = /^--\s*$/m;
    const signaturePart = emailBody.split(signatureRegex)[1];

    if (!signaturePart) return null;

    const emailMatch = signaturePart.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const phoneMatch = signaturePart.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const linkedInMatch = signaturePart.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/);

    // Extract name (usually first line of signature)
    const lines = signaturePart.trim().split('\n');
    const name = lines[0].trim();

    return {
      name,
      email: emailMatch?.[0],
      phone: phoneMatch?.[0],
      linkedin_url: linkedInMatch?.[0],
      company: extractCompany(signaturePart), // Custom logic
      title: extractTitle(signaturePart) // Custom logic
    };
  }
  ```

- **Relationship Strength Calculation**:
  ```typescript
  // lib/relationship-intelligence/relationship-scorer.ts
  export function calculateRelationshipStrength(interactions: Interaction[]): number {
    // Factors:
    // 1. Frequency: # emails in last 90 days (max 10 = 0.4 points)
    // 2. Recency: Days since last interaction (0-30 days = 0.3, 31-90 = 0.2, 91+ = 0.1)
    // 3. Bidirectional: User initiated AND responded (0.3 points)

    const last90Days = interactions.filter(i =>
      Date.now() - i.timestamp < 90 * 24 * 60 * 60 * 1000
    );

    const frequency = Math.min(last90Days.length / 10, 1) * 0.4;

    const daysSinceLast = (Date.now() - Math.max(...interactions.map(i => i.timestamp))) / (24 * 60 * 60 * 1000);
    const recency = daysSinceLast <= 30 ? 0.3 : daysSinceLast <= 90 ? 0.2 : 0.1;

    const hasSent = interactions.some(i => i.direction === 'sent');
    const hasReceived = interactions.some(i => i.direction === 'received');
    const bidirectional = hasSent && hasReceived ? 0.3 : 0;

    return Math.min(frequency + recency + bidirectional, 1);
  }
  ```

**Test Cases**:
1. Connect Gmail → OAuth flow → Parse 100 recent emails → Extract 50 contacts
2. Email signature with multiple emails → Extract all emails
3. Meeting invitation → Extract all attendees as connections
4. Calculate relationship strength → 10 emails in 30 days = 0.8 score
5. Privacy: Never store email content, only metadata

**Estimated Effort**: 12 days
**Priority**: P0
**Labels**: `relationship-intelligence`, `gmail`, `outlook`, `oauth`, `backend`

---

### Story 5.3: Network Graph Visualization

**As a** user
**I want to** visualize my professional network as an interactive graph
**So that** I can see how I'm connected to target companies and identify warm intro paths

**Acceptance Criteria**:
- [ ] Interactive network graph showing nodes (people/companies) and edges (relationships)
- [ ] Node colors: 1st degree (blue), 2nd degree (green), 3rd degree (yellow)
- [ ] Node size: Relationship strength (larger = stronger)
- [ ] Click node → View contact details, LinkedIn profile, recent interactions
- [ ] Search: Find specific person or company in network
- [ ] Filters: Degree (1st/2nd/3rd), company, industry
- [ ] Zoom/pan controls
- [ ] Export: PNG/SVG image of network graph

**Technical Notes**:
- **Graph Visualization Library**: Use `react-force-graph` or `vis-network`
  - `react-force-graph`: WebGL-powered, handles 10,000+ nodes
  - `vis-network`: Canvas-based, easier to customize

- **Data Structure**:
  ```typescript
  // types/network-graph.ts
  export type NetworkNode = {
    id: string;
    label: string;
    type: 'person' | 'company';
    degree: 1 | 2 | 3;
    relationshipStrength: number; // 0-1
    company?: string;
    title?: string;
    email?: string;
    linkedin_url?: string;
  };

  export type NetworkEdge = {
    from: string; // node ID
    to: string; // node ID
    strength: number; // 0-1
    lastInteraction?: Date;
  };

  export type NetworkGraphData = {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
  };
  ```

- **Component Implementation**:
  ```tsx
  // components/relationship-intelligence/network-graph.tsx
  import ForceGraph2D from 'react-force-graph-2d';

  export function NetworkGraph({ data }: { data: NetworkGraphData }) {
    const graphRef = useRef<any>();

    const nodeColor = (node: NetworkNode) => {
      if (node.degree === 1) return '#3b82f6'; // blue
      if (node.degree === 2) return '#10b981'; // green
      return '#f59e0b'; // amber
    };

    const nodeSize = (node: NetworkNode) => {
      return 4 + node.relationshipStrength * 6; // 4-10px
    };

    return (
      <div className="w-full h-[600px] border rounded-lg">
        <ForceGraph2D
          ref={graphRef}
          graphData={data}
          nodeLabel="label"
          nodeColor={nodeColor}
          nodeVal={nodeSize}
          linkWidth={link => link.strength * 2}
          linkColor={() => '#cbd5e1'}
          onNodeClick={(node) => handleNodeClick(node as NetworkNode)}
          cooldownTicks={100}
          warmupTicks={0}
        />
      </div>
    );
  }
  ```

- **API Endpoint**:
  ```typescript
  // app/api/relationship-intelligence/network-graph/route.ts
  export async function GET(req: NextRequest) {
    const userId = await getUserId(req);
    const searchParams = req.nextUrl.searchParams;
    const targetCompanyId = searchParams.get('target_company_id');

    // Fetch network connections
    const { data: connections } = await supabase
      .from('network_connections')
      .select('*')
      .eq('user_id', userId);

    // Build graph data
    const nodes: NetworkNode[] = connections.map(conn => ({
      id: conn.id,
      label: conn.connection_name,
      type: 'person',
      degree: conn.connection_degree,
      relationshipStrength: conn.relationship_strength,
      company: conn.connection_company,
      title: conn.connection_title,
      email: conn.connection_email,
      linkedin_url: conn.connection_linkedin_id
    }));

    // If target company specified, find shortest paths
    if (targetCompanyId) {
      const { data: targetContacts } = await supabase
        .from('business_contacts')
        .select('*')
        .eq('business_id', targetCompanyId);

      // Add target company nodes
      targetContacts.forEach(contact => {
        nodes.push({
          id: `target-${contact.id}`,
          label: contact.name,
          type: 'person',
          degree: 3, // Unknown degree initially
          relationshipStrength: 0,
          company: targetCompanyId,
          title: contact.title,
          email: contact.email
        });
      });
    }

    // Build edges (relationships between connections)
    const edges: NetworkEdge[] = [];
    // Logic to find mutual connections...

    return NextResponse.json({ nodes, edges });
  }
  ```

**Test Cases**:
1. View network graph → Displays 500 connections as interactive graph
2. Click node "John Smith" → Shows sidebar with contact details
3. Filter by "1st degree only" → Hides 2nd/3rd degree nodes
4. Search "Acme Corp" → Highlights all Acme Corp employees
5. Export PNG → Downloads high-res image of network

**Estimated Effort**: 10 days
**Priority**: P0
**Labels**: `relationship-intelligence`, `visualization`, `frontend`

---

### Story 5.4: Warm Intro Finder

**As a** deal sourcing professional
**I want to** find the shortest path to a decision-maker at a target company
**So that** I can leverage warm introductions instead of cold outreach

**Acceptance Criteria**:
- [ ] Select target company → oppSpot finds all decision-makers (from ResearchGPT data)
- [ ] For each decision-maker, show shortest path via my network
- [ ] Path display: "You → Alice (VP Sales at TechCo) → Bob (CEO at Target)"
- [ ] Relationship strength indicators for each hop
- [ ] "Request intro" button → Drafts email asking Alice to introduce Bob
- [ ] Multiple paths ranked by: path length, relationship strength, recency
- [ ] Save intro requests to track follow-ups

**Technical Notes**:
- **Graph Shortest Path Algorithm**: Use Dijkstra's algorithm weighted by relationship strength
  - Library: `graphology` (JavaScript graph library)

- **Algorithm Implementation**:
  ```typescript
  // lib/relationship-intelligence/intro-finder.ts
  import { Graph } from 'graphology';
  import { bidirectional } from 'graphology-shortest-path';

  export function findWarmIntroPaths(
    userConnections: NetworkConnection[],
    targetContacts: BusinessContact[]
  ): IntroPath[] {
    // Build graph
    const graph = new Graph();

    // Add nodes
    graph.addNode('user', { type: 'user' });
    userConnections.forEach(conn => {
      graph.addNode(conn.id, {
        name: conn.connection_name,
        email: conn.connection_email,
        company: conn.connection_company,
        relationshipStrength: conn.relationship_strength
      });

      // Edge: user -> connection (weighted by relationship strength)
      graph.addEdge('user', conn.id, {
        weight: 1 - conn.relationship_strength // Lower weight = better path
      });
    });

    targetContacts.forEach(contact => {
      graph.addNode(`target-${contact.id}`, {
        name: contact.name,
        email: contact.email,
        company: contact.company_id,
        title: contact.title
      });
    });

    // Find connections between user's network and target contacts
    // (This requires matching by email, LinkedIn ID, or company affiliation)
    userConnections.forEach(conn => {
      targetContacts.forEach(target => {
        if (conn.connection_company === target.company_name) {
          // Assume they might know each other (weak edge)
          graph.addEdge(conn.id, `target-${target.id}`, { weight: 2 });
        }
      });
    });

    // Find shortest paths
    const paths: IntroPath[] = [];
    targetContacts.forEach(target => {
      try {
        const path = bidirectional(graph, 'user', `target-${target.id}`);
        if (path && path.length <= 4) { // Max 3 hops
          paths.push({
            targetContact: target,
            path: path.map(nodeId => graph.getNodeAttributes(nodeId)),
            pathLength: path.length - 1,
            totalStrength: calculatePathStrength(graph, path)
          });
        }
      } catch (e) {
        // No path found
      }
    });

    // Sort by: path length (asc), total strength (desc)
    return paths.sort((a, b) => {
      if (a.pathLength !== b.pathLength) return a.pathLength - b.pathLength;
      return b.totalStrength - a.totalStrength;
    });
  }

  function calculatePathStrength(graph: Graph, path: string[]): number {
    let totalStrength = 1;
    for (let i = 0; i < path.length - 1; i++) {
      const edge = graph.edge(path[i], path[i + 1]);
      const weight = graph.getEdgeAttribute(edge, 'weight');
      totalStrength *= (1 - weight); // Convert weight back to strength
    }
    return totalStrength;
  }
  ```

- **UI Component**:
  ```tsx
  // components/relationship-intelligence/warm-intro-finder.tsx
  export function WarmIntroFinder({ businessId }: { businessId: string }) {
    const [paths, setPaths] = useState<IntroPath[]>([]);

    useEffect(() => {
      fetch(`/api/relationship-intelligence/intro-paths?business_id=${businessId}`)
        .then(res => res.json())
        .then(setPaths);
    }, [businessId]);

    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Warm Introduction Paths</h3>

        {paths.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No warm intro paths found. Try connecting LinkedIn or importing more contacts.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {paths.map((path, i) => (
              <Card key={i} className="p-4 border-l-4 border-blue-600">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {path.pathLength === 1 ? '1 hop' : `${path.pathLength} hops`}
                      </Badge>
                      <span className="text-sm text-slate-600">
                        Strength: {(path.totalStrength * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      {path.path.map((node, j) => (
                        <React.Fragment key={j}>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              {node.type === 'user' ? '👤' : node.name[0]}
                            </div>
                            <div>
                              <p className="font-medium">
                                {node.type === 'user' ? 'You' : node.name}
                              </p>
                              {node.title && (
                                <p className="text-xs text-slate-600">
                                  {node.title} at {node.company}
                                </p>
                              )}
                            </div>
                          </div>
                          {j < path.path.length - 1 && (
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleRequestIntro(path)}
                  >
                    Request Intro
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    );
  }
  ```

**Test Cases**:
1. Select target company → Shows 3 warm intro paths ranked by strength
2. 1-hop path: "You → Alice (strong connection) → Bob (CEO)"
3. 2-hop path: "You → Carol → Dave → Bob (CEO)"
4. Click "Request intro" → Opens email draft with template
5. No paths found → Shows message "Connect LinkedIn to find paths"

**Estimated Effort**: 12 days
**Priority**: P0
**Labels**: `relationship-intelligence`, `graph-algorithm`, `backend`, `frontend`

---

### Story 5.5: Intro Request Email Template Generator

**As a** user
**I want to** automatically generate intro request emails
**So that** I can quickly ask my connections to introduce me to target decision-makers

**Acceptance Criteria**:
- [ ] Click "Request intro" → Opens modal with email template
- [ ] Template pre-filled with: Sender (you), Intermediary (Alice), Target (Bob)
- [ ] AI-generated personalized message referencing shared context
- [ ] Edit template before sending
- [ ] Track intro requests in database (status: pending/accepted/declined)
- [ ] Reminder: Follow up if no response in 3 days

**Technical Notes**:
- **Email Template**:
  ```
  Subject: Introduction to [Target Name] at [Target Company]

  Hi [Intermediary Name],

  Hope you're doing well! I'm currently researching [Target Company] for a potential partnership/investment opportunity, and I noticed you're connected with [Target Name] ([Target Title]).

  Would you be comfortable making an introduction? I'd love to learn more about their work in [Target Company's sector/product].

  Here's a bit about what we're working on at oppSpot:
  [User's company description]

  Happy to provide more context if helpful. Thanks so much!

  Best,
  [Your Name]
  ```

- **AI Personalization** (optional):
  - Use OpenRouter API to generate personalized intro based on:
    - Target company's industry, products
    - User's background, firm focus
    - Recent news about target company

- **Database Schema**:
  ```sql
  CREATE TABLE intro_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    target_contact_id UUID REFERENCES business_contacts(id),
    intermediary_connection_id UUID REFERENCES network_connections(id),
    email_subject TEXT,
    email_body TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'no_response'
    sent_at TIMESTAMP,
    response_at TIMESTAMP,
    follow_up_reminder_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

**Test Cases**:
1. Click "Request intro" → Modal opens with pre-filled template
2. Edit template → Save changes
3. Send email → Creates intro_request record
4. Track status → Shows "Pending response from Alice"
5. Reminder: 3 days no response → Email reminder "Follow up with Alice"

**Estimated Effort**: 5 days
**Priority**: P1
**Labels**: `relationship-intelligence`, `email`, `backend`, `frontend`

---

## Epic 6: CRM Integration (Salesforce, HubSpot, Affinity)

**Epic Description**: Bi-directional sync with Salesforce, HubSpot, and Affinity CRM. Push companies, contacts, deals to CRM. Pull relationship data and enrich CRM records with oppSpot data.

**Business Value**: CRM integration is **table stakes for enterprise customers**. Becomes embedded in daily workflow, making oppSpot sticky and increasing retention.

**Acceptance Criteria**:
- Salesforce integration: OAuth, bi-directional sync of accounts/contacts/opportunities
- HubSpot integration: OAuth, sync companies/contacts/deals
- Affinity integration: API key, sync companies/lists/relationships
- Auto-enrich CRM records with oppSpot data (revenue, employees, ResearchGPT summaries)
- Sync frequency: Real-time (webhooks) or scheduled (hourly/daily)
- Conflict resolution: Last-write-wins or manual merge

**Estimated Effort**: 12 weeks (2 engineers)
**Priority**: P0 (Must-Have)
**Dependencies**: None

---

### Story 6.1: Salesforce OAuth & Schema Mapping

**As a** enterprise customer
**I want to** connect oppSpot to Salesforce
**So that** I can sync companies and contacts between both systems

**Acceptance Criteria**:
- [ ] Salesforce OAuth 2.0 authentication
- [ ] Map oppSpot fields to Salesforce standard objects:
  - `businesses` → Salesforce `Account`
  - `business_contacts` → Salesforce `Contact`
  - `saved_businesses` → Salesforce `Opportunity` (optional)
- [ ] Custom field mapping UI (user can map additional fields)
- [ ] Initial sync: Import existing Salesforce accounts
- [ ] Ongoing sync: Push new oppSpot companies to Salesforce
- [ ] Pull Salesforce data: Import notes, activities, ownership

**Technical Notes**:
- **Salesforce OAuth**:
  - Scopes: `api`, `refresh_token`, `offline_access`
  - Endpoint: `https://login.salesforce.com/services/oauth2/authorize`
  - Store: `instance_url`, `access_token`, `refresh_token`

- **Field Mapping**:
  ```typescript
  const DEFAULT_FIELD_MAPPING = {
    // oppSpot field → Salesforce field
    'name': 'Name',
    'website': 'Website',
    'industry': 'Industry',
    'employee_count': 'NumberOfEmployees',
    'revenue': 'AnnualRevenue',
    'location_city': 'BillingCity',
    'location_country': 'BillingCountry',
    'description': 'Description',
    'founded_year': 'YearStarted', // Custom field
  };
  ```

- **Database Schema**:
  ```sql
  CREATE TABLE crm_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    crm_type VARCHAR(20) NOT NULL, -- 'salesforce', 'hubspot', 'affinity'
    crm_instance_url TEXT,
    access_token TEXT NOT NULL, -- Encrypted
    refresh_token TEXT, -- Encrypted
    expires_at TIMESTAMP,
    field_mapping JSONB, -- Custom field mappings
    sync_frequency VARCHAR(20) DEFAULT 'hourly', -- 'realtime', 'hourly', 'daily'
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, crm_type)
  );

  CREATE TABLE crm_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES crm_integrations(id) ON DELETE CASCADE,
    direction VARCHAR(20), -- 'push' (oppSpot → CRM), 'pull' (CRM → oppSpot)
    entity_type VARCHAR(50), -- 'business', 'contact', 'opportunity'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
    records_synced INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_log JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE crm_entity_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES crm_integrations(id) ON DELETE CASCADE,
    oppspot_entity_type VARCHAR(50), -- 'business', 'contact'
    oppspot_entity_id UUID,
    crm_entity_type VARCHAR(50), -- 'Account', 'Contact', 'Opportunity'
    crm_entity_id VARCHAR(50),
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(integration_id, oppspot_entity_id, crm_entity_id)
  );
  ```

- **Sync Logic**:
  ```typescript
  // lib/crm/salesforce-sync.ts
  export async function pushBusinessToSalesforce(
    business: Business,
    integration: CRMIntegration
  ): Promise<string> {
    const sf = new SalesforceClient(integration.access_token, integration.crm_instance_url);

    // Check if already synced
    const existingMapping = await db.query(
      'SELECT crm_entity_id FROM crm_entity_mappings WHERE oppspot_entity_id = $1',
      [business.id]
    );

    const accountData = {
      Name: business.name,
      Website: business.website,
      Industry: business.industry,
      NumberOfEmployees: business.employee_count,
      AnnualRevenue: business.revenue,
      BillingCity: business.location_city,
      BillingCountry: business.location_country,
      Description: business.description,
      // Custom fields
      oppSpot_Company_ID__c: business.id,
      oppSpot_Research_URL__c: `https://oppspot.ai/business/${business.id}`
    };

    let accountId: string;

    if (existingMapping) {
      // Update existing
      await sf.update('Account', existingMapping.crm_entity_id, accountData);
      accountId = existingMapping.crm_entity_id;
    } else {
      // Create new
      const result = await sf.create('Account', accountData);
      accountId = result.id;

      // Save mapping
      await db.insert('crm_entity_mappings', {
        integration_id: integration.id,
        oppspot_entity_type: 'business',
        oppspot_entity_id: business.id,
        crm_entity_type: 'Account',
        crm_entity_id: accountId,
        last_synced_at: new Date()
      });
    }

    return accountId;
  }
  ```

**Test Cases**:
1. Connect Salesforce → OAuth flow → Grants permissions → Returns to oppSpot
2. Initial sync → Imports 1,000 Salesforce accounts to oppSpot
3. Push business to Salesforce → Creates new Account record
4. Update business in oppSpot → Updates Salesforce Account
5. Handle conflict: Business updated in both systems → Last-write-wins

**Estimated Effort**: 15 days
**Priority**: P0
**Labels**: `crm`, `salesforce`, `oauth`, `sync`, `backend`

---

### Story 6.2: HubSpot Integration

(Similar structure to Salesforce, but using HubSpot API)

**Estimated Effort**: 12 days
**Priority**: P0
**Labels**: `crm`, `hubspot`, `oauth`, `sync`, `backend`

---

### Story 6.3: Affinity CRM Integration

(Affinity uses API key authentication, not OAuth)

**Estimated Effort**: 10 days
**Priority**: P1
**Labels**: `crm`, `affinity`, `api`, `sync`, `backend`

---

### Story 6.4: CRM Auto-Enrichment

**As a** user
**I want to** automatically enrich CRM records with oppSpot data
**So that** my CRM always has up-to-date company information

**Acceptance Criteria**:
- [ ] When new company added to CRM, trigger oppSpot lookup
- [ ] If company found in oppSpot, enrich CRM record with: Revenue, employees, industry, funding history
- [ ] If company not in oppSpot database, trigger ResearchGPT generation
- [ ] Enrichment runs in background (async job)
- [ ] Settings: Enable/disable auto-enrichment, choose which fields to enrich

**Estimated Effort**: 8 days
**Priority**: P1
**Labels**: `crm`, `enrichment`, `backend`

---

## Epic 7: Quick Wins (Company Comparison, Browser Extension)

**Epic Description**: Ship high-value features quickly to improve user workflows.

**Estimated Effort**: 5 weeks (1 engineer)
**Priority**: P1

---

### Story 7.1: Company Comparison Tool

**As a** analyst shortlisting targets
**I want to** compare 2-10 companies side-by-side
**So that** I can quickly identify the best acquisition candidates

**Acceptance Criteria**:
- [ ] Multi-select companies (checkboxes on search results)
- [ ] Click "Compare" → Opens comparison view
- [ ] Side-by-side table: Columns = companies, Rows = metrics
- [ ] Metrics: Revenue, employees, growth rate, profitability, funding, valuation
- [ ] Highlight differences (color coding)
- [ ] Export comparison as PDF or CSV
- [ ] Share link: Generate shareable URL for comparison

**Technical Notes**:
- **UI Layout**:
  ```
  ┌────────────── Company Comparison ──────────────┐
  │                                                 │
  │ [TechCo] [DataFlow] [CloudNet] [+ Add Company] │
  │                                                 │
  │ Metric          TechCo    DataFlow   CloudNet  │
  │ ─────────────────────────────────────────────── │
  │ Revenue         £15M      £8M        £22M      │
  │ Employees       120       45         180       │
  │ Growth (YoY)    45% ↑     120% ↑     30% ↑     │
  │ Profitability   ✓ Yes     ✗ No       ✓ Yes     │
  │ Last Funding    Series B  Seed       Series A  │
  │ Valuation       £200M     £25M       £65M      │
  │ Founded         2018      2021       2019      │
  │ Location        London    Manchester Leeds     │
  │                                                 │
  │ [Export PDF] [Export CSV] [Share Link]         │
  └─────────────────────────────────────────────────┘
  ```

- **Component**:
  ```tsx
  // components/comparison/company-comparison.tsx
  export function CompanyComparison({ companyIds }: { companyIds: string[] }) {
    const [companies, setCompanies] = useState<Business[]>([]);

    useEffect(() => {
      Promise.all(companyIds.map(id =>
        fetch(`/api/businesses/${id}`).then(res => res.json())
      )).then(setCompanies);
    }, [companyIds]);

    const metrics = [
      { key: 'revenue', label: 'Revenue', format: formatCurrency },
      { key: 'employee_count', label: 'Employees', format: (v) => v },
      { key: 'growth_rate', label: 'Growth (YoY)', format: (v) => `${v}%` },
      { key: 'is_profitable', label: 'Profitability', format: (v) => v ? '✓ Yes' : '✗ No' },
      { key: 'latest_funding_round', label: 'Last Funding', format: (v) => v.round_type },
      { key: 'valuation', label: 'Valuation', format: formatCurrency },
      { key: 'founded_year', label: 'Founded', format: (v) => v },
      { key: 'location_city', label: 'Location', format: (v) => v }
    ];

    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Company Comparison</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share className="h-4 w-4 mr-2" />
              Share Link
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-semibold">Metric</th>
                {companies.map(company => (
                  <th key={company.id} className="text-left p-3 font-semibold">
                    {company.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map(metric => (
                <tr key={metric.key} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-700">{metric.label}</td>
                  {companies.map(company => (
                    <td key={company.id} className="p-3">
                      {metric.format(company[metric.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }
  ```

**Test Cases**:
1. Select 3 companies → Click "Compare" → Shows comparison table
2. Highlight max/min values (e.g., highest revenue in green)
3. Export PDF → Downloads formatted comparison report
4. Share link → Generates public URL (e.g., oppspot.ai/compare/abc123)
5. Add 4th company → Updates comparison dynamically

**Estimated Effort**: 6 days
**Priority**: P1
**Labels**: `comparison`, `frontend`, `export`

---

### Story 7.2: Browser Extension for Quick Lookup

**As a** busy professional browsing LinkedIn or company websites
**I want to** quickly lookup company information in oppSpot without switching tabs
**So that** I can research faster during discovery

**Acceptance Criteria**:
- [ ] Chrome extension installable from Chrome Web Store
- [ ] Firefox add-on available
- [ ] Highlight company name on any webpage → Right-click → "Lookup in oppSpot"
- [ ] Extension popup shows: Company summary, revenue, employees, ResearchGPT snippet
- [ ] "View Full Profile" button → Opens oppSpot in new tab
- [ ] "Save Company" button → Adds to saved businesses list
- [ ] Works on: LinkedIn, Crunchbase, company websites
- [ ] Authentication: Uses oppSpot login (OAuth)

**Technical Notes**:
- **Chrome Extension Manifest** (`manifest.json`):
  ```json
  {
    "manifest_version": 3,
    "name": "oppSpot Company Lookup",
    "version": "1.0.0",
    "description": "Quick company intelligence from oppSpot",
    "permissions": ["contextMenus", "activeTab", "storage"],
    "host_permissions": ["https://oppspot.ai/*"],
    "background": {
      "service_worker": "background.js"
    },
    "content_scripts": [
      {
        "matches": ["<all_urls>"],
        "js": ["content.js"]
      }
    ],
    "action": {
      "default_popup": "popup.html",
      "default_icon": {
        "16": "icons/icon16.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png"
      }
    }
  }
  ```

- **Context Menu** (`background.js`):
  ```javascript
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "oppspot-lookup",
      title: "Lookup '%s' in oppSpot",
      contexts: ["selection"]
    });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "oppspot-lookup") {
      const companyName = info.selectionText;

      // Fetch company data from oppSpot API
      fetch(`https://oppspot.ai/api/businesses/search?q=${encodeURIComponent(companyName)}`, {
        credentials: 'include' // Include cookies for authentication
      })
        .then(res => res.json())
        .then(data => {
          // Show popup with company info
          chrome.action.setPopup({ popup: `popup.html?company=${data[0].id}` });
          chrome.action.openPopup();
        });
    }
  });
  ```

- **Popup UI** (`popup.html`):
  ```html
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        width: 400px;
        padding: 16px;
        font-family: Inter, sans-serif;
      }
      .company-card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
      }
      .stat {
        display: flex;
        justify-content: space-between;
        margin: 8px 0;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script src="popup.js"></script>
  </body>
  </html>
  ```

- **Popup Logic** (`popup.js`):
  ```javascript
  const urlParams = new URLSearchParams(window.location.search);
  const companyId = urlParams.get('company');

  fetch(`https://oppspot.ai/api/businesses/${companyId}`)
    .then(res => res.json())
    .then(company => {
      document.getElementById('app').innerHTML = `
        <div class="company-card">
          <h2>${company.name}</h2>
          <p>${company.description}</p>
          <div class="stat">
            <span>Revenue:</span>
            <strong>£${(company.revenue / 1000000).toFixed(1)}M</strong>
          </div>
          <div class="stat">
            <span>Employees:</span>
            <strong>${company.employee_count}</strong>
          </div>
          <div class="stat">
            <span>Location:</span>
            <strong>${company.location_city}, ${company.location_country}</strong>
          </div>
          <button onclick="window.open('https://oppspot.ai/business/${company.id}')">
            View Full Profile
          </button>
          <button onclick="saveCompany('${company.id}')">
            Save Company
          </button>
        </div>
      `;
    });

  function saveCompany(companyId) {
    fetch(`https://oppspot.ai/api/saved-businesses`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: companyId })
    }).then(() => alert('Company saved!'));
  }
  ```

**Test Cases**:
1. Install extension → Appears in Chrome toolbar
2. Highlight "Stripe" on LinkedIn → Right-click → "Lookup in oppSpot" → Shows popup
3. Click "View Full Profile" → Opens oppspot.ai/business/stripe-id in new tab
4. Click "Save Company" → Adds to saved businesses
5. Authentication: Not logged in → Shows "Login to oppSpot" button

**Estimated Effort**: 10 days
**Priority**: P1
**Labels**: `browser-extension`, `chrome`, `firefox`, `frontend`

---

# Q3 2025: AI & Automation

**Quarter Goal**: Leverage AI to automate workflows + build predictive capabilities
**Success Metrics**:
- Predictive score correlates 70%+ with successful deals
- Automated pipeline reduces screening time from 2 weeks to 2 days
- API adopted by 20% of Enterprise customers

---

## Epic 8: Predictive Deal Scoring (AI-Powered)

**Epic Description**: Train ML model to predict acquisition attractiveness (0-100 score). Matches CB Insights' Mosaic Score but optimized for mid-market PE deals.

**Business Value**: Speeds up deal qualification by 10x. Pre-screens 100 companies in <1 hour vs. 2 weeks manual review.

**Acceptance Criteria**:
- ML model trained on historical acquisition data (successful/failed deals)
- Input features: Financial metrics, growth rate, market trends, team quality, funding history
- Output: 0-100 "oppSpot Score" with confidence intervals
- Explainability: Show why score is high/low (SHAP values)
- Alert: Flag high-scoring targets (>80) automatically

**Estimated Effort**: 20 weeks (1 ML engineer + 1 backend engineer)
**Priority**: P0 (Must-Have)
**Dependencies**: Q1 funding data, Q4 financial data

---

### Story 8.1: Data Collection & Feature Engineering

**As an** ML engineer
**I want to** collect historical acquisition data and engineer features
**So that** I can train a predictive model

**Acceptance Criteria**:
- [ ] Scrape historical M&A deals from public sources (Crunchbase, CB Insights, TechCrunch)
- [ ] Label training data: Success = acquired at >2x valuation, Failure = shut down or fire sale
- [ ] Feature engineering: 50+ features across 5 categories
  - Financial: Revenue, EBITDA, growth rate, profitability
  - Market: TAM, competitive landscape, market share
  - Team: Founder experience, team size, key hires
  - Traction: Customer count, MRR, churn rate
  - Signals: Recent funding, press coverage, hiring velocity
- [ ] Clean data: Handle missing values, outliers
- [ ] Train/val/test split: 70/15/15

**Technical Notes**:
- **Data Sources**:
  - Crunchbase API (if available) or web scraping
  - CB Insights historical deal data
  - Companies House financial filings (UK companies)
  - LinkedIn for team data (founder experience, key hires)

- **Feature Engineering**:
  ```python
  # lib/ml/feature_engineering.py
  import pandas as pd
  import numpy as np

  def engineer_features(business: dict) -> dict:
      features = {}

      # Financial features
      features['revenue_log'] = np.log1p(business['revenue'])
      features['employee_count_log'] = np.log1p(business['employee_count'])
      features['revenue_per_employee'] = business['revenue'] / business['employee_count'] if business['employee_count'] > 0 else 0
      features['growth_rate_3y'] = business['revenue_growth_rate_3y']
      features['is_profitable'] = 1 if business['is_profitable'] else 0
      features['ebitda_margin'] = business['ebitda'] / business['revenue'] if business['revenue'] > 0 else 0

      # Market features
      features['tam_size_log'] = np.log1p(business['tam_estimate'])
      features['market_share'] = business['revenue'] / business['tam_estimate'] if business['tam_estimate'] > 0 else 0
      features['competitor_count'] = business['competitor_count']

      # Team features
      features['founder_previous_exits'] = business['founder_previous_exits']
      features['team_size_log'] = np.log1p(business['employee_count'])
      features['key_hires_last_6m'] = business['key_hires_last_6m']

      # Traction features
      features['customer_count_log'] = np.log1p(business['customer_count'])
      features['mrr_log'] = np.log1p(business['mrr'])
      features['churn_rate'] = business['churn_rate']

      # Signal features
      features['months_since_last_funding'] = business['months_since_last_funding']
      features['press_mentions_last_3m'] = business['press_mentions_last_3m']
      features['hiring_velocity'] = business['employees_added_last_6m']

      # Industry one-hot encoding
      features[f'industry_{business["industry"]}'] = 1

      return features
  ```

- **Training Data Structure**:
  ```sql
  CREATE TABLE ml_training_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id),
    acquisition_status VARCHAR(20), -- 'success', 'failure', 'unknown'
    acquisition_date DATE,
    acquisition_price_usd BIGINT,
    acquisition_multiple DECIMAL(5,2), -- price / revenue
    features JSONB NOT NULL,
    label INTEGER, -- 1 = success, 0 = failure
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

**Test Cases**:
1. Scrape 10,000 historical deals from Crunchbase
2. Label 1,000 deals manually (success/failure)
3. Engineer 50 features for 1 company
4. Check data quality: No NaN values, outliers capped at 99th percentile
5. Verify train/val/test split: 7000/1500/1500

**Estimated Effort**: 15 days
**Priority**: P0
**Labels**: `ml`, `data-engineering`, `feature-engineering`

---

### Story 8.2: Model Training & Evaluation

**As an** ML engineer
**I want to** train and evaluate multiple ML models
**So that** I can select the best-performing model for production

**Acceptance Criteria**:
- [ ] Train 5 models: Logistic Regression, Random Forest, XGBoost, LightGBM, Neural Network
- [ ] Hyperparameter tuning with cross-validation
- [ ] Evaluation metrics: AUC-ROC, Precision, Recall, F1 at threshold 0.8
- [ ] Model comparison: Select model with highest AUC-ROC
- [ ] Calibration: Ensure predicted probabilities match actual outcomes
- [ ] Save best model to file (.pkl or .onnx)

**Technical Notes**:
- **Model Training**:
  ```python
  # lib/ml/model_training.py
  from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
  from sklearn.linear_model import LogisticRegression
  from sklearn.neural_network import MLPClassifier
  import xgboost as xgb
  import lightgbm as lgb
  from sklearn.model_selection import GridSearchCV
  from sklearn.metrics import roc_auc_score, classification_report

  def train_models(X_train, y_train, X_val, y_val):
      models = {
          'logistic': LogisticRegression(max_iter=1000),
          'random_forest': RandomForestClassifier(n_estimators=200, max_depth=10),
          'xgboost': xgb.XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.1),
          'lightgbm': lgb.LGBMClassifier(n_estimators=200, max_depth=6, learning_rate=0.1),
          'neural_net': MLPClassifier(hidden_layer_sizes=(128, 64, 32), max_iter=500)
      }

      results = {}
      for name, model in models.items():
          print(f"Training {name}...")
          model.fit(X_train, y_train)
          y_pred_proba = model.predict_proba(X_val)[:, 1]
          auc = roc_auc_score(y_val, y_pred_proba)
          results[name] = {'model': model, 'auc': auc}
          print(f"{name} AUC: {auc:.4f}")

      # Select best model
      best_model_name = max(results, key=lambda k: results[k]['auc'])
      best_model = results[best_model_name]['model']
      print(f"Best model: {best_model_name} (AUC: {results[best_model_name]['auc']:.4f})")

      return best_model, results
  ```

- **Hyperparameter Tuning**:
  ```python
  # Tune XGBoost (typically best performer)
  param_grid = {
      'n_estimators': [100, 200, 300],
      'max_depth': [4, 6, 8],
      'learning_rate': [0.05, 0.1, 0.15],
      'subsample': [0.8, 1.0]
  }

  grid_search = GridSearchCV(
      xgb.XGBClassifier(),
      param_grid,
      cv=5,
      scoring='roc_auc',
      n_jobs=-1
  )
  grid_search.fit(X_train, y_train)

  print(f"Best params: {grid_search.best_params_}")
  print(f"Best CV AUC: {grid_search.best_score_:.4f}")
  ```

- **Model Calibration**:
  ```python
  from sklearn.calibration import CalibratedClassifierCV

  # Calibrate probabilities
  calibrated_model = CalibratedClassifierCV(best_model, method='isotonic', cv=5)
  calibrated_model.fit(X_train, y_train)

  # Verify calibration
  from sklearn.calibration import calibration_curve
  prob_true, prob_pred = calibration_curve(y_val, calibrated_model.predict_proba(X_val)[:, 1], n_bins=10)
  # Plot calibration curve (prob_true vs prob_pred should be close to y=x line)
  ```

**Test Cases**:
1. Train 5 models → All complete without errors
2. XGBoost achieves AUC > 0.75 on validation set
3. Calibration: Predicted 80% probability → 75-85% actual success rate
4. Save model → Load model → Predictions match
5. Inference time: <100ms per prediction

**Estimated Effort**: 20 days
**Priority**: P0
**Labels**: `ml`, `model-training`, `evaluation`

---

### Story 8.3: Model Explainability (SHAP Values)

**As a** user
**I want to** understand why a company received a high/low oppSpot Score
**So that** I can trust the model and understand key drivers

**Acceptance Criteria**:
- [ ] SHAP (SHapley Additive exPlanations) values computed for each prediction
- [ ] Display top 5 features influencing score (positive and negative)
- [ ] Feature importance bar chart
- [ ] Waterfall chart showing contribution of each feature to final score
- [ ] Plain English explanation: "High score due to strong revenue growth (+15 points), profitable operations (+10 points)"

**Technical Notes**:
- **SHAP Library**:
  ```python
  # lib/ml/explainability.py
  import shap

  def explain_prediction(model, features: dict, feature_names: list):
      # Convert features to numpy array
      X = np.array([list(features.values())])

      # Compute SHAP values
      explainer = shap.TreeExplainer(model)  # For tree-based models
      shap_values = explainer.shap_values(X)

      # Get base value (average prediction)
      base_value = explainer.expected_value

      # Get top 5 positive and negative features
      feature_contributions = list(zip(feature_names, shap_values[0]))
      feature_contributions.sort(key=lambda x: abs(x[1]), reverse=True)

      top_features = feature_contributions[:5]

      # Generate explanation
      explanation = {
          'score': (base_value + sum(shap_values[0])) * 100,  # Convert to 0-100
          'base_value': base_value * 100,
          'top_features': [
              {
                  'feature': name,
                  'contribution': contrib * 100,
                  'direction': 'positive' if contrib > 0 else 'negative'
              }
              for name, contrib in top_features
          ]
      }

      return explanation
  ```

- **UI Component**:
  ```tsx
  // components/ml/oppspot-score-explanation.tsx
  export function OppSpotScoreExplanation({ companyId }: { companyId: string }) {
    const [explanation, setExplanation] = useState<ScoreExplanation | null>(null);

    useEffect(() => {
      fetch(`/api/ml/explain?company_id=${companyId}`)
        .then(res => res.json())
        .then(setExplanation);
    }, [companyId]);

    if (!explanation) return <Skeleton />;

    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">oppSpot Score</h3>
          <div className="text-4xl font-bold text-blue-600">
            {explanation.score.toFixed(0)}
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          This score predicts acquisition attractiveness based on 50+ factors.
        </p>

        <div className="space-y-3">
          <h4 className="font-medium text-sm">Key Drivers:</h4>
          {explanation.top_features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2">
              {feature.direction === 'positive' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm flex-1">{formatFeatureName(feature.feature)}</span>
              <span className={cn(
                "text-sm font-medium",
                feature.direction === 'positive' ? 'text-green-600' : 'text-red-600'
              )}>
                {feature.contribution > 0 ? '+' : ''}{feature.contribution.toFixed(1)}
              </span>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" className="mt-4 w-full">
          View Detailed Breakdown
        </Button>
      </Card>
    );
  }
  ```

**Test Cases**:
1. Company with high score → Shows positive drivers (e.g., "Strong revenue growth +15")
2. Company with low score → Shows negative drivers (e.g., "High churn rate -12")
3. Waterfall chart → Visualizes contribution of each feature
4. Plain English explanation → "This company scores well due to..."
5. SHAP values sum to final score (mathematical correctness)

**Estimated Effort**: 10 days
**Priority**: P0
**Labels**: `ml`, `explainability`, `shap`, `frontend`

---

### Story 8.4: Batch Scoring & Alerts

**As a** user
**I want to** automatically score all companies in my database
**So that** I can prioritize high-scoring targets without manual review

**Acceptance Criteria**:
- [ ] Cron job: Run model on all companies nightly
- [ ] Store scores in database with timestamp
- [ ] Alert: Email when new high-scoring company (>80) detected
- [ ] Dashboard: List of top 100 scored companies
- [ ] Filter search results by oppSpot Score (e.g., "Show only score >70")

**Technical Notes**:
- **Batch Scoring**:
  ```python
  # lib/ml/batch_scoring.py
  async def score_all_companies():
      # Fetch all companies
      companies = await db.fetch_all("SELECT * FROM businesses WHERE deleted_at IS NULL")

      # Load model
      model = joblib.load('models/oppspot_score_v1.pkl')

      scores = []
      for company in companies:
          features = engineer_features(company)
          score = model.predict_proba([list(features.values())])[0][1] * 100

          scores.append({
              'business_id': company['id'],
              'score': score,
              'scored_at': datetime.now()
          })

      # Bulk insert scores
      await db.bulk_insert('ml_scores', scores)

      # Find new high-scorers
      new_high_scorers = await db.fetch_all("""
          SELECT b.*
          FROM businesses b
          JOIN ml_scores ms ON b.id = ms.business_id
          LEFT JOIN ml_scores prev ON b.id = prev.business_id AND prev.scored_at < CURRENT_DATE
          WHERE ms.score > 80
          AND (prev.score IS NULL OR prev.score <= 80)
      """)

      # Send alerts
      for company in new_high_scorers:
          await send_high_score_alert(company)
  ```

- **Database Schema**:
  ```sql
  CREATE TABLE ml_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL, -- 0.00 - 100.00
    model_version VARCHAR(20) DEFAULT 'v1',
    scored_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, scored_at)
  );

  CREATE INDEX idx_ml_scores_business ON ml_scores(business_id, scored_at DESC);
  CREATE INDEX idx_ml_scores_score ON ml_scores(score DESC);
  ```

**Test Cases**:
1. Batch score 10,000 companies → Completes in <30 minutes
2. New high-scorer detected → Sends email alert
3. Dashboard shows top 100 → Sorted by score DESC
4. Search filter "Score >70" → Returns 234 companies
5. Model version tracking → Can revert to previous model if needed

**Estimated Effort**: 8 days
**Priority**: P0
**Labels**: `ml`, `batch-processing`, `alerts`, `backend`

---

## Epic 9: Automated Deal Flow Pipeline

**Epic Description**: Workflow automation from sourcing to term sheet. Auto-advance deals based on criteria, task management, team collaboration.

**Business Value**: Reduces deal screening time from 2 weeks to 2 days. Competes with DealRoom's workflow features.

**Estimated Effort**: 16 weeks (2 engineers)
**Priority**: P0 (Must-Have)
**Dependencies**: Q1 saved searches, Q3 predictive scoring

---

### Story 9.1: Pipeline Stages & Workflow

**As a** PE analyst
**I want to** organize deals into pipeline stages (Sourcing → Screening → Due Diligence → Term Sheet)
**So that** I can track deal progress and prioritize next actions

**Acceptance Criteria**:
- [ ] Default pipeline stages: Sourcing, Screening, Due Diligence, Term Sheet, Closed Won, Closed Lost
- [ ] Custom stages: Users can add/edit/delete stages
- [ ] Kanban board view: Drag-and-drop deals between stages
- [ ] Deal cards show: Company name, oppSpot Score, last activity, assigned team member
- [ ] Stage-specific fields: e.g., Due Diligence requires checklist completion
- [ ] Auto-advance rules: "If oppSpot Score >80, move to Screening"

**Technical Notes**:
- **Database Schema**:
  ```sql
  CREATE TABLE pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL, -- Display order
    color VARCHAR(7), -- Hex color code
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    pipeline_stage_id UUID REFERENCES pipeline_stages(id),
    assigned_to UUID REFERENCES auth.users(id),
    score DECIMAL(5,2), -- oppSpot Score snapshot
    probability DECIMAL(3,2), -- Win probability (0.00-1.00)
    deal_size_usd BIGINT,
    expected_close_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    moved_to_stage_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE deal_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    from_stage_id UUID REFERENCES pipeline_stages(id),
    to_stage_id UUID REFERENCES pipeline_stages(id),
    moved_by UUID REFERENCES auth.users(id),
    moved_at TIMESTAMP DEFAULT NOW()
  );

  CREATE INDEX idx_deals_user ON deals(user_id);
  CREATE INDEX idx_deals_stage ON deals(pipeline_stage_id);
  CREATE INDEX idx_deals_business ON deals(business_id);
  ```

- **Kanban Board Component**:
  ```tsx
  // components/pipeline/kanban-board.tsx
  import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
  import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

  export function PipelineKanban({ stages, deals }: { stages: Stage[], deals: Deal[] }) {
    const [activeDealId, setActiveDealId] = useState<string | null>(null);

    const handleDragEnd = async (event: any) => {
      const { active, over } = event;
      if (!over) return;

      const dealId = active.id;
      const newStageId = over.id;

      // Update deal stage
      await fetch(`/api/deals/${dealId}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ pipeline_stage_id: newStageId })
      });

      // Optimistically update UI
      // ... state update logic
    };

    return (
      <DndContext
        collisionDetection={closestCorners}
        onDragStart={({ active }) => setActiveDealId(active.id)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map(stage => (
            <div
              key={stage.id}
              className="min-w-[300px] bg-slate-50 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{stage.name}</h3>
                <Badge variant="secondary">
                  {deals.filter(d => d.pipeline_stage_id === stage.id).length}
                </Badge>
              </div>

              <SortableContext
                items={deals.filter(d => d.pipeline_stage_id === stage.id).map(d => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {deals
                    .filter(d => d.pipeline_stage_id === stage.id)
                    .map(deal => (
                      <DealCard key={deal.id} deal={deal} />
                    ))}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeDealId ? <DealCard deal={deals.find(d => d.id === activeDealId)!} /> : null}
        </DragOverlay>
      </DndContext>
    );
  }
  ```

**Test Cases**:
1. Create deal → Appears in "Sourcing" stage
2. Drag deal from "Sourcing" to "Screening" → Updates stage, logs history
3. Auto-advance rule: oppSpot Score >80 → Moves to "Screening" automatically
4. Filter by assigned team member → Shows only their deals
5. View stage history → Shows "Moved from Sourcing to Screening on 2025-01-15"

**Estimated Effort**: 12 days
**Priority**: P0
**Labels**: `pipeline`, `workflow`, `kanban`, `frontend`, `backend`

---

### Story 9.2: Task Management & Checklists

(Continued in next section due to length...)

**Estimated Effort**: 10 days
**Priority**: P0
**Labels**: `pipeline`, `tasks`, `checklist`, `backend`, `frontend`

---

### Story 9.3: Team Collaboration (Comments, @mentions)

**Estimated Effort**: 8 days
**Priority**: P1
**Labels**: `pipeline`, `collaboration`, `comments`, `frontend`, `backend`

---

## Epic 10: Public API

**Epic Description**: RESTful API with authentication, rate limiting, developer docs (Swagger).

**Business Value**: **Enterprise requirement** - critical for custom integrations. Enables customers to build on top of oppSpot platform.

**Estimated Effort**: 12 weeks (2 engineers)
**Priority**: P0 (Must-Have)
**Dependencies**: None

---

### Story 10.1: API Authentication & Rate Limiting

(Detailed user story with API key generation, JWT tokens, rate limiting logic...)

**Estimated Effort**: 10 days
**Priority**: P0
**Labels**: `api`, `auth`, `rate-limiting`, `backend`

---

### Story 10.2: API Endpoints (Companies, Searches, Research Reports)

(Detailed user story with endpoint specs, request/response formats...)

**Estimated Effort**: 15 days
**Priority**: P0
**Labels**: `api`, `endpoints`, `backend`

---

### Story 10.3: Developer Documentation (Swagger/OpenAPI)

(Detailed user story with interactive API docs...)

**Estimated Effort**: 8 days
**Priority**: P0
**Labels**: `api`, `documentation`, `swagger`

---

## Epic 11: Mobile PWA App

**Epic Description**: Progressive Web App (read-only) for mobile access.

**Business Value**: **Competitive advantage** - most competitors are desktop-only.

**Estimated Effort**: 12 weeks (1 frontend engineer)
**Priority**: P1 (High)
**Dependencies**: None

---

(Continue with detailed user stories for PWA...)

---

# Q4 2025: Financial Data & Enterprise

**Quarter Goal**: Add deep financial data + enterprise-grade security to compete with PitchBook
**Success Metrics**:
- 80% of companies have comprehensive financial data
- SOC 2 Type II certification achieved
- 5+ large enterprise customers (>50 seats)

---

## Epic 12: Advanced Financial Data

**Epic Description**: Companies House integration + partner with Orbis/FactSet for international data.

**Business Value**: **Competitive necessity** - required to displace PitchBook for mid-market PE.

**Estimated Effort**: 24 weeks (2 data engineers + 1 BD for partnerships)
**Priority**: P0 (Must-Have)
**Dependencies**: Q1 company database

---

(Continue with detailed user stories for financial data integration...)

---

## Epic 13: Market Intelligence Dashboard

**Epic Description**: Sector heatmaps, competitor tracking, AI theme detection, TAM analysis.

**Business Value**: **Strategic value** - positions oppSpot as strategic tool, not just tactical.

**Estimated Effort**: 20 weeks (2 engineers + 1 data scientist)
**Priority**: P1 (High)
**Dependencies**: Q1 funding data, Q4 financial data

---

(Continue with detailed user stories...)

---

## Epic 14: Enterprise Security & Compliance (SOC 2)

**Epic Description**: SSO, SOC 2 Type II prep, RBAC, audit logs, GDPR compliance.

**Business Value**: **Enterprise deal-breaker** - cannot close large customers without SOC 2.

**Estimated Effort**: 16 weeks (1 security engineer + 1 backend engineer)
**Priority**: P0 (Must-Have)
**Dependencies**: None

---

### Story 14.1: SSO (Single Sign-On) via SAML/OAuth

**As an** enterprise customer
**I want to** use my company's SSO provider (Okta, Azure AD, Google Workspace)
**So that** employees can access oppSpot without separate passwords

**Acceptance Criteria**:
- [ ] SAML 2.0 support (Okta, Azure AD, OneLogin)
- [ ] OAuth 2.0 / OpenID Connect support (Google Workspace, Auth0)
- [ ] Just-in-Time (JIT) provisioning: Create user accounts automatically on first login
- [ ] Attribute mapping: Email, name, role from SSO provider
- [ ] Settings: Configure SSO provider per organization
- [ ] Enforce SSO: Option to disable password login for organization

**Technical Notes**:
- **SAML Implementation**: Use `passport-saml` library
- **OAuth/OIDC**: Use `passport-google-oauth20`, `passport-azure-ad`
- **Database Schema**:
  ```sql
  CREATE TABLE sso_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    provider_type VARCHAR(20) NOT NULL, -- 'saml', 'oauth', 'oidc'
    provider_name VARCHAR(50), -- 'okta', 'azure_ad', 'google_workspace'
    configuration JSONB NOT NULL, -- Provider-specific config
    is_enforced BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

**Test Cases**:
1. Configure Okta SSO → User logs in via Okta → Account created automatically
2. Azure AD SSO → User logs in → Role assigned based on AD group
3. Enforce SSO → Password login disabled → Redirects to SSO
4. JIT provisioning → New employee logs in for first time → Account created
5. Attribute mapping → User's name/email pulled from SSO provider

**Estimated Effort**: 12 days
**Priority**: P0
**Labels**: `security`, `sso`, `saml`, `oauth`, `enterprise`, `backend`

---

### Story 14.2: SOC 2 Type II Compliance Preparation

**As a** VP of Engineering
**I want to** prepare for SOC 2 Type II audit
**So that** we can close enterprise deals and demonstrate security posture

**Acceptance Criteria**:
- [ ] Identify SOC 2 controls: CC1-CC9 (Common Criteria)
- [ ] Implement technical controls:
  - Access logging (audit logs)
  - Encryption at rest and in transit
  - Password policies (complexity, rotation)
  - MFA enforcement for admin accounts
  - Incident response procedures
  - Backup and disaster recovery
- [ ] Document policies and procedures
- [ ] Employee security training
- [ ] Vendor risk management
- [ ] Hire external auditor for Type II audit

**Technical Notes**:
- **Audit Logs**:
  ```sql
  CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(50) NOT NULL, -- 'login', 'logout', 'view_company', 'edit_company', 'delete_user'
    resource_type VARCHAR(50), -- 'business', 'user', 'data_room'
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    response_status INTEGER,
    metadata JSONB, -- Additional context
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
  CREATE INDEX idx_audit_logs_action ON audit_logs(action);
  CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

  -- Partition by month for performance
  CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
  ```

- **Encryption**:
  - At rest: Supabase already encrypts database at rest (AES-256)
  - In transit: Enforce HTTPS (TLS 1.2+)
  - Sensitive fields: Encrypt access tokens, API keys using `pgcrypto`

- **Password Policies**:
  ```typescript
  // lib/auth/password-policy.ts
  export function validatePassword(password: string): { valid: boolean, errors: string[] } {
    const errors: string[] = [];

    if (password.length < 12) {
      errors.push('Password must be at least 12 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain special character');
    }

    return { valid: errors.length === 0, errors };
  }
  ```

**Test Cases**:
1. Audit log: User views company → Logged with timestamp, IP, user agent
2. Encryption: Access token stored in database → Encrypted, not readable
3. Password policy: User tries weak password → Rejected with error message
4. MFA enforcement: Admin logs in without MFA → Blocked, forced to enable MFA
5. Backup: Daily database backup runs → Verified restoreable

**Estimated Effort**: 20 days (+ ongoing compliance work)
**Priority**: P0
**Labels**: `security`, `compliance`, `soc2`, `audit-logs`, `backend`

---

### Story 14.3: Role-Based Access Control (RBAC)

**As an** organization admin
**I want to** assign roles to team members (Admin, Editor, Viewer)
**So that** I can control who can view/edit/delete data

**Acceptance Criteria**:
- [ ] Default roles: Admin, Editor, Viewer, Custom
- [ ] Role permissions matrix:
  - Admin: Full access (view, edit, delete, invite users)
  - Editor: View, edit companies/deals (cannot delete, cannot invite users)
  - Viewer: Read-only access
  - Custom: Granular permissions (e.g., "can view financials but not contact info")
- [ ] Organization-level roles: Apply to all users in organization
- [ ] Resource-level roles: Apply to specific data rooms, deals, lists
- [ ] Permission checks: All API endpoints validate user permissions

**Technical Notes**:
- **Database Schema**:
  ```sql
  CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL, -- { "companies": ["view", "edit"], "data_rooms": ["view"] }
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
  );

  -- Resource-specific permissions
  CREATE TABLE resource_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50), -- 'data_room', 'deal', 'list'
    resource_id UUID,
    permission_level VARCHAR(20), -- 'owner', 'editor', 'viewer', 'commenter'
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, resource_type, resource_id)
  );
  ```

- **Permission Check Middleware**:
  ```typescript
  // lib/auth/rbac.ts
  export async function checkPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    // Get user's role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role_id, roles(*)')
      .eq('user_id', userId)
      .single();

    if (!userRole) return false;

    // Check if role has permission
    const permissions = userRole.roles.permissions;
    return permissions[resource]?.includes(action) || false;
  }

  // Usage in API route
  export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const userId = await getUserId(req);
    const hasPermission = await checkPermission(userId, 'companies', 'edit');

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Proceed with update
    // ...
  }
  ```

**Test Cases**:
1. Admin role → Can view, edit, delete all resources
2. Editor role → Can view, edit but not delete
3. Viewer role → Can view but not edit/delete
4. Custom role "Finance Viewer" → Can view financials but not contact info
5. Permission denied → API returns 403 Forbidden

**Estimated Effort**: 10 days
**Priority**: P0
**Labels**: `security`, `rbac`, `permissions`, `backend`

---

### Story 14.4: Data Retention & GDPR Compliance

**As a** compliance officer
**I want to** configure data retention policies and enable GDPR data deletion
**So that** we comply with privacy regulations

**Acceptance Criteria**:
- [ ] Data retention policies: Configure retention period per data type (e.g., audit logs: 7 years, ResearchGPT reports: 6 months)
- [ ] Automatic deletion: Cron job deletes expired data
- [ ] GDPR data export: User can export all their personal data (JSON/CSV)
- [ ] GDPR right to erasure: User can request account deletion (anonymizes data, keeps audit trail)
- [ ] Data processing agreements: Legal templates for enterprise customers

**Technical Notes**:
- **Data Retention**:
  ```sql
  CREATE TABLE data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type VARCHAR(50) NOT NULL, -- 'audit_logs', 'research_reports', 'feedback'
    retention_days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  );

  -- Cron job: Delete expired data
  CREATE OR REPLACE FUNCTION delete_expired_data() RETURNS void AS $$
  DECLARE
    policy RECORD;
  BEGIN
    FOR policy IN SELECT * FROM data_retention_policies WHERE is_active = true LOOP
      EXECUTE format('DELETE FROM %I WHERE created_at < NOW() - INTERVAL ''%s days''',
        policy.data_type, policy.retention_days);
    END LOOP;
  END;
  $$ LANGUAGE plpgsql;
  ```

- **GDPR Data Export**:
  ```typescript
  // app/api/gdpr/export/route.ts
  export async function GET(req: NextRequest) {
    const userId = await getUserId(req);

    // Fetch all user data
    const userData = {
      profile: await fetchUserProfile(userId),
      saved_businesses: await fetchSavedBusinesses(userId),
      searches: await fetchSavedSearches(userId),
      data_rooms: await fetchDataRooms(userId),
      feedback: await fetchFeedback(userId),
      audit_logs: await fetchAuditLogs(userId)
    };

    // Generate ZIP with JSON files
    const zip = new JSZip();
    Object.entries(userData).forEach(([key, data]) => {
      zip.file(`${key}.json`, JSON.stringify(data, null, 2));
    });

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="oppspot-data-export-${userId}.zip"`
      }
    });
  }
  ```

**Test Cases**:
1. Set retention policy: Audit logs = 7 years → Logs older than 7 years deleted automatically
2. GDPR export → User downloads ZIP with all their data
3. Account deletion request → User data anonymized, audit trail kept
4. Expired ResearchGPT reports → Deleted after 6 months
5. Data processing agreement → Generated for enterprise customer

**Estimated Effort**: 8 days
**Priority**: P0
**Labels**: `security`, `gdpr`, `compliance`, `data-retention`, `backend`

---

## Epic 15: White-Label & Multi-Tenancy

**Epic Description**: Custom branding for enterprise customers, multi-tenant architecture.

**Business Value**: **Revenue opportunity** - charge premium ($5K-10K/year) for white-label.

**Estimated Effort**: 16 weeks (2 engineers)
**Priority**: P2 (Nice-to-Have)
**Dependencies**: Epic 14 (RBAC, security)

---

(Continue with detailed user stories...)

---

# Jira/Linear Import Format

**CSV Format** for Q2-Q4 Tickets:

```csv
Issue Key,Summary,Description,Story Points,Priority,Labels,Epic Link,Quarter
OPPS-501,[EPIC] Relationship Intelligence & Network Mapping,"Build LinkedIn/email network mapping to enable warm introductions",80,Highest,"relationship-intelligence,epic",,Q2
OPPS-502,LinkedIn OAuth Integration,"Connect LinkedIn account for network mapping",10,Highest,"relationship-intelligence,linkedin,oauth,backend,frontend",OPPS-501,Q2
OPPS-503,Email Integration (Gmail/Outlook),"Connect email for relationship analysis",12,Highest,"relationship-intelligence,gmail,outlook,oauth,backend",OPPS-501,Q2
OPPS-504,Network Graph Visualization,"Interactive network graph with D3.js",10,Highest,"relationship-intelligence,visualization,frontend",OPPS-501,Q2
OPPS-505,Warm Intro Finder,"Find shortest path to target decision-makers",12,Highest,"relationship-intelligence,graph-algorithm,backend,frontend",OPPS-501,Q2
OPPS-506,Intro Request Email Template Generator,"Auto-generate intro request emails",5,High,"relationship-intelligence,email,backend,frontend",OPPS-501,Q2

OPPS-601,[EPIC] CRM Integration (Salesforce/HubSpot/Affinity),"Bi-directional sync with CRM systems",60,Highest,"crm,epic",,Q2
OPPS-602,Salesforce OAuth & Schema Mapping,"Connect Salesforce and map fields",15,Highest,"crm,salesforce,oauth,sync,backend",OPPS-601,Q2
OPPS-603,HubSpot Integration,"Connect HubSpot CRM",12,Highest,"crm,hubspot,oauth,sync,backend",OPPS-601,Q2
OPPS-604,Affinity CRM Integration,"Connect Affinity CRM",10,High,"crm,affinity,api,sync,backend",OPPS-601,Q2
OPPS-605,CRM Auto-Enrichment,"Automatically enrich CRM records with oppSpot data",8,High,"crm,enrichment,backend",OPPS-601,Q2

OPPS-701,[EPIC] Quick Wins (Comparison, Browser Extension),"High-value features shipped quickly",25,High,"quick-win,epic",,Q2
OPPS-702,Company Comparison Tool,"Side-by-side comparison of 2-10 companies",6,High,"comparison,frontend,export",OPPS-701,Q2
OPPS-703,Browser Extension for Quick Lookup,"Chrome/Firefox extension for quick company lookup",10,High,"browser-extension,chrome,firefox,frontend",OPPS-701,Q2

OPPS-801,[EPIC] Predictive Deal Scoring,"ML model to predict acquisition attractiveness",100,Highest,"ml,epic",,Q3
OPPS-802,Data Collection & Feature Engineering,"Collect historical deals and engineer features",15,Highest,"ml,data-engineering,feature-engineering",OPPS-801,Q3
OPPS-803,Model Training & Evaluation,"Train and evaluate ML models",20,Highest,"ml,model-training,evaluation",OPPS-801,Q3
OPPS-804,Model Explainability (SHAP Values),"Explain predictions with SHAP values",10,Highest,"ml,explainability,shap,frontend",OPPS-801,Q3
OPPS-805,Batch Scoring & Alerts,"Score all companies nightly and send alerts",8,Highest,"ml,batch-processing,alerts,backend",OPPS-801,Q3

OPPS-901,[EPIC] Automated Deal Flow Pipeline,"Workflow automation from sourcing to term sheet",80,Highest,"pipeline,epic",,Q3
OPPS-902,Pipeline Stages & Workflow,"Kanban board with drag-and-drop",12,Highest,"pipeline,workflow,kanban,frontend,backend",OPPS-901,Q3
OPPS-903,Task Management & Checklists,"Tasks and checklists per deal stage",10,Highest,"pipeline,tasks,checklist,backend,frontend",OPPS-901,Q3
OPPS-904,Team Collaboration (Comments/@mentions),"Comments and @mentions for team collaboration",8,High,"pipeline,collaboration,comments,frontend,backend",OPPS-901,Q3

OPPS-1001,[EPIC] Public API,"RESTful API with authentication and docs",60,Highest,"api,epic",,Q3
OPPS-1002,API Authentication & Rate Limiting,"API key generation and rate limiting",10,Highest,"api,auth,rate-limiting,backend",OPPS-1001,Q3
OPPS-1003,API Endpoints (Companies/Searches/Reports),"Core API endpoints",15,Highest,"api,endpoints,backend",OPPS-1001,Q3
OPPS-1004,Developer Documentation (Swagger/OpenAPI),"Interactive API docs with Swagger",8,Highest,"api,documentation,swagger",OPPS-1001,Q3

OPPS-1101,[EPIC] Mobile PWA App,"Progressive Web App for mobile",60,High,"mobile,pwa,epic",,Q3
OPPS-1102,PWA Architecture & Service Worker,"Setup PWA with offline support",15,High,"mobile,pwa,service-worker,frontend",OPPS-1101,Q3
OPPS-1103,Mobile-Optimized UI,"Mobile-responsive components",20,High,"mobile,pwa,ui,frontend",OPPS-1101,Q3

OPPS-1201,[EPIC] Advanced Financial Data,"Companies House + Orbis/FactSet integration",120,Highest,"financial-data,epic",,Q4
OPPS-1202,Companies House Financial Filings,"Integrate Companies House API for UK financials",20,Highest,"financial-data,companies-house,api,backend",OPPS-1201,Q4
OPPS-1203,Orbis/FactSet Partnership,"Partner with financial data provider",30,Highest,"financial-data,partnership,backend",OPPS-1201,Q4
OPPS-1204,Financial Data UI (Charts/Tables),"Display financial data with charts",15,Highest,"financial-data,charts,frontend",OPPS-1201,Q4

OPPS-1301,[EPIC] Market Intelligence Dashboard,"Sector heatmaps, trends, TAM analysis",100,High,"market-intelligence,epic",,Q4
OPPS-1302,Sector Heatmaps,"Visualize hot industries and M&A trends",20,High,"market-intelligence,heatmaps,frontend",OPPS-1301,Q4
OPPS-1303,AI Theme Detection,"Detect emerging themes (e.g., AI cybersecurity)",25,High,"market-intelligence,ai,ml,backend",OPPS-1301,Q4

OPPS-1401,[EPIC] Enterprise Security & Compliance,"SSO, SOC 2, RBAC, audit logs",80,Highest,"security,compliance,epic",,Q4
OPPS-1402,SSO (SAML/OAuth),"Single Sign-On with Okta/Azure AD",12,Highest,"security,sso,saml,oauth,enterprise,backend",OPPS-1401,Q4
OPPS-1403,SOC 2 Type II Compliance Prep,"Implement SOC 2 controls and audit",20,Highest,"security,compliance,soc2,audit-logs,backend",OPPS-1401,Q4
OPPS-1404,Role-Based Access Control (RBAC),"Admin/Editor/Viewer roles with permissions",10,Highest,"security,rbac,permissions,backend",OPPS-1401,Q4
OPPS-1405,Data Retention & GDPR Compliance,"GDPR data export and right to erasure",8,Highest,"security,gdpr,compliance,data-retention,backend",OPPS-1401,Q4

OPPS-1501,[EPIC] White-Label & Multi-Tenancy,"Custom branding for enterprise customers",80,Medium,"white-label,multi-tenancy,epic",,Q4
OPPS-1502,Custom Branding UI,"Upload logo, colors, domain",12,Medium,"white-label,branding,frontend",OPPS-1501,Q4
OPPS-1503,Multi-Tenant Architecture,"Isolate data per organization",20,Medium,"multi-tenancy,architecture,backend",OPPS-1501,Q4
```

---

## Summary: Q2-Q4 2025 Roadmap

| Quarter | Epics | Total Stories | Effort | Priority |
|---------|-------|---------------|--------|----------|
| **Q2** | 3 (Relationship Intelligence, CRM, Quick Wins) | 11 stories | 19 weeks | P0 |
| **Q3** | 4 (Predictive Scoring, Pipeline, API, Mobile) | 13 stories | 30 weeks | P0 |
| **Q4** | 5 (Financial Data, Market Intel, Security, White-Label) | 15 stories | 38 weeks | P0 |

**Total Q2-Q4**: 12 epics, 39 detailed user stories, 87 weeks of engineering effort (parallelizable)

**Recommended Team Size**:
- Q2: 3 engineers (relationship intelligence, CRM, browser extension)
- Q3: 5 engineers (2 ML, 2 full-stack, 1 mobile)
- Q4: 6 engineers (2 data, 2 full-stack, 1 security, 1 BD)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-13
**Owner**: Product Team
**Status**: Ready for Sprint Planning

**Next Steps**:
1. Import CSV into Jira/Linear
2. Schedule Q2 sprint planning (kick-off February 2025)
3. Hire ML engineer for Q3 predictive scoring
4. Negotiate Orbis/FactSet partnership for Q4 financial data
5. Start SOC 2 compliance process (6-month timeline)
