/**
 * Knowledge Graph™ - TeamPlay™ Integration
 * Automatically capture team activities as knowledge
 */

import { createClient } from '@/lib/supabase/client'
import type { ActivityType } from '@/lib/teamplay/activity-tracker'
import type { Row } from '@/lib/supabase/helpers'

export class TeamPlayKnowledgeIntegration {
  /**
   * Capture team activity as knowledge entities and relationships
   */
  static async captureActivity(
    activityType: ActivityType,
    entityType: string,
    entityId: string,
    entityName: string,
    metadata?: Record<string, any>
  ) {
    try {
      const supabase = createClient()

      // Get current user and org
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single() as { data: Row<'profiles'> | null; error: any }

      if (!profile?.org_id) return

      // Map activity type to knowledge entity type
      const knowledgeEntityType = this.mapActivityToEntityType(activityType)
      if (!knowledgeEntityType) return

      // Create or update knowledge entity
      const { data: entity } = await supabase
        .from('knowledge_entities')
        .upsert({
          org_id: profile.org_id,
          entity_type: knowledgeEntityType,
          entity_name: entityName,
          reference_type: entityType,
          reference_id: entityId,
          metadata: {
            ...metadata,
            last_activity: new Date().toISOString(),
            last_activity_type: activityType
          },
          confidence: 'verified',
          created_by: user.id
        }, {
          onConflict: 'org_id,entity_type,reference_id',
          ignoreDuplicates: false
        })
        .select()
        .single()

      if (!entity) return

      // Create activity fact
      await this.createActivityFact(
        profile.org_id,
        entity.id,
        activityType,
        user.id,
        metadata
      )

      // Create user-entity relationship
      await this.createUserRelationship(
        profile.org_id,
        user.id,
        entity.id,
        activityType
      )

      console.log('[TeamPlayKG] Captured activity:', activityType, entityName)
    } catch (error) {
      console.error('[TeamPlayKG] Error capturing activity:', error)
    }
  }

  /**
   * Map TeamPlay activity type to Knowledge Graph entity type
   */
  private static mapActivityToEntityType(
    activityType: ActivityType
  ): 'company' | 'buying_signal' | 'event' | 'insight' | null {
    const mapping: Partial<Record<ActivityType, any>> = {
      'company_viewed': 'company',
      'company_saved': 'company',
      'company_shared': 'company',
      'research_generated': 'insight',
      'signal_detected': 'buying_signal',
      'agent_created': 'event',
      'agent_run': 'event',
      'stream_created': 'event',
      'list_created': 'event'
    }
    return mapping[activityType] || null
  }

  /**
   * Create fact from activity
   */
  private static async createActivityFact(
    orgId: string,
    entityId: string,
    activityType: ActivityType,
    userId: string,
    metadata?: Record<string, any>
  ) {
    const supabase = createClient()

    const factText = this.generateActivityFactText(activityType, metadata)

    await supabase.from('knowledge_facts').insert({
      org_id: orgId,
      entity_id: entityId,
      fact_type: 'event',
      fact_key: 'team_activity',
      fact_value: activityType,
      fact_text: factText,
      source_type: 'team_activity',
      extracted_by: 'user',
      confidence: 'verified',
      importance: this.getActivityImportance(activityType),
      fact_date: new Date().toISOString(),
      is_current: true,
      created_by: userId
    })
  }

  /**
   * Create user-entity relationship
   */
  private static async createUserRelationship(
    orgId: string,
    userId: string,
    entityId: string,
    activityType: ActivityType
  ) {
    const supabase = createClient()

    // Get or create user entity
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single() as { data: Row<'profiles'> | null; error: any }

    if (!userProfile) return

    const { data: userEntity } = await supabase
      .from('knowledge_entities')
      .upsert({
        org_id: orgId,
        entity_type: 'person',
        entity_name: userProfile.full_name || userProfile.email,
        reference_type: 'profiles',
        reference_id: userId,
        confidence: 'verified',
        created_by: userId
      }, {
        onConflict: 'org_id,entity_type,reference_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (!userEntity) return

    // Create relationship based on activity
    const relationshipType = this.mapActivityToRelationship(activityType)
    if (!relationshipType) return

    await supabase.from('entity_relationships').insert({
      org_id: orgId,
      source_entity_id: userEntity.id,
      target_entity_id: entityId,
      relationship_type: relationshipType,
      relationship_label: this.getRelationshipLabel(activityType),
      confidence: 'verified',
      strength: 0.8,
      source_type: 'team_activity',
      created_by: userId
    })
  }

  /**
   * Map activity to relationship type
   */
  private static mapActivityToRelationship(activityType: ActivityType): string | null {
    const mapping: Partial<Record<ActivityType, string>> = {
      'company_viewed': 'researched',
      'company_saved': 'interested_in',
      'research_generated': 'researched',
      'signal_detected': 'mentioned_in'
    }
    return mapping[activityType] || null
  }

  /**
   * Generate human-readable fact text
   */
  private static generateActivityFactText(
    activityType: ActivityType,
    metadata?: Record<string, any>
  ): string {
    const baseTexts: Partial<Record<ActivityType, string>> = {
      'company_viewed': 'Team member viewed this company',
      'company_saved': 'Team member saved this company to a list',
      'research_generated': 'Research report generated',
      'signal_detected': 'Buying signal detected',
      'agent_run': 'AI agent analyzed this entity'
    }

    let text = baseTexts[activityType] || 'Team activity recorded'

    if (metadata?.opportunities_found) {
      text += ` (found ${metadata.opportunities_found} opportunities)`
    }

    return text
  }

  /**
   * Get relationship label
   */
  private static getRelationshipLabel(activityType: ActivityType): string {
    const labels: Partial<Record<ActivityType, string>> = {
      'company_viewed': 'viewed',
      'company_saved': 'interested in',
      'research_generated': 'researched',
      'signal_detected': 'detected signal for'
    }
    return labels[activityType] || activityType
  }

  /**
   * Get activity importance score
   */
  private static getActivityImportance(activityType: ActivityType): number {
    const importance: Partial<Record<ActivityType, number>> = {
      'company_viewed': 3,
      'company_saved': 7,
      'research_generated': 8,
      'signal_detected': 9,
      'agent_run': 6
    }
    return importance[activityType] || 5
  }
}
