// Financial Analytics Components - Central Export
// Feature: 012-oppspot-docs-financial

// Core Data Display Components
export { KPIOverview, KPICard, transformKPISnapshots } from './kpi-overview';
export type { KPIOverviewProps, KPICardProps, KPIWithTrend, KPITrend } from './kpi-overview';

// Using simple CSS-based charts instead of recharts for better compatibility
export { NRRWaterfall } from './nrr-waterfall-simple';
export type { NRRWaterfallProps, NRRWaterfallData } from './nrr-waterfall-simple';

export { CohortHeatmap } from './cohort-heatmap';
export type { CohortHeatmapProps, CohortData, CohortGrid, RetentionType } from './cohort-heatmap';

// Using simple CSS-based chart instead of recharts for better compatibility
export { ConcentrationChart } from './concentration-chart-simple';
export type { ConcentrationChartProps, ConcentrationData, TopCustomer } from './concentration-chart-simple';

export { ARAPAgingTable } from './ar-ap-aging-table';
export type { ARAPAgingTableProps, ARAPAgingData } from './ar-ap-aging-table';

export { BenchmarkComparison, transformBenchmarks } from './benchmark-comparison';
export type {
  BenchmarkComparisonProps,
  BenchmarkComparisonData,
  BenchmarkMetric,
  BenchmarkInput,
} from './benchmark-comparison';

// Utility Components
export { FormulaTooltip, METRIC_FORMULAS } from './formula-tooltip';
export type { FormulaTooltipProps, MetricKey, MetricFormula } from './formula-tooltip';

export { AnomalyBanner, AnomalyBanners, ANOMALY_MESSAGES } from './anomaly-banner';
export type {
  AnomalyBannerProps,
  AnomalyBannersProps,
  AnomalyType,
  AnomalyMessage,
} from './anomaly-banner';

export { CSVUploadZone } from './csv-upload-zone';
export type {
  CSVUploadZoneProps,
  CSVFileType,
  UploadFile,
  ValidationError,
  UploadResult,
} from './csv-upload-zone';
