/**
 * Knowledge Graph™ - ResearchGPT™ Integration
 * Automatically extract knowledge from research reports
 */

import { EntityExtractor } from '../extraction/entity-extractor'
import type { ExtractKnowledgeRequest } from '../types'

export class ResearchGPTKnowledgeIntegration {
  /**
   * Extract knowledge from research report
   */
  static async extractFromResearch(
    companyId: string,
    companyName: string,
    researchContent: string,
    userId: string
  ): Promise<{
    success: boolean
    entities_created: number
    facts_created: number
    relationships_created: number
  }> {
    try {
      // Build extraction request
      const request: ExtractKnowledgeRequest = {
        content: researchContent,
        content_type: 'research_report',
        source_id: companyId,
        entity_context: {
          entity_id: companyId,
          entity_type: 'company',
          entity_name: companyName
        }
      }

      // Extract knowledge
      const result = await EntityExtractor.extractKnowledge(request, userId)

      console.log('[ResearchGPTKG] Extracted knowledge from research:', companyName, {
        entities: result.entities_created,
        facts: result.facts_created,
        relationships: result.relationships_created
      })

      return {
        success: result.success,
        entities_created: result.entities_created,
        facts_created: result.facts_created,
        relationships_created: result.relationships_created
      }
    } catch (error) {
      console.error('[ResearchGPTKG] Error extracting from research:', error)
      return {
        success: false,
        entities_created: 0,
        facts_created: 0,
        relationships_created: 0
      }
    }
  }

  /**
   * Extract knowledge from conversation/meeting notes
   */
  static async extractFromConversation(
    conversationText: string,
    conversationType: 'meeting' | 'email' | 'call',
    participants: string[],
    userId: string
  ): Promise<{
    success: boolean
    entities_created: number
    facts_created: number
    relationships_created: number
  }> {
    try {
      const request: ExtractKnowledgeRequest = {
        content: conversationText,
        content_type: 'conversation',
        entity_context: participants.length > 0 ? {
          entity_type: 'person',
          entity_name: participants[0]
        } : undefined
      }

      const result = await EntityExtractor.extractKnowledge(request, userId)

      console.log('[ResearchGPTKG] Extracted knowledge from conversation:', conversationType, {
        entities: result.entities_created,
        facts: result.facts_created,
        relationships: result.relationships_created
      })

      return {
        success: result.success,
        entities_created: result.entities_created,
        facts_created: result.facts_created,
        relationships_created: result.relationships_created
      }
    } catch (error) {
      console.error('[ResearchGPTKG] Error extracting from conversation:', error)
      return {
        success: false,
        entities_created: 0,
        facts_created: 0,
        relationships_created: 0
      }
    }
  }

  /**
   * Extract knowledge from buying signals
   */
  static async extractFromSignal(
    signalType: string,
    signalData: string,
    companyId: string,
    companyName: string,
    userId: string
  ): Promise<{
    success: boolean
    facts_created: number
  }> {
    try {
      const content = `Buying Signal Detected:
Type: ${signalType}
Company: ${companyName}
Data: ${signalData}
`

      const request: ExtractKnowledgeRequest = {
        content,
        content_type: 'document',
        source_id: companyId,
        entity_context: {
          entity_id: companyId,
          entity_type: 'company',
          entity_name: companyName
        }
      }

      const result = await EntityExtractor.extractKnowledge(request, userId)

      console.log('[ResearchGPTKG] Extracted knowledge from signal:', signalType, companyName, {
        facts: result.facts_created
      })

      return {
        success: result.success,
        facts_created: result.facts_created
      }
    } catch (error) {
      console.error('[ResearchGPTKG] Error extracting from signal:', error)
      return {
        success: false,
        facts_created: 0
      }
    }
  }
}
