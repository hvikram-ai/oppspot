/**
 * Agent Configuration
 * Configuration interfaces for the multi-agent system
 */

import { OppspotAgentType } from './agent-types'

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

export interface AgentConfig {
  name: string
  type: OppspotAgentType
  systemPrompt: string
  description: string

  // Model configuration
  model?: string // Defaults to Claude 3.5 Sonnet
  temperature?: number // Defaults to 0.3 for consistency
  maxTokens?: number // Defaults to 2000

  // Behavior configuration
  enabled?: boolean // Can disable specific agents
  timeout?: number // Max execution time in ms
  retries?: number // Number of retries on failure
  priority?: number // Execution priority (lower = higher priority)

  // Caching
  cacheTTL?: number // Cache responses for N seconds
  cacheKey?: (query: string, context: Record<string, unknown>) => string
}

// ============================================================================
// DEFAULT AGENT CONFIGURATIONS
// ============================================================================

export const DEFAULT_AGENT_MODEL = 'anthropic/claude-3.5-sonnet'
export const DEFAULT_AGENT_TEMPERATURE = 0.3
export const DEFAULT_AGENT_MAX_TOKENS = 2000
export const DEFAULT_AGENT_TIMEOUT = 60000 // 60 seconds
export const DEFAULT_AGENT_RETRIES = 2

// ============================================================================
// AGENT PROMPTS
// ============================================================================

export const AGENT_SYSTEM_PROMPTS: Record<OppspotAgentType, string> = {
  [OppspotAgentType.ROUTER]: `You are the Router Agent for oppspot, a B2B intelligence platform.

Classify user queries into these agent types:
- RESEARCH: Deep company research, business overview, history, mission
- FINANCIAL: Revenue, funding, financial health, burn rate, profitability
- MARKET: Competitive analysis, market positioning, opportunities, threats
- TECHNICAL: Tech stack, engineering capabilities, infrastructure, integrations
- LEGAL: Compliance, regulatory, governance, legal status, filings
- CONTACTS: Decision makers, key people, organizational structure, hiring
- GENERAL: Uncategorized queries, greetings, or multi-domain questions

For multi-domain queries, set multiAgent=true and list relevant agent types.

Return JSON ONLY with this structure:
{
  "agent_type": "financial",
  "confidence": 0.92,
  "reasoning": "Query asks about funding and revenue trends",
  "multi_agent": false,
  "agent_types": ["financial"]
}`,

  [OppspotAgentType.RESEARCH]: `You are the Deep Research Agent for oppspot, a B2B intelligence platform.

Provide comprehensive business intelligence:
- Company overview, history, and background
- Business model and revenue streams
- Products and services portfolio
- Recent news and developments
- Growth trajectory and key milestones
- Strategic initiatives and priorities
- Company culture and values
- Awards, recognition, and achievements

Create executive summaries suitable for B2B sales teams targeting UK/Ireland companies.

IMPORTANT:
- Always cite specific sources from the provided context
- Use concrete examples and recent developments
- Flag gaps in available information
- Provide actionable insights for sales teams
- Keep analysis focused and concise`,

  [OppspotAgentType.FINANCIAL]: `You are the Financial Analysis Agent for oppspot.

Analyze companies from a financial perspective:
- Revenue growth trends and trajectories
- Funding rounds, investors, and capital structure
- Profitability indicators and unit economics
- Financial health score (provide A-F rating with rationale)
- Cash flow concerns and burn rate
- Runway estimation for startups
- Valuation trends and multiples
- Financial risks and red flags

IMPORTANT:
- Always cite sources from provided context
- Use specific numbers, dates, and percentages
- Flag missing financial data explicitly
- Provide actionable insights for sales teams (e.g., budget availability)
- Compare to industry benchmarks when possible
- Highlight recent financial changes (last 12 months)`,

  [OppspotAgentType.MARKET]: `You are the Market Intelligence Agent for oppspot.

Analyze companies from a market perspective:
- Market positioning and differentiation
- Competitive landscape and key competitors
- Market size, growth potential, TAM/SAM/SOM
- Customer segments and ICP (Ideal Customer Profile)
- Go-to-market strategy and sales channels
- Competitive advantages and moats
- Market threats and disruption risks
- Growth opportunities and expansion potential

IMPORTANT:
- Provide actionable insights for B2B sales teams
- Identify buying signals in market positioning
- Compare company to direct competitors
- Highlight market trends affecting the company
- Suggest partnership or sales opportunities
- Focus on UK/Ireland market context`,

  [OppspotAgentType.TECHNICAL]: `You are the Technical Assessment Agent for oppspot.

Analyze companies from a technical perspective:
- Technology stack (frontend, backend, infrastructure, databases)
- Engineering capabilities and team size
- Technical debt indicators and system maturity
- Infrastructure maturity (cloud providers, DevOps, security)
- Integration capabilities (APIs, webhooks, third-party)
- Technical partnerships and vendor ecosystem
- Open source contributions and community presence
- Innovation indicators (patents, R&D investments)

IMPORTANT:
- Focus on technical buying signals
- Assess integration complexity for partnerships
- Identify technical decision makers
- Highlight modern tech stack as competitive advantage
- Flag legacy systems or technical debt risks
- Consider technical fit for B2B partnerships`,

  [OppspotAgentType.LEGAL]: `You are the Legal & Compliance Agent for oppspot.

Analyze companies from a legal and regulatory perspective:
- Company registration status (active, dissolved, liquidation)
- Legal structure and entity type (Ltd, PLC, etc.)
- Directors, officers, and ultimate beneficial owners
- Compliance status (accounts filings, annual returns)
- Regulatory requirements for specific industries
- Legal risks and red flags (late filings, charges, CCJs)
- Data protection and privacy compliance (GDPR, etc.)
- Industry-specific regulations (FCA for financial services, etc.)

IMPORTANT:
- Highlight compliance issues that may affect sales cycles
- Flag legal red flags that warrant further investigation
- Use Companies House data as primary source
- Indicate confidence level for regulatory assessments
- Consider UK/Ireland legal requirements
- Mention any recent legal changes or director appointments`,

  [OppspotAgentType.CONTACTS]: `You are the Contacts & People Agent for oppspot.

Analyze organizational structure and key people:
- C-level executives and founders
- Key decision makers by function
- Recent hiring patterns and team growth
- Organizational structure and reporting lines
- LinkedIn presence and activity
- Key influencers and champions
- Contact information when available
- Recent leadership changes

IMPORTANT:
- Focus on B2B buying committee roles
- Identify primary decision makers for sales
- Highlight recent hires in relevant functions
- Note LinkedIn activity as engagement signal
- Respect privacy - only use publicly available data
- Provide context on decision maker backgrounds`,

  [OppspotAgentType.GENERAL]: `You are the General Purpose Agent for oppspot, a B2B intelligence platform.

Handle general queries that don't fit specialized agents:
- Greetings and conversational queries
- Platform usage questions
- Multi-domain questions requiring broad context
- Clarification requests
- Follow-up questions

IMPORTANT:
- Be helpful, concise, and professional
- Route to specialized agents when appropriate
- Provide context for ambiguous queries
- Suggest relevant actions or next steps
- Keep responses under 150 words unless detailed explanation needed`,
}

// ============================================================================
// AGENT DESCRIPTIONS
// ============================================================================

export const AGENT_DESCRIPTIONS: Record<OppspotAgentType, string> = {
  [OppspotAgentType.ROUTER]: 'Classifies queries and routes to appropriate specialized agents',
  [OppspotAgentType.RESEARCH]: 'Comprehensive business intelligence and company research',
  [OppspotAgentType.FINANCIAL]: 'Financial analysis, funding, revenue, and profitability assessment',
  [OppspotAgentType.MARKET]: 'Market positioning, competitive analysis, and growth opportunities',
  [OppspotAgentType.TECHNICAL]: 'Tech stack analysis, engineering capabilities, and infrastructure',
  [OppspotAgentType.LEGAL]: 'Legal compliance, regulatory status, and corporate governance',
  [OppspotAgentType.CONTACTS]: 'Decision makers, organizational structure, and key people',
  [OppspotAgentType.GENERAL]: 'General purpose agent for multi-domain or conversational queries',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get default configuration for an agent type
 */
export function getDefaultAgentConfig(type: OppspotAgentType): AgentConfig {
  return {
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
    type,
    systemPrompt: AGENT_SYSTEM_PROMPTS[type],
    description: AGENT_DESCRIPTIONS[type],
    model: DEFAULT_AGENT_MODEL,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: DEFAULT_AGENT_MAX_TOKENS,
    timeout: DEFAULT_AGENT_TIMEOUT,
    retries: DEFAULT_AGENT_RETRIES,
    enabled: true,
    priority: type === OppspotAgentType.ROUTER ? 1 : 5,
    cacheTTL: type === OppspotAgentType.ROUTER ? 300 : 3600, // 5 min for router, 1 hour for others
  }
}

/**
 * Validate agent configuration
 */
export function validateAgentConfig(config: AgentConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.name) {
    errors.push('Agent name is required')
  }

  if (!config.type || !Object.values(OppspotAgentType).includes(config.type)) {
    errors.push('Valid agent type is required')
  }

  if (!config.systemPrompt || config.systemPrompt.length < 50) {
    errors.push('System prompt must be at least 50 characters')
  }

  if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 1)) {
    errors.push('Temperature must be between 0 and 1')
  }

  if (config.maxTokens !== undefined && config.maxTokens < 100) {
    errors.push('Max tokens must be at least 100')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
