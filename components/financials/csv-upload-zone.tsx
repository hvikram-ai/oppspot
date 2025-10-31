"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { AlertCircle, CheckCircle2, Download, FileText, Upload, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"

// ==============================================================================
// TYPE DEFINITIONS
// ==============================================================================

export type CSVFileType = 'subscriptions' | 'invoices' | 'payments' | 'cogs' | 'sales_marketing';

export interface UploadFile {
  file: File;
  type: CSVFileType;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface UploadResult {
  upload_id: string;
  affected_months: {
    start: string;
    end: string;
  };
  validation_errors?: ValidationError[];
}

// ==============================================================================
// CONSTANTS
// ==============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const FILE_TYPES: Record<CSVFileType, { label: string; template: string }> = {
  subscriptions: {
    label: 'Subscriptions',
    template: '/templates/subscriptions.csv',
  },
  invoices: {
    label: 'Invoices',
    template: '/templates/invoices.csv',
  },
  payments: {
    label: 'Payments',
    template: '/templates/payments.csv',
  },
  cogs: {
    label: 'COGS (Cost of Goods Sold)',
    template: '/templates/cogs.csv',
  },
  sales_marketing: {
    label: 'Sales & Marketing Costs',
    template: '/templates/sales_marketing.csv',
  },
};

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectFileType(filename: string): CSVFileType | null {
  const lower = filename.toLowerCase();
  if (lower.includes('subscription')) return 'subscriptions';
  if (lower.includes('invoice')) return 'invoices';
  if (lower.includes('payment')) return 'payments';
  if (lower.includes('cogs') || lower.includes('cost')) return 'cogs';
  if (lower.includes('sales') || lower.includes('marketing')) return 'sales_marketing';
  return null;
}

// ==============================================================================
// COMPONENT
// ==============================================================================

export interface CSVUploadZoneProps {
  companyId: string;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export function CSVUploadZone({
  companyId,
  onUploadComplete,
  onUploadError,
  className,
}: CSVUploadZoneProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setGlobalError(null);

    const newFiles: UploadFile[] = acceptedFiles
      .filter((file) => {
        if (!file.name.endsWith('.csv')) {
          setGlobalError(`Invalid file type: ${file.name}. Only CSV files are allowed.`);
          return false;
        }
        if (file.size > MAX_FILE_SIZE) {
          setGlobalError(
            `File too large: ${file.name} (${formatFileSize(file.size)}). Max size: 10MB.`
          );
          return false;
        }
        return true;
      })
      .map((file) => ({
        file,
        type: detectFileType(file.name) || 'subscriptions',
        progress: 0,
        status: 'pending' as const,
      }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFileType = (index: number, type: CSVFileType) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, type } : f))
    );
  };

  const uploadFiles = async () => {
    setGlobalError(null);

    const formData = new FormData();
    files.forEach((uploadFile) => {
      formData.append(uploadFile.type, uploadFile.file);
    });

    try {
      // Update all to uploading
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: 'uploading' as const, progress: 0 }))
      );

      // Simulate upload progress (in real implementation, use XMLHttpRequest for progress)
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.status === 'uploading' && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          )
        );
      }, 200);

      const response = await fetch(`/api/companies/${companyId}/financials/upload`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Upload failed');
      }

      const result: UploadResult = await response.json();

      // Mark all as success
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: 'success' as const, progress: 100 }))
      );

      if (onUploadComplete) {
        onUploadComplete(result);
      }

      // Clear files after 2 seconds
      setTimeout(() => {
        setFiles([]);
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setGlobalError(errorMessage);

      setFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: 'error' as const,
          error: errorMessage,
        }))
      );

      if (onUploadError) {
        onUploadError(errorMessage);
      }
    }
  };

  const canUpload = files.length > 0 && files.every((f) => f.status === 'pending');

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Upload Financial Data</CardTitle>
        <CardDescription>
          Upload CSV files containing subscriptions, invoices, payments, COGS, and sales & marketing costs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm text-muted-foreground">Drop CSV files here...</p>
          ) : (
            <>
              <p className="text-sm font-medium mb-1">
                Drag & drop CSV files here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Max file size: 10MB per file
              </p>
            </>
          )}
        </div>

        {/* Global Error */}
        {globalError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{globalError}</AlertDescription>
          </Alert>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            {files.map((uploadFile, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{uploadFile.file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatFileSize(uploadFile.file.size)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadFile.status === 'success' && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {uploadFile.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    {uploadFile.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {uploadFile.status === 'pending' && (
                  <select
                    value={uploadFile.type}
                    onChange={(e) => updateFileType(index, e.target.value as CSVFileType)}
                    className="w-full text-sm border rounded px-3 py-1.5 bg-background"
                  >
                    {Object.entries(FILE_TYPES).map(([type, { label }]) => (
                      <option key={type} value={type}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}

                {uploadFile.status === 'uploading' && (
                  <Progress value={uploadFile.progress} className="mt-2" />
                )}

                {uploadFile.status === 'error' && uploadFile.error && (
                  <p className="text-xs text-red-600 mt-2">{uploadFile.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        {canUpload && (
          <Button onClick={uploadFiles} className="w-full mt-4">
            Upload {files.length} File{files.length > 1 ? 's' : ''}
          </Button>
        )}

        {/* CSV Templates */}
        <div className="mt-6 pt-6 border-t">
          <div className="text-sm font-medium mb-3">Download CSV Templates:</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(FILE_TYPES).map(([type, { label, template }]) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                asChild
                className="justify-start"
              >
                <a href={template} download>
                  <Download className="h-3.5 w-3.5 mr-2" />
                  {label}
                </a>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
