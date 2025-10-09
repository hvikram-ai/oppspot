/**
 * Knowledge Graph™ - Entity Extraction Service
 * AI-powered extraction of entities, relationships, and facts from text
 */

import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'
import type {
  ExtractKnowledgeRequest,
  ExtractKnowledgeResponse,
  ExtractedKnowledge,
  EntityType,
  RelationshipType,
  FactType,
  ConfidenceLevel,
} from '../types'

interface AIExtractionResult {
  entities: Array<{
    type: string
    name: string
    subtype?: string
    description?: string
    confidence: number
  }>
  relationships: Array<{
    source: string
    target: string
    type: string
    label?: string
    confidence: number
  }>
  facts: Array<{
    entity: string
    type: string
    key: string
    value: string
    text: string
    confidence: number
    importance: number
  }>
}

export class EntityExtractor {
  /**
   * Extract knowledge from content using AI
   */
  static async extractKnowledge(
    request: ExtractKnowledgeRequest,
    userId: string
  ): Promise<ExtractKnowledgeResponse> {
    try {
      const supabase = await createClient()

      // Get user's org
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', userId)
        .single() as { data: Row<'profiles'> | null; error: any }

      if (!profile?.org_id) {
        return {
          success: false,
          extracted: { entities: [], relationships: [], facts: [] },
          entities_created: 0,
          relationships_created: 0,
          facts_created: 0,
          message: 'User org not found'
        }
      }

      // Extract entities using AI
      const extracted = await this.extractWithAI(request.content, request.content_type, request.entity_context)

      // Store extracted knowledge in database
      const result = await this.storeExtractedKnowledge(
        profile.org_id,
        userId,
        extracted,
        request.source_id
      )

      return {
        success: true,
        extracted,
        entities_created: result.entities_created,
        relationships_created: result.relationships_created,
        facts_created: result.facts_created,
        message: `Extracted ${result.entities_created} entities, ${result.relationships_created} relationships, ${result.facts_created} facts`
      }
    } catch (error) {
      console.error('[EntityExtractor] Error:', error)
      return {
        success: false,
        extracted: { entities: [], relationships: [], facts: [] },
        entities_created: 0,
        relationships_created: 0,
        facts_created: 0,
        message: error instanceof Error ? error.message : 'Extraction failed'
      }
    }
  }

  /**
   * Extract entities using OpenRouter AI
   */
  private static async extractWithAI(
    content: string,
    contentType: string,
    context?: ExtractKnowledgeRequest['entity_context']
  ): Promise<ExtractedKnowledge> {
    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured')
    }

    // Build extraction prompt
    const prompt = this.buildExtractionPrompt(content, contentType, context)

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://oppspot.ai',
        'X-Title': 'oppSpot Knowledge Graph'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: 'You are an expert knowledge extraction system. Extract structured entities, relationships, and facts from text with high accuracy.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Low temperature for consistent extraction
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`)
    }

    const data = await response.json()
    const aiResult: AIExtractionResult = JSON.parse(data.choices[0].message.content)

    // Convert AI result to our format
    return this.convertAIResult(aiResult)
  }

  /**
   * Build extraction prompt for AI
   */
  private static buildExtractionPrompt(
    content: string,
    contentType: string,
    context?: ExtractKnowledgeRequest['entity_context']
  ): string {
    const contextInfo = context ? `
Focus extraction on: ${context.entity_name} (${context.entity_type})
` : ''

    return `${contextInfo}
Extract structured knowledge from the following ${contentType}:

${content}

Extract:
1. **Entities**: Companies, people, stakeholders, technologies, products, signals, events
2. **Relationships**: How entities relate to each other
3. **Facts**: Specific information about entities (attributes, events, opinions, intents)

Return JSON in this exact format:
{
  "entities": [
    {
      "type": "company|person|stakeholder|technology|buying_signal|event|product|industry",
      "name": "Entity name",
      "subtype": "Optional subtype (e.g., 'cto', 'series_a', 'hiring_signal')",
      "description": "Brief description",
      "confidence": 0.0-1.0
    }
  ],
  "relationships": [
    {
      "source": "Entity name",
      "target": "Related entity name",
      "type": "works_at|reports_to|interested_in|uses|champions|competes_with|etc",
      "label": "Human-readable relationship",
      "confidence": 0.0-1.0
    }
  ],
  "facts": [
    {
      "entity": "Entity name",
      "type": "attribute|event|opinion|intent|pain_point|goal|constraint|preference",
      "key": "Fact key (e.g., 'employee_count', 'funding_stage', 'budget')",
      "value": "Fact value",
      "text": "Full fact sentence",
      "confidence": 0.0-1.0,
      "importance": 1-10 (how important is this fact)
    }
  ]
}

Entity Types:
- company: Business organizations
- person/stakeholder: People mentioned (decision makers, champions, etc.)
- technology: Tech stack, tools, platforms
- buying_signal: Indicators of buying intent (hiring, funding, pain points)
- event: Meetings, conferences, product launches
- product: Products or services
- industry: Industry/sector classifications

Relationship Types:
- works_at, reports_to, manages, colleagues_with
- interested_in, researched, evaluated, uses
- champions, opposes, influences
- built_with, integrates_with, competes_with, similar_to
- mentioned_in, discussed_in, related_to

Fact Types:
- attribute: Static properties (employee count, revenue, location)
- event: Time-based occurrences (raised funding, hired someone)
- opinion: Preferences or likes (likes AWS, prefers monthly billing)
- intent: Buying or action intent (wants to buy CRM, planning to scale)
- pain_point: Problems or frustrations
- goal: Objectives or targets
- constraint: Limitations (budget, timeline)
- preference: Choices or inclinations

Guidelines:
- Be specific and precise
- Extract ALL entities, relationships, and facts
- Assign confidence based on how explicit the information is (explicit=0.9, implied=0.6, inferred=0.3)
- Assign importance 1-10 (critical info=10, minor detail=1)
- Use consistent entity names (e.g., "Revolut" not "revolut" or "Revolut Ltd")
- Normalize relationships (e.g., "Sarah works at Revolut" and "Revolut employs Sarah" → same relationship)
`
  }

  /**
   * Convert AI extraction result to our format
   */
  private static convertAIResult(aiResult: AIExtractionResult): ExtractedKnowledge {
    return {
      entities: aiResult.entities.map(e => ({
        entity_type: this.normalizeEntityType(e.type),
        entity_name: e.name,
        entity_subtype: e.subtype,
        description: e.description,
        confidence: this.scoreToConfidence(e.confidence)
      })),
      relationships: aiResult.relationships.map(r => ({
        source_entity_name: r.source,
        target_entity_name: r.target,
        relationship_type: this.normalizeRelationshipType(r.type),
        relationship_label: r.label,
        confidence: this.scoreToConfidence(r.confidence)
      })),
      facts: aiResult.facts.map(f => ({
        entity_name: f.entity,
        fact_type: this.normalizeFactType(f.type),
        fact_key: f.key,
        fact_value: f.value,
        fact_text: f.text,
        confidence: this.scoreToConfidence(f.confidence),
        importance: Math.min(10, Math.max(1, Math.round(f.importance)))
      }))
    }
  }

  /**
   * Store extracted knowledge in database
   */
  private static async storeExtractedKnowledge(
    orgId: string,
    userId: string,
    extracted: ExtractedKnowledge,
    sourceId?: string
  ): Promise<{
    entities_created: number
    relationships_created: number
    facts_created: number
  }> {
    const supabase = await createClient()

    // Map of entity names to IDs
    const entityMap = new Map<string, string>()

    // 1. Create entities
    let entitiesCreated = 0
    for (const entityData of extracted.entities) {
      const { data: entity } = await supabase
        .from('knowledge_entities')
        // @ts-ignore - Supabase type inference issue
        .insert({
          org_id: orgId,
          entity_type: entityData.entity_type,
          entity_name: entityData.entity_name,
          entity_subtype: entityData.entity_subtype,
          description: entityData.description,
          confidence: entityData.confidence,
          created_by: userId
        })
        .select()
        .single()

      if (entity) {
        entityMap.set(entityData.entity_name, entity.id)
        entitiesCreated++
      }
    }

    // 2. Create relationships
    let relationshipsCreated = 0
    for (const relData of extracted.relationships) {
      const sourceId = entityMap.get(relData.source_entity_name)
      const targetId = entityMap.get(relData.target_entity_name)

      if (sourceId && targetId) {
        const { error } = await supabase
          // @ts-ignore - Supabase type inference issue
          .from('entity_relationships')
          .insert({
            org_id: orgId,
            source_entity_id: sourceId,
            target_entity_id: targetId,
            relationship_type: relData.relationship_type,
            relationship_label: relData.relationship_label,
            confidence: relData.confidence,
            strength: this.confidenceToStrength(relData.confidence),
            created_by: userId
          })

        if (!error) relationshipsCreated++
      }
    }

    // 3. Create facts
    let factsCreated = 0
    for (const factData of extracted.facts) {
      const entityId = entityMap.get(factData.entity_name)

      if (entityId) {
        // @ts-ignore - Supabase type inference issue
        const { error } = await supabase
          .from('knowledge_facts')
          .insert({
            org_id: orgId,
            entity_id: entityId,
            fact_type: factData.fact_type,
            fact_key: factData.fact_key,
            fact_value: factData.fact_value,
            fact_text: factData.fact_text,
            source_type: 'ai_extraction',
            source_id: sourceId,
            extracted_by: 'ai',
            confidence: factData.confidence,
            importance: factData.importance,
            is_current: true,
            created_by: userId
          })

        if (!error) factsCreated++
      }
    }

    return {
      entities_created: entitiesCreated,
      relationships_created: relationshipsCreated,
      facts_created: factsCreated
    }
  }

  /**
   * Helper: Normalize entity type
   */
  private static normalizeEntityType(type: string): EntityType {
    const normalized = type.toLowerCase().replace(/_/g, '_')
    const validTypes: EntityType[] = [
      'company', 'person', 'stakeholder', 'buying_signal', 'research_report',
      'meeting', 'conversation', 'document', 'technology', 'industry',
      'insight', 'event', 'deal', 'product', 'use_case'
    ]

    if (validTypes.includes(normalized as EntityType)) {
      return normalized as EntityType
    }

    // Default fallback
    return 'insight'
  }

  /**
   * Helper: Normalize relationship type
   */
  private static normalizeRelationshipType(type: string): RelationshipType {
    const normalized = type.toLowerCase().replace(/-/g, '_')
    const validTypes: RelationshipType[] = [
      'works_at', 'reports_to', 'manages', 'colleagues_with',
      'interested_in', 'researched', 'evaluated', 'purchased', 'uses',
      'champions', 'opposes', 'influences', 'recommends',
      'built_with', 'integrates_with', 'competes_with', 'similar_to',
      'preceded_by', 'resulted_in', 'triggered_by',
      'mentioned_in', 'discussed_in', 'related_to', 'tagged_with', 'custom'
    ]

    if (validTypes.includes(normalized as RelationshipType)) {
      return normalized as RelationshipType
    }

    return 'related_to'
  }

  /**
   * Helper: Normalize fact type
   */
  private static normalizeFactType(type: string): FactType {
    const normalized = type.toLowerCase().replace(/-/g, '_')
    const validTypes: FactType[] = [
      'attribute', 'event', 'opinion', 'observation', 'intent',
      'pain_point', 'goal', 'constraint', 'preference', 'relationship'
    ]

    if (validTypes.includes(normalized as FactType)) {
      return normalized as FactType
    }

    return 'observation'
  }

  /**
   * Helper: Convert 0-1 score to confidence level
   */
  private static scoreToConfidence(score: number): ConfidenceLevel {
    if (score >= 0.9) return 'verified'
    if (score >= 0.7) return 'high'
    if (score >= 0.5) return 'medium'
    if (score >= 0.3) return 'low'
    return 'speculative'
  }

  /**
   * Helper: Convert confidence to relationship strength
   */
  private static confidenceToStrength(confidence: ConfidenceLevel): number {
    const strengthMap: Record<ConfidenceLevel, number> = {
      'verified': 1.0,
      'high': 0.8,
      'medium': 0.6,
      'low': 0.4,
      'speculative': 0.2
    }
    return strengthMap[confidence]
  }
}
