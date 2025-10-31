'use client'

/**
 * Q&A Document Preview Component
 * Feature: 008-oppspot-docs-dataroom
 * Task: T031
 *
 * Extends the existing DocumentViewer to support citation navigation:
 * - Parse URL hash: #page={num}&chunk={chunkId}
 * - Scroll to specified page
 * - Highlight cited text section
 * - Show citation context (~240 chars)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
}

interface CitationHighlight {
  page: number
  chunkId?: string
  text: string
  startChar?: number
  endChar?: number
}

interface QADocumentPreviewProps {
  documentUrl: string
  documentTitle: string
  documentId?: string
  className?: string
  initialPage?: number
  citationHighlight?: CitationHighlight
  onClose?: () => void
}

export function QADocumentPreview({
  documentUrl,
  documentTitle,
  documentId,
  className,
  initialPage,
  citationHighlight,
  onClose
}: QADocumentPreviewProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(initialPage || 1)
  const [zoom, setZoom] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [highlightInfo, setHighlightInfo] = useState<CitationHighlight | null>(
    citationHighlight || null
  )

  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse URL hash for citation navigation
  useEffect(() => {
    if (typeof window === 'undefined') return

    const parseHashParams = () => {
      const hash = window.location.hash.slice(1) // Remove #
      const params = new URLSearchParams(hash)

      const pageParam = params.get('page')
      const chunkParam = params.get('chunk')

      if (pageParam) {
        const pageNum = parseInt(pageParam, 10)
        if (!isNaN(pageNum) && pageNum > 0) {
          setCurrentPage(pageNum)

          // If chunk ID provided, store for highlighting
          if (chunkParam) {
            setHighlightInfo({
              page: pageNum,
              chunkId: chunkParam,
              text: '' // Will be populated if citation data available
            })
          }
        }
      }
    }

    parseHashParams()

    // Listen for hash changes
    window.addEventListener('hashchange', parseHashParams)
    return () => window.removeEventListener('hashchange', parseHashParams)
  }, [])

  // Update page when citationHighlight prop changes
  useEffect(() => {
    if (citationHighlight) {
      setCurrentPage(citationHighlight.page)
      setHighlightInfo(citationHighlight)

      // Wait for page to render, then scroll to it
      setTimeout(() => {
        scrollToPage(citationHighlight.page)
      }, 500)
    }
  }, [citationHighlight])

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)

    // Scroll to initial page after document loads
    if (currentPage > 1) {
      setTimeout(() => {
        scrollToPage(currentPage)
      }, 300)
    }
  }, [currentPage])

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error)
    setError('Failed to load document. Please try again.')
    setLoading(false)
  }, [])

  const scrollToPage = (pageNum: number) => {
    const pageElement = pageRefs.current.get(pageNum)
    if (pageElement && containerRef.current) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      scrollToPage(newPage)
    }
  }

  const goToNextPage = () => {
    if (currentPage < numPages) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      scrollToPage(newPage)
    }
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5))
  }

  const clearHighlight = () => {
    setHighlightInfo(null)
    // Clear hash without reloading
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }

  const onPageRenderSuccess = (pageNum: number) => {
    // If this is the highlighted page, we could add text selection here
    // For now, we just show the highlight banner
    if (highlightInfo && highlightInfo.page === pageNum) {
      // Page rendered with highlight
    }
  }

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <h3 className="font-semibold truncate">{documentTitle}</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Close Button */}
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Citation Highlight Banner */}
      {highlightInfo && (
        <Alert className="m-4 mb-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium">Citation highlighted</p>
              {highlightInfo.text && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  "{highlightInfo.text}"
                </p>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={clearHighlight}>
              <X className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* PDF Viewer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-muted/20 p-4"
      >
        <div className="max-w-4xl mx-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          <Document
            file={documentUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            className="flex flex-col gap-4"
          >
            {Array.from(new Array(numPages), (el, index) => {
              const pageNum = index + 1
              const isHighlightedPage = highlightInfo?.page === pageNum

              return (
                <div
                  key={`page_${pageNum}`}
                  ref={(el) => {
                    if (el) pageRefs.current.set(pageNum, el)
                  }}
                  className="relative"
                >
                  {/* Page Number Badge */}
                  <Badge
                    variant={isHighlightedPage ? 'default' : 'secondary'}
                    className={cn(
                      'absolute top-2 right-2 z-10',
                      isHighlightedPage && 'bg-yellow-500 text-yellow-950'
                    )}
                  >
                    Page {pageNum}
                    {isHighlightedPage && ' (Citation)'}
                  </Badge>

                  {/* PDF Page with optional highlight */}
                  <Card
                    className={cn(
                      'overflow-hidden shadow-lg',
                      isHighlightedPage && 'ring-2 ring-yellow-400 ring-offset-2'
                    )}
                  >
                    <Page
                      pageNumber={pageNum}
                      scale={zoom}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      onRenderSuccess={() => onPageRenderSuccess(pageNum)}
                      loading={
                        <div className="flex items-center justify-center p-12 bg-muted/50">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      }
                    />
                  </Card>

                  {/* Highlight Context (shown below highlighted page) */}
                  {isHighlightedPage && highlightInfo.text && (
                    <Card className="mt-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20">
                      <CardContent className="p-3">
                        <p className="text-xs font-medium mb-1">Citation Context:</p>
                        <p className="text-sm text-muted-foreground italic">
                          "{highlightInfo.text}"
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )
            })}
          </Document>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between p-4 border-t bg-card">
        <Button
          size="sm"
          variant="outline"
          onClick={goToPreviousPage}
          disabled={currentPage <= 1 || loading}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <span className="text-sm font-medium">
          Page {currentPage} of {numPages || '...'}
        </span>

        <Button
          size="sm"
          variant="outline"
          onClick={goToNextPage}
          disabled={currentPage >= numPages || loading}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

/**
 * Helper function to generate citation navigation URL
 * Used by other components to create links to specific pages/chunks
 */
export function generateCitationUrl(
  documentId: string,
  pageNumber: number,
  chunkId?: string
): string {
  const baseUrl = `/data-room/documents/${documentId}`
  const hash = `page=${pageNumber}${chunkId ? `&chunk=${chunkId}` : ''}`
  return `${baseUrl}#${hash}`
}

/**
 * Hook for parsing citation URL parameters
 * Can be used in page components that need to read citation data from URL
 */
export function useCitationUrlParams() {
  const [params, setParams] = useState<{
    page: number | null
    chunkId: string | null
  }>({ page: null, chunkId: null })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const parseParams = () => {
      const hash = window.location.hash.slice(1)
      const urlParams = new URLSearchParams(hash)

      const pageParam = urlParams.get('page')
      const chunkParam = urlParams.get('chunk')

      setParams({
        page: pageParam ? parseInt(pageParam, 10) : null,
        chunkId: chunkParam
      })
    }

    parseParams()
    window.addEventListener('hashchange', parseParams)
    return () => window.removeEventListener('hashchange', parseParams)
  }, [])

  return params
}
