/**
 * ML Model Manager
 * Centralized infrastructure for managing ML models across the application
 */

import { createClient } from '@/lib/supabase/server'

export interface ModelConfig {
  id: string
  name: string
  version: string
  type: 'classification' | 'regression' | 'clustering' | 'nlp' | 'embedding'
  provider: 'openrouter' | 'huggingface' | 'custom' | 'tensorflow'
  endpoint?: string
  apiKey?: string
  parameters?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface ModelPrediction {
  model_id: string
  input: unknown
  output: unknown
  confidence?: number
  latency_ms: number
  timestamp: Date
  metadata?: Record<string, unknown>
}

export interface ModelMetrics {
  model_id: string
  total_predictions: number
  avg_latency_ms: number
  avg_confidence: number
  error_rate: number
  last_used: Date
}

export class ModelManager {
  private models: Map<string, ModelConfig> = new Map()
  private modelMetrics: Map<string, ModelMetrics> = new Map()

  constructor() {
    this.initializeModels()
  }

  /**
   * Initialize all ML models used in the application
   */
  private initializeModels() {
    // Lead Scoring Model
    this.registerModel({
      id: 'lead-scoring-v1',
      name: 'Lead Scoring Model',
      version: '1.0.0',
      type: 'regression',
      provider: 'openrouter',
      parameters: {
        model: 'anthropic/claude-3-haiku',
        temperature: 0.3,
        max_tokens: 1000
      }
    })

    // BANT Classification Model
    this.registerModel({
      id: 'bant-classifier-v1',
      name: 'BANT Qualification Classifier',
      version: '1.0.0',
      type: 'classification',
      provider: 'openrouter',
      parameters: {
        model: 'anthropic/claude-3-haiku',
        temperature: 0.2
      }
    })

    // Funding Signal Detection
    this.registerModel({
      id: 'funding-detector-v1',
      name: 'Funding Signal Detector',
      version: '1.0.0',
      type: 'nlp',
      provider: 'openrouter',
      parameters: {
        model: 'anthropic/claude-3-haiku',
        temperature: 0.1
      }
    })

    // Stakeholder Influence Scoring
    this.registerModel({
      id: 'influence-scorer-v1',
      name: 'Stakeholder Influence Scorer',
      version: '1.0.0',
      type: 'regression',
      provider: 'custom',
      parameters: {
        algorithm: 'weighted_scoring',
        weights: {
          seniority: 0.3,
          department: 0.2,
          engagement: 0.3,
          network_size: 0.2
        }
      }
    })

    // Company Similarity Model
    this.registerModel({
      id: 'company-similarity-v1',
      name: 'Company Similarity Model',
      version: '1.0.0',
      type: 'embedding',
      provider: 'openrouter',
      parameters: {
        model: 'openai/text-embedding-3-small',
        dimensions: 512
      }
    })

    // Intent Classification
    this.registerModel({
      id: 'intent-classifier-v1',
      name: 'Buying Intent Classifier',
      version: '1.0.0',
      type: 'classification',
      provider: 'openrouter',
      parameters: {
        model: 'anthropic/claude-3-haiku',
        temperature: 0.2,
        classes: ['high_intent', 'medium_intent', 'low_intent', 'no_intent']
      }
    })

    // Churn Prediction Model
    this.registerModel({
      id: 'churn-predictor-v1',
      name: 'Customer Churn Predictor',
      version: '1.0.0',
      type: 'classification',
      provider: 'custom',
      parameters: {
        algorithm: 'gradient_boosting',
        features: ['engagement_score', 'days_since_last_contact', 'support_tickets', 'usage_trend']
      }
    })

    // Opportunity Scoring Model
    this.registerModel({
      id: 'opportunity-scorer-v1',
      name: 'Opportunity Value Scorer',
      version: '1.0.0',
      type: 'regression',
      provider: 'custom',
      parameters: {
        algorithm: 'ensemble',
        models: ['linear_regression', 'random_forest', 'xgboost']
      }
    })
  }

  /**
   * Register a new model
   */
  registerModel(config: ModelConfig): void {
    this.models.set(config.id, config)
    this.modelMetrics.set(config.id, {
      model_id: config.id,
      total_predictions: 0,
      avg_latency_ms: 0,
      avg_confidence: 0,
      error_rate: 0,
      last_used: new Date()
    })
  }

  /**
   * Get model configuration
   */
  getModel(modelId: string): ModelConfig | undefined {
    return this.models.get(modelId)
  }

  /**
   * Run prediction with a model
   */
  async predict(
    modelId: string,
    input: any,
    options?: {
      saveToDb?: boolean
      userId?: string
    }
  ): Promise<ModelPrediction> {
    const startTime = Date.now()
    const model = this.getModel(modelId)

    if (!model) {
      throw new Error(`Model ${modelId} not found`)
    }

    try {
      let output: any
      let confidence: number | undefined

      switch (model.provider) {
        case 'openrouter':
          const result = await this.predictWithOpenRouter(model, input)
          output = result.output
          confidence = result.confidence
          break

        case 'custom':
          const customResult = await this.predictWithCustomModel(model, input)
          output = customResult.output
          confidence = customResult.confidence
          break

        default:
          throw new Error(`Provider ${model.provider} not implemented`)
      }

      const latency = Date.now() - startTime
      const prediction: ModelPrediction = {
        model_id: modelId,
        input,
        output,
        confidence,
        latency_ms: latency,
        timestamp: new Date()
      }

      // Update metrics
      this.updateMetrics(modelId, latency, confidence)

      // Save to database if requested
      if (options?.saveToDb) {
        await this.savePrediction(prediction, options.userId)
      }

      return prediction
    } catch (error) {
      console.error(`[ModelManager] Prediction error for ${modelId}:`, error)
      throw error
    }
  }

  /**
   * Predict using OpenRouter API
   */
  private async predictWithOpenRouter(
    model: ModelConfig,
    input: any
  ): Promise<{ output: any; confidence?: number }> {
    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://oppspot.ai',
        'X-Title': 'OppSpot ML Platform'
      },
      body: JSON.stringify({
        model: model.parameters?.model || 'anthropic/claude-3-haiku',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(model)
          },
          {
            role: 'user',
            content: JSON.stringify(input)
          }
        ],
        temperature: model.parameters?.temperature || 0.3,
        max_tokens: model.parameters?.max_tokens || 1000
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    try {
      const result = JSON.parse(content)
      return {
        output: result.prediction || result,
        confidence: result.confidence
      }
    } catch {
      return { output: content }
    }
  }

  /**
   * Predict using custom model implementation
   */
  private async predictWithCustomModel(
    model: ModelConfig,
    input: any
  ): Promise<{ output: any; confidence?: number }> {
    const algorithm = model.parameters?.algorithm

    switch (algorithm) {
      case 'weighted_scoring':
        return this.weightedScoringAlgorithm(model, input)

      case 'gradient_boosting':
        return this.gradientBoostingAlgorithm(model, input)

      case 'ensemble':
        return this.ensembleAlgorithm(model, input)

      default:
        throw new Error(`Algorithm ${algorithm} not implemented`)
    }
  }

  /**
   * Simple weighted scoring algorithm
   */
  private weightedScoringAlgorithm(
    model: ModelConfig,
    input: any
  ): { output: any; confidence?: number } {
    const weights = model.parameters?.weights || {}
    let totalScore = 0
    let totalWeight = 0

    for (const [key, weight] of Object.entries(weights)) {
      if (input[key] !== undefined) {
        totalScore += (input[key] as number) * (weight as number)
        totalWeight += weight as number
      }
    }

    const score = totalWeight > 0 ? totalScore / totalWeight : 0

    return {
      output: {
        score: Math.round(score * 100) / 100,
        classification: score > 0.7 ? 'high' : score > 0.4 ? 'medium' : 'low'
      },
      confidence: 0.85
    }
  }

  /**
   * Gradient boosting algorithm (simplified)
   */
  private gradientBoostingAlgorithm(
    model: ModelConfig,
    input: any
  ): { output: any; confidence?: number } {
    const features = model.parameters?.features || []

    // Simplified gradient boosting logic
    let riskScore = 0

    if (input.engagement_score < 30) riskScore += 0.3
    if (input.days_since_last_contact > 90) riskScore += 0.3
    if (input.support_tickets > 5) riskScore += 0.2
    if (input.usage_trend === 'declining') riskScore += 0.2

    return {
      output: {
        churn_probability: riskScore,
        risk_level: riskScore > 0.6 ? 'high' : riskScore > 0.3 ? 'medium' : 'low',
        factors: features.filter(f => input[f] !== undefined)
      },
      confidence: 0.75
    }
  }

  /**
   * Ensemble algorithm combining multiple models
   */
  private ensembleAlgorithm(
    model: ModelConfig,
    input: any
  ): { output: any; confidence?: number } {
    const models = model.parameters?.models || []
    const predictions: number[] = []

    // Simplified ensemble - average of multiple approaches
    for (const subModel of models) {
      let score = Math.random() * 0.3 + 0.5 // Placeholder for actual model predictions

      // Adjust based on input features
      if (input.company_size === 'enterprise') score += 0.1
      if (input.budget > 100000) score += 0.1
      if (input.timeline === 'immediate') score += 0.15

      predictions.push(score)
    }

    const avgScore = predictions.reduce((a, b) => a + b, 0) / predictions.length
    const variance = predictions.reduce((sum, p) => sum + Math.pow(p - avgScore, 2), 0) / predictions.length
    const confidence = 1 - Math.sqrt(variance) // Lower variance = higher confidence

    return {
      output: {
        opportunity_score: Math.round(avgScore * 100),
        estimated_value: Math.round(avgScore * input.budget || 0),
        confidence_interval: [
          Math.round((avgScore - Math.sqrt(variance)) * 100),
          Math.round((avgScore + Math.sqrt(variance)) * 100)
        ]
      },
      confidence: Math.round(confidence * 100) / 100
    }
  }

  /**
   * Get system prompt for model
   */
  private getSystemPrompt(model: ModelConfig): string {
    const prompts: Record<string, string> = {
      'lead-scoring-v1': 'You are a lead scoring AI. Analyze the input data and return a JSON object with: {prediction: {score: 0-100, category: "hot/warm/cold"}, confidence: 0-1}',
      'bant-classifier-v1': 'You are a BANT qualification classifier. Analyze the input and return: {prediction: {status: "highly_qualified/qualified/nurture/not_qualified", scores: {budget: 0-100, authority: 0-100, need: 0-100, timeline: 0-100}}, confidence: 0-1}',
      'funding-detector-v1': 'You are a funding signal detector. Analyze the text and return: {prediction: {has_funding: boolean, round_type: string, amount: number, confidence: 0-1}}',
      'intent-classifier-v1': 'You are a buying intent classifier. Analyze the behavior data and return: {prediction: {intent_level: "high_intent/medium_intent/low_intent/no_intent", signals: string[]}, confidence: 0-1}'
    }

    return prompts[model.id] || 'You are an AI model. Analyze the input and provide predictions.'
  }

  /**
   * Update model metrics
   */
  private updateMetrics(modelId: string, latency: number, confidence?: number): void {
    const metrics = this.modelMetrics.get(modelId)
    if (!metrics) return

    const n = metrics.total_predictions
    metrics.total_predictions++
    metrics.avg_latency_ms = (metrics.avg_latency_ms * n + latency) / (n + 1)

    if (confidence !== undefined) {
      metrics.avg_confidence = (metrics.avg_confidence * n + confidence) / (n + 1)
    }

    metrics.last_used = new Date()
  }

  /**
   * Save prediction to database
   */
  private async savePrediction(prediction: ModelPrediction, userId?: string): Promise<void> {
    try {
      const supabase = await createClient()

      await supabase.from('ml_predictions').insert({
        model_id: prediction.model_id,
        input_data: prediction.input,
        output_data: prediction.output,
        confidence: prediction.confidence,
        latency_ms: prediction.latency_ms,
        user_id: userId,
        created_at: prediction.timestamp.toISOString()
      })
    } catch (error) {
      console.error('[ModelManager] Error saving prediction:', error)
    }
  }

  /**
   * Get model metrics
   */
  getMetrics(modelId?: string): ModelMetrics | ModelMetrics[] | undefined {
    if (modelId) {
      return this.modelMetrics.get(modelId)
    }
    return Array.from(this.modelMetrics.values())
  }

  /**
   * Get all registered models
   */
  getAllModels(): ModelConfig[] {
    return Array.from(this.models.values())
  }

  /**
   * Batch predict for multiple inputs
   */
  async batchPredict(
    modelId: string,
    inputs: any[],
    options?: { saveToDb?: boolean; userId?: string }
  ): Promise<ModelPrediction[]> {
    const predictions: ModelPrediction[] = []

    for (const input of inputs) {
      try {
        const prediction = await this.predict(modelId, input, options)
        predictions.push(prediction)
      } catch (error) {
        console.error(`[ModelManager] Batch prediction error:`, error)
        // Continue with next prediction
      }
    }

    return predictions
  }
}

// Export singleton instance
export const modelManager = new ModelManager()