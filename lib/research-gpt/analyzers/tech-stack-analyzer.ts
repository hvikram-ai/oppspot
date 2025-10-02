/**
 * Tech Stack Analyzer
 * Detects technology stack from website and other sources
 * Uses BuiltWith-style detection + AI analysis
 */

import { getLLMFactory } from '@/lib/ai/llm-factory'

export interface TechStackResult {
  categories: {
    frontend: string[]
    backend: string[]
    infrastructure: string[]
    analytics: string[]
    marketing: string[]
    other: string[]
  }
  confidence: number
  detectionMethod: 'html_analysis' | 'ai_inference' | 'mixed'
  rawDetections: Array<{
    technology: string
    category: string
    confidence: number
    evidence: string
  }>
}

export async function getTechStackAnalyzer() {
  return {
    analyze: analyzeTechStack
  }
}

async function analyzeTechStack(
  websiteHtml: string | null,
  websiteUrl: string | null,
  companyDescription: string | null
): Promise<TechStackResult> {
  const detections: Array<{
    technology: string
    category: string
    confidence: number
    evidence: string
  }> = []

  // Step 1: HTML-based detection (if we have HTML)
  if (websiteHtml) {
    detections.push(...detectFromHtml(websiteHtml))
  }

  // Step 2: AI-powered inference from description and context
  if (companyDescription || websiteUrl) {
    const aiDetections = await inferFromAI(companyDescription, websiteUrl, websiteHtml)
    detections.push(...aiDetections)
  }

  // Step 3: Categorize and deduplicate
  const categories = {
    frontend: [] as string[],
    backend: [] as string[],
    infrastructure: [] as string[],
    analytics: [] as string[],
    marketing: [] as string[],
    other: [] as string[]
  }

  const seen = new Set<string>()

  for (const detection of detections.sort((a, b) => b.confidence - a.confidence)) {
    const tech = detection.technology.toLowerCase()
    if (seen.has(tech)) continue
    seen.add(tech)

    const category = detection.category as keyof typeof categories
    if (categories[category]) {
      categories[category].push(detection.technology)
    } else {
      categories.other.push(detection.technology)
    }
  }

  // Calculate overall confidence
  const avgConfidence = detections.length > 0
    ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length
    : 0

  const detectionMethod = websiteHtml && detections.length > 0
    ? (detections.some(d => d.evidence.includes('HTML')) ? 'mixed' : 'ai_inference')
    : 'ai_inference'

  return {
    categories,
    confidence: Math.round(avgConfidence),
    detectionMethod,
    rawDetections: detections
  }
}

/**
 * Detect technologies from HTML content
 */
function detectFromHtml(html: string): Array<{
  technology: string
  category: string
  confidence: number
  evidence: string
}> {
  const detections: Array<{
    technology: string
    category: string
    confidence: number
    evidence: string
  }> = []

  const patterns = [
    // Frontend frameworks
    { tech: 'React', category: 'frontend', pattern: /react|_next\/static|__NEXT_DATA__/i, confidence: 90 },
    { tech: 'Next.js', category: 'frontend', pattern: /_next\/static|__NEXT_DATA__|next\.config/i, confidence: 95 },
    { tech: 'Vue.js', category: 'frontend', pattern: /vue\.js|__vue__|v-bind|v-for/i, confidence: 90 },
    { tech: 'Angular', category: 'frontend', pattern: /angular|ng-app|ng-controller/i, confidence: 90 },
    { tech: 'Svelte', category: 'frontend', pattern: /svelte/i, confidence: 85 },

    // Analytics
    { tech: 'Google Analytics', category: 'analytics', pattern: /google-analytics|gtag|ga\.js/i, confidence: 95 },
    { tech: 'Google Tag Manager', category: 'analytics', pattern: /googletagmanager|gtm\.js/i, confidence: 95 },
    { tech: 'Mixpanel', category: 'analytics', pattern: /mixpanel/i, confidence: 90 },
    { tech: 'Segment', category: 'analytics', pattern: /segment\.com|analytics\.js/i, confidence: 90 },
    { tech: 'Hotjar', category: 'analytics', pattern: /hotjar/i, confidence: 90 },

    // Marketing/CRM
    { tech: 'Intercom', category: 'marketing', pattern: /intercom/i, confidence: 90 },
    { tech: 'HubSpot', category: 'marketing', pattern: /hubspot/i, confidence: 90 },
    { tech: 'Mailchimp', category: 'marketing', pattern: /mailchimp/i, confidence: 90 },

    // Infrastructure/Hosting
    { tech: 'Vercel', category: 'infrastructure', pattern: /vercel/i, confidence: 85 },
    { tech: 'Netlify', category: 'infrastructure', pattern: /netlify/i, confidence: 85 },
    { tech: 'AWS', category: 'infrastructure', pattern: /amazonaws\.com|cloudfront/i, confidence: 80 },
    { tech: 'Cloudflare', category: 'infrastructure', pattern: /cloudflare|cf-ray/i, confidence: 85 },

    // Backend (harder to detect from HTML, but sometimes visible)
    { tech: 'WordPress', category: 'backend', pattern: /wp-content|wordpress/i, confidence: 95 },
    { tech: 'Shopify', category: 'backend', pattern: /shopify|cdn\.shopify/i, confidence: 95 },
    { tech: 'Webflow', category: 'backend', pattern: /webflow/i, confidence: 90 },
  ]

  for (const { tech, category, pattern, confidence } of patterns) {
    if (pattern.test(html)) {
      detections.push({
        technology: tech,
        category,
        confidence,
        evidence: 'HTML pattern match'
      })
    }
  }

  return detections
}

/**
 * Infer technologies using AI
 */
async function inferFromAI(
  description: string | null,
  websiteUrl: string | null,
  websiteHtml: string | null
): Promise<Array<{
  technology: string
  category: string
  confidence: number
  evidence: string
}>> {
  try {
    const llmFactory = getLLMFactory()
    const llm = llmFactory.createLLM('fast')

    const prompt = `Analyze this company and infer their likely technology stack.

Company Description: ${description || 'N/A'}
Website URL: ${websiteUrl || 'N/A'}
${websiteHtml ? `Website HTML snippet: ${websiteHtml.slice(0, 1000)}...` : ''}

Based on this information, infer the likely technologies they use in these categories:
- Frontend (React, Vue, Angular, etc.)
- Backend (Node.js, Python/Django, Ruby/Rails, Java/Spring, etc.)
- Infrastructure (AWS, Google Cloud, Azure, Vercel, etc.)
- Analytics (Google Analytics, Mixpanel, Amplitude, etc.)
- Marketing (HubSpot, Intercom, Mailchimp, etc.)

Return ONLY a JSON array with this structure:
[
  {"technology": "React", "category": "frontend", "confidence": 85, "evidence": "Modern SaaS company likely uses React"},
  {"technology": "AWS", "category": "infrastructure", "confidence": 70, "evidence": "Most companies use AWS for cloud"}
]

Focus on likely technologies, not every possible option. Only include technologies with confidence > 60.`

    const response = await llm.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 1000
    })

    // Try to parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed
    }

    return []
  } catch (error) {
    console.error('[Tech Stack Analyzer] AI inference error:', error)
    return []
  }
}

/**
 * Get tech stack insights/summary
 */
export function getTechStackInsights(result: TechStackResult): string[] {
  const insights: string[] = []

  const totalTechs = Object.values(result.categories).flat().length

  if (totalTechs === 0) {
    return ['Unable to detect technology stack']
  }

  // Frontend insights
  if (result.categories.frontend.length > 0) {
    insights.push(`Uses ${result.categories.frontend.join(', ')} for frontend`)
  }

  // Infrastructure insights
  if (result.categories.infrastructure.length > 0) {
    insights.push(`Hosted on ${result.categories.infrastructure.join(', ')}`)
  }

  // Analytics insights
  if (result.categories.analytics.length > 0) {
    insights.push(`Tracks analytics with ${result.categories.analytics.join(', ')}`)
  }

  // Modern stack indicator
  const modernTechs = ['React', 'Next.js', 'Vue.js', 'Svelte', 'Vercel', 'AWS']
  const hasModernStack = result.categories.frontend.some(t =>
    modernTechs.includes(t)
  )
  if (hasModernStack) {
    insights.push('Modern tech stack indicates technical sophistication')
  }

  return insights
}
