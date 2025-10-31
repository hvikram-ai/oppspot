/**
 * Evidence Linker - Evidence Type Resolver Registry
 *
 * Resolves evidence source IDs to rich metadata for display in the UI.
 * Supports 5 evidence types:
 * - document: Links to Data Room documents
 * - alert: Links to Alert system alerts
 * - kpi: Links to Analytics KPIs
 * - signal: Links to business signals
 * - news: Links to news items
 *
 * Pattern: Registry of resolvers, one per evidence type
 * Caching: 1-hour TTL for evidence metadata
 */

import { createClient } from '../../supabase/server';
import {
  RedFlagEvidence,
  EvidenceType,
  EvidenceMetadata,
  ResolvedEvidence,
  CitationData,
} from '../types';

/**
 * Evidence resolver interface
 * Each evidence type implements this to resolve source_id → metadata
 */
interface EvidenceResolver {
  type: EvidenceType;
  resolve(sourceId: string): Promise<EvidenceMetadata | null>;
}

/**
 * Document evidence resolver
 * Resolves document_id → document metadata from Data Room
 */
class DocumentEvidenceResolver implements EvidenceResolver {
  type: EvidenceType = 'document';

  async resolve(sourceId: string): Promise<EvidenceMetadata | null> {
    try {
      const supabase = await createClient();

      // Query documents table
      const { data: document, error } = await supabase
        .from('documents')
        .select('id, file_name, document_type, ai_classification, storage_path')
        .eq('id', sourceId)
        .single();

      if (error || !document) {
        console.warn(`[DocumentResolver] Document not found: ${sourceId}`);
        return null;
      }

      // Build citation
      const citation: CitationData = {
        type: 'document',
        documentId: document.id,
        pageNumber: 1, // Will be enriched from evidence.page_number if available
        chunkIndex: 0,
      };

      return {
        id: document.id,
        title: document.file_name,
        type: 'document',
        preview: `Document: ${document.file_name} (${document.document_type || 'Unknown type'})`,
        citation,
        url: `/data-room/documents/${document.id}`,
        available: true,
      };
    } catch (error) {
      console.error(`[DocumentResolver] Error resolving document ${sourceId}:`, error);
      return null;
    }
  }
}

/**
 * Alert evidence resolver
 * Resolves alert_id → alert metadata
 */
class AlertEvidenceResolver implements EvidenceResolver {
  type: EvidenceType = 'alert';

  async resolve(sourceId: string): Promise<EvidenceMetadata | null> {
    try {
      const supabase = await createClient();

      // Query alerts table
      const { data: alert, error } = await supabase
        .from('alerts')
        .select('id, title, description, severity, alert_type, created_at')
        .eq('id', sourceId)
        .single();

      if (error || !alert) {
        console.warn(`[AlertResolver] Alert not found: ${sourceId}`);
        return null;
      }

      const citation: CitationData = {
        type: 'alert',
        alertId: alert.id,
        severity: alert.severity,
      };

      return {
        id: alert.id,
        title: alert.title,
        type: 'alert',
        preview: alert.description || alert.title,
        citation,
        url: `/alerts/${alert.id}`,
        available: true,
      };
    } catch (error) {
      console.error(`[AlertResolver] Error resolving alert ${sourceId}:`, error);
      return null;
    }
  }
}

/**
 * KPI evidence resolver
 * Resolves kpi_id → KPI metadata
 */
class KPIEvidenceResolver implements EvidenceResolver {
  type: EvidenceType = 'kpi';

  async resolve(sourceId: string): Promise<EvidenceMetadata | null> {
    try {
      const supabase = await createClient();

      // Query market_metrics table (KPI storage)
      const { data: kpi, error } = await supabase
        .from('market_metrics')
        .select('id, metric_name, metric_value, metric_type, timestamp')
        .eq('id', sourceId)
        .single();

      if (error || !kpi) {
        console.warn(`[KPIResolver] KPI not found: ${sourceId}`);
        return null;
      }

      const citation: CitationData = {
        type: 'kpi',
        kpiId: kpi.id,
        value: parseFloat(kpi.metric_value),
        threshold: 0, // TODO: Get threshold from KPI config
      };

      return {
        id: kpi.id,
        title: kpi.metric_name,
        type: 'kpi',
        preview: `${kpi.metric_name}: ${kpi.metric_value}`,
        citation,
        url: `/analytics/kpis/${kpi.id}`,
        available: true,
      };
    } catch (error) {
      console.error(`[KPIResolver] Error resolving KPI ${sourceId}:`, error);
      return null;
    }
  }
}

/**
 * Signal evidence resolver
 * Resolves signal_id → business signal metadata
 */
class SignalEvidenceResolver implements EvidenceResolver {
  type: EvidenceType = 'signal';

  async resolve(sourceId: string): Promise<EvidenceMetadata | null> {
    try {
      // For now, signals are stored in market_metrics with signal_type
      // This is a simplified implementation
      const supabase = await createClient();

      const { data: signal, error } = await supabase
        .from('market_metrics')
        .select('id, metric_name, metric_value, metric_type')
        .eq('id', sourceId)
        .eq('metric_type', 'signal')
        .single();

      if (error || !signal) {
        console.warn(`[SignalResolver] Signal not found: ${sourceId}`);
        return null;
      }

      const citation: CitationData = {
        type: 'signal',
        signalId: signal.id,
        value: parseFloat(signal.metric_value),
      };

      return {
        id: signal.id,
        title: signal.metric_name,
        type: 'signal',
        preview: `Signal: ${signal.metric_name}`,
        citation,
        url: `/signals/${signal.id}`,
        available: true,
      };
    } catch (error) {
      console.error(`[SignalResolver] Error resolving signal ${sourceId}:`, error);
      return null;
    }
  }
}

/**
 * News evidence resolver
 * Resolves news_id → news article metadata
 */
class NewsEvidenceResolver implements EvidenceResolver {
  type: EvidenceType = 'news';

  async resolve(sourceId: string): Promise<EvidenceMetadata | null> {
    try {
      const supabase = await createClient();

      // Query research_sources table (news items stored here)
      const { data: news, error } = await supabase
        .from('research_sources')
        .select('id, source_type, title, url, published_at, content_preview')
        .eq('id', sourceId)
        .eq('source_type', 'news')
        .single();

      if (error || !news) {
        console.warn(`[NewsResolver] News item not found: ${sourceId}`);
        return null;
      }

      const citation: CitationData = {
        type: 'news',
        newsId: news.id,
        source: news.url || 'Unknown source',
        published_at: news.published_at,
      };

      return {
        id: news.id,
        title: news.title || 'News article',
        type: 'news',
        preview: news.content_preview || news.title || 'News article',
        citation,
        url: news.url || undefined,
        available: true,
      };
    } catch (error) {
      console.error(`[NewsResolver] Error resolving news ${sourceId}:`, error);
      return null;
    }
  }
}

/**
 * Evidence Linker - Main service
 *
 * Coordinates evidence resolution across all evidence types
 */
export class EvidenceLinker {
  private resolvers: Map<EvidenceType, EvidenceResolver>;
  private cache: Map<string, { metadata: EvidenceMetadata | null; timestamp: number }>;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor() {
    // Register resolvers for each evidence type
    this.resolvers = new Map();
    this.cache = new Map();

    this.registerResolver(new DocumentEvidenceResolver());
    this.registerResolver(new AlertEvidenceResolver());
    this.registerResolver(new KPIEvidenceResolver());
    this.registerResolver(new SignalEvidenceResolver());
    this.registerResolver(new NewsEvidenceResolver());
  }

  /**
   * Register a resolver for an evidence type
   */
  private registerResolver(resolver: EvidenceResolver): void {
    this.resolvers.set(resolver.type, resolver);
  }

  /**
   * Resolve evidence metadata for multiple evidence items
   * Batches resolution and handles unavailable sources gracefully
   */
  async resolveEvidence(evidence: RedFlagEvidence[]): Promise<ResolvedEvidence[]> {
    const resolved: ResolvedEvidence[] = [];

    // Resolve in parallel (batched by type for efficiency)
    const promises = evidence.map(async (item) => {
      const metadata = await this.resolveSingleEvidence(item);
      return {
        ...item,
        metadata: metadata || undefined,
      };
    });

    const results = await Promise.allSettled(promises);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        resolved.push(result.value);
      } else {
        console.error('[EvidenceLinker] Failed to resolve evidence:', result.reason);
      }
    }

    return resolved;
  }

  /**
   * Resolve a single evidence item
   */
  private async resolveSingleEvidence(
    evidence: RedFlagEvidence
  ): Promise<EvidenceMetadata | null> {
    if (!evidence.source_id) {
      return null;
    }

    // Check cache
    const cacheKey = `${evidence.evidence_type}:${evidence.source_id}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.metadata;
    }

    // Resolve using appropriate resolver
    const resolver = this.resolvers.get(evidence.evidence_type);
    if (!resolver) {
      console.warn(`[EvidenceLinker] No resolver for type: ${evidence.evidence_type}`);
      return null;
    }

    try {
      const metadata = await resolver.resolve(evidence.source_id);

      // Enrich citation with evidence-specific data
      if (metadata && metadata.citation) {
        metadata.citation = this.enrichCitation(metadata.citation, evidence);
      }

      // Cache the result
      this.cache.set(cacheKey, { metadata, timestamp: Date.now() });

      return metadata;
    } catch (error) {
      console.error(`[EvidenceLinker] Error resolving evidence ${evidence.id}:`, error);
      return null;
    }
  }

  /**
   * Enrich citation with evidence-specific data (page numbers, etc.)
   */
  private enrichCitation(
    citation: CitationData,
    evidence: RedFlagEvidence
  ): CitationData {
    // For document citations, add page/chunk info from evidence
    if (citation.type === 'document' && evidence.page_number !== null) {
      return {
        ...citation,
        pageNumber: evidence.page_number,
        chunkIndex: evidence.chunk_index || 0,
      };
    }

    return citation;
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Singleton instance
 */
let evidenceLinkerInstance: EvidenceLinker | null = null;

/**
 * Get evidence linker instance
 */
export function getEvidenceLinker(): EvidenceLinker {
  if (!evidenceLinkerInstance) {
    evidenceLinkerInstance = new EvidenceLinker();
  }
  return evidenceLinkerInstance;
}
