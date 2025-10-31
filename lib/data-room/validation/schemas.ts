/**
 * Validation Schemas for Data Room
 * Zod schemas for runtime validation and type safety
 */

import { z } from 'zod';

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

export const DealTypeSchema = z.enum([
  'acquisition',
  'investment',
  'partnership',
  'merger',
  'sale',
  'due_diligence',
  'other',
]);

export const DataRoomStatusSchema = z.enum(['active', 'archived', 'deleted']);

export const DocumentTypeSchema = z.enum([
  'financial',
  'contract',
  'due_diligence',
  'legal',
  'hr',
  'other',
]);

export const ProcessingStatusSchema = z.enum([
  'pending',
  'processing',
  'complete',
  'failed',
]);

export const PermissionLevelSchema = z.enum([
  'owner',
  'editor',
  'viewer',
  'commenter',
]);

export const ActivityActionSchema = z.enum([
  'upload',
  'view',
  'download',
  'edit',
  'delete',
  'share',
  'revoke',
  'generate_report',
  'create_room',
  'archive_room',
  'delete_room',
]);

export const AnnotationTypeSchema = z.enum(['highlight', 'comment', 'sticky_note']);

export const AnalysisTypeSchema = z.enum([
  'classification',
  'financial',
  'contract',
  'risk',
]);

export const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low']);

// ============================================================================
// METADATA SCHEMAS
// ============================================================================

export const DocumentMetadataSchema = z.object({
  dates: z.array(z.string().datetime()).optional(),
  amounts: z
    .array(
      z.object({
        value: z.number(),
        currency: z.string(),
        context: z.string(),
      })
    )
    .optional(),
  parties: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(['person', 'company']),
        role: z.string().optional(),
      })
    )
    .optional(),
  document_date: z.string().datetime().optional(),
  fiscal_period: z.string().optional(),
  contract_parties: z.array(z.string()).optional(),
  contract_value: z.number().optional(),
  effective_date: z.string().datetime().optional(),
  expiration_date: z.string().datetime().optional(),
});

export const DataRoomMetadataSchema = z.object({
  deal_value: z.number().optional(),
  currency: z.string().optional(),
  target_close_date: z.string().datetime().optional(),
  retention_days: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
});

// ============================================================================
// ENTITY SCHEMAS
// ============================================================================

export const DataRoomSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  company_id: z.string().uuid().nullable(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  deal_type: DealTypeSchema,
  status: DataRoomStatusSchema,
  storage_used_bytes: z.number().int().nonnegative(),
  document_count: z.number().int().nonnegative(),
  metadata: DataRoomMetadataSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  data_room_id: z.string().uuid(),
  filename: z.string().min(1).max(255),
  folder_path: z.string(),
  file_size_bytes: z.number().int().positive(),
  mime_type: z.string(),
  storage_path: z.string(),
  uploaded_by: z.string().uuid(),
  upload_completed: z.boolean(),
  document_type: DocumentTypeSchema,
  confidence_score: z.number().min(0).max(1),
  processing_status: ProcessingStatusSchema,
  metadata: DocumentMetadataSchema,
  error_message: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export const DataRoomAccessSchema = z.object({
  id: z.string().uuid(),
  data_room_id: z.string().uuid(),
  user_id: z.string().uuid(),
  permission_level: PermissionLevelSchema,
  invited_by: z.string().uuid(),
  invite_token: z.string(),
  invite_email: z.string().email(),
  expires_at: z.string().datetime(),
  accepted_at: z.string().datetime().nullable(),
  revoked_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const ActivityLogSchema = z.object({
  id: z.string().uuid(),
  data_room_id: z.string().uuid(),
  document_id: z.string().uuid().nullable(),
  actor_id: z.string().uuid(),
  actor_name: z.string(),
  actor_email: z.string().email(),
  action: ActivityActionSchema,
  details: z.record(z.unknown()),
  ip_address: z.string().regex(
    /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i,
    'Invalid IP address'
  ).or(z.literal('127.0.0.1')),
  user_agent: z.string(),
  created_at: z.string().datetime(),
});

export const DocumentAnnotationSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  user_id: z.string().uuid(),
  annotation_type: AnnotationTypeSchema,
  page_number: z.number().int().positive().nullable(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .nullable(),
  text: z.string(),
  color: z.string(),
  resolved: z.boolean(),
  resolved_by: z.string().uuid().nullable(),
  resolved_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

// ============================================================================
// CREATE/UPDATE SCHEMAS
// ============================================================================

export const CreateDataRoomSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  company_id: z.string().uuid().optional(),
  deal_type: DealTypeSchema.optional().default('other'),
  metadata: DataRoomMetadataSchema.optional().default({}),
});

export const UpdateDataRoomSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  deal_type: DealTypeSchema.optional(),
  status: DataRoomStatusSchema.optional(),
  metadata: DataRoomMetadataSchema.optional(),
});

export const CreateDocumentSchema = z.object({
  data_room_id: z.string().uuid(),
  filename: z.string().min(1).max(255),
  folder_path: z.string().default('/'),
  file_size_bytes: z
    .number()
    .int()
    .positive()
    .max(100 * 1024 * 1024, 'File size must be less than 100MB'),
  mime_type: z
    .string()
    .refine(
      (type) =>
        [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/msword',
          'application/vnd.ms-excel',
        ].includes(type),
      {
        message: 'Invalid file type. Only PDF, Word, and Excel files are allowed.',
      }
    ),
  storage_path: z.string(),
});

export const UpdateDocumentSchema = z.object({
  filename: z.string().min(1).max(255).optional(),
  folder_path: z.string().optional(),
  document_type: DocumentTypeSchema.optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  processing_status: ProcessingStatusSchema.optional(),
  metadata: DocumentMetadataSchema.optional(),
  error_message: z.string().nullable().optional(),
});

export const CreateAccessSchema = z.object({
  data_room_id: z.string().uuid(),
  invite_email: z.string().email('Invalid email address'),
  permission_level: PermissionLevelSchema,
  expires_in_days: z
    .number()
    .int()
    .positive()
    .max(365, 'Expiration cannot exceed 365 days')
    .optional()
    .default(7),
});

export const CreateActivityLogSchema = z.object({
  data_room_id: z.string().uuid(),
  document_id: z.string().uuid().optional(),
  action: ActivityActionSchema,
  details: z.record(z.unknown()).optional().default({}),
});

export const CreateAnnotationSchema = z.object({
  document_id: z.string().uuid(),
  annotation_type: AnnotationTypeSchema,
  page_number: z.number().int().positive().optional(),
  position: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      width: z.number().min(0).max(1),
      height: z.number().min(0).max(1),
    })
    .optional(),
  text: z.string().min(1, 'Text is required').max(5000, 'Text is too long'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional()
    .default('#FFFF00'),
});

// ============================================================================
// FILTER SCHEMAS
// ============================================================================

export const DataRoomFilterSchema = z.object({
  status: DataRoomStatusSchema.optional(),
  deal_type: DealTypeSchema.optional(),
  search: z.string().optional(),
  sort_by: z
    .enum(['created_at', 'updated_at', 'name', 'document_count'])
    .optional()
    .default('updated_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0),
});

export const DocumentFilterSchema = z.object({
  data_room_id: z.string().uuid(),
  document_type: DocumentTypeSchema.optional(),
  folder_path: z.string().optional(),
  search: z.string().optional(),
  uploaded_by: z.string().uuid().optional(),
  processing_status: ProcessingStatusSchema.optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  sort_by: z
    .enum(['created_at', 'filename', 'file_size_bytes', 'confidence_score'])
    .optional()
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0),
});

export const ActivityLogFilterSchema = z.object({
  data_room_id: z.string().uuid(),
  document_id: z.string().uuid().optional(),
  actor_id: z.string().uuid().optional(),
  action: ActivityActionSchema.optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  limit: z.number().int().positive().max(1000).optional().default(100),
  offset: z.number().int().nonnegative().optional().default(0),
});

// ============================================================================
// TYPE INFERENCE
// ============================================================================

export type CreateDataRoomInput = z.infer<typeof CreateDataRoomSchema>;
export type UpdateDataRoomInput = z.infer<typeof UpdateDataRoomSchema>;
export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>;
export type CreateAccessInput = z.infer<typeof CreateAccessSchema>;
export type CreateActivityLogInput = z.infer<typeof CreateActivityLogSchema>;
export type CreateAnnotationInput = z.infer<typeof CreateAnnotationSchema>;
export type DataRoomFilter = z.infer<typeof DataRoomFilterSchema>;
export type DocumentFilter = z.infer<typeof DocumentFilterSchema>;
export type ActivityLogFilter = z.infer<typeof ActivityLogFilterSchema>;
