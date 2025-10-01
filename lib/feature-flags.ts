/**
 * Feature flags for gradual rollout and A/B testing
 */

export interface FeatureFlags {
  ENABLE_DASHBOARD_V2: boolean
  ENABLE_AI_DIGEST: boolean
  ENABLE_PRIORITY_QUEUE: boolean
  ENABLE_COMMAND_PALETTE: boolean
  ENABLE_PERFORMANCE_MONITORING: boolean
  ENABLE_ANALYTICS_TRACKING: boolean
}

// Default flags (can be overridden by environment variables or database)
const defaultFlags: FeatureFlags = {
  ENABLE_DASHBOARD_V2: process.env.NEXT_PUBLIC_ENABLE_DASHBOARD_V2 === 'true',
  ENABLE_AI_DIGEST: process.env.NEXT_PUBLIC_ENABLE_AI_DIGEST === 'true',
  ENABLE_PRIORITY_QUEUE: process.env.NEXT_PUBLIC_ENABLE_PRIORITY_QUEUE === 'true',
  ENABLE_COMMAND_PALETTE: process.env.NEXT_PUBLIC_ENABLE_COMMAND_PALETTE === 'true',
  ENABLE_PERFORMANCE_MONITORING: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
  ENABLE_ANALYTICS_TRACKING: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_TRACKING === 'true',
}

/**
 * Get feature flag value
 */
export function getFeatureFlag(flag: keyof FeatureFlags): boolean {
  return defaultFlags[flag] || false
}

/**
 * Check if dashboard v2 is enabled
 */
export function isDashboardV2Enabled(): boolean {
  return getFeatureFlag('ENABLE_DASHBOARD_V2')
}

/**
 * Check if AI digest is enabled
 */
export function isAIDigestEnabled(): boolean {
  return getFeatureFlag('ENABLE_AI_DIGEST')
}

/**
 * Check if priority queue is enabled
 */
export function isPriorityQueueEnabled(): boolean {
  return getFeatureFlag('ENABLE_PRIORITY_QUEUE')
}

/**
 * Check if command palette is enabled
 */
export function isCommandPaletteEnabled(): boolean {
  return getFeatureFlag('ENABLE_COMMAND_PALETTE')
}

/**
 * Check if performance monitoring is enabled
 */
export function isPerformanceMonitoringEnabled(): boolean {
  return getFeatureFlag('ENABLE_PERFORMANCE_MONITORING')
}

/**
 * Check if analytics tracking is enabled
 */
export function isAnalyticsTrackingEnabled(): boolean {
  return getFeatureFlag('ENABLE_ANALYTICS_TRACKING')
}

/**
 * Get all feature flags
 */
export function getAllFeatureFlags(): FeatureFlags {
  return { ...defaultFlags }
}

/**
 * User-based feature rollout (percentage-based)
 * @param userId - User ID to check
 * @param rolloutPercentage - Percentage of users to enable (0-100)
 */
export function isFeatureEnabledForUser(
  userId: string,
  rolloutPercentage: number
): boolean {
  if (rolloutPercentage >= 100) return true
  if (rolloutPercentage <= 0) return false

  // Simple hash function to determine if user is in rollout
  const hash = userId
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)

  return (hash % 100) < rolloutPercentage
}

/**
 * Check if user is in dashboard v2 rollout
 * Default rollout: 100% (full launch)
 */
export function isUserInDashboardV2Rollout(userId: string): boolean {
  const rolloutPercentage = parseInt(
    process.env.NEXT_PUBLIC_DASHBOARD_V2_ROLLOUT || '100',
    10
  )
  return isFeatureEnabledForUser(userId, rolloutPercentage)
}
