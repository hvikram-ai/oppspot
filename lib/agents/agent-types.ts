/**
 * Multi-Agent System Type Definitions
 * Core types for the oppspot agent system
 */

// ============================================================================
// AGENT TYPES
// ============================================================================

export enum OppspotAgentType {
  ROUTER = 'router',
  RESEARCH = 'research',              // Deep company research
  FINANCIAL = 'financial',            // Financial analysis
  MARKET = 'market',                  // Market/competitive intel
  TECHNICAL = 'technical',            // Tech stack analysis
  LEGAL = 'legal',                    // Legal/regulatory
  CONTACTS = 'contacts',              // People/contacts
  GENERAL = 'general',                // General queries
}

// ============================================================================
// RESEARCH CONTEXT
// ============================================================================

export interface CompanyInfo {
  id: string
  name: string
  company_number?: string
  website?: string
  description?: string
  industry?: string
  employee_count?: number
  founded_date?: string
  address?: Record<string, unknown>
  financial_data?: FinancialInfo[]
  fundingRounds?: FundingRound[]
  [key: string]: unknown
}

export interface FinancialInfo {
  year: number
  revenue?: number
  growth?: number
  profit?: number
  assets?: number
  liabilities?: number
  cash?: number
  [key: string]: unknown
}

export interface FundingRound {
  date: string
  type: string
  amount: string
  investors: string[]
  valuation?: string
}

export interface Article {
  title: string
  summary: string
  url: string
  published_date?: string
  source: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  relevance_score?: number
}

export interface Competitor {
  name: string
  description: string
  marketShare?: number
  url?: string
  differentiation?: string
}

export interface Technology {
  name: string
  category: string
  adoption_date?: string
  confidence?: number
}

export interface Person {
  name: string
  title: string
  role?: string
  linkedin_url?: string
  email?: string
  phone?: string
  seniority?: 'C-level' | 'VP' | 'Director' | 'Manager' | 'Individual Contributor'
}

export interface ResearchContext {
  companyData: CompanyInfo
  newsArticles: Article[]
  financialData: FinancialInfo[]
  competitors: Competitor[]
  technologies: Technology[]
  people?: Person[]
  sources: Source[]
  metadata: {
    sources_fetched: number
    sources_failed: number
    fetch_duration_ms?: number
  }
}

// ============================================================================
// AGENT ANALYSIS RESULTS
// ============================================================================

export interface AgentAnalysis {
  agentType: OppspotAgentType
  content: string
  keyInsights: string[]
  opportunities?: string[]
  concerns?: string[]
  recommendations?: string[]
  confidence: number // 0-1
  sources: Source[]
  metadata?: {
    processing_time_ms?: number
    model_used?: string
    tokens_used?: number
  }
}

export interface Source {
  url: string
  title: string
  source_type: 'companies_house' | 'news' | 'website' | 'linkedin' | 'twitter' | 'other'
  reliability_score?: number
  published_date?: string
  accessed_date?: string
  domain?: string
  content_snippet?: string
}

// ============================================================================
// ROUTER CLASSIFICATION
// ============================================================================

export interface RouterClassification {
  agentType: OppspotAgentType
  confidence: number
  reasoning: string
  multiAgent: boolean // True if query needs multiple agents
  agentTypes?: OppspotAgentType[] // For multi-agent queries
  parameters?: Record<string, unknown>
}

// ============================================================================
// MULTI-AGENT REPORT
// ============================================================================

export interface MultiAgentReport {
  company: string
  executiveSummary: string
  sections: {
    financial?: AgentAnalysis
    market?: AgentAnalysis
    technical?: AgentAnalysis
    legal?: AgentAnalysis
    research?: AgentAnalysis
    contacts?: AgentAnalysis
  }
  buyingSignals?: BuyingSignal[]
  opportunityScore?: number
  allSources: Source[]
  metadata: {
    total_agents_used: number
    parallel_execution: boolean
    total_processing_time_ms: number
    generated_at: string
  }
}

export interface BuyingSignal {
  type: 'hiring' | 'expansion' | 'funding' | 'technology' | 'leadership' | 'product'
  description: string
  confidence: number
  detected_at: string
  source?: string
}

// ============================================================================
// AGENT HEALTH & STATUS
// ============================================================================

export interface AgentStatus {
  agentType: OppspotAgentType
  healthy: boolean
  lastUsed?: string
  totalExecutions: number
  successRate: number
  avgResponseTime: number
}

export interface AgentExecutionMetrics {
  agentType: OppspotAgentType
  executionTime: number
  success: boolean
  error?: string
  tokensUsed?: number
}
