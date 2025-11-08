'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, XCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';

export interface ErrorDisplayProps {
  error: {
    error?: string;
    code?: string;
    context?: Record<string, any>;
  } | string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Error Display Component
 * Displays API errors with proper styling and context
 * Maps error codes to user-friendly messages
 */
export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  const errorData = typeof error === 'string' ? { error, code: 'UNKNOWN' } : error;

  const getErrorIcon = () => {
    switch (errorData.code) {
      case 'UNAUTHORIZED':
      case 'FORBIDDEN':
        return <AlertCircle className="h-5 w-5" />;
      case 'NOT_FOUND':
        return <Info className="h-5 w-5" />;
      case 'VALIDATION_ERROR':
        return <AlertTriangle className="h-5 w-5" />;
      case 'RATE_LIMIT_ERROR':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <XCircle className="h-5 w-5" />;
    }
  };

  const getErrorVariant = (): 'default' | 'destructive' => {
    switch (errorData.code) {
      case 'UNAUTHORIZED':
      case 'FORBIDDEN':
      case 'VALIDATION_ERROR':
        return 'destructive';
      case 'NOT_FOUND':
      case 'RATE_LIMIT_ERROR':
        return 'default';
      default:
        return 'destructive';
    }
  };

  const getErrorTitle = () => {
    switch (errorData.code) {
      case 'UNAUTHORIZED':
        return 'Authentication Required';
      case 'FORBIDDEN':
        return 'Access Denied';
      case 'NOT_FOUND':
        return 'Not Found';
      case 'VALIDATION_ERROR':
        return 'Validation Error';
      case 'RATE_LIMIT_ERROR':
        return 'Rate Limit Exceeded';
      case 'CONFLICT_ERROR':
        return 'Conflict';
      case 'TIMEOUT_ERROR':
        return 'Request Timeout';
      case 'EXTERNAL_SERVICE_ERROR':
        return 'External Service Error';
      case 'DATABASE_ERROR':
        return 'Database Error';
      case 'AI_OPERATION_ERROR':
        return 'AI Operation Failed';
      default:
        return 'Error';
    }
  };

  const getUserFriendlyMessage = () => {
    switch (errorData.code) {
      case 'UNAUTHORIZED':
        return 'Please log in to access this resource.';
      case 'FORBIDDEN':
        return 'You do not have permission to perform this action.';
      case 'NOT_FOUND':
        return errorData.error || 'The requested resource was not found.';
      case 'VALIDATION_ERROR':
        return errorData.error || 'Please check your input and try again.';
      case 'RATE_LIMIT_ERROR':
        return 'You have exceeded the rate limit. Please try again later.';
      case 'CONFLICT_ERROR':
        return errorData.error || 'This operation conflicts with existing data.';
      case 'TIMEOUT_ERROR':
        return 'The request took too long. Please try again.';
      case 'EXTERNAL_SERVICE_ERROR':
        return 'An external service is unavailable. Please try again later.';
      case 'DATABASE_ERROR':
        return 'A database error occurred. Our team has been notified.';
      case 'AI_OPERATION_ERROR':
        return 'AI processing failed. Please try again or contact support.';
      default:
        return errorData.error || 'An unexpected error occurred.';
    }
  };

  return (
    <Alert variant={getErrorVariant()} className="my-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">{getErrorIcon()}</div>
        <div className="flex-1 space-y-2">
          <AlertTitle>{getErrorTitle()}</AlertTitle>
          <AlertDescription>{getUserFriendlyMessage()}</AlertDescription>

          {/* Context Information (for debugging) */}
          {errorData.context && Object.keys(errorData.context).length > 0 && (
            <details className="text-sm mt-2">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Technical Details
              </summary>
              <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                {Object.entries(errorData.context).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-semibold">{key}:</span>{' '}
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 mt-3">
            {onRetry && (
              <Button onClick={onRetry} size="sm" variant="outline">
                <RefreshCw className="mr-2 h-3 w-3" />
                Retry
              </Button>
            )}
            {onDismiss && (
              <Button onClick={onDismiss} size="sm" variant="ghost">
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </Alert>
  );
}

/**
 * Hook for extracting error information from API responses
 */
export function useErrorHandler() {
  const handleApiError = async (response: Response) => {
    try {
      const data = await response.json();
      return {
        error: data.error || 'Unknown error',
        code: data.code || 'UNKNOWN',
        context: data.context || {},
      };
    } catch {
      return {
        error: `HTTP ${response.status}: ${response.statusText}`,
        code: 'UNKNOWN',
        context: {},
      };
    }
  };

  return { handleApiError };
}
