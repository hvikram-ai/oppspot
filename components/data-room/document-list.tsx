'use client'

/**
 * Document List Component
 * Display and manage documents in a data room
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  FileText,
  File,
  FileSpreadsheet,
  FileCode,
  Search,
  Download,
  Eye,
  Trash2,
  Loader2,
  Filter,
  Calendar,
  HardDrive
} from 'lucide-react'
import type { Document, DocumentType } from '@/lib/data-room/types'
import Link from 'next/link'

interface DocumentListProps {
  dataRoomId: string
  documents: Document[]
  onDocumentDeleted: () => void
}

export function DocumentList({ dataRoomId, documents, onDocumentDeleted }: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all')

  const getDocumentIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-600" />
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-600" />
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-5 w-5 text-blue-600" />
    return <File className="h-5 w-5 text-muted-foreground" />
  }

  const getTypeColor = (type: DocumentType) => {
    const colors = {
      financial: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      contract: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      due_diligence: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      legal: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      hr: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
    return colors[type] || colors.other
  }

  const getProcessingStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge variant="outline" className="bg-green-50">✓ Analyzed</Badge>
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter
    return matchesSearch && matchesType
  })

  const documentTypes: DocumentType[] = ['financial', 'contract', 'due_diligence', 'legal', 'hr', 'other']

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Documents</CardTitle>
            <CardDescription>
              {documents.length} {documents.length === 1 ? 'document' : 'documents'} uploaded
            </CardDescription>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <Button
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter('all')}
            >
              All
            </Button>
            {documentTypes.map(type => (
              <Button
                key={type}
                variant={typeFilter === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter(type)}
              >
                {type.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery || typeFilter !== 'all' ? 'No documents found' : 'No documents yet'}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload documents to get started with AI analysis'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {getDocumentIcon(doc.mime_type)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">{doc.filename}</p>
                    <Badge className={getTypeColor(doc.document_type)}>
                      {doc.document_type.replace('_', ' ')}
                    </Badge>
                    {getProcessingStatusBadge(doc.processing_status)}
                    {doc.confidence_score > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {Math.round(doc.confidence_score * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      <span>{formatBytes(doc.file_size_bytes)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                    {doc.folder_path !== '/' && (
                      <div className="flex items-center gap-1">
                        <span>📁 {doc.folder_path}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link href={`/data-rooms/${dataRoomId}/documents/${doc.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </Link>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
