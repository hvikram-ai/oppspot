/**
 * ChatSpot™ - Intent Recognition Service
 * Understands user intent from natural language queries
 */

import type {
  Intent,
  IntentType,
  IntentParameters,
  SuggestedAction,
  ActionType
} from './types'

export class IntentRecognizer {
  /**
   * Recognize intent from user message using AI
   */
  static async recognizeIntent(message: string, conversationHistory?: string[]): Promise<Intent> {
    try {
      // Build context from conversation history
      const context = conversationHistory?.join('\n') || ''

      // Use local Ollama for intent recognition
      const ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434'
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral:7b',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: `${context ? `Previous context:\n${context}\n\n` : ''}User query: "${message}"\n\nRespond with ONLY valid JSON, no markdown formatting.`
            }
          ],
          stream: false,
          format: 'json',
          options: {
            temperature: 0.1,
            num_predict: 1000
          }
        })
      })

      if (!response.ok) {
        console.error('[IntentRecognizer] Ollama error:', response.status, response.statusText)
        return this.fallbackIntent(message)
      }

      const data = await response.json()
      const content = data.message?.content || '{}'

      // Parse JSON response
      const intentData = JSON.parse(content)

      return this.validateIntent(intentData)
    } catch (error) {
      console.error('[IntentRecognizer] Error:', error)
      return this.fallbackIntent(message)
    }
  }

  /**
   * System prompt for intent recognition
   */
  private static getSystemPrompt(): string {
    return `You are an intent recognition system for oppSpot, a B2B business intelligence platform.

Analyze user queries and extract:
1. **Intent type** (what they want to do)
2. **Parameters** (search criteria, filters, company names, etc.)
3. **Suggested actions** (what we can do for them)

Available intent types:
- search_companies: Find companies matching criteria
- research_company: Deep research on specific company
- find_similar: Find companies similar to X
- check_signals: Check buying signals for accounts
- find_stakeholder: Find decision makers at company
- create_list: Create or update a prospect list
- export_data: Export data to file/CRM
- get_recommendations: Get AI recommendations
- analyze_market: Market/competitive analysis
- answer_question: General questions about data
- execute_workflow: Multi-step workflows

Extract parameters like:
- industries: Array of industry names
- locations: Array of locations (cities, regions, countries)
- company_size: { min, max } employee count
- funding_stage: Array of stages (seed, series_a, series_b, etc.)
- technologies: Array of tech stack
- keywords: Important keywords
- company_names: Specific companies mentioned
- date_range: Time periods
- limit: How many results

Suggest actions the user might want:
- search: Search for companies
- research: Generate research report
- add_to_list: Add to prospect list
- export: Export results
- draft_email: Draft outreach emails
- analyze: Analyze data
- summarize: Summarize results

Return JSON:
{
  "type": "intent_type",
  "confidence": 0.0-1.0,
  "parameters": {
    "industries": ["fintech"],
    "locations": ["London"],
    "company_size": { "min": 50, "max": 500 },
    "funding_stage": ["series_a", "series_b"],
    "technologies": ["AWS", "React"],
    "keywords": ["hiring engineers"],
    "date_range": { "from": "2025-01-01" },
    "limit": 20
  },
  "suggested_actions": [
    {
      "type": "search",
      "label": "Search for companies",
      "description": "Find companies matching your criteria",
      "priority": 1
    },
    {
      "type": "research",
      "label": "Research top 5",
      "description": "Generate detailed research reports",
      "priority": 2
    },
    {
      "type": "add_to_list",
      "label": "Add to list",
      "description": "Save results to a prospect list",
      "priority": 3
    }
  ]
}

Examples:

Query: "Find fintech companies in London that raised money this year and are hiring engineers"
{
  "type": "search_companies",
  "confidence": 0.95,
  "parameters": {
    "industries": ["fintech"],
    "locations": ["London"],
    "keywords": ["hiring engineers", "raised funding"],
    "date_range": { "from": "2025-01-01" },
    "limit": 20
  },
  "suggested_actions": [
    { "type": "search", "label": "Search companies", "description": "Find matching companies", "priority": 1 },
    { "type": "research", "label": "Research top 5", "description": "Deep dive on best matches", "priority": 2 },
    { "type": "add_to_list", "label": "Save to list", "description": "Create prospect list", "priority": 3 }
  ]
}

Query: "Research Revolut"
{
  "type": "research_company",
  "confidence": 0.98,
  "parameters": {
    "company_names": ["Revolut"]
  },
  "suggested_actions": [
    { "type": "research", "label": "Generate research", "description": "Create detailed company report", "priority": 1 },
    { "type": "add_to_list", "label": "Add to list", "description": "Save to prospect list", "priority": 2 }
  ]
}

Query: "Find companies similar to Stripe"
{
  "type": "find_similar",
  "confidence": 0.92,
  "parameters": {
    "company_names": ["Stripe"],
    "limit": 10
  },
  "suggested_actions": [
    { "type": "search", "label": "Find similar", "description": "Search using AI similarity", "priority": 1 },
    { "type": "compare", "label": "Compare", "description": "Side-by-side comparison", "priority": 2 }
  ]
}

Query: "Which accounts are showing buying signals?"
{
  "type": "check_signals",
  "confidence": 0.90,
  "parameters": {},
  "suggested_actions": [
    { "type": "search", "label": "Show hot accounts", "description": "Accounts with recent signals", "priority": 1 },
    { "type": "analyze", "label": "Analyze signals", "description": "Signal strength analysis", "priority": 2 }
  ]
}

Be precise, extract all relevant parameters, and suggest helpful next actions.`
  }

  /**
   * Validate and normalize intent data
   */
  private static validateIntent(data: any): Intent {
    return {
      type: this.normalizeIntentType(data.type),
      confidence: Math.min(1, Math.max(0, data.confidence || 0.7)),
      parameters: this.normalizeParameters(data.parameters || {}),
      suggested_actions: (data.suggested_actions || []).map((a: any) => ({
        type: this.normalizeActionType(a.type),
        label: a.label || a.type,
        description: a.description || '',
        priority: a.priority || 5
      }))
    }
  }

  /**
   * Fallback intent when AI is unavailable
   */
  private static fallbackIntent(message: string): Intent {
    const lowerMessage = message.toLowerCase()

    // Simple keyword-based intent detection
    if (lowerMessage.includes('find') || lowerMessage.includes('search')) {
      return {
        type: 'search_companies',
        confidence: 0.6,
        parameters: this.extractSimpleParameters(message),
        suggested_actions: [
          {
            type: 'search',
            label: 'Search companies',
            description: 'Search based on your query',
            priority: 1
          }
        ]
      }
    }

    if (lowerMessage.includes('research')) {
      return {
        type: 'research_company',
        confidence: 0.6,
        parameters: this.extractSimpleParameters(message),
        suggested_actions: [
          {
            type: 'research',
            label: 'Generate research',
            description: 'Create research report',
            priority: 1
          }
        ]
      }
    }

    if (lowerMessage.includes('similar to')) {
      return {
        type: 'find_similar',
        confidence: 0.6,
        parameters: this.extractSimpleParameters(message),
        suggested_actions: [
          {
            type: 'search',
            label: 'Find similar companies',
            description: 'Semantic similarity search',
            priority: 1
          }
        ]
      }
    }

    // Default to answering questions
    return {
      type: 'answer_question',
      confidence: 0.5,
      parameters: {},
      suggested_actions: []
    }
  }

  /**
   * Extract simple parameters using regex
   */
  private static extractSimpleParameters(message: string): IntentParameters {
    const params: IntentParameters = {}

    // Extract company names (capitalized words)
    const companyMatches = message.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g)
    if (companyMatches) {
      params.company_names = companyMatches
    }

    // Extract numbers (for limits)
    const numberMatch = message.match(/\b(\d+)\b/)
    if (numberMatch) {
      params.limit = parseInt(numberMatch[1])
    }

    return params
  }

  /**
   * Normalize intent type
   */
  private static normalizeIntentType(type: string): IntentType {
    const validTypes: IntentType[] = [
      'search_companies',
      'research_company',
      'find_similar',
      'check_signals',
      'find_stakeholder',
      'create_list',
      'export_data',
      'get_recommendations',
      'analyze_market',
      'answer_question',
      'execute_workflow',
      'unknown'
    ]

    const normalized = type.toLowerCase().replace(/-/g, '_')
    return validTypes.includes(normalized as IntentType) ? (normalized as IntentType) : 'unknown'
  }

  /**
   * Normalize action type
   */
  private static normalizeActionType(type: string): ActionType {
    const validTypes: ActionType[] = [
      'search',
      'research',
      'add_to_list',
      'export',
      'draft_email',
      'book_meeting',
      'analyze',
      'summarize',
      'compare'
    ]

    const normalized = type.toLowerCase().replace(/-/g, '_')
    return validTypes.includes(normalized as ActionType) ? (normalized as ActionType) : 'search'
  }

  /**
   * Normalize parameters
   */
  private static normalizeParameters(params: any): IntentParameters {
    const normalized: IntentParameters = {}

    if (params.industries) normalized.industries = Array.isArray(params.industries) ? params.industries : [params.industries]
    if (params.locations) normalized.locations = Array.isArray(params.locations) ? params.locations : [params.locations]
    if (params.company_size) normalized.company_size = params.company_size
    if (params.funding_stage) normalized.funding_stage = Array.isArray(params.funding_stage) ? params.funding_stage : [params.funding_stage]
    if (params.technologies) normalized.technologies = Array.isArray(params.technologies) ? params.technologies : [params.technologies]
    if (params.keywords) normalized.keywords = Array.isArray(params.keywords) ? params.keywords : [params.keywords]
    if (params.company_names) normalized.company_names = Array.isArray(params.company_names) ? params.company_names : [params.company_names]
    if (params.company_ids) normalized.company_ids = Array.isArray(params.company_ids) ? params.company_ids : [params.company_ids]
    if (params.date_range) normalized.date_range = params.date_range
    if (params.limit) normalized.limit = parseInt(params.limit) || 20
    if (params.exclude) normalized.exclude = Array.isArray(params.exclude) ? params.exclude : [params.exclude]

    return normalized
  }
}
