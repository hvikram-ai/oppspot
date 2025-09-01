'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import Link from 'next/link'
import { 
  Globe, 
  Users, 
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Activity,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Link2,
  ShoppingCart,
  Shield,
  Smartphone,
  Search,
  Mail,
  Phone,
  MapPin,
  Clock,
  DollarSign,
  Star
} from 'lucide-react'

interface SocialProfile {
  id?: string
  platform: string
  profile_url: string
  username?: string
  followers_count?: number
  following_count?: number
  posts_count?: number
  engagement_rate?: number
  bio?: string
  profile_image_url?: string
  is_active?: boolean
  last_scraped_at?: string
  verified?: boolean
}

interface WebsiteData {
  website_url: string
  title?: string
  meta_description?: string
  seo_score?: number
  has_ssl?: boolean
  mobile_friendly?: boolean
  has_online_store?: boolean
  payment_methods?: string[]
  emails?: string[]
  phone_numbers?: string[]
  social_links?: any
  services?: string[]
  products?: string[]
  technologies?: string[]
  last_scraped_at?: string
}

interface SocialScore {
  overall_score: number
  reach_score: number
  engagement_score: number
  activity_score: number
  growth_score: number
  strengths?: string[]
  weaknesses?: string[]
  recommendations?: string[]
}

interface SocialPresenceProps {
  businessId: string
  businessName?: string
  websiteUrl?: string
  isAdmin?: boolean
}

export function SocialPresence({ 
  businessId, 
  businessName,
  websiteUrl,
  isAdmin = false 
}: SocialPresenceProps) {
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  
  const [profiles, setProfiles] = useState<SocialProfile[]>([])
  const [websiteData, setWebsiteData] = useState<WebsiteData | null>(null)
  const [socialScore, setSocialScore] = useState<SocialScore | null>(null)

  useEffect(() => {
    fetchSocialData()
  }, [businessId])

  const fetchSocialData = async () => {
    try {
      const response = await fetch(`/api/businesses/social?businessId=${businessId}`)
      const data = await response.json()
      
      if (response.ok) {
        setProfiles(data.profiles || [])
        setWebsiteData(data.website)
        setSocialScore(data.socialScore)
      }
    } catch (error) {
      console.error('Error fetching social data:', error)
    } finally {
      setLoading(false)
    }
  }

  const scrapeSocialData = async () => {
    setScraping(true)
    try {
      const response = await fetch('/api/businesses/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          scrapeWebsite: true,
          scrapeSocial: true
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Social data updated successfully')
        await fetchSocialData()
      } else {
        toast.error(data.error || 'Failed to scrape social data')
      }
    } catch (error) {
      console.error('Scraping error:', error)
      toast.error('Failed to scrape social data')
    } finally {
      setScraping(false)
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return <Facebook className="h-5 w-5" />
      case 'instagram': return <Instagram className="h-5 w-5" />
      case 'twitter':
      case 'x': return <Twitter className="h-5 w-5" />
      case 'linkedin': return <Linkedin className="h-5 w-5" />
      case 'youtube': return <Youtube className="h-5 w-5" />
      default: return <Link2 className="h-5 w-5" />
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Needs Improvement'
  }

  const formatNumber = (num?: number) => {
    if (!num) return '0'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Social Media Presence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Social Media Presence
            </CardTitle>
            <CardDescription>
              Online presence and social media performance
            </CardDescription>
          </div>
          {isAdmin && websiteUrl && (
            <Button
              onClick={scrapeSocialData}
              disabled={scraping}
              size="sm"
            >
              {scraping ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update Data
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profiles">Social Profiles</TabsTrigger>
            <TabsTrigger value="website">Website Info</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Social Score */}
            {socialScore ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(socialScore.overall_score)}`}>
                    {socialScore.overall_score}
                  </div>
                  <Badge className="mt-2" variant="outline">
                    {getScoreLabel(socialScore.overall_score)}
                  </Badge>
                </div>

                {/* Score Breakdown */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Reach</span>
                      <span>{socialScore.reach_score}%</span>
                    </div>
                    <Progress value={socialScore.reach_score} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Engagement</span>
                      <span>{socialScore.engagement_score}%</span>
                    </div>
                    <Progress value={socialScore.engagement_score} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Activity</span>
                      <span>{socialScore.activity_score}%</span>
                    </div>
                    <Progress value={socialScore.activity_score} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Growth</span>
                      <span>{socialScore.growth_score}%</span>
                    </div>
                    <Progress value={socialScore.growth_score} className="h-2" />
                  </div>
                </div>

                {/* Insights */}
                {(socialScore.strengths?.length || socialScore.weaknesses?.length || socialScore.recommendations?.length) && (
                  <div className="space-y-4">
                    {socialScore.strengths && socialScore.strengths.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Strengths
                        </h4>
                        <ul className="space-y-1">
                          {socialScore.strengths.map((strength, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground">
                              • {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {socialScore.weaknesses && socialScore.weaknesses.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          Areas for Improvement
                        </h4>
                        <ul className="space-y-1">
                          {socialScore.weaknesses.map((weakness, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground">
                              • {weakness}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {socialScore.recommendations && socialScore.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          Recommendations
                        </h4>
                        <ul className="space-y-1">
                          {socialScore.recommendations.map((rec, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground">
                              • {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No social media data available
                </p>
                {isAdmin && websiteUrl && (
                  <Button onClick={scrapeSocialData} className="mt-4">
                    Analyze Social Presence
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profiles" className="space-y-4">
            {profiles.length > 0 ? (
              profiles.map(profile => (
                <div key={profile.id || profile.platform} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-accent rounded-lg">
                        {getPlatformIcon(profile.platform)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold capitalize">
                            {profile.platform}
                          </h4>
                          {profile.verified && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                          {profile.is_active ? (
                            <Badge variant="outline" className="text-xs">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        {profile.username && (
                          <p className="text-sm text-muted-foreground">@{profile.username}</p>
                        )}
                        {profile.bio && (
                          <p className="text-sm mt-1">{profile.bio}</p>
                        )}
                        
                        {/* Metrics */}
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          {profile.followers_count !== undefined && (
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{formatNumber(profile.followers_count)} followers</span>
                            </div>
                          )}
                          {profile.posts_count !== undefined && (
                            <div className="flex items-center gap-1">
                              <MessageCircle className="h-4 w-4 text-muted-foreground" />
                              <span>{formatNumber(profile.posts_count)} posts</span>
                            </div>
                          )}
                          {profile.engagement_rate !== undefined && (
                            <div className="flex items-center gap-1">
                              <Heart className="h-4 w-4 text-muted-foreground" />
                              <span>{profile.engagement_rate.toFixed(1)}% engagement</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Link 
                      href={profile.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No social media profiles found
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="website" className="space-y-4">
            {websiteData ? (
              <>
                {/* Website Overview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Website</span>
                    </div>
                    <Link 
                      href={websiteData.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline">
                        Visit Site
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>

                  {websiteData.title && (
                    <div>
                      <p className="font-medium text-sm">Title</p>
                      <p className="text-sm text-muted-foreground">{websiteData.title}</p>
                    </div>
                  )}

                  {websiteData.meta_description && (
                    <div>
                      <p className="font-medium text-sm">Description</p>
                      <p className="text-sm text-muted-foreground">{websiteData.meta_description}</p>
                    </div>
                  )}
                </div>

                {/* Technical Info */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Technical Details</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      {websiteData.has_ssl ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm">SSL Certificate</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {websiteData.mobile_friendly ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm">Mobile Friendly</span>
                    </div>

                    {websiteData.has_online_store !== undefined && (
                      <div className="flex items-center gap-2">
                        {websiteData.has_online_store ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm">E-commerce</span>
                      </div>
                    )}

                    {websiteData.seo_score !== undefined && (
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">SEO Score: {websiteData.seo_score}/100</span>
                      </div>
                    )}
                  </div>

                  {websiteData.technologies && websiteData.technologies.length > 0 && (
                    <div>
                      <p className="font-medium text-sm mb-2">Technologies</p>
                      <div className="flex flex-wrap gap-2">
                        {websiteData.technologies.map((tech, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {websiteData.payment_methods && websiteData.payment_methods.length > 0 && (
                    <div>
                      <p className="font-medium text-sm mb-2">Payment Methods</p>
                      <div className="flex flex-wrap gap-2">
                        {websiteData.payment_methods.map((method, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {method}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                {(websiteData.emails?.length || websiteData.phone_numbers?.length) && (
                  <div className="border rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-sm">Contact Information Found</h4>
                    
                    {websiteData.emails && websiteData.emails.length > 0 && (
                      <div>
                        <p className="font-medium text-sm mb-1 flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          Emails
                        </p>
                        {websiteData.emails.slice(0, 3).map((email, idx) => (
                          <p key={idx} className="text-sm text-muted-foreground">
                            {email}
                          </p>
                        ))}
                      </div>
                    )}

                    {websiteData.phone_numbers && websiteData.phone_numbers.length > 0 && (
                      <div>
                        <p className="font-medium text-sm mb-1 flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          Phone Numbers
                        </p>
                        {websiteData.phone_numbers.slice(0, 3).map((phone, idx) => (
                          <p key={idx} className="text-sm text-muted-foreground">
                            {phone}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Services/Products */}
                {(websiteData.services?.length || websiteData.products?.length) && (
                  <div className="border rounded-lg p-4 space-y-3">
                    {websiteData.services && websiteData.services.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Services</h4>
                        <div className="flex flex-wrap gap-2">
                          {websiteData.services.slice(0, 10).map((service, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {websiteData.products && websiteData.products.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Products</h4>
                        <div className="flex flex-wrap gap-2">
                          {websiteData.products.slice(0, 10).map((product, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {product}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {websiteData.last_scraped_at && (
                  <p className="text-xs text-muted-foreground text-center">
                    Last updated: {new Date(websiteData.last_scraped_at).toLocaleDateString()}
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No website data available
                </p>
                {isAdmin && websiteUrl && (
                  <Button onClick={scrapeSocialData} className="mt-4">
                    Analyze Website
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}