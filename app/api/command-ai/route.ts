import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OllamaClient } from '@/lib/ai/ollama'

interface AICommandResponse {
  intent: 'search' | 'create' | 'navigate' | 'analyze' | 'unknown'
  action?: string
  target?: string
  params?: Record<string, unknown>
  suggestions?: Array<{
    title: string
    description: string
    href?: string
    action?: () => void
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Simple pattern matching for common intents
    const result = await processNaturalLanguageQuery(query)

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI command processing error:', error)
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    )
  }
}

async function processNaturalLanguageQuery(query: string): Promise<AICommandResponse> {
  const lowerQuery = query.toLowerCase()

  // Pattern: "create/new/start [type]"
  if (/^(create|new|start)\s+(stream|deal|project)/.test(lowerQuery)) {
    return {
      intent: 'create',
      action: 'create_stream',
      suggestions: [{
        title: 'Create New Stream',
        description: 'Start a new stream for this ' + (lowerQuery.includes('deal') ? 'deal' : 'project'),
        href: '/streams?create=true',
      }]
    }
  }

  if (/^(create|new|start)\s+(scan|opportunity|opp)/.test(lowerQuery)) {
    return {
      intent: 'create',
      action: 'create_scan',
      suggestions: [{
        title: 'Start Opportunity Scan',
        description: 'Begin scanning for acquisition targets',
        href: '/opp-scan/new',
      }]
    }
  }

  if (/^(create|new|start|add)\s+(list)/.test(lowerQuery)) {
    return {
      intent: 'create',
      action: 'create_list',
      suggestions: [{
        title: 'Create New List',
        description: 'Create a new company list',
        href: '/lists?create=true',
      }]
    }
  }

  // Pattern: "find/search [entity type]"
  if (/^(find|search|show|get)\s+(companies|businesses)/.test(lowerQuery)) {
    const searchTerm = lowerQuery.replace(/^(find|search|show|get)\s+(companies|businesses)\s*/, '')
    return {
      intent: 'search',
      action: 'search_companies',
      target: searchTerm,
      suggestions: [{
        title: 'Search Companies',
        description: searchTerm ? `Search for: ${searchTerm}` : 'Browse all companies',
        href: searchTerm ? `/search?q=${encodeURIComponent(searchTerm)}` : '/companies',
      }]
    }
  }

  if (/^(find|search|show|get)\s+(streams|deals|projects)/.test(lowerQuery)) {
    return {
      intent: 'navigate',
      action: 'view_streams',
      suggestions: [{
        title: 'View Streams',
        description: 'See all your active streams',
        href: '/streams',
      }]
    }
  }

  if (/^(find|search|show|get)\s+(signals|buying)/.test(lowerQuery)) {
    return {
      intent: 'navigate',
      action: 'view_signals',
      suggestions: [{
        title: 'View Buying Signals',
        description: 'See recent buying signals',
        href: '/signals',
      }]
    }
  }

  if (/^(find|search|show|get)\s+(scans|opportunities)/.test(lowerQuery)) {
    return {
      intent: 'navigate',
      action: 'view_scans',
      suggestions: [{
        title: 'View Opportunity Scans',
        description: 'See all your scans',
        href: '/opp-scan',
      }]
    }
  }

  // Pattern: "analyze/check [company name]"
  if (/^(analyze|check|research|investigate)\s+/.test(lowerQuery)) {
    const target = lowerQuery.replace(/^(analyze|check|research|investigate)\s+/, '')
    return {
      intent: 'analyze',
      action: 'analyze_company',
      target,
      suggestions: [{
        title: `Analyze: ${target}`,
        description: 'Run AI analysis on this company',
        href: `/search?q=${encodeURIComponent(target)}`,
      }]
    }
  }

  // Pattern: "go to [page]"
  if (/^(go\s+to|open|navigate\s+to)\s+/.test(lowerQuery)) {
    const page = lowerQuery.replace(/^(go\s+to|open|navigate\s+to)\s+/, '')
    const pageMap: Record<string, { title: string; href: string }> = {
      'dashboard': { title: 'Dashboard', href: '/' },
      'home': { title: 'Dashboard', href: '/' },
      'streams': { title: 'Streams', href: '/streams' },
      'companies': { title: 'Companies', href: '/companies' },
      'signals': { title: 'Signals', href: '/signals' },
      'scans': { title: 'Opportunity Scans', href: '/opp-scan' },
      'settings': { title: 'Settings', href: '/settings' },
      'analytics': { title: 'Analytics', href: '/analytics' },
      'stakeholders': { title: 'Stakeholders', href: '/stakeholders' },
    }

    const match = Object.entries(pageMap).find(([key]) => page.includes(key))
    if (match) {
      const [, pageInfo] = match
      return {
        intent: 'navigate',
        action: 'navigate',
        target: pageInfo.title,
        suggestions: [{
          title: `Go to ${pageInfo.title}`,
          description: `Navigate to ${pageInfo.title}`,
          href: pageInfo.href,
        }]
      }
    }
  }

  // Pattern: "help with [feature]" or "how to [action]"
  if (/^(help|how|explain|what|show\s+me)/.test(lowerQuery)) {
    return {
      intent: 'navigate',
      action: 'get_help',
      suggestions: [
        {
          title: 'AI Assistant',
          description: 'Ask the AI assistant for help',
          href: '/?chat=true',
        },
        {
          title: 'Documentation',
          description: 'View help documentation',
          href: '/help',
        }
      ]
    }
  }

  // Default: treat as search query
  return {
    intent: 'search',
    action: 'search',
    target: query,
    suggestions: [{
      title: `Search for "${query}"`,
      description: 'Search across all companies, streams, and scans',
    }]
  }
}
