'use client'

/**
 * Upload Zone Component
 * Drag & drop file upload for data rooms
 */

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  dataRoomId: string
  onUploadComplete: () => void
}

interface UploadingFile {
  file: File
  status: 'uploading' | 'complete' | 'error'
  progress: number
  error?: string
}

export function UploadZone({ dataRoomId, onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFiles = useCallback(async (files: File[]) => {
    // Add files to uploading state
    const newUploadingFiles: UploadingFile[] = files.map(file => ({
      file,
      status: 'uploading',
      progress: 0
    }))

    setUploadingFiles(prev => [...prev, ...newUploadingFiles])

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      await uploadFile(files[i], i + uploadingFiles.length)
    }

    // Notify parent
    onUploadComplete()
  }, [uploadingFiles.length, onUploadComplete])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [handleFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }
  }, [handleFiles])

  const uploadFile = async (file: File, index: number) => {
    try {
      // TODO: This is a placeholder. In production, you would:
      // 1. Upload to Supabase Storage
      // 2. Create document record in database
      // 3. Trigger AI classification

      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setUploadingFiles(prev =>
          prev.map((f, i) =>
            i === index ? { ...f, progress } : f
          )
        )
      }

      // Mark as complete
      setUploadingFiles(prev =>
        prev.map((f, i) =>
          i === index ? { ...f, status: 'complete', progress: 100 } : f
        )
      )

      // Remove after 2 seconds
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter((_, i) => i !== index))
      }, 2000)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadingFiles(prev =>
        prev.map((f, i) =>
          i === index
            ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
            : f
        )
      )
    }
  }

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card
        className={cn(
          'border-2 border-dashed transition-colors cursor-pointer',
          isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-muted-foreground/25'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Upload className={cn(
            'h-12 w-12 mb-4',
            isDragging ? 'text-blue-600' : 'text-muted-foreground'
          )} />
          <h3 className="text-lg font-semibold mb-2">
            {isDragging ? 'Drop files here' : 'Upload Documents'}
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Drag & drop files here, or click to browse
          </p>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          />
          <label htmlFor="file-upload">
            <Button type="button" asChild>
              <span>
                <FileText className="h-4 w-4 mr-2" />
                Browse Files
              </span>
            </Button>
          </label>
          <p className="text-xs text-muted-foreground mt-4">
            Supported: PDF, Word, Excel, PowerPoint, Text, CSV (Max 100MB per file)
          </p>
        </CardContent>
      </Card>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {uploadingFiles.map((uploadFile, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  {uploadFile.status === 'uploading' && (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  )}
                  {uploadFile.status === 'complete' && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {uploadFile.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {uploadFile.file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(uploadFile.file.size)}
                    </p>
                    {uploadFile.status === 'uploading' && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground">
                          {uploadFile.progress}%
                        </p>
                      </>
                    )}
                    {uploadFile.status === 'complete' && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-green-600">Complete</p>
                      </>
                    )}
                    {uploadFile.status === 'error' && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-red-600">
                          {uploadFile.error || 'Failed'}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Progress bar */}
                  {uploadFile.status === 'uploading' && (
                    <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {uploadFile.status !== 'uploading' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
