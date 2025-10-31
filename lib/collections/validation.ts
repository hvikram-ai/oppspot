/**
 * Validation Schemas for Collection Operations
 * Feature: Collection-Based Work Organization
 *
 * Zod schemas for validating API requests related to collections
 */

import { z } from 'zod';

// ============================================================================
// ENUM Schemas
// ============================================================================

/**
 * Work product types that can be saved to collections
 */
export const workProductTypeSchema = z.enum([
  'business',  // Business/company entity
  'report',    // Research report
  'contact',   // Contact/profile
  'list',      // Business list
  'insight',   // Insight/finding
  'query'      // Saved search query
]);

/**
 * Permission levels for shared collections
 */
export const permissionLevelSchema = z.enum([
  'view',    // Can view stream and items only
  'edit',    // Can view + add/remove items
  'manage'   // Can view + edit + rename stream + invite users
]);

// ============================================================================
// Collection Management Schemas
// ============================================================================

/**
 * Schema for creating a new stream
 */
export const createStreamSchema = z.object({
  name: z.string()
    .min(1, 'Collection name is required')
    .max(255, 'Collection name must be less than 255 characters')
    .trim()
});

/**
 * Schema for updating/renaming a stream
 */
export const updateStreamSchema = z.object({
  name: z.string()
    .min(1, 'Collection name is required')
    .max(255, 'Collection name must be less than 255 characters')
    .trim()
});

/**
 * Schema for setting active stream
 */
export const setActiveStreamSchema = z.object({
  collection_id: z.string().uuid('Invalid stream ID format')
});

// ============================================================================
// Collection Items Schemas
// ============================================================================

/**
 * Schema for adding an item to a stream
 */
export const addStreamItemSchema = z.object({
  item_type: workProductTypeSchema,
  item_id: z.string().uuid('Invalid item ID format')
});

/**
 * Schema for moving an item to a different stream
 */
export const moveItemSchema = z.object({
  target_collection_id: z.string().uuid('Invalid target stream ID format')
});

// ============================================================================
// Collection Access (Sharing) Schemas
// ============================================================================

/**
 * Schema for granting access to a stream
 */
export const grantAccessSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
  permission_level: permissionLevelSchema
});

/**
 * Schema for updating permission level
 */
export const updatePermissionSchema = z.object({
  permission_level: permissionLevelSchema
});

// ============================================================================
// Query Parameter Schemas
// ============================================================================

/**
 * Schema for list collections query parameters
 */
export const listCollectionsQuerySchema = z.object({
  include_archived: z.enum(['true', 'false']).optional().transform(val => val === 'true')
});

/**
 * Schema for list items query parameters (pagination)
 */
export const listItemsQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0)
}).refine(data => {
  return data.limit && data.limit > 0 && data.limit <= 100;
}, {
  message: 'Limit must be between 1 and 100'
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type WorkProductType = z.infer<typeof workProductTypeSchema>;
export type PermissionLevel = z.infer<typeof permissionLevelSchema>;
export type CreateStreamInput = z.infer<typeof createStreamSchema>;
export type UpdateStreamInput = z.infer<typeof updateStreamSchema>;
export type SetActiveStreamInput = z.infer<typeof setActiveStreamSchema>;
export type AddStreamItemInput = z.infer<typeof addStreamItemSchema>;
export type MoveItemInput = z.infer<typeof moveItemSchema>;
export type GrantAccessInput = z.infer<typeof grantAccessSchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;
export type ListCollectionsQuery = z.infer<typeof listCollectionsQuerySchema>;
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;
