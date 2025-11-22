"use client"

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { ProtectedLayout } from '@/components/layout/protected-layout'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CSVUploadZone } from '@/components/financials'
import type { UploadResult } from '@/components/financials/csv-upload-zone'

interface UploadPageProps {
  params: Promise<{
    id: string
  }>
}

interface UploadHistory {
  id: string
  uploaded_at: string
  affected_months: {
    start: string
    end: string
  }
  file_types: string[]
  status: 'processing' | 'completed' | 'failed'
}

export default function FinancialsUploadPage({ params }: UploadPageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [companyName, setCompanyName] = useState<string>('')
  const [hasPermission, setHasPermission] = useState<boolean>(true)
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([])
  const [lastUploadResult, setLastUploadResult] = useState<UploadResult | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Fetch company name and check permissions
    async function loadData() {
      try {
        // Fetch company
        const companyRes = await fetch(`/api/companies/${resolvedParams.id}`)
        if (companyRes.ok) {
          const company = await companyRes.json()
          setCompanyName(company.name || 'Company')
        }

        // Check user has Financial Editor role
        const permissionRes = await fetch(`/api/companies/${resolvedParams.id}/financials/permissions`)
        if (permissionRes.ok) {
          const permissions = await permissionRes.json()
          setHasPermission(permissions.can_edit || false)
        }

        // Fetch upload history (last 10 uploads)
        const historyRes = await fetch(`/api/companies/${resolvedParams.id}/financials/uploads`)
        if (historyRes.ok) {
          const history = await historyRes.json()
          setUploadHistory(history.data || [])
        }
      } catch (error) {
        console.error('Failed to load upload page data:', error)
      }
    }

    loadData()
  }, [resolvedParams.id])

  const handleUploadComplete = (result: UploadResult) => {
    setLastUploadResult(result)

    // Add to history
    setUploadHistory((prev) => [
      {
        id: result.upload_id,
        uploaded_at: new Date().toISOString(),
        affected_months: result.affected_months,
        file_types: [], // Would come from upload metadata
        status: 'processing',
      },
      ...prev,
    ])

    // Redirect to dashboard after 3 seconds
    setIsRedirecting(true)
    setTimeout(() => {
      router.push(`/companies/${resolvedParams.id}/financials`)
    }, 3000)
  }

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error)
    // Error is already displayed in CSVUploadZone component
  }

  if (!hasPermission) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto py-6 space-y-6">
          <Breadcrumbs
            items={[
              { label: 'Companies', href: '/companies' },
              { label: companyName, href: `/business/${resolvedParams.id}` },
              { label: 'Financials', href: `/companies/${resolvedParams.id}/financials` },
              { label: 'Upload', href: `/companies/${resolvedParams.id}/financials/upload` },
            ]}
          />

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Permission Denied</AlertTitle>
            <AlertDescription>
              You do not have permission to upload financial data for this company. Please contact
              your organization administrator to request Financial Editor access.
            </AlertDescription>
          </Alert>

          <Button variant="outline" asChild>
            <Link href={`/companies/${resolvedParams.id}/financials`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto py-6 space-y-6 max-w-4xl">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Companies', href: '/companies' },
            { label: companyName, href: `/business/${resolvedParams.id}` },
            { label: 'Financials', href: `/companies/${resolvedParams.id}/financials` },
            { label: 'Upload', href: `/companies/${resolvedParams.id}/financials/upload` },
          ]}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Upload Financial Data</h1>
            <p className="text-muted-foreground">
              Import CSV files to generate financial analytics
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/companies/${resolvedParams.id}/financials`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Success Message */}
        {lastUploadResult && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Upload Successful!</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Data uploaded successfully. Metrics are being recalculated for{' '}
                {new Date(lastUploadResult.affected_months.start).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                to{' '}
                {new Date(lastUploadResult.affected_months.end).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
                .
              </p>
              {isRedirecting && (
                <p className="text-sm text-muted-foreground">
                  Redirecting to dashboard in 3 seconds...
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Zone */}
        <CSVUploadZone
          companyId={resolvedParams.id}
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
        />

        {/* Upload Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Instructions</CardTitle>
            <CardDescription>Follow these guidelines for successful data import</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm list-decimal list-inside">
              <li>
                <strong>Download templates</strong> for each data type (subscriptions, invoices,
                payments, COGS, sales & marketing)
              </li>
              <li>
                <strong>Fill in your data</strong> following the column names exactly as shown in
                the templates
              </li>
              <li>
                <strong>Ensure single currency</strong> - all amounts must be in the same currency
                {`as your company's reporting currency`}
              </li>
              <li>
                <strong>Use ISO date format</strong> (YYYY-MM-DD) for all date fields
              </li>
              <li>
                <strong>Include unique IDs</strong> for customers, subscriptions, and invoices to
                enable idempotent uploads
              </li>
              <li>
                <strong>Upload multiple files</strong> at once - all related data will be
                processed together
              </li>
            </ol>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs">
              <p className="font-medium mb-1">Important Notes:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Re-uploading the same data (same IDs and amounts) will not create duplicates</li>
                <li>Metrics are automatically recalculated after successful upload</li>
                <li>Large uploads may take 1-2 minutes to process</li>
                <li>Maximum file size: 10MB per CSV file</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Upload History */}
        {uploadHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Uploads</CardTitle>
              <CardDescription>Last 10 data uploads for this company</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadHistory.map((upload) => (
                  <div
                    key={upload.id}
                    className="flex items-center justify-between border rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      {upload.status === 'completed' && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                      {upload.status === 'processing' && (
                        <Clock className="h-5 w-5 text-yellow-600" />
                      )}
                      {upload.status === 'failed' && (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <div className="text-sm font-medium">
                          {new Date(upload.uploaded_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Affected:{' '}
                          {new Date(upload.affected_months.start).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          -{' '}
                          {new Date(upload.affected_months.end).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {upload.status}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  )
}
