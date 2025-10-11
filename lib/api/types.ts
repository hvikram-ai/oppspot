/**
 * Common API Type Definitions
 *
 * Shared types for API routes to ensure consistency and type safety
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';

// ============= Standard API Response Types =============

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: string;
  code?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============= Helper Functions =============

export function successResponse<T>(data: T, message?: string): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message })
  };
}

export function errorResponse(error: string, details?: string, code?: string): ApiErrorResponse {
  return {
    success: false,
    error,
    ...(details && { details }),
    ...(code && { code })
  };
}

// ============= Request Body Parsing =============

export async function parseRequestBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: `Invalid request body: ${result.error.issues.map(i => i.message).join(', ')}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse request body'
    };
  }
}

// ============= Query Parameter Parsing =============

export function parseQueryParams<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const result = schema.safeParse(params);

    if (!result.success) {
      return {
        success: false,
        error: `Invalid query parameters: ${result.error.issues.map(i => i.message).join(', ')}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse query parameters'
    };
  }
}

// ============= Path Parameter Types =============

export interface PathParams {
  params: Record<string, string>;
}

// Helper to get typed path params
export async function getPathParams<T extends z.ZodType>(
  params: Promise<Record<string, string>>,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; error: string }> {
  try {
    const resolvedParams = await params;
    const result = schema.safeParse(resolvedParams);

    if (!result.success) {
      return {
        success: false,
        error: `Invalid path parameters: ${result.error.issues.map(i => i.message).join(', ')}`
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse path parameters'
    };
  }
}

// ============= Common Validation Schemas =============

export const IdParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format')
});

export const PaginationSchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('10').transform(Number),
  offset: z.string().optional().transform(v => v ? Number(v) : undefined)
});

export const DateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

// ============= Database Query Result Types =============

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============= Error Handling =============

export function handleApiError(error: unknown): ApiErrorResponse {
  console.error('API Error:', error);

  if (error instanceof Error) {
    return errorResponse(error.message, error.stack);
  }

  return errorResponse('An unexpected error occurred');
}

// ============= Type Guards =============

export function isApiError(response: ApiResponse): response is ApiErrorResponse {
  return response.success === false;
}

export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}
