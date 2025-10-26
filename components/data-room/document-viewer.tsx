'use client'

/**
 * Document Viewer Component
 * PDF viewer with navigation, zoom, and annotation support
 */

import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  FileText,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface DocumentViewerProps {
  documentUrl: string
  filename: string
  className?: string
  onPageChange?: (page: number) => void
  initialPage?: number
  initialZoom?: number
}

export function DocumentViewer({
  documentUrl,
  filename,
  className,
  onPageChange,
  initialPage = 1,
  initialZoom = 1
}: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [zoom, setZoom] = useState(initialZoom)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }, [])

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error)
    setError('Failed to load document. Please try again.')
    setLoading(false)
  }, [])

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      onPageChange?.(newPage)
    }
  }

  const goToNextPage = () => {
    if (currentPage < numPages) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      onPageChange?.(newPage)
    }
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5))
  }

  const handleZoomChange = (value: number[]) => {
    setZoom(value[0])
  }

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev)
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = documentUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="border-b p-4 flex items-center justify-between gap-4 flex-wrap bg-muted/30">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 text-sm min-w-[100px] justify-center">
            <span className="font-medium">{currentPage}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{numPages || '?'}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= numPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-[150px]">
            <Slider
              value={[zoom]}
              onValueChange={handleZoomChange}
              min={0.5}
              max={3}
              step={0.25}
              className="w-full"
            />
            <span className="text-sm font-medium min-w-[45px]">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Document Viewer */}
      <CardContent
        className={cn(
          'flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900',
          isFullscreen && 'fixed inset-0 z-50 p-6'
        )}
      >
        <div className="flex items-center justify-center min-h-full">
          {loading && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading document...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-4 text-center max-w-md">
              <FileText className="h-16 w-16 text-muted-foreground opacity-50" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Failed to Load Document</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {!error && (
            <div className="shadow-2xl">
              <Document
                file={documentUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  scale={zoom}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-lg"
                />
              </Document>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
