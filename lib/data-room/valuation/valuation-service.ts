/**
 * Valuation Service
 *
 * Main orchestrator for SaaS valuation model feature
 * Coordinates: financial extraction → calculation → storage → scenarios
 */

import { extractFinancials } from './ai/financial-extractor';
import {
  calculateRevenueMultiple,
  type RevenueMultipleCalculationInput,
} from './calculators/revenue-multiple';
import {
  createValuationModel,
  updateValuationStatus,
  updateValuationResults,
  getValuationModelById,
  listComparables,
  createScenario,
  updateScenarioResults,
  listScenarios,
} from './repository/valuation-repository';
import type {
  CreateValuationModelInput,
  ValuationCalculationResult,
  ExtractFinancialsInput,
  ScenarioType,
  ValuationModel,
  ValuationScenario,
} from './types';

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class ValuationService {
  /**
   * Generate complete valuation with extraction and calculation
   */
  async generateValuation(
    input: CreateValuationModelInput,
    userId: string
  ): Promise<ValuationCalculationResult> {
    const startTime = Date.now();

    try {
      // Step 1: Create valuation model record
      const model = await createValuationModel(input, userId);
      console.log(`[ValuationService] Created model ${model.id}`);

      // Step 2: Extract financials from documents (if provided)
      if (input.source_documents && input.source_documents.length > 0) {
        await updateValuationStatus(model.id, 'extracting');

        const extractionInput: ExtractFinancialsInput = {
          document_ids: input.source_documents,
          company_name: input.company_name,
          fiscal_year_end: input.fiscal_year_end,
          currency: input.currency,
        };

        const extracted = await extractFinancials(extractionInput, userId);

        if (extracted.success) {
          // Update model with extracted financials
          await this.updateModelWithExtractedFinancials(model.id, extracted);
          console.log(`[ValuationService] Extracted financials for ${model.id}`);
        } else {
          console.warn(`[ValuationService] Extraction failed: ${extracted.error_message}`);
        }
      }

      // Step 3: Calculate valuation
      await updateValuationStatus(model.id, 'calculating');

      // Fetch updated model (with extracted financials)
      const updatedModel = await getValuationModelById(model.id);
      if (!updatedModel) {
        throw new Error('Model not found after extraction');
      }

      // Get comparables for benchmarking
      const comparables = await listComparables(model.id);

      // Prepare calculation input
      const calculationInput: RevenueMultipleCalculationInput = {
        arr: updatedModel.arr || input.arr || 0,
        revenue_growth_rate: updatedModel.revenue_growth_rate,
        gross_margin: updatedModel.gross_margin,
        net_revenue_retention: updatedModel.net_revenue_retention,
        cac_payback_months: updatedModel.cac_payback_months,
        ebitda: updatedModel.ebitda,
        burn_rate: updatedModel.burn_rate,
        runway_months: updatedModel.runway_months,
        comparables,
        currency: updatedModel.currency,
      };

      // Calculate valuation
      const calculation = calculateRevenueMultiple(calculationInput);

      // Step 4: Store results
      await updateValuationResults(model.id, {
        revenue_multiple_low: calculation.multiple_low,
        revenue_multiple_mid: calculation.multiple_mid,
        revenue_multiple_high: calculation.multiple_high,
        estimated_valuation_low: calculation.valuation_low,
        estimated_valuation_mid: calculation.valuation_mid,
        estimated_valuation_high: calculation.valuation_high,
        valuation_confidence: calculation.confidence,
        data_quality_score: calculation.data_quality_score,
        ai_insights: calculation.ai_insights,
        ai_model: 'anthropic/claude-3.5-sonnet',
        ai_processing_time_ms: Date.now() - startTime,
        calculation_details: calculation.calculation_details,
      });

      console.log(`[ValuationService] Valuation complete for ${model.id}`);

      // Step 5: Generate default scenarios
      await this.generateDefaultScenarios(model.id, calculationInput);

      // Step 6: Return result
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        valuation_model_id: model.id,
        valuation_low: calculation.valuation_low,
        valuation_mid: calculation.valuation_mid,
        valuation_high: calculation.valuation_high,
        multiple_low: calculation.multiple_low,
        multiple_mid: calculation.multiple_mid,
        multiple_high: calculation.multiple_high,
        confidence: calculation.confidence,
        data_quality_score: calculation.data_quality_score,
        ai_insights: calculation.ai_insights!,
        calculation_details: calculation.calculation_details,
        processing_time_ms: processingTime,
        ai_model_used: 'anthropic/claude-3.5-sonnet',
      };
    } catch (error) {
      console.error('[ValuationService] Generation failed:', error);

      // Update model status to error if it exists
      if ('id' in input) {
        await updateValuationStatus(
          (input as { id: string }).id,
          'error',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }

      throw error;
    }
  }

  /**
   * Recalculate valuation with updated inputs
   */
  async recalculateValuation(
    modelId: string,
    updatedInputs?: Partial<RevenueMultipleCalculationInput>
  ): Promise<ValuationCalculationResult> {
    try {
      // Fetch existing model
      const model = await getValuationModelById(modelId);
      if (!model) {
        throw new Error('Valuation model not found');
      }

      await updateValuationStatus(modelId, 'calculating');

      // Get comparables
      const comparables = await listComparables(modelId);

      // Prepare calculation input (merge existing + updated)
      const calculationInput: RevenueMultipleCalculationInput = {
        arr: updatedInputs?.arr || model.arr || 0,
        revenue_growth_rate: updatedInputs?.revenue_growth_rate ?? model.revenue_growth_rate,
        gross_margin: updatedInputs?.gross_margin ?? model.gross_margin,
        net_revenue_retention: updatedInputs?.net_revenue_retention ?? model.net_revenue_retention,
        cac_payback_months: updatedInputs?.cac_payback_months ?? model.cac_payback_months,
        ebitda: updatedInputs?.ebitda ?? model.ebitda,
        burn_rate: updatedInputs?.burn_rate ?? model.burn_rate,
        runway_months: updatedInputs?.runway_months ?? model.runway_months,
        comparables,
        currency: model.currency,
      };

      // Calculate
      const calculation = calculateRevenueMultiple(calculationInput);

      // Store results
      await updateValuationResults(modelId, {
        revenue_multiple_low: calculation.multiple_low,
        revenue_multiple_mid: calculation.multiple_mid,
        revenue_multiple_high: calculation.multiple_high,
        estimated_valuation_low: calculation.valuation_low,
        estimated_valuation_mid: calculation.valuation_mid,
        estimated_valuation_high: calculation.valuation_high,
        valuation_confidence: calculation.confidence,
        data_quality_score: calculation.data_quality_score,
        ai_insights: calculation.ai_insights,
        calculation_details: calculation.calculation_details,
      });

      return {
        success: true,
        valuation_model_id: modelId,
        valuation_low: calculation.valuation_low,
        valuation_mid: calculation.valuation_mid,
        valuation_high: calculation.valuation_high,
        multiple_low: calculation.multiple_low,
        multiple_mid: calculation.multiple_mid,
        multiple_high: calculation.multiple_high,
        confidence: calculation.confidence,
        data_quality_score: calculation.data_quality_score,
        ai_insights: calculation.ai_insights!,
        calculation_details: calculation.calculation_details,
        processing_time_ms: 0,
        ai_model_used: 'anthropic/claude-3.5-sonnet',
      };
    } catch (error) {
      console.error('[ValuationService] Recalculation failed:', error);
      throw error;
    }
  }

  /**
   * Generate default scenarios (optimistic, base, pessimistic)
   */
  private async generateDefaultScenarios(
    modelId: string,
    baseInputs: RevenueMultipleCalculationInput
  ): Promise<void> {
    try {
      const scenarios: Array<{
        type: ScenarioType;
        name: string;
        multipliers: Record<string, number>;
      }> = [
        {
          type: 'optimistic',
          name: 'Optimistic Case',
          multipliers: {
            revenue_growth_rate: 1.3, // +30%
            gross_margin: 1.1, // +10%
            net_revenue_retention: 1.1, // +10%
          },
        },
        {
          type: 'base',
          name: 'Base Case',
          multipliers: {}, // No adjustments - use current values
        },
        {
          type: 'pessimistic',
          name: 'Pessimistic Case',
          multipliers: {
            revenue_growth_rate: 0.7, // -30%
            gross_margin: 0.9, // -10%
            net_revenue_retention: 0.9, // -10%
          },
        },
      ];

      for (const scenario of scenarios) {
        // Build adjusted assumptions
        const assumptions: Record<string, number> = {
          arr: baseInputs.arr,
        };

        // Apply multipliers to create scenario assumptions
        Object.keys(baseInputs).forEach((key) => {
          const value = baseInputs[key as keyof RevenueMultipleCalculationInput];
          if (typeof value === 'number') {
            const multiplier = scenario.multipliers[key] || 1.0;
            assumptions[key] = value * multiplier;
          }
        });

        // Calculate scenario valuation
        const scenarioCalc = calculateRevenueMultiple({
          ...baseInputs,
          ...assumptions,
        });

        // Create scenario record
        const scenarioRecord = await createScenario({
          valuation_model_id: modelId,
          scenario_name: scenario.name,
          scenario_type: scenario.type,
          description: `${scenario.name} with adjusted assumptions`,
          assumptions,
          probability: scenario.type === 'base' ? 0.6 : scenario.type === 'optimistic' ? 0.2 : 0.2,
        });

        // Update with calculated results
        await updateScenarioResults(scenarioRecord.id, {
          revenue_multiple: scenarioCalc.multiple_mid,
          estimated_valuation: scenarioCalc.valuation_mid,
          upside_downside:
            ((scenarioCalc.valuation_mid - baseInputs.arr * scenarioCalc.multiple_mid) /
              (baseInputs.arr * scenarioCalc.multiple_mid)) *
            100,
        });
      }

      console.log(`[ValuationService] Generated default scenarios for ${modelId}`);
    } catch (error) {
      console.error('[ValuationService] Scenario generation failed:', error);
      // Non-fatal - continue even if scenarios fail
    }
  }

  /**
   * Update model with extracted financials
   */
  private async updateModelWithExtractedFinancials(
    modelId: string,
    extracted: Awaited<ReturnType<typeof extractFinancials>>
  ): Promise<void> {
    try {
      const supabase = await (await import('@/lib/supabase/server')).createClient();

      await supabase
        .from('saas_valuation_models')
        .update({
          arr: extracted.arr,
          mrr: extracted.mrr,
          revenue_growth_rate: extracted.revenue_growth_rate,
          gross_margin: extracted.gross_margin,
          net_revenue_retention: extracted.net_revenue_retention,
          cac_payback_months: extracted.cac_payback_months,
          burn_rate: extracted.burn_rate,
          runway_months: extracted.runway_months,
          ebitda: extracted.ebitda,
          employees: extracted.employees,
          data_quality_score: extracted.data_quality_score,
          extraction_method: extracted.extraction_method,
        })
        .eq('id', modelId);
    } catch (error) {
      console.error('[ValuationService] Update with extracted financials failed:', error);
      throw error;
    }
  }

  /**
   * Calculate scenario with custom assumptions
   */
  async calculateScenario(
    modelId: string,
    assumptions: Record<string, number>
  ): Promise<ValuationScenario> {
    try {
      // Fetch base model
      const model = await getValuationModelById(modelId);
      if (!model) {
        throw new Error('Valuation model not found');
      }

      // Get comparables
      const comparables = await listComparables(modelId);

      // Build input with custom assumptions
      const calculationInput: RevenueMultipleCalculationInput = {
        arr: assumptions.arr || model.arr || 0,
        revenue_growth_rate: assumptions.revenue_growth_rate ?? model.revenue_growth_rate,
        gross_margin: assumptions.gross_margin ?? model.gross_margin,
        net_revenue_retention: assumptions.net_revenue_retention ?? model.net_revenue_retention,
        cac_payback_months: assumptions.cac_payback_months ?? model.cac_payback_months,
        ebitda: assumptions.ebitda ?? model.ebitda,
        burn_rate: assumptions.burn_rate ?? model.burn_rate,
        runway_months: assumptions.runway_months ?? model.runway_months,
        comparables,
        currency: model.currency,
      };

      // Calculate
      const calculation = calculateRevenueMultiple(calculationInput);

      // Create scenario
      const scenario = await createScenario({
        valuation_model_id: modelId,
        scenario_name: 'Custom Scenario',
        scenario_type: 'custom',
        description: 'User-defined custom scenario',
        assumptions,
      });

      // Update with results
      const baseValuation = model.estimated_valuation_mid || 0;
      const upsideDownside =
        baseValuation > 0 ? ((calculation.valuation_mid - baseValuation) / baseValuation) * 100 : 0;

      await updateScenarioResults(scenario.id, {
        revenue_multiple: calculation.multiple_mid,
        estimated_valuation: calculation.valuation_mid,
        upside_downside: upsideDownside,
      });

      // Return updated scenario
      const scenarios = await listScenarios(modelId);
      const updatedScenario = scenarios.find((s) => s.id === scenario.id);

      if (!updatedScenario) {
        throw new Error('Scenario not found after creation');
      }

      return updatedScenario;
    } catch (error) {
      console.error('[ValuationService] Scenario calculation failed:', error);
      throw error;
    }
  }

  /**
   * Get valuation summary for quick display
   */
  async getValuationSummary(modelId: string): Promise<{
    model_name: string;
    company_name: string;
    valuation_range: string;
    valuation_mid: number;
    currency: string;
    confidence: number;
    status: ValuationModel['status'];
    created_at: string;
  }> {
    try {
      const model = await getValuationModelById(modelId);
      if (!model) {
        throw new Error('Valuation model not found');
      }

      const currencySymbol = model.currency === 'GBP' ? '£' : model.currency === 'EUR' ? '€' : '$';

      const formatValue = (value: number) => {
        if (value >= 1000000) {
          return `${currencySymbol}${(value / 1000000).toFixed(0)}M`;
        } else if (value >= 1000) {
          return `${currencySymbol}${(value / 1000).toFixed(0)}K`;
        } else {
          return `${currencySymbol}${value.toFixed(0)}`;
        }
      };

      const valuationRange =
        model.estimated_valuation_low && model.estimated_valuation_high
          ? `${formatValue(model.estimated_valuation_low)}-${formatValue(model.estimated_valuation_high)}`
          : 'Not calculated';

      return {
        model_name: model.model_name,
        company_name: model.company_name,
        valuation_range: valuationRange,
        valuation_mid: model.estimated_valuation_mid || 0,
        currency: model.currency,
        confidence: model.valuation_confidence || 0,
        status: model.status,
        created_at: model.created_at,
      };
    } catch (error) {
      console.error('[ValuationService] Get summary failed:', error);
      throw error;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: ValuationService | null = null;

export function getValuationService(): ValuationService {
  if (!instance) {
    instance = new ValuationService();
  }
  return instance;
}
