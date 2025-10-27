'use client'

/**
 * Document Viewer Page
 * View document with AI insights sidebar
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Loader2,
  Download,
  Share2,
  Trash2,
  RefreshCw,
  ChevronRight
} from 'lucide-react'
import { DocumentViewer } from '@/components/data-room/document-viewer'
import { AIInsightsSidebar } from '@/components/data-room/ai-insights-sidebar'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import type { Document, DocumentAnalysis } from '@/lib/data-room/types'
import { useDataRoomStore } from '@/lib/stores/data-room-store'

export default function DocumentViewerPage() {
  const params = useParams()
  const router = useRouter()
  const [document, setDocument] = useState<Document | null>(null)
  const [analyses, setAnalyses] = useState<DocumentAnalysis[]>([])
  const [documentUrl, setDocumentUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get page and zoom from store
  const { currentPage, zoomLevel, setCurrentPage } = useDataRoomStore()

  const fetchDocument = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch document details
      const response = await fetch(`/api/data-room/documents/${params.documentId}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to load document')
      }

      setDocument(result.data.document)
      setAnalyses(result.data.analyses || [])

      // Get signed URL for document viewing
      setDocumentUrl(result.data.document.storage_path)
    } catch (err) {
      console.error('Error loading document:', err)
      setError(err instanceof Error ? err.message : 'Failed to load document')
    } finally {
      setLoading(false)
    }
  }, [params.documentId])

  useEffect(() => {
    fetchDocument()
  }, [fetchDocument])

  const handleDownload = () => {
    if (documentUrl) {
      const link = document.createElement('a')
      link.href = documentUrl
      link.download = document?.filename || 'document'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this document? This cannot be undone.')) return

    try {
      const response = await fetch(`/api/data-room/documents/${params.documentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push(`/data-rooms/${params.id}`)
      } else {
        alert('Failed to delete document')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete document')
    }
  }

  const handleReanalyze = async () => {
    if (!confirm('Re-run AI analysis on this document?')) return

    try {
      setLoading(true)
      const response = await fetch(`/api/data-room/documents/${params.documentId}/analyze`, {
        method: 'POST'
      })

      if (response.ok) {
        // Refresh document data
        await fetchDocument()
      } else {
        alert('Failed to trigger analysis')
      }
    } catch (error) {
      console.error('Analysis error:', error)
      alert('Failed to trigger analysis')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !document) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ProtectedLayout>
    )
  }

  if (error || !document) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <h2 className="text-2xl font-bold mb-2">Document Not Found</h2>
            <p className="text-muted-foreground mb-6">{error || 'This document could not be loaded'}</p>
            <Link href={`/data-rooms/${params.id}`}>
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Data Room
              </Button>
            </Link>
          </div>
        </div>
      </ProtectedLayout>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-800">Analyzed</Badge>
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  return (
    <ProtectedLayout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="border-b bg-background">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Breadcrumb & Title */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Link href={`/data-rooms/${params.id}`}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-3 min-w-0">
                  <h1 className="text-lg font-semibold truncate">{document.filename}</h1>
                  {getStatusBadge(document.processing_status)}
                  <Badge variant="outline" className="capitalize">
                    {document.document_type.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {document.processing_status === 'failed' && (
                  <Button variant="outline" size="sm" onClick={handleReanalyze} disabled={loading}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-analyze
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Document Viewer */}
            <div className="flex-1 overflow-hidden">
              <DocumentViewer
                documentUrl={documentUrl}
                filename={document.filename}
                initialPage={currentPage}
                initialZoom={zoomLevel}
                onPageChange={(page) => setCurrentPage(page)}
                className="h-full"
              />
            </div>

            {/* AI Insights Sidebar */}
            <div className="w-96 border-l overflow-y-auto bg-background">
              <AIInsightsSidebar
                document={document}
                analyses={analyses}
                loading={document.processing_status === 'processing'}
              />
            </div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
