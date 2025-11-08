/**
 * Utility functions for Competitive Intelligence Dashboard
 */

/**
 * Check if analysis data is stale based on last refresh date
 */
export function isDataStale(lastRefreshedAt: Date | string | null, thresholdDays: number = 30): boolean {
  if (!lastRefreshedAt) return true;

  const lastRefresh = typeof lastRefreshedAt === 'string' ? new Date(lastRefreshedAt) : lastRefreshedAt;
  const now = new Date();
  const diffTime = now.getTime() - lastRefresh.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  return diffDays > thresholdDays;
}

/**
 * Calculate days since last refresh
 */
export function calculateDaysSinceRefresh(lastRefreshedAt: Date | string | null): number {
  if (!lastRefreshedAt) return 999; // Return large number for never refreshed

  const lastRefresh = typeof lastRefreshedAt === 'string' ? new Date(lastRefreshedAt) : lastRefreshedAt;
  const now = new Date();
  const diffTime = now.getTime() - lastRefresh.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Format analysis title from target company name
 */
export function formatAnalysisTitle(targetName: string): string {
  return `${targetName} Competitive Analysis`;
}

/**
 * Validate competitor URL format
 */
export function validateCompetitorUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Get data freshness status with color coding
 */
export function getDataFreshnessStatus(lastRefreshedAt: Date | string | null): {
  status: 'fresh' | 'aging' | 'stale' | 'never';
  color: 'green' | 'yellow' | 'red' | 'gray';
  label: string;
} {
  if (!lastRefreshedAt) {
    return {
      status: 'never',
      color: 'gray',
      label: 'Never refreshed',
    };
  }

  const days = calculateDaysSinceRefresh(lastRefreshedAt);

  if (days < 7) {
    return {
      status: 'fresh',
      color: 'green',
      label: `Updated ${days} ${days === 1 ? 'day' : 'days'} ago`,
    };
  } else if (days < 30) {
    return {
      status: 'aging',
      color: 'yellow',
      label: `Updated ${days} days ago`,
    };
  } else {
    return {
      status: 'stale',
      color: 'red',
      label: `Updated ${days} days ago (stale)`,
    };
  }
}

/**
 * Format parity score with interpretation
 */
export function formatParityScore(score: number): {
  value: number;
  label: string;
  interpretation: string;
  color: 'red' | 'yellow' | 'green';
} {
  const rounded = Math.round(score);

  if (score >= 90) {
    return {
      value: rounded,
      label: `${rounded}/100`,
      interpretation: 'Near parity - High commodity risk',
      color: 'red',
    };
  } else if (score >= 75) {
    return {
      value: rounded,
      label: `${rounded}/100`,
      interpretation: 'Strong overlap - Moderate differentiation',
      color: 'yellow',
    };
  } else if (score >= 50) {
    return {
      value: rounded,
      label: `${rounded}/100`,
      interpretation: 'Significant gaps - Target has advantages',
      color: 'green',
    };
  } else {
    return {
      value: rounded,
      label: `${rounded}/100`,
      interpretation: 'Weak competitor - Different market segment',
      color: 'green',
    };
  }
}

/**
 * Format moat score with interpretation
 */
export function formatMoatScore(score: number): {
  value: number;
  label: string;
  interpretation: string;
  color: 'red' | 'yellow' | 'green';
} {
  const rounded = Math.round(score);

  if (score >= 80) {
    return {
      value: rounded,
      label: `${rounded}/100`,
      interpretation: 'Dominant Moat - Market leader, high defensibility',
      color: 'green',
    };
  } else if (score >= 60) {
    return {
      value: rounded,
      label: `${rounded}/100`,
      interpretation: 'Strong Moat - Sustainable competitive advantage',
      color: 'green',
    };
  } else if (score >= 40) {
    return {
      value: rounded,
      label: `${rounded}/100`,
      interpretation: 'Moderate Moat - Defensible but vulnerable',
      color: 'yellow',
    };
  } else if (score >= 20) {
    return {
      value: rounded,
      label: `${rounded}/100`,
      interpretation: 'Weak Moat - High commoditization risk',
      color: 'red',
    };
  } else {
    return {
      value: rounded,
      label: `${rounded}/100`,
      interpretation: 'No Moat - Undifferentiated offering',
      color: 'red',
    };
  }
}

/**
 * Sanitize analysis title for file export
 */
export function sanitizeFilename(title: string): string {
  return title
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Generate export filename with date
 */
export function generateExportFilename(title: string, format: 'pdf' | 'excel' | 'pptx'): string {
  const sanitized = sanitizeFilename(title);
  const date = new Date().toISOString().split('T')[0];
  const extension = format === 'excel' ? 'xlsx' : format === 'pptx' ? 'pptx' : 'pdf';
  return `Analysis-${sanitized}-${date}.${extension}`;
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Format currency for pricing display
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Group feature matrix entries by category
 */
export function groupFeaturesByCategory<T extends { feature_category: string }>(
  features: T[]
): Record<string, T[]> {
  return features.reduce((acc, feature) => {
    const category = feature.feature_category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * Calculate confidence level based on data quality
 */
export function calculateConfidenceLevel(
  dataCompleteness: number,
  sourceQuality: number
): 'high' | 'medium' | 'low' {
  const score = (dataCompleteness + sourceQuality) / 2;
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

/**
 * Parse threat level to numeric value for sorting
 */
export function threatLevelToNumeric(level: string | null | undefined): number {
  switch (level) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get relative time string (e.g., "2 hours ago", "3 days ago")
 */
export function getRelativeTimeString(date: Date | string): string {
  const now = new Date();
  const past = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - past.getTime();

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMonths > 0) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
  if (diffWeeks > 0) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
  if (diffDays > 0) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  if (diffHours > 0) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffMinutes > 0) return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  return 'Just now';
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return url;
  }
}
