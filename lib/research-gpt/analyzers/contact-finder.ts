/**
 * AI-Powered Contact Finder
 * Discovers key decision makers and contact information
 * Uses AI + web scraping + LinkedIn/Hunter.io patterns
 */

import { getLLMFactory } from '@/lib/ai/llm-factory'

export interface ContactResult {
  contacts: Array<{
    name: string
    role: string
    email?: string
    linkedin?: string
    phone?: string
    confidence: number
    source: string
  }>
  recommendations: string[]
  searchStrategy: string
}

export async function getContactFinder() {
  return {
    findContacts
  }
}

async function findContacts(
  companyName: string,
  websiteHtml: string | null,
  websiteUrl: string | null,
  linkedinUrl: string | null
): Promise<ContactResult> {
  const contacts: Array<{
    name: string
    role: string
    email?: string
    linkedin?: string
    phone?: string
    confidence: number
    source: string
  }> = []

  // Step 1: Extract from website HTML
  if (websiteHtml) {
    contacts.push(...extractContactsFromHtml(websiteHtml, websiteUrl || ''))
  }

  // Step 2: AI-powered inference
  const aiContacts = await inferContactsWithAI(
    companyName,
    websiteUrl,
    linkedinUrl,
    websiteHtml
  )
  contacts.push(...aiContacts)

  // Step 3: Generate recommendations
  const recommendations = generateRecommendations(companyName, websiteUrl, contacts)

  return {
    contacts: deduplicateContacts(contacts),
    recommendations,
    searchStrategy: determineSearchStrategy(contacts)
  }
}

/**
 * Extract contacts from HTML (about page, contact page, team page)
 */
function extractContactsFromHtml(
  html: string,
  websiteUrl: string
): Array<{
  name: string
  role: string
  email?: string
  linkedin?: string
  phone?: string
  confidence: number
  source: string
}> {
  const contacts: Array<{
    name: string
    role: string
    email?: string
    linkedin?: string
    phone?: string
    confidence: number
    source: string
  }> = []

  // Email pattern
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
  const emails = html.match(emailRegex) || []

  // Phone pattern (UK format)
  const phoneRegex = /(\+44\s?\d{2,4}\s?\d{3,4}\s?\d{3,4}|\d{5}\s?\d{6}|\d{4}\s?\d{6})/g
  const phones = html.match(phoneRegex) || []

  // LinkedIn URLs
  const linkedinRegex = /linkedin\.com\/in\/([a-zA-Z0-9-]+)/g
  const linkedinMatches = html.matchAll(linkedinRegex)
  const linkedinProfiles = Array.from(linkedinMatches).map(m => m[0])

  // Common decision-maker patterns in HTML
  const rolePatterns = [
    { role: 'CEO', pattern: /CEO|Chief Executive Officer/i },
    { role: 'Founder', pattern: /Founder|Co-Founder/i },
    { role: 'CTO', pattern: /CTO|Chief Technology Officer/i },
    { role: 'Head of Sales', pattern: /Head of Sales|Sales Director/i },
    { role: 'Marketing Director', pattern: /Marketing Director|Head of Marketing/i }
  ]

  // Try to find roles mentioned near names
  for (const { role, pattern } of rolePatterns) {
    if (pattern.test(html)) {
      // Generic contact based on role
      contacts.push({
        name: `${role} (Name not found)`,
        role,
        email: emails[0], // Best guess
        confidence: 50,
        source: 'HTML pattern'
      })
    }
  }

  // If we found general contact info
  if (emails.length > 0 || phones.length > 0) {
    contacts.push({
      name: 'General Contact',
      role: 'Unknown',
      email: emails[0],
      phone: phones[0],
      confidence: 60,
      source: 'Website contact info'
    })
  }

  return contacts
}

/**
 * Use AI to infer likely decision makers
 */
async function inferContactsWithAI(
  companyName: string,
  websiteUrl: string | null,
  linkedinUrl: string | null,
  websiteHtml: string | null
): Promise<Array<{
  name: string
  role: string
  email?: string
  linkedin?: string
  confidence: number
  source: string
}>> {
  try {
    const llmFactory = getLLMFactory()
    const llm = llmFactory.createLLM('fast')

    const prompt = `You are analyzing "${companyName}" to find key decision makers.

Company Website: ${websiteUrl || 'N/A'}
LinkedIn: ${linkedinUrl || 'N/A'}
${websiteHtml ? `Website snippet: ${websiteHtml.slice(0, 1500)}...` : ''}

Based on this information, infer the MOST LIKELY key decision makers and their contact patterns.

For B2B sales, we need:
1. CEO/Founder (strategic decisions)
2. Head of Sales/Revenue (direct buyer)
3. CTO/Head of Product (technical evaluation)

Return ONLY a JSON array:
[
  {
    "name": "Likely CEO name OR 'CEO (Name unknown)'",
    "role": "CEO",
    "email": "guess email pattern if possible (e.g., firstname@company.com)",
    "linkedin": "inferred linkedin URL if pattern suggests it",
    "confidence": 70
  }
]

Rules:
- Only include contacts with confidence > 50
- If you can't find a name, use "Role (Name unknown)"
- For emails, infer pattern like: firstname@domain.com, hello@domain.com, contact@domain.com
- Max 5 contacts
- Focus on decision makers, not general staff`

    const response = await llm.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 1000
    })

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.map((c: any) => ({
        ...c,
        source: 'AI inference'
      }))
    }

    return []
  } catch (error) {
    console.error('[Contact Finder] AI inference error:', error)
    return []
  }
}

/**
 * Generate actionable recommendations for finding contacts
 */
function generateRecommendations(
  companyName: string,
  websiteUrl: string | null,
  contacts: Array<{ name: string; role: string; confidence: number }>
): string[] {
  const recommendations: string[] = []
  const domain = websiteUrl ? new URL(websiteUrl).hostname.replace('www.', '') : null

  // LinkedIn search
  recommendations.push(
    `Search LinkedIn: "${companyName}" + "CEO" OR "Founder" OR "Head of Sales"`
  )

  // Email pattern suggestion
  if (domain) {
    recommendations.push(
      `Try email patterns: firstname@${domain}, hello@${domain}, contact@${domain}`
    )
  }

  // Hunter.io suggestion
  if (domain) {
    recommendations.push(
      `Use Hunter.io or similar tools to find verified emails for ${domain}`
    )
  }

  // Company website pages
  recommendations.push(
    `Check company pages: /about, /team, /contact, /leadership on their website`
  )

  // Social media
  recommendations.push(
    `Check Twitter/X and other social profiles for founder/CEO handles`
  )

  // If low confidence contacts
  const hasLowConfidence = contacts.some(c => c.confidence < 60)
  if (hasLowConfidence) {
    recommendations.push(
      `Low confidence detected - manual verification recommended via LinkedIn or direct outreach`
    )
  }

  return recommendations
}

/**
 * Determine search strategy based on available data
 */
function determineSearchStrategy(
  contacts: Array<{ confidence: number }>
): string {
  const avgConfidence = contacts.length > 0
    ? contacts.reduce((sum, c) => sum + c.confidence, 0) / contacts.length
    : 0

  if (avgConfidence >= 80) {
    return 'high_confidence_direct_outreach'
  } else if (avgConfidence >= 60) {
    return 'medium_confidence_verify_then_outreach'
  } else {
    return 'low_confidence_research_required'
  }
}

/**
 * Remove duplicate contacts
 */
function deduplicateContacts(
  contacts: Array<{
    name: string
    role: string
    email?: string
    linkedin?: string
    phone?: string
    confidence: number
    source: string
  }>
): Array<{
  name: string
  role: string
  email?: string
  linkedin?: string
  phone?: string
  confidence: number
  source: string
}> {
  const seen = new Map<string, typeof contacts[0]>()

  for (const contact of contacts.sort((a, b) => b.confidence - a.confidence)) {
    const key = `${contact.role}-${contact.name}`.toLowerCase()
    if (!seen.has(key)) {
      seen.set(key, contact)
    }
  }

  return Array.from(seen.values())
}

/**
 * Get contact insights summary
 */
export function getContactInsights(result: ContactResult): string[] {
  const insights: string[] = []

  const highConfidenceContacts = result.contacts.filter(c => c.confidence >= 70)
  const hasEmails = result.contacts.some(c => c.email)

  if (highConfidenceContacts.length > 0) {
    insights.push(
      `Found ${highConfidenceContacts.length} high-confidence decision maker(s)`
    )
  }

  if (hasEmails) {
    insights.push('Email contacts available for direct outreach')
  }

  if (result.searchStrategy === 'low_confidence_research_required') {
    insights.push('Additional research needed - check LinkedIn and company website')
  }

  if (result.contacts.length === 0) {
    insights.push('No contacts found - manual research required')
  }

  return insights
}
