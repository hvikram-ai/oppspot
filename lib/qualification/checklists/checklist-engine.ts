import { createClient } from '@/lib/supabase/server';
import type { Row } from '@/lib/supabase/helpers'
import type {
  QualificationChecklist,
  ChecklistItem,
  CreateChecklistRequest
} from '../types/qualification';

interface ChecklistTemplate {
  name: string;
  framework: 'BANT' | 'MEDDIC' | 'CUSTOM';
  categories: {
    name: string;
    items: {
      question: string;
      description?: string;
      is_required: boolean;
      weight?: number;
      auto_populate?: boolean;
      data_source?: string;
    }[];
  }[];
}

// Interfaces for BANT/MEDDIC qualification data structure
interface BudgetDetails {
  budget_range?: string;
  budget_confirmed?: boolean;
  [key: string]: unknown;
}

interface AuthorityDetails {
  decision_makers?: Array<unknown>;
  [key: string]: unknown;
}

interface NeedDetails {
  pain_points?: Array<unknown>;
  [key: string]: unknown;
}

interface TimelineDetails {
  decision_date?: string;
  buying_stage?: string;
  [key: string]: unknown;
}

export class ChecklistEngine {
  private supabase;

  constructor() {
    // Initialize in methods to handle async
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Create a new qualification checklist
   */
  async createChecklist(request: CreateChecklistRequest): Promise<QualificationChecklist | null> {
    try {
      const supabase = await this.getSupabase();

      // Check for existing checklist
      const { data: existing } = (await supabase
        .from('qualification_checklists')
        .select('*')
        .eq('lead_id', request.lead_id)
        .eq('company_id', request.company_id)
        .eq('framework', request.framework)
        .single()) as { data: Record<string, unknown> | null; error: unknown };

      if (existing) {
        return await this.getChecklist(existing.id as string);
      }

      // Get template
      const template = request.template_id
        ? await this.getCustomTemplate(request.template_id)
        : this.getDefaultTemplate(request.framework);

      // Create checklist
      const { data: checklist, error } = await supabase
        .from('qualification_checklists')
        .insert({
          lead_id: request.lead_id,
          company_id: request.company_id,
          framework: request.framework,
          template_id: request.template_id,
          total_items: 0,
          completed_items: 0,
          completion_percentage: 0,
          status: 'not_started'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating checklist:', error);
        return null;
      }

      // Create checklist items
      const items = await this.createChecklistItems(checklist.id, template);

      // Update checklist with item count
      await supabase
        .from('qualification_checklists')
        .update({
          total_items: items.length
        })
        .eq('id', checklist.id);

      // Auto-populate items if possible
      await this.autoPopulateItems(checklist.id, request.lead_id, request.company_id);

      return await this.getChecklist(checklist.id);

    } catch (error) {
      console.error('Checklist creation error:', error);
      return null;
    }
  }

  /**
   * Get a checklist with all items
   */
  async getChecklist(checklistId: string): Promise<QualificationChecklist | null> {
    const supabase = await this.getSupabase();

    const { data: checklist } = await supabase
      .from('qualification_checklists')
      .select(`
        *,
        checklist_items(*) as { data: Row<'qualification_checklists'>[] | null; error: any }
      `)
      .eq('id', checklistId)
      .single();

    if (!checklist) return null;

    return this.mapChecklistFromDatabase(checklist);
  }

  /**
   * Update a checklist item
   */
  async updateChecklistItem(
    itemId: string,
    updates: Partial<ChecklistItem>
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();

      // Get current item
      const { data: item } = await supabase
        .from('checklist_items')
        .select('*, qualification_checklists!inner(*)')
        .eq('id', itemId)
        .single();

      if (!item) return false;

      // Update item
      const { error } = await supabase
        .from('checklist_items')
        .update({
          status: updates.status || item.status,
          answer: updates.answer || item.answer,
          evidence: updates.evidence || item.evidence,
          completed_at: updates.status === 'completed' ? new Date().toISOString() : item.completed_at,
          completed_by: updates.status === 'completed' ? (await supabase.auth.getUser()).data.user?.id : item.completed_by,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) {
        console.error('Error updating checklist item:', error);
        return false;
      }

      // Update checklist progress
      await this.updateChecklistProgress(item.checklist_id);

      // Check dependencies and unlock items
      if (updates.status === 'completed') {
        await this.processItemDependencies(itemId, item.checklist_id);
      }

      // Update qualification scores if needed
      if (item.score_impact && updates.status === 'completed') {
        await this.updateQualificationScore(
          item.qualification_checklists.lead_id,
          item.qualification_checklists.company_id,
          item.qualification_checklists.framework,
          item.score_impact
        );
      }

      return true;

    } catch (error) {
      console.error('Checklist item update error:', error);
      return false;
    }
  }

  /**
   * Create checklist items from template
   */
  private async createChecklistItems(
    checklistId: string,
    template: ChecklistTemplate
  ): Promise<ChecklistItem[]> {
    const supabase = await this.getSupabase();
    const items: Array<Omit<ChecklistItem, 'id'>> = [];
    let orderIndex = 0;

    for (const category of template.categories) {
      for (const item of category.items) {
        items.push({
          checklist_id: checklistId,
          category: category.name,
          question: item.question,
          description: item.description,
          order_index: orderIndex++,
          status: 'pending',
          is_required: item.is_required,
          validation_type: item.auto_populate ? 'hybrid' : 'manual',
          weight: item.weight || 1.0,
          auto_populate: item.auto_populate || false,
          data_source: item.data_source
        });
      }
    }

    const { data, error } = await supabase
      .from('checklist_items')
      .insert(items)
      .select();

    if (error) {
      console.error('Error creating checklist items:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Auto-populate checklist items with available data
   */
  private async autoPopulateItems(
    checklistId: string,
    leadId: string,
    companyId: string
  ): Promise<void> {
    const supabase = await this.getSupabase();

    // Get auto-populatable items
    const { data: items } = (await supabase
      .from('checklist_items')
      .select('*')
      .eq('checklist_id', checklistId)
      .eq('auto_populate', true)) as { data: Row<'checklist_items'>[] | null; error: unknown };

    if (!items || items.length === 0) return;

    // Get lead and company data
    const { data: lead } = (await supabase
      .from('lead_scores')
      .select('*')
      .eq('id', leadId)
      .single()) as { data: Row<'lead_scores'> | null; error: unknown };

    const { data: company } = (await supabase
      .from('businesses')
      .select('*')
      .eq('id', companyId)
      .single()) as { data: Row<'businesses'> | null; error: unknown };

    // Get BANT/MEDDIC qualifications if they exist
    const { data: bantQual } = (await supabase
      .from('bant_qualifications')
      .select('*')
      .eq('lead_id', leadId)
      .eq('company_id', companyId)
      .single()) as { data: Row<'bant_qualifications'> | null; error: unknown };

    const { data: meddicQual } = (await supabase
      .from('meddic_qualifications')
      .select('*')
      .eq('lead_id', leadId)
      .eq('company_id', companyId)
      .single()) as { data: Row<'meddic_qualifications'> | null; error: unknown };

    // Auto-populate each item
    for (const item of items) {
      const populated = await this.populateItem(item, {
        lead,
        company,
        bantQual,
        meddicQual
      });

      if (populated) {
        await supabase
          .from('checklist_items')
          .update({
            answer: populated.answer,
            evidence: populated.evidence,
            status: 'completed',
            completed_at: new Date().toISOString(),
            ml_suggestion: populated.suggestion,
            confidence_score: populated.confidence
          })
          .eq('id', (item as any).id);
      }
    }

    // Update progress
    await this.updateChecklistProgress(checklistId);
  }

  /**
   * Populate a single item based on available data
   */
  private async populateItem(
    item: ChecklistItem,
    data: {
      lead: Row<'lead_scores'> | null;
      company: Row<'businesses'> | null;
      bantQual: Row<'bant_qualifications'> | null;
      meddicQual: Row<'meddic_qualifications'> | null;
    }
  ): Promise<{ answer: string; evidence: Array<Record<string, unknown>>; suggestion?: string; confidence?: number } | null> {
    const question = item.question.toLowerCase();

    // Cast to any for flexible property access since these are Json fields
    const bantQualData = data.bantQual as Record<string, unknown> | null;
    const companyData = data.company as Record<string, unknown> | null;
    const leadData = data.lead as Record<string, unknown> | null;

    // Budget-related questions
    if (question.includes('budget') || question.includes('funding')) {
      if (bantQualData?.budget_details) {
        const budget = bantQualData.budget_details as BudgetDetails;
        return {
          answer: `Budget range: ${budget.budget_range}, Confirmed: ${budget.budget_confirmed}`,
          evidence: [{ type: 'bant_qualification', data: budget }],
          confidence: budget.budget_confirmed ? 0.9 : 0.6
        };
      } else if (companyData?.annual_revenue) {
        return {
          answer: `Estimated based on revenue: ${this.estimateBudgetFromRevenue(companyData.annual_revenue as number)}`,
          evidence: [{ type: 'company_data', data: { annual_revenue: companyData.annual_revenue } }],
          suggestion: 'Budget confirmation needed',
          confidence: 0.5
        };
      }
    }

    // Authority-related questions
    if (question.includes('decision maker') || question.includes('stakeholder')) {
      const authorityDetails = bantQualData?.authority_details as AuthorityDetails | undefined;
      if (authorityDetails?.decision_makers) {
        const dms = authorityDetails.decision_makers;
        return {
          answer: `${dms.length} decision makers identified`,
          evidence: [{ type: 'decision_makers', data: dms }],
          confidence: 0.8
        };
      }
    }

    // Need-related questions
    if (question.includes('pain point') || question.includes('challenge')) {
      const needDetails = bantQualData?.need_details as NeedDetails | undefined;
      if (needDetails?.pain_points) {
        const pains = needDetails.pain_points;
        return {
          answer: `${pains.length} pain points identified`,
          evidence: [{ type: 'pain_points', data: pains }],
          confidence: 0.85
        };
      }
    }

    // Timeline-related questions
    if (question.includes('timeline') || question.includes('decision date')) {
      if (bantQualData?.timeline_details) {
        const timeline = bantQualData.timeline_details as TimelineDetails;
        return {
          answer: `Decision date: ${timeline.decision_date || 'Not set'}, Stage: ${timeline.buying_stage}`,
          evidence: [{ type: 'timeline', data: timeline }],
          confidence: timeline.decision_date ? 0.8 : 0.4
        };
      }
    }

    // Company information
    if (question.includes('company size') || question.includes('employees')) {
      if (companyData?.employee_count) {
        return {
          answer: `${companyData.employee_count} employees`,
          evidence: [{ type: 'company_data', data: { employee_count: companyData.employee_count } }],
          confidence: 0.95
        };
      }
    }

    // Industry information
    if (question.includes('industry') || question.includes('sector')) {
      if (companyData?.industry) {
        return {
          answer: companyData.industry as string,
          evidence: [{ type: 'company_data', data: { industry: companyData.industry } }],
          confidence: 0.95
        };
      }
    }

    // Lead score
    if (question.includes('lead score') || question.includes('qualification score')) {
      if (leadData?.total_score) {
        return {
          answer: `Lead score: ${leadData.total_score}/100`,
          evidence: [{ type: 'lead_score', data: leadData }],
          confidence: 0.9
        };
      }
    }

    return null;
  }

  /**
   * Update checklist progress
   */
  private async updateChecklistProgress(checklistId: string): Promise<void> {
    const supabase = await this.getSupabase();

    // Get all items
    const { data: items } = (await supabase
      .from('checklist_items')
      .select('status, is_required')
      .eq('checklist_id', checklistId)) as { data: Row<'checklist_items'>[] | null; error: unknown };

    if (!items) return;

    const totalItems = items.length;
    const completedItems = items.filter((i: any) => i.status === 'completed').length;
    const completionPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    // Determine status
    let status: QualificationChecklist['status'] = 'not_started';
    if (completionPercentage === 100) {
      status = 'completed';
    } else if (completionPercentage > 0) {
      status = 'in_progress';
    }

    // Check if all required items are complete
    const requiredItems = items.filter((i: any) => i.is_required);
    const requiredComplete = requiredItems.filter((i: any) => i.status === 'completed').length;
    const requiredCompletion = requiredItems.length > 0
      ? (requiredComplete / requiredItems.length) * 100
      : 100;

    // Update checklist
    await supabase
      .from('qualification_checklists')
      .update({
        total_items: totalItems,
        completed_items: completedItems,
        completion_percentage: completionPercentage,
        status,
        started_at: status === 'in_progress' && completedItems === 1
          ? new Date().toISOString()
          : undefined,
        completed_at: status === 'completed'
          ? new Date().toISOString()
          : undefined
      })
      .eq('id', checklistId);

    // Create alert if required items not complete but optional items are
    if (requiredCompletion < 100 && completionPercentage > requiredCompletion + 20) {
      await this.createRequiredItemsAlert(checklistId);
    }
  }

  /**
   * Process item dependencies
   */
  private async processItemDependencies(itemId: string, checklistId: string): Promise<void> {
    const supabase = await this.getSupabase();

    // Get all items with dependencies
    const { data: items } = (await supabase
      .from('checklist_items')
      .select('*')
      .eq('checklist_id', checklistId)) as { data: Row<'checklist_items'>[] | null; error: unknown };

    if (!items) return;

    // Find items that depend on this completed item
    const dependentItems = items.filter(item => {
      const deps = (item as any).dependencies as { prerequisite_items?: string[] } | undefined;
      return deps?.prerequisite_items?.includes(itemId);
    });

    // Update dependent items
    for (const item of dependentItems) {
      const deps = (item as any).dependencies as { prerequisite_items?: string[] } | undefined;
      const prereqs = deps?.prerequisite_items || [];

      // Check if all prerequisites are met
      const prereqsMet = prereqs.every((prereqId: string) => {
        const prereqItem = items.find(i => (i as any).id === prereqId) as Record<string, unknown> | undefined;
        return prereqItem?.status === 'completed';
      });

      if (prereqsMet && (item as any).status === 'blocked') {
        await supabase
          .from('checklist_items')
          .update({
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', (item as any).id);
      }
    }
  }

  /**
   * Update qualification score based on checklist completion
   */
  private async updateQualificationScore(
    leadId: string,
    companyId: string,
    framework: string,
    scoreImpact: number
  ): Promise<void> {
    // This would integrate with BANT/MEDDIC scoring
    // For now, we'll just log the activity
    const supabase = await this.getSupabase();

    await supabase
      .from('qualification_activities')
      .insert({
        lead_id: leadId,
        company_id: companyId,
        activity_type: 'checklist_item_completed',
        activity_description: `Checklist item completed with score impact: ${scoreImpact}`,
        score_impact: scoreImpact,
        framework_affected: framework
      });
  }

  /**
   * Create alert for incomplete required items
   */
  private async createRequiredItemsAlert(checklistId: string): Promise<void> {
    const supabase = await this.getSupabase();

    const { data: checklist } = (await supabase
      .from('qualification_checklists')
      .select('lead_id')
      .eq('id', checklistId)
      .single()) as { data: Record<string, unknown> | null; error: unknown };

    if (!checklist) return;

    // Check if alert already exists
    const { data: existingAlert } = (await supabase
      .from('scoring_alerts')
      .select('id')
      .eq('lead_id', checklist.lead_id as string)
      .eq('alert_type', 'checklist_required_items')
      .eq('is_resolved', false)
      .single()) as { data: Record<string, unknown> | null; error: unknown };

    if (existingAlert) return;

    await supabase
      .from('scoring_alerts')
      .insert({
        lead_id: checklist.lead_id as string,
        alert_type: 'checklist_required_items',
        severity: 'warning',
        title: 'Required checklist items incomplete',
        description: 'Some required qualification checklist items are not yet completed',
        is_resolved: false
      });
  }

  /**
   * Get default template for framework
   */
  private getDefaultTemplate(framework: 'BANT' | 'MEDDIC' | 'CUSTOM'): ChecklistTemplate {
    if (framework === 'BANT') {
      return this.getBANTTemplate();
    } else if (framework === 'MEDDIC') {
      return this.getMEDDICTemplate();
    } else {
      return this.getCustomDefaultTemplate();
    }
  }

  /**
   * Get BANT checklist template
   */
  private getBANTTemplate(): ChecklistTemplate {
    return {
      name: 'BANT Qualification Checklist',
      framework: 'BANT',
      categories: [
        {
          name: 'Budget',
          items: [
            {
              question: 'Has the budget been confirmed with the stakeholder?',
              description: 'Verify that budget has been explicitly discussed and confirmed',
              is_required: true,
              weight: 2.0,
              auto_populate: true,
              data_source: 'bant_qualification'
            },
            {
              question: 'What is the budget range for this project?',
              description: 'Document the specific budget range or amount',
              is_required: true,
              weight: 1.5,
              auto_populate: true,
              data_source: 'bant_qualification'
            },
            {
              question: 'Has funding been approved?',
              description: 'Confirm if budget has been formally approved',
              is_required: false,
              weight: 1.0
            },
            {
              question: 'What is the budget approval process?',
              description: 'Document the steps required for budget approval',
              is_required: false,
              weight: 0.5
            }
          ]
        },
        {
          name: 'Authority',
          items: [
            {
              question: 'Have all decision makers been identified?',
              description: 'Confirm that all key stakeholders are known',
              is_required: true,
              weight: 2.0,
              auto_populate: true,
              data_source: 'bant_qualification'
            },
            {
              question: 'Is the economic buyer engaged?',
              description: 'Verify engagement with the person who controls the budget',
              is_required: true,
              weight: 1.5
            },
            {
              question: 'Has the buying committee been mapped?',
              description: 'Document all members of the buying committee',
              is_required: false,
              weight: 1.0,
              auto_populate: true,
              data_source: 'stakeholders'
            },
            {
              question: 'Do we have a champion identified?',
              description: 'Identify an internal advocate for our solution',
              is_required: false,
              weight: 1.0
            }
          ]
        },
        {
          name: 'Need',
          items: [
            {
              question: 'Have pain points been documented?',
              description: 'List all identified business pain points',
              is_required: true,
              weight: 2.0,
              auto_populate: true,
              data_source: 'bant_qualification'
            },
            {
              question: 'Are use cases clearly defined?',
              description: 'Document specific use cases for the solution',
              is_required: true,
              weight: 1.5
            },
            {
              question: 'Has the prospect acknowledged the problem?',
              description: 'Confirm explicit acknowledgment of the business problem',
              is_required: true,
              weight: 1.5
            },
            {
              question: 'Have success criteria been agreed upon?',
              description: 'Define what success looks like for the prospect',
              is_required: false,
              weight: 1.0
            }
          ]
        },
        {
          name: 'Timeline',
          items: [
            {
              question: 'Has a decision date been set?',
              description: 'Confirm when a decision will be made',
              is_required: true,
              weight: 2.0,
              auto_populate: true,
              data_source: 'bant_qualification'
            },
            {
              question: 'Is there an implementation timeline?',
              description: 'Document when the solution needs to be implemented',
              is_required: true,
              weight: 1.5
            },
            {
              question: 'Are there any compelling events?',
              description: 'Identify events that create urgency',
              is_required: false,
              weight: 1.0
            },
            {
              question: 'What is the current buying stage?',
              description: 'Document where the prospect is in their buying journey',
              is_required: true,
              weight: 1.0,
              auto_populate: true,
              data_source: 'bant_qualification'
            }
          ]
        }
      ]
    };
  }

  /**
   * Get MEDDIC checklist template
   */
  private getMEDDICTemplate(): ChecklistTemplate {
    return {
      name: 'MEDDIC Qualification Checklist',
      framework: 'MEDDIC',
      categories: [
        {
          name: 'Metrics',
          items: [
            {
              question: 'Have success metrics been defined?',
              description: 'Document specific, measurable success metrics',
              is_required: true,
              weight: 2.0,
              auto_populate: true,
              data_source: 'meddic_qualification'
            },
            {
              question: 'Are KPIs quantified?',
              description: 'Ensure KPIs have specific targets',
              is_required: true,
              weight: 1.5
            },
            {
              question: 'Has ROI been calculated?',
              description: 'Document the expected return on investment',
              is_required: true,
              weight: 1.5
            },
            {
              question: 'Are baseline measurements documented?',
              description: 'Record current state metrics for comparison',
              is_required: false,
              weight: 1.0
            }
          ]
        },
        {
          name: 'Economic Buyer',
          items: [
            {
              question: 'Is the economic buyer identified?',
              description: 'Confirm who has budget authority',
              is_required: true,
              weight: 2.0,
              auto_populate: true,
              data_source: 'meddic_qualification'
            },
            {
              question: 'Has direct contact been established?',
              description: 'Verify direct communication with economic buyer',
              is_required: true,
              weight: 1.5
            },
            {
              question: 'Is budget authority confirmed?',
              description: 'Confirm they can approve the purchase',
              is_required: true,
              weight: 1.5
            },
            {
              question: 'Has the business case been reviewed with them?',
              description: 'Ensure economic buyer understands the value proposition',
              is_required: false,
              weight: 1.0
            }
          ]
        },
        {
          name: 'Decision Criteria',
          items: [
            {
              question: 'Are technical requirements documented?',
              description: 'List all technical requirements',
              is_required: true,
              weight: 2.0,
              auto_populate: true,
              data_source: 'meddic_qualification'
            },
            {
              question: 'Are business requirements clear?',
              description: 'Document business-level requirements',
              is_required: true,
              weight: 1.5
            },
            {
              question: 'Has evaluation criteria been agreed upon?',
              description: 'Confirm how the solution will be evaluated',
              is_required: true,
              weight: 1.5
            },
            {
              question: 'Is the competitive landscape understood?',
              description: 'Document competing solutions being considered',
              is_required: false,
              weight: 1.0
            }
          ]
        },
        {
          name: 'Decision Process',
          items: [
            {
              question: 'Is the decision process mapped?',
              description: 'Document all steps in the decision process',
              is_required: true,
              weight: 2.0,
              auto_populate: true,
              data_source: 'meddic_qualification'
            },
            {
              question: 'Are all stakeholders identified?',
              description: 'List everyone involved in the decision',
              is_required: true,
              weight: 1.5
            },
            {
              question: 'Are approval stages defined?',
              description: 'Document each approval required',
              is_required: true,
              weight: 1.0
            },
            {
              question: 'Are timeline milestones set?',
              description: 'Define key dates in the process',
              is_required: false,
              weight: 1.0
            }
          ]
        },
        {
          name: 'Identify Pain',
          items: [
            {
              question: 'Is business pain quantified?',
              description: 'Document the cost/impact of the problem',
              is_required: true,
              weight: 2.0,
              auto_populate: true,
              data_source: 'meddic_qualification'
            },
            {
              question: 'Has cost of inaction been calculated?',
              description: 'What happens if they do nothing?',
              is_required: true,
              weight: 1.5
            },
            {
              question: 'Is urgency level assessed?',
              description: 'How urgent is solving this problem?',
              is_required: true,
              weight: 1.5
            },
            {
              question: 'Is solution alignment verified?',
              description: 'Confirm our solution addresses the pain',
              is_required: false,
              weight: 1.0
            }
          ]
        },
        {
          name: 'Champion',
          items: [
            {
              question: 'Is an internal champion identified?',
              description: 'Who will advocate for us internally?',
              is_required: true,
              weight: 2.0,
              auto_populate: true,
              data_source: 'meddic_qualification'
            },
            {
              question: 'Is champion influence verified?',
              description: 'Confirm they have internal influence',
              is_required: true,
              weight: 1.5
            },
            {
              question: 'Is the champion equipped with materials?',
              description: 'Have we provided tools for internal selling?',
              is_required: false,
              weight: 1.0
            },
            {
              question: 'Is the champion actively selling internally?',
              description: 'Verify they are advocating for us',
              is_required: false,
              weight: 1.0
            }
          ]
        }
      ]
    };
  }

  /**
   * Get custom default template
   */
  private getCustomDefaultTemplate(): ChecklistTemplate {
    return {
      name: 'Custom Qualification Checklist',
      framework: 'CUSTOM',
      categories: [
        {
          name: 'Discovery',
          items: [
            {
              question: 'Initial discovery call completed?',
              is_required: true,
              weight: 1.0
            },
            {
              question: 'Business needs identified?',
              is_required: true,
              weight: 1.0
            }
          ]
        },
        {
          name: 'Qualification',
          items: [
            {
              question: 'Budget discussed?',
              is_required: true,
              weight: 1.0
            },
            {
              question: 'Decision maker engaged?',
              is_required: true,
              weight: 1.0
            }
          ]
        },
        {
          name: 'Next Steps',
          items: [
            {
              question: 'Demo scheduled?',
              is_required: false,
              weight: 1.0
            },
            {
              question: 'Proposal timeline agreed?',
              is_required: false,
              weight: 1.0
            }
          ]
        }
      ]
    };
  }

  /**
   * Get custom template from database
   */
  private async getCustomTemplate(templateId: string): Promise<ChecklistTemplate> {
    // This would fetch a custom template from the database
    // For now, return the default custom template
    return this.getCustomDefaultTemplate();
  }

  /**
   * Estimate budget from revenue
   */
  private estimateBudgetFromRevenue(revenue: number): string {
    // Typical B2B SaaS spend is 1-5% of revenue
    const estimated = revenue * 0.02;

    if (estimated > 500000) return 'over_500k';
    if (estimated > 100000) return '100k_500k';
    if (estimated > 50000) return '50k_100k';
    if (estimated > 10000) return '10k_50k';
    return 'under_10k';
  }

  /**
   * Map checklist from database format
   */
  private mapChecklistFromDatabase(data: Record<string, unknown> & { checklist_items?: Array<Record<string, unknown>> }): QualificationChecklist {
    return {
      id: data.id as string,
      lead_id: data.lead_id as string,
      company_id: data.company_id as string | undefined,
      framework: data.framework as 'BANT' | 'MEDDIC' | 'CUSTOM',
      template_id: data.template_id as string | undefined,
      total_items: data.total_items as number,
      completed_items: data.completed_items as number,
      completion_percentage: data.completion_percentage as number,
      status: data.status as 'not_started' | 'in_progress' | 'completed' | 'abandoned',
      started_at: data.started_at as string | undefined,
      completed_at: data.completed_at as string | undefined,
      items: data.checklist_items?.map((item: Record<string, unknown>) => ({
        id: item.id,
        checklist_id: item.checklist_id,
        category: item.category,
        question: item.question,
        description: item.description,
        order_index: item.order_index,
        status: item.status,
        completed_at: item.completed_at,
        completed_by: item.completed_by,
        answer: item.answer,
        evidence: item.evidence,
        is_required: item.is_required,
        validation_type: item.validation_type,
        validation_data: item.validation_data,
        weight: item.weight,
        score_impact: item.score_impact,
        dependencies: item.dependencies,
        auto_populate: item.auto_populate,
        data_source: item.data_source,
        ml_suggestion: item.ml_suggestion,
        confidence_score: item.confidence_score
      })) || []
    };
  }
}

// Export singleton instance
export const checklistEngine = new ChecklistEngine();