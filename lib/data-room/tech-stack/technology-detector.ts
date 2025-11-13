/**
 * Technology Detector
 * AI-powered technology detection and classification from document text
 */

import { createLLMManager, type LLMManager } from '@/lib/llm/manager/LLMManager';
import {
  TechCategory,
  TechAuthenticity,
  TechStackTechnology,
} from '../types';
import {
  ALL_TECHNOLOGIES,
  searchTechnologies,
  findTechnology,
  hasGPTWrapperIndicators,
  hasProprietaryAIIndicators,
  TechnologyDefinition,
} from './tech-database';

export interface TechnologyDetectionResult {
  name: string;
  category: TechCategory;
  version: string | null;
  authenticity: TechAuthenticity | null;
  confidence_score: number; // 0-1
  risk_score: number | null; // 0-100
  is_outdated: boolean;
  is_deprecated: boolean;
  has_security_issues: boolean;
  security_details: string | null;
  ai_reasoning: string;
  ai_confidence: number;
  license_type: string | null;
  excerpt_text: string; // The text excerpt where this was found
}

export interface DocumentTechnologyAnalysis {
  document_id: string;
  document_filename: string;
  technologies: TechnologyDetectionResult[];
  wrapper_indicators: {
    is_likely_wrapper: boolean;
    indicators: string[];
    confidence: number;
  };
  proprietary_indicators: {
    is_likely_proprietary: boolean;
    indicators: string[];
    confidence: number;
  };
  analysis_time_ms: number;
}

/**
 * TechnologyDetector - AI-powered technology detection
 */
export class TechnologyDetector {
  private llmManager: LLMManager | null = null;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Initialize LLM manager (lazy initialization)
   */
  private async ensureLLMManager(): Promise<LLMManager> {
    if (!this.llmManager) {
      this.llmManager = await createLLMManager({
        userId: this.userId,
        enableFallback: true,
        enableCaching: true,
        enableUsageTracking: true,
      });
    }
    return this.llmManager;
  }

  /**
   * Analyze a document for technologies
   */
  async analyzeDocument(
    documentId: string,
    filename: string,
    text: string
  ): Promise<DocumentTechnologyAnalysis> {
    const startTime = Date.now();

    // Step 1: Pattern-based detection for quick wins
    const patternMatches = searchTechnologies(text);

    // Step 2: AI-powered detection for nuanced analysis
    const aiDetections = await this.detectTechnologiesWithAI(text);

    // Step 3: Merge and deduplicate results
    const technologies = this.mergeTechnologyDetections(patternMatches, aiDetections, text);

    // Step 4: Check for wrapper vs proprietary indicators (AI/ML only)
    const wrapperCheck = hasGPTWrapperIndicators(text);
    const proprietaryCheck = hasProprietaryAIIndicators(text);

    const analysisTime = Date.now() - startTime;

    return {
      document_id: documentId,
      document_filename: filename,
      technologies,
      wrapper_indicators: wrapperCheck,
      proprietary_indicators: proprietaryCheck,
      analysis_time_ms: analysisTime,
    };
  }

  /**
   * Detect technologies using AI (Claude Sonnet 3.5)
   */
  private async detectTechnologiesWithAI(text: string): Promise<TechnologyDetectionResult[]> {
    const prompt = `You are a technical due diligence expert analyzing a company's technology stack.

Analyze the following text and identify ALL technologies mentioned, including:
- Programming languages
- Frameworks and libraries
- Databases
- Infrastructure and cloud services
- DevOps tools
- ML/AI technologies (IMPORTANT: distinguish between proprietary models and API wrappers)
- Testing frameworks
- Monitoring tools

For EACH technology found, provide:
1. Name (exact, official name)
2. Category (frontend/backend/database/infrastructure/devops/ml_ai/security/testing/monitoring/other)
3. Version (if mentioned, otherwise null)
4. Authenticity (for ML/AI only: proprietary/wrapper/hybrid/third_party/unknown)
5. Confidence (0.0-1.0 - how confident are you this technology is used?)
6. Risk score (0-100 - based on security issues, age, deprecation status)
7. Is outdated (true/false)
8. Is deprecated (true/false)
9. Has security issues (true/false)
10. Security details (specific vulnerabilities or concerns, if any)
11. License type (if known)
12. Reasoning (brief explanation of why you identified this and assigned these scores)
13. Excerpt (the exact text snippet where you found evidence of this technology)

CRITICAL: For AI/ML technologies:
- "wrapper" = Company just calls OpenAI/Claude/etc APIs without custom models
- "proprietary" = Company has custom models, training pipelines, fine-tuning
- "hybrid" = Mix of both
- "third_party" = Uses open-source models (LLaMA, Mistral, etc.)

Look for evidence like:
- WRAPPER indicators: "openai.ChatCompletion", "OPENAI_API_KEY", simple prompt engineering
- PROPRIETARY indicators: "model training", "fine-tuning", "custom architecture", "training data"

Text to analyze:
${text.substring(0, 8000)} ${text.length > 8000 ? '...(truncated)' : ''}

Respond with a JSON array of detected technologies. If no technologies found, return empty array.

IMPORTANT: Return ONLY valid JSON, no markdown formatting.

Example format:
[
  {
    "name": "React",
    "category": "frontend",
    "version": "18.2.0",
    "authenticity": null,
    "confidence": 0.95,
    "risk_score": 10,
    "is_outdated": false,
    "is_deprecated": false,
    "has_security_issues": false,
    "security_details": null,
    "license_type": "MIT",
    "reasoning": "Found React imports and JSX syntax throughout the codebase",
    "excerpt": "import React from 'react'; ... <Component />"
  },
  {
    "name": "OpenAI GPT",
    "category": "ml_ai",
    "version": "gpt-4",
    "authenticity": "wrapper",
    "confidence": 0.90,
    "risk_score": 60,
    "is_outdated": false,
    "is_deprecated": false,
    "has_security_issues": false,
    "security_details": null,
    "license_type": null,
    "reasoning": "Direct OpenAI API calls without custom model training, indicating a wrapper approach",
    "excerpt": "const response = await openai.chat.completions.create({ model: 'gpt-4' })"
  }
]`;

    try {
      const llmManager = await this.ensureLLMManager();
      const response = await llmManager.chat(
        [{ role: 'user', content: prompt }],
        {
          model: 'anthropic/claude-3.5-sonnet',
          maxTokens: 4000,
          temperature: 0.1, // Low temperature for consistent output
        }
      );

      // Parse AI response
      const content = response.content.trim();

      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) ||
                       content.match(/(\[[\s\S]*\])/);

      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      const aiDetections = JSON.parse(jsonStr);

      // Validate and normalize AI results
      return aiDetections.map((detection: any) => ({
        name: detection.name,
        category: detection.category as TechCategory,
        version: detection.version || null,
        authenticity: detection.authenticity || null,
        confidence_score: Math.min(Math.max(detection.confidence || 0, 0), 1),
        risk_score: detection.risk_score !== null ? Math.min(Math.max(detection.risk_score, 0), 100) : null,
        is_outdated: detection.is_outdated || false,
        is_deprecated: detection.is_deprecated || false,
        has_security_issues: detection.has_security_issues || false,
        security_details: detection.security_details || null,
        license_type: detection.license_type || null,
        ai_reasoning: detection.reasoning || '',
        ai_confidence: Math.round((detection.confidence || 0) * 100),
        excerpt_text: detection.excerpt ? detection.excerpt.substring(0, 500) : '',
      }));
    } catch (error) {
      console.error('[TechnologyDetector] AI detection failed:', error);
      // Return empty array on error - pattern matching still works
      return [];
    }
  }

  /**
   * Merge pattern-based and AI-based detections
   */
  private mergeTechnologyDetections(
    patternMatches: TechnologyDefinition[],
    aiDetections: TechnologyDetectionResult[],
    fullText: string
  ): TechnologyDetectionResult[] {
    const merged = new Map<string, TechnologyDetectionResult>();

    // Add AI detections first (higher priority as they include reasoning)
    for (const detection of aiDetections) {
      const key = `${detection.name.toLowerCase()}_${detection.category}`;
      merged.set(key, detection);
    }

    // Add pattern matches if not already detected by AI
    for (const tech of patternMatches) {
      const key = `${tech.name.toLowerCase()}_${tech.category}`;

      if (!merged.has(key)) {
        // Find excerpt from full text
        const excerpt = this.findExcerpt(fullText, tech.patterns[0]);

        merged.set(key, {
          name: tech.name,
          category: tech.category,
          version: null,
          authenticity: tech.typical_authenticity || null,
          confidence_score: 0.7, // Lower confidence for pattern-only matches
          risk_score: tech.risk_indicators?.default_risk_score || null,
          is_outdated: false,
          is_deprecated: tech.deprecation_info?.is_deprecated || false,
          has_security_issues: (tech.risk_indicators?.security_issues?.length || 0) > 0,
          security_details: tech.risk_indicators?.security_issues?.join(', ') || null,
          license_type: tech.license_info?.typical_license || null,
          ai_reasoning: 'Detected via pattern matching',
          ai_confidence: 70,
          excerpt_text: excerpt,
        });
      } else {
        // Enhance existing detection with knowledge base data
        const existing = merged.get(key)!;

        // Fill in missing fields from knowledge base
        if (!existing.risk_score && tech.risk_indicators?.default_risk_score) {
          existing.risk_score = tech.risk_indicators.default_risk_score;
        }
        if (!existing.license_type && tech.license_info?.typical_license) {
          existing.license_type = tech.license_info.typical_license;
        }
        if (!existing.is_deprecated && tech.deprecation_info?.is_deprecated) {
          existing.is_deprecated = true;
        }
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Find an excerpt from text matching a pattern
   */
  private findExcerpt(text: string, pattern: string): string {
    try {
      const regex = new RegExp(`(.{0,50}${pattern}.{0,50})`, 'i');
      const match = text.match(regex);
      if (match) {
        return match[1].trim().substring(0, 200);
      }
    } catch {
      // Regex error, try simple substring
      const index = text.toLowerCase().indexOf(pattern.toLowerCase());
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + 100);
        return text.substring(start, end).trim();
      }
    }
    return '';
  }

  /**
   * Classify AI authenticity based on analysis
   */
  classifyAIAuthenticity(
    technologies: TechnologyDetectionResult[],
    wrapperIndicators: { is_likely_wrapper: boolean; confidence: number },
    proprietaryIndicators: { is_likely_proprietary: boolean; confidence: number }
  ): TechAuthenticity {
    const aiTechnologies = technologies.filter((t) => t.category === 'ml_ai');

    if (aiTechnologies.length === 0) {
      return 'unknown';
    }

    // If AI explicitly detected wrapper patterns
    const hasWrapperTech = aiTechnologies.some((t) => t.authenticity === 'wrapper');
    const hasProprietaryTech = aiTechnologies.some((t) => t.authenticity === 'proprietary');

    // Combine AI detections with pattern analysis
    if (hasProprietaryTech && proprietaryIndicators.is_likely_proprietary) {
      if (hasWrapperTech || wrapperIndicators.is_likely_wrapper) {
        return 'hybrid'; // Both proprietary and wrapper elements
      }
      return 'proprietary';
    }

    if (hasWrapperTech || wrapperIndicators.is_likely_wrapper) {
      return 'wrapper';
    }

    // Check if using only third-party open source
    const allThirdParty = aiTechnologies.every(
      (t) => t.authenticity === 'third_party' || t.name.includes('LLaMA') || t.name.includes('Mistral')
    );
    if (allThirdParty) {
      return 'third_party';
    }

    return 'unknown';
  }

  /**
   * Calculate overall AI authenticity score (0-100)
   * 100 = Fully proprietary, 0 = Pure GPT wrapper
   */
  calculateAIAuthenticityScore(
    technologies: TechnologyDetectionResult[],
    overallAuthenticity: TechAuthenticity,
    proprietaryIndicators: { confidence: number }
  ): number {
    switch (overallAuthenticity) {
      case 'proprietary':
        return Math.min(90 + proprietaryIndicators.confidence / 10, 100);
      case 'hybrid':
        return 60;
      case 'third_party':
        return 40;
      case 'wrapper':
        return 10;
      case 'unknown':
      default:
        return 50;
    }
  }

  /**
   * Batch analyze multiple documents
   */
  async analyzeDocuments(
    documents: Array<{ id: string; filename: string; text: string }>
  ): Promise<DocumentTechnologyAnalysis[]> {
    const results: DocumentTechnologyAnalysis[] = [];

    // Process documents sequentially to avoid rate limits
    for (const doc of documents) {
      try {
        const analysis = await this.analyzeDocument(doc.id, doc.filename, doc.text);
        results.push(analysis);

        // Small delay to avoid rate limits (500ms between requests)
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(
          `[TechnologyDetector] Failed to analyze document ${doc.filename}:`,
          error
        );
        // Continue with next document
      }
    }

    return results;
  }
}
