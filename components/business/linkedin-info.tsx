'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { 
  Linkedin, 
  Users, 
  Building2, 
  Calendar, 
  MapPin, 
  Globe, 
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Loader2,
  CheckCircle
} from 'lucide-react'

interface LinkedInData {
  url?: string
  industry?: string
  company_size?: string
  employee_count?: number
  headquarters?: string
  founded?: number
  specialties?: string[]
  followers?: number
  tagline?: string
  description?: string
  last_updated?: string
  data_source?: string
}

interface LinkedInInfoProps {
  businessId: string
  businessName: string
  linkedinData?: LinkedInData | null
  isAdmin?: boolean
  onUpdate?: () => void
}

export function LinkedInInfo({ 
  businessId, 
  businessName, 
  linkedinData, 
  isAdmin = false,
  onUpdate
}: LinkedInInfoProps) {
  const [loading, setLoading] = useState(false)
  const [searchResult, setSearchResult] = useState<unknown>(null)

  const handleSearchLinkedIn = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/businesses/linkedin?company=${encodeURIComponent(businessName)}`)
      const data = await response.json()

      if (response.ok && data.found) {
        setSearchResult(data)
        toast.success('LinkedIn profile found!')
      } else {
        toast.error('No LinkedIn profile found for this business')
      }
    } catch (error) {
      console.error('LinkedIn search error:', error)
      toast.error('Failed to search LinkedIn')
    } finally {
      setLoading(false)
    }
  }

  const handleEnrichWithLinkedIn = async (linkedinUrl?: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/businesses/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          linkedinUrl: linkedinUrl || (searchResult as { linkedin_url?: string })?.linkedin_url,
          autoSearch: !linkedinUrl
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('LinkedIn data enriched successfully')
        setSearchResult(null)
        if (onUpdate) onUpdate()
      } else {
        toast.error(data.error || 'Failed to enrich LinkedIn data')
      }
    } catch (error) {
      console.error('LinkedIn enrichment error:', error)
      toast.error('Failed to enrich with LinkedIn data')
    } finally {
      setLoading(false)
    }
  }

  const formatEmployeeCount = (count: number) => {
    if (count > 10000) return '10,000+'
    if (count > 1000) return `${Math.floor(count / 1000)}k+`
    return count.toLocaleString()
  }

  const getDataSourceBadge = (source?: string) => {
    switch (source) {
      case 'proxycurl':
        return <Badge variant="default" className="text-xs">Verified Data</Badge>
      case 'bulk_search':
        return <Badge variant="secondary" className="text-xs">Auto-Discovered</Badge>
      default:
        return <Badge variant="outline" className="text-xs">Basic Data</Badge>
    }
  }

  if (!linkedinData && !isAdmin) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Linkedin className="h-5 w-5 text-[#0077B5]" />
            <CardTitle>LinkedIn Profile</CardTitle>
          </div>
          {linkedinData?.data_source && getDataSourceBadge(linkedinData.data_source)}
        </div>
        {linkedinData?.tagline && (
          <CardDescription>{linkedinData.tagline}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {linkedinData ? (
          <>
            {/* LinkedIn URL */}
            {linkedinData.url && (
              <div className="flex items-center justify-between">
                <a
                  href={linkedinData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-primary hover:underline"
                >
                  <span>View LinkedIn Profile</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
                {linkedinData.followers && (
                  <span className="text-sm text-muted-foreground">
                    {linkedinData.followers.toLocaleString()} followers
                  </span>
                )}
              </div>
            )}

            <Separator />

            {/* Company Information Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {linkedinData.industry && (
                <div className="flex items-start space-x-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Industry</p>
                    <p className="text-sm text-muted-foreground">{linkedinData.industry}</p>
                  </div>
                </div>
              )}

              {(linkedinData.employee_count || linkedinData.company_size) && (
                <div className="flex items-start space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Company Size</p>
                    <p className="text-sm text-muted-foreground">
                      {linkedinData.employee_count 
                        ? formatEmployeeCount(linkedinData.employee_count)
                        : linkedinData.company_size}
                    </p>
                  </div>
                </div>
              )}

              {linkedinData.headquarters && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Headquarters</p>
                    <p className="text-sm text-muted-foreground">{linkedinData.headquarters}</p>
                  </div>
                </div>
              )}

              {linkedinData.founded && (
                <div className="flex items-start space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Founded</p>
                    <p className="text-sm text-muted-foreground">{linkedinData.founded}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Specialties */}
            {linkedinData.specialties && linkedinData.specialties.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Specialties</p>
                  <div className="flex flex-wrap gap-2">
                    {linkedinData.specialties.map((specialty, index) => (
                      <Badge key={index} variant="secondary">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* LinkedIn Description */}
            {linkedinData.description && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">About</p>
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {linkedinData.description}
                  </p>
                </div>
              </>
            )}

            {/* Last Updated */}
            {linkedinData.last_updated && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  Updated: {new Date(linkedinData.last_updated).toLocaleDateString()}
                </span>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEnrichWithLinkedIn(linkedinData.url)}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refresh
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          // No LinkedIn data - show search/enrich options for admins
          isAdmin && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No LinkedIn profile linked to this business yet.
              </p>

              {!searchResult ? (
                <Button
                  onClick={handleSearchLinkedIn}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Linkedin className="mr-2 h-4 w-4" />
                      Search for LinkedIn Profile
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Found LinkedIn Profile</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <a
                      href={(searchResult as { linkedin_url?: string }).linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center"
                    >
                      {(searchResult as { linkedin_url?: string }).linkedin_url}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleEnrichWithLinkedIn()}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enriching...
                        </>
                      ) : (
                        'Add to Business'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSearchResult(null)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}