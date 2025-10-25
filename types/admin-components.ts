/**
 * Type definitions for Admin Dashboard Components
 * Shared types used across admin UI components
 */

// =====================================================
// ADMIN STATISTICS
// =====================================================

/**
 * Admin dashboard statistics
 * Used by AdminStatsGrid component to display key metrics
 */
export interface AdminStats {
  /** Total number of users across all roles */
  totalUsers: number;
  /** User count grouped by role */
  usersByRole: Record<string, number>;
  /** Number of role changes in the last 7 days */
  recentRoleChanges: number;
  /** Number of currently active AI agents */
  activeAgents: number;
}

/**
 * Props for AdminStatsGrid component
 */
export interface AdminStatsGridProps {
  /** Statistics data to display, null if not yet loaded */
  stats: AdminStats | null;
  /** Whether stats are currently being refreshed */
  refreshing?: boolean;
}

// =====================================================
// ADMIN TOOLS
// =====================================================

/**
 * Admin tool configuration
 * Represents a navigable admin tool card
 */
export interface AdminTool {
  /** Display title of the tool */
  title: string;
  /** Brief description of what the tool does */
  description: string;
  /** Navigation path (e.g., '/admin/roles') */
  href: string;
  /** Icon component to display */
  icon: React.ComponentType<{ className?: string }>;
  /** Optional badge text (e.g., 'New', 'Beta') */
  badge?: string;
  /** Whether this is a premium feature */
  isPremium?: boolean;
  /** Whether this tool requires super admin access */
  requiresSuperAdmin?: boolean;
}

/**
 * Props for AdminToolsGrid component
 */
export interface AdminToolsGridProps {
  /** Array of admin tools to display */
  tools: AdminTool[];
  /** Whether current user is a super admin (shows restricted tools) */
  isSuperAdmin?: boolean;
}

// =====================================================
// QUICK ACTIONS
// =====================================================

/**
 * Quick action button configuration
 * Represents a clickable action card
 */
export interface QuickAction {
  /** Display title of the action */
  title: string;
  /** Brief description of what the action does */
  description: string;
  /** Icon component to display */
  icon: React.ComponentType<{ className?: string }>;
  /** Function to execute when action is clicked */
  action: () => void;
}

/**
 * Props for QuickActionsGrid component
 */
export interface QuickActionsGridProps {
  /** Optional custom actions, uses defaults if not provided */
  actions?: QuickAction[];
}
