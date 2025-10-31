/**
 * ESG PDF Report Generator
 * Uses @react-pdf/renderer to create comprehensive ESG reports
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { ESGScore, ESGMetric, ESGCategory } from '@/types/esg';

// Register fonts (optional - using default fonts)
// Font.register({ family: 'Roboto', src: '...' });

// PDF Styles
const styles = StyleSheet.create({
  // Page Styles
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },

  // Cover Page
  coverPage: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1e3a8a',
  },
  coverSubtitle: {
    fontSize: 18,
    marginBottom: 10,
    color: '#64748b',
  },
  coverCompany: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 10,
  },
  coverYear: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 60,
  },
  coverFooter: {
    position: 'absolute',
    bottom: 40,
    fontSize: 10,
    color: '#94a3b8',
  },

  // Header & Footer
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
  },
  headerTitle: {
    fontSize: 10,
    color: '#64748b',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 10,
    color: '#94a3b8',
  },

  // Section Styles
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
    paddingBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
    color: '#475569',
  },

  // Executive Summary
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    width: '30%',
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
  },
  summaryCardTitle: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  summaryScore: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  summaryLevel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryDetails: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 5,
  },

  // Score Badge
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreBadgeCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  scoreBadgeText: {
    fontSize: 10,
  },

  // Table Styles
  table: {
    width: '100%',
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
  },
  tableCell: {
    flex: 1,
  },
  tableCellNarrow: {
    width: '15%',
  },
  tableCellWide: {
    width: '30%',
  },

  // Benchmark Bar
  benchmarkBar: {
    width: '100%',
    height: 30,
    marginBottom: 15,
  },
  benchmarkBarTitle: {
    fontSize: 10,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  benchmarkBarContainer: {
    width: '100%',
    height: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'solid',
  },
  benchmarkBarZone: {
    position: 'absolute',
    height: '100%',
  },
  benchmarkMarker: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: '#64748b',
  },
  benchmarkYourPosition: {
    position: 'absolute',
    width: 4,
    height: '100%',
    backgroundColor: '#2563eb',
  },
  benchmarkLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 5,
    fontSize: 8,
    color: '#64748b',
  },

  // Highlights
  highlight: {
    padding: 10,
    marginBottom: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: 'solid',
  },
  highlightStrength: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  highlightWeakness: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  highlightTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 9,
    color: '#475569',
  },

  // Subcategory Details
  subcategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    marginBottom: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 2,
  },
  subcategoryName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#334155',
  },
  subcategoryScore: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Footer notes
  footerNote: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    fontSize: 9,
    color: '#64748b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
  },
});

// Color helpers
const getLevelColor = (level: string): string => {
  switch (level) {
    case 'leading':
      return '#22c55e';
    case 'par':
      return '#eab308';
    case 'lagging':
      return '#ef4444';
    default:
      return '#64748b';
  }
};

const getCategoryColor = (category: ESGCategory): string => {
  switch (category) {
    case 'environmental':
      return '#10b981';
    case 'social':
      return '#3b82f6';
    case 'governance':
      return '#8b5cf6';
    default:
      return '#64748b';
  }
};

// Component: Cover Page
const CoverPage: React.FC<{
  companyName: string;
  periodYear: number;
  generatedDate: string;
}> = ({ companyName, periodYear, generatedDate }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.coverPage}>
      <Text style={styles.coverTitle}>ESG Benchmarking Report</Text>
      <Text style={styles.coverSubtitle}>Environmental, Social & Governance Analysis</Text>

      <Text style={styles.coverCompany}>{companyName}</Text>
      <Text style={styles.coverYear}>Reporting Period: {periodYear}</Text>

      <Text style={styles.coverFooter}>
        Generated on {generatedDate} • Powered by oppSpot ESG Analytics
      </Text>
    </View>
  </Page>
);

// Component: Executive Summary
const ExecutiveSummary: React.FC<{
  companyName: string;
  scores: ESGScore[];
  highlights?: Array<{ type: string; message: string }>;
}> = ({ companyName, scores, highlights }) => {
  const categoryScores = scores.filter(s => !s.subcategory);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Executive Summary</Text>
        <Text style={styles.headerTitle}>{companyName}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overall ESG Performance</Text>

        <View style={styles.summaryGrid}>
          {categoryScores.map((score) => (
            <View key={score.category} style={styles.summaryCard}>
              <Text style={styles.summaryCardTitle}>
                {score.category.toUpperCase()}
              </Text>
              <Text
                style={[
                  styles.summaryScore,
                  { color: getCategoryColor(score.category) }
                ]}
              >
                {score.score.toFixed(0)}/100
              </Text>
              <Text
                style={[
                  styles.summaryLevel,
                  { color: getLevelColor(score.level) }
                ]}
              >
                {score.level.toUpperCase()}
              </Text>
              {score.details?.metric_count && (
                <Text style={styles.summaryDetails}>
                  Based on {score.details.metric_count} metrics
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>

      {highlights && highlights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Highlights</Text>
          {highlights.slice(0, 6).map((highlight, index) => (
            <View
              key={index}
              style={[
                styles.highlight,
                highlight.type === 'strength'
                  ? styles.highlightStrength
                  : styles.highlightWeakness
              ]}
            >
              <Text style={styles.highlightTitle}>
                {highlight.type === 'strength' ? '✓ Strength' : '⚠ Area for Improvement'}
              </Text>
              <Text style={styles.highlightText}>{highlight.message}</Text>
            </View>
          ))}
        </View>
      )}

      <Text
        style={styles.pageNumber}
        render={({ pageNumber }) => `Page ${pageNumber}`}
        fixed
      />
    </Page>
  );
};

// Component: Category Detail Page
const CategoryDetailPage: React.FC<{
  companyName: string;
  category: ESGCategory;
  categoryScore: ESGScore;
  subcategoryScores: ESGScore[];
  metrics: ESGMetric[];
}> = ({ companyName, category, categoryScore, subcategoryScores, metrics }) => {
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  const categoryColor = getCategoryColor(category);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{categoryName} Performance</Text>
        <Text style={styles.headerTitle}>{companyName}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: categoryColor }]}>
          {categoryName} Score: {categoryScore.score.toFixed(1)}/100
        </Text>

        <View style={styles.scoreBadge}>
          <View
            style={[
              styles.scoreBadgeCircle,
              { backgroundColor: getLevelColor(categoryScore.level) }
            ]}
          />
          <Text style={styles.scoreBadgeText}>
            Performance Level: {categoryScore.level.toUpperCase()}
          </Text>
        </View>

        {categoryScore.details?.metric_count && (
          <Text style={styles.summaryDetails}>
            Based on {categoryScore.details.metric_count} metrics • {' '}
            {categoryScore.details.metrics_with_benchmarks || 0} with benchmark data
          </Text>
        )}
      </View>

      {subcategoryScores.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>Subcategory Breakdown</Text>
          {subcategoryScores.map((score) => (
            <View key={score.subcategory} style={styles.subcategoryRow}>
              <Text style={styles.subcategoryName}>{score.subcategory}</Text>
              <Text
                style={[
                  styles.subcategoryScore,
                  { color: getLevelColor(score.level) }
                ]}
              >
                {score.score.toFixed(1)}/100 ({score.level})
              </Text>
            </View>
          ))}
        </View>
      )}

      {metrics.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>Key Metrics</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCellWide}>Metric</Text>
              <Text style={styles.tableCellNarrow}>Value</Text>
              <Text style={styles.tableCellNarrow}>Confidence</Text>
            </View>
            {metrics.slice(0, 12).map((metric) => (
              <View key={metric.id} style={styles.tableRow}>
                <Text style={styles.tableCellWide}>{metric.metric_name}</Text>
                <Text style={styles.tableCellNarrow}>
                  {metric.value_numeric !== null
                    ? `${metric.value_numeric} ${metric.unit || ''}`
                    : metric.value_boolean !== null
                    ? metric.value_boolean ? 'Yes' : 'No'
                    : 'N/A'}
                </Text>
                <Text style={styles.tableCellNarrow}>
                  {metric.confidence ? `${(metric.confidence * 100).toFixed(0)}%` : 'N/A'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Text
        style={styles.pageNumber}
        render={({ pageNumber }) => `Page ${pageNumber}`}
        fixed
      />
    </Page>
  );
};

// Component: Metrics Overview Page
const MetricsOverviewPage: React.FC<{
  companyName: string;
  metrics: ESGMetric[];
}> = ({ companyName, metrics }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>All ESG Metrics</Text>
      <Text style={styles.headerTitle}>{companyName}</Text>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Complete Metrics Inventory</Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { width: '25%' }]}>Metric</Text>
          <Text style={styles.tableCellNarrow}>Category</Text>
          <Text style={styles.tableCellNarrow}>Value</Text>
          <Text style={styles.tableCellNarrow}>Confidence</Text>
        </View>
        {metrics.map((metric) => (
          <View key={metric.id} style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: '25%' }]}>
              {metric.metric_name}
            </Text>
            <Text style={styles.tableCellNarrow}>
              {metric.category.charAt(0).toUpperCase() + metric.category.slice(0, 3)}
            </Text>
            <Text style={styles.tableCellNarrow}>
              {metric.value_numeric !== null
                ? `${metric.value_numeric}`
                : metric.value_boolean !== null
                ? metric.value_boolean ? '✓' : '✗'
                : '-'}
            </Text>
            <Text style={styles.tableCellNarrow}>
              {metric.confidence ? `${(metric.confidence * 100).toFixed(0)}%` : '-'}
            </Text>
          </View>
        ))}
      </View>
    </View>

    <View style={styles.footerNote}>
      <Text>
        Note: This report is based on available ESG data and benchmarks as of the reporting period.
        Metrics marked with high confidence (≥80%) are based on verified source documents.
        For detailed methodology and data sources, please refer to the full ESG documentation.
      </Text>
    </View>

    <Text
      style={styles.pageNumber}
      render={({ pageNumber }) => `Page ${pageNumber}`}
      fixed
    />
  </Page>
);

// Main Document Component
export const ESGReportDocument: React.FC<{
  companyName: string;
  periodYear: number;
  scores: ESGScore[];
  metrics: ESGMetric[];
  highlights?: Array<{ type: string; message: string }>;
}> = ({ companyName, periodYear, scores, metrics, highlights }) => {
  const generatedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Organize scores by category
  const categoryScores = scores.filter(s => !s.subcategory);
  const getSubcategoryScores = (category: ESGCategory) =>
    scores.filter(s => s.category === category && s.subcategory);
  const getCategoryMetrics = (category: ESGCategory) =>
    metrics.filter(m => m.category === category);

  return (
    <Document>
      <CoverPage
        companyName={companyName}
        periodYear={periodYear}
        generatedDate={generatedDate}
      />

      <ExecutiveSummary
        companyName={companyName}
        scores={scores}
        highlights={highlights}
      />

      {(['environmental', 'social', 'governance'] as ESGCategory[]).map((category) => {
        const categoryScore = categoryScores.find(s => s.category === category);
        if (!categoryScore) return null;

        return (
          <CategoryDetailPage
            key={category}
            companyName={companyName}
            category={category}
            categoryScore={categoryScore}
            subcategoryScores={getSubcategoryScores(category)}
            metrics={getCategoryMetrics(category)}
          />
        );
      })}

      <MetricsOverviewPage
        companyName={companyName}
        metrics={metrics}
      />
    </Document>
  );
};
