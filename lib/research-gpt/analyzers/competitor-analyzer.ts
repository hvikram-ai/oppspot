/**
 * Competitor Analysis System
 * Identifies competitors and analyzes competitive positioning
 * Uses AI + web data + business intelligence
 */

import { getLLMFactory } from '@/lib/ai/llm-factory'

export interface CompetitorResult {
  competitors: Array<{
    name: string
    website?: string
    description: string
    similarity: number
    strengths: string[]
    weaknesses: string[]
    differentiators: string[]
  }>
  marketPosition: {
    category: string
    positioning: string
    uniqueValueProp: string[]
  }
  competitiveAdvantages: string[]
  threats: string[]
  opportunities: string[]
}

export async function getCompetitorAnalyzer() {
  return {
    analyze: analyzeCompetitors
  }
}

async function analyzeCompetitors(
  companyName: string,
  description: string | null,
  industry: string | null,
  websiteUrl: string | null,
  websiteHtml: string | null
): Promise<CompetitorResult> {
  // Step 1: Use AI to identify competitors
  const competitors = await identifyCompetitorsWithAI(
    companyName,
    description,
    industry,
    websiteUrl,
    websiteHtml
  )

  // Step 2: Analyze market positioning
  const marketPosition = await analyzeMarketPositioning(
    companyName,
    description,
    industry,
    competitors
  )

  // Step 3: Identify competitive advantages and threats
  const { advantages, threats, opportunities } = await analyzeSWOT(
    companyName,
    description,
    competitors,
    marketPosition
  )

  return {
    competitors,
    marketPosition,
    competitiveAdvantages: advantages,
    threats,
    opportunities
  }
}

/**
 * Use AI to identify likely competitors
 */
async function identifyCompetitorsWithAI(
  companyName: string,
  description: string | null,
  industry: string | null,
  websiteUrl: string | null,
  websiteHtml: string | null
): Promise<Array<{
  name: string
  website?: string
  description: string
  similarity: number
  strengths: string[]
  weaknesses: string[]
  differentiators: string[]
}>> {
  try {
    const llmFactory = getLLMFactory()
    const llm = llmFactory.createLLM('smart')

    const prompt = `Analyze "${companyName}" and identify their top competitors.

Company Information:
- Name: ${companyName}
- Industry: ${industry || 'Unknown'}
- Description: ${description || 'N/A'}
- Website: ${websiteUrl || 'N/A'}
${websiteHtml ? `- Website snippet: ${websiteHtml.slice(0, 1000)}...` : ''}

Identify the top 5 MOST DIRECT competitors. For each competitor provide:
1. Company name
2. Website (if known)
3. Brief description
4. Similarity score (0-100) - how similar they are
5. Their key strengths (3 max)
6. Their weaknesses (3 max)
7. How they differentiate (2-3 points)

Return ONLY a JSON array:
[
  {
    "name": "Competitor Name",
    "website": "https://competitor.com",
    "description": "Brief description of what they do",
    "similarity": 85,
    "strengths": ["Strong brand", "Large customer base", "Advanced features"],
    "weaknesses": ["Expensive", "Complex UI", "Poor customer service"],
    "differentiators": ["Focus on enterprise", "AI-powered features"]
  }
]

Focus on REAL, KNOWN competitors in the same market. Similarity > 70 means direct competitor.`

    const response = await llm.generateText(prompt, {
      temperature: 0.4,
      maxTokens: 2000
    })

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return []
  } catch (error) {
    console.error('[Competitor Analyzer] AI identification error:', error)
    return []
  }
}

/**
 * Analyze market positioning
 */
async function analyzeMarketPositioning(
  companyName: string,
  description: string | null,
  industry: string | null,
  competitors: Array<{ name: string; description: string }>
): Promise<{
  category: string
  positioning: string
  uniqueValueProp: string[]
}> {
  try {
    const llmFactory = getLLMFactory()
    const llm = llmFactory.createLLM('smart')

    const competitorContext = competitors.length > 0
      ? `\n\nCompetitors:\n${competitors.map(c => `- ${c.name}: ${c.description}`).join('\n')}`
      : ''

    const prompt = `Analyze the market positioning for "${companyName}".

Company Information:
- Name: ${companyName}
- Industry: ${industry || 'Unknown'}
- Description: ${description || 'N/A'}${competitorContext}

Determine:
1. Market category (e.g., "B2B SaaS - Sales Intelligence", "E-commerce - Fashion", etc.)
2. Market positioning statement (1 sentence explaining their position)
3. Unique value propositions (3-5 points that make them different/better)

Return ONLY a JSON object:
{
  "category": "Market Category",
  "positioning": "One sentence positioning statement",
  "uniqueValueProp": ["Value prop 1", "Value prop 2", "Value prop 3"]
}

Be specific and strategic. Think like a marketing strategist.`

    const response = await llm.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 800
    })

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    // Fallback
    return {
      category: industry || 'Unknown',
      positioning: `${companyName} operates in the ${industry || 'business'} sector`,
      uniqueValueProp: []
    }
  } catch (error) {
    console.error('[Competitor Analyzer] Market positioning error:', error)
    return {
      category: industry || 'Unknown',
      positioning: 'Unable to determine positioning',
      uniqueValueProp: []
    }
  }
}

/**
 * Perform SWOT-style competitive analysis
 */
async function analyzeSWOT(
  companyName: string,
  description: string | null,
  competitors: Array<{
    name: string
    strengths: string[]
    weaknesses: string[]
  }>,
  marketPosition: {
    category: string
    uniqueValueProp: string[]
  }
): Promise<{
  advantages: string[]
  threats: string[]
  opportunities: string[]
}> {
  try {
    const llmFactory = getLLMFactory()
    const llm = llmFactory.createLLM('smart')

    const competitorContext = competitors.length > 0
      ? `\n\nKey Competitors:\n${competitors.map(c =>
          `- ${c.name}:\n  Strengths: ${c.strengths.join(', ')}\n  Weaknesses: ${c.weaknesses.join(', ')}`
        ).join('\n')}`
      : ''

    const prompt = `Perform a strategic competitive analysis for "${companyName}".

Company: ${companyName}
Description: ${description || 'N/A'}
Market Category: ${marketPosition.category}
Unique Value Props: ${marketPosition.uniqueValueProp.join(', ')}${competitorContext}

Analyze and return:

1. **Competitive Advantages** (3-5 points): What gives them an edge over competitors?
2. **Threats** (3-5 points): What competitive threats do they face?
3. **Opportunities** (3-5 points): What market opportunities can they exploit?

Return ONLY a JSON object:
{
  "advantages": [
    "Competitive advantage 1",
    "Competitive advantage 2"
  ],
  "threats": [
    "Threat 1",
    "Threat 2"
  ],
  "opportunities": [
    "Opportunity 1",
    "Opportunity 2"
  ]
}

Be strategic and actionable. Think like a business strategist.`

    const response = await llm.generateText(prompt, {
      temperature: 0.4,
      maxTokens: 1200
    })

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    // Fallback
    return {
      advantages: [],
      threats: [],
      opportunities: []
    }
  } catch (error) {
    console.error('[Competitor Analyzer] SWOT analysis error:', error)
    return {
      advantages: [],
      threats: [],
      opportunities: []
    }
  }
}

/**
 * Get competitive insights summary
 */
export function getCompetitiveInsights(result: CompetitorResult): string[] {
  const insights: string[] = []

  // Competitor count
  const directCompetitors = result.competitors.filter(c => c.similarity >= 70)
  if (directCompetitors.length > 0) {
    insights.push(
      `${directCompetitors.length} direct competitor(s) identified with high similarity`
    )
  }

  // Market positioning
  if (result.marketPosition.uniqueValueProp.length > 0) {
    insights.push(
      `${result.marketPosition.uniqueValueProp.length} unique value propositions identified`
    )
  }

  // Competitive advantages
  if (result.competitiveAdvantages.length > 0) {
    insights.push(
      `Key advantage: ${result.competitiveAdvantages[0]}`
    )
  }

  // Threats
  if (result.threats.length > 0) {
    insights.push(
      `Primary threat: ${result.threats[0]}`
    )
  }

  // Opportunities
  if (result.opportunities.length > 0) {
    insights.push(
      `Top opportunity: ${result.opportunities[0]}`
    )
  }

  // Overall assessment
  const hasStrongPosition =
    result.competitiveAdvantages.length >= 3 &&
    result.marketPosition.uniqueValueProp.length >= 2

  if (hasStrongPosition) {
    insights.push('Strong competitive positioning detected')
  } else if (result.threats.length > result.competitiveAdvantages.length) {
    insights.push('Competitive pressures detected - monitor closely')
  }

  return insights
}

/**
 * Generate competitive battle card
 */
export function generateBattleCard(
  companyName: string,
  result: CompetitorResult
): string {
  const sections: string[] = []

  sections.push(`# Competitive Battle Card: ${companyName}\n`)

  // Market Position
  sections.push(`## Market Position`)
  sections.push(`**Category:** ${result.marketPosition.category}`)
  sections.push(`**Positioning:** ${result.marketPosition.positioning}\n`)

  // Unique Value Props
  if (result.marketPosition.uniqueValueProp.length > 0) {
    sections.push(`## Unique Value Propositions`)
    result.marketPosition.uniqueValueProp.forEach(prop => {
      sections.push(`- ${prop}`)
    })
    sections.push('')
  }

  // Competitors
  if (result.competitors.length > 0) {
    sections.push(`## Key Competitors\n`)
    result.competitors.forEach(comp => {
      sections.push(`### ${comp.name} (${comp.similarity}% similar)`)
      sections.push(`${comp.description}\n`)
      sections.push(`**Strengths:** ${comp.strengths.join(', ')}`)
      sections.push(`**Weaknesses:** ${comp.weaknesses.join(', ')}`)
      sections.push(`**Differentiators:** ${comp.differentiators.join(', ')}\n`)
    })
  }

  // Competitive Advantages
  if (result.competitiveAdvantages.length > 0) {
    sections.push(`## Our Competitive Advantages`)
    result.competitiveAdvantages.forEach(adv => {
      sections.push(`- ${adv}`)
    })
    sections.push('')
  }

  // Threats
  if (result.threats.length > 0) {
    sections.push(`## Threats to Monitor`)
    result.threats.forEach(threat => {
      sections.push(`- ${threat}`)
    })
    sections.push('')
  }

  // Opportunities
  if (result.opportunities.length > 0) {
    sections.push(`## Market Opportunities`)
    result.opportunities.forEach(opp => {
      sections.push(`- ${opp}`)
    })
  }

  return sections.join('\n')
}
