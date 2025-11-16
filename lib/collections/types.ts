/**
 * TypeScript Types for Collection Operations
 * Feature: Collection-Based Work Organization
 *
 * These types match the database schema defined in migrations
 */

// ============================================================================
// Database ENUM Types
// ============================================================================

/**
 * Work product types that can be saved to collections
 */
export type WorkProductType =
  | 'business'
  | 'report'
  | 'contact'
  | 'list'
  | 'insight'
  | 'query';

/**
 * Permission levels for shared collections
 */
export type PermissionLevel =
  | 'view'    // Can view stream and items only
  | 'edit'    // Can view + add/remove items
  | 'manage'; // Can view + edit + rename stream + invite users

// ============================================================================
// Database Table Types
// ============================================================================

/**
 * Collection: User-created organizational container
 */
export interface Collection {
  id: string;
  user_id: string;
  name: string;
  is_system: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Collection with item count (for list views)
 */
export interface StreamWithCounts extends Collection {
  item_count: number;
}

/**
 * Shared stream with permission info
 */
export interface SharedCollection extends StreamWithCounts {
  permission_level: PermissionLevel;
  owner_name: string | null;
  owner_email: string | null;
}

/**
 * Collection Item: Work product saved to a stream
 */
export interface StreamItem {
  id: string;
  collection_id: string;
  item_type: WorkProductType;
  item_id: string;
  added_by: string;
  added_at: string;
}

/**
 * Collection Item with metadata (for display)
 */
export interface StreamItemWithDetails extends StreamItem {
  added_by_name?: string;
  added_by_email?: string;
  // Polymorphic reference details (populated based on item_type)
  item_title?: string;
  item_metadata?: Record<string, unknown>;
}

/**
 * Collection Access: Permission grant for shared stream
 */
export interface StreamAccess {
  id: string;
  collection_id: string;
  user_id: string;
  permission_level: PermissionLevel;
  granted_by: string;
  granted_at: string;
}

/**
 * Collection Access with user details (for display)
 */
export interface StreamAccessWithDetails extends StreamAccess {
  user_email: string;
  user_name?: string;
  granted_by_name?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Response for listing user's collections
 */
export interface ListCollectionsResponse {
  owned: StreamWithCounts[];
  shared: SharedCollection[];
}

/**
 * Response for getting single stream details
 */
export interface StreamDetailResponse extends StreamWithCounts {
  items?: StreamItemWithDetails[];
  access_grants?: StreamAccessWithDetails[];
}

/**
 * Response for listing stream items (paginated)
 */
export interface ListItemsResponse {
  items: StreamItemWithDetails[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Response for listing access grants
 */
export interface ListAccessResponse {
  grants: StreamAccessWithDetails[];
}

// ============================================================================
// API Error Types
// ============================================================================

/**
 * Standard error response
 */
export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
}

// ============================================================================
// Permission Matrix Types
// ============================================================================

/**
 * Actions that can be performed on a stream
 */
export type StreamAction =
  | 'view_items'
  | 'add_items'
  | 'remove_items'
  | 'move_items'
  | 'rename_stream'
  | 'invite_users'
  | 'change_permissions'
  | 'archive_stream';

/**
 * Permission capabilities matrix
 */
export const PERMISSION_CAPABILITIES: Record<PermissionLevel, Set<StreamAction>> = {
  view: new Set(['view_items']),
  edit: new Set(['view_items', 'add_items', 'remove_items', 'move_items']),
  manage: new Set(['view_items', 'add_items', 'remove_items', 'move_items', 'rename_stream', 'invite_users', 'change_permissions'])
};

/**
 * Check if permission level allows an action
 */
export function canPerformAction(permission: PermissionLevel, action: StreamAction): boolean {
  return PERMISSION_CAPABILITIES[permission].has(action);
}

// ============================================================================
// Filter and Sort Types
// ============================================================================

/**
 * Collection list filter options
 */
export interface StreamFilters {
  include_archived?: boolean;
  is_system?: boolean;
  search?: string;
}

/**
 * Collection sort options
 */
export type StreamSortBy =
  | 'name'
  | 'created_at'
  | 'updated_at'
  | 'item_count';

export type SortOrder = 'asc' | 'desc';

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit: number;
  offset: number;
}

// ============================================================================
// UI Component Types
// ============================================================================

/**
 * Collection selector component props
 */
export interface StreamSelectorProps {
  activeStreamId?: string | null;
  onStreamChange: (streamId: string) => void;
  onCreateCollection?: () => void;
}

/**
 * Save to stream button props
 */
export interface SaveToStreamButtonProps {
  itemType: WorkProductType;
  itemId: string;
  variant?: 'default' | 'outline' | 'ghost';
  onSave?: (streamId: string) => void;
}

/**
 * Collection item card props
 */
export interface StreamItemCardProps {
  item: StreamItemWithDetails;
  onRemove?: (itemId: string) => void;
  onMove?: (itemId: string, targetStreamId: string) => void;
  showActions?: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
