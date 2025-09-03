'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDemoMode } from '@/lib/demo/demo-context'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  Camera,
  Printer,
  TrendingUp, 
  TrendingDown,
  Building2,
  Globe,
  DollarSign,
  Shield,
  Target,
  Brain,
  FileText,
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
  RefreshCcw,
  Share2,
  Bookmark,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { SimilarityMatrix } from '@/components/similar-companies/similarity-matrix'
import { ScoreConfidenceScatter } from '@/components/similar-companies/score-confidence-scatter'
import { MultiDimensionalRadar } from '@/components/similar-companies/multi-dimensional-radar'
import { SimilarityNetwork } from '@/components/similar-companies/similarity-network'

interface SimilarityAnalysis {
  id: string
  target_company_name: string
  target_company_data: any
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_companies_analyzed: number
  average_similarity_score: number
  top_similarity_score: number
  executive_summary: string
  key_opportunities: string[]
  risk_highlights: string[]
  strategic_recommendations: string[]
  analysis_configuration: any
  created_at: string
  completed_at: string
  similar_company_matches: SimilarityMatch[]
  summary: {
    totalMatches: number
    averageScore: number
    topScore: number
    scoreDistribution: {
      excellent: number
      good: number
      fair: number
      poor: number
    }
    confidenceDistribution: {
      high: number
      medium: number
      low: number
    }
  }
}

interface SimilarityMatch {
  id: string
  company_name: string
  company_data: any
  overall_score: number
  confidence: number
  rank: number
  financial_score: number
  strategic_score: number
  operational_score: number
  market_score: number
  risk_score: number
  financial_confidence: number
  strategic_confidence: number
  operational_confidence: number
  market_confidence: number
  risk_confidence: number
  financial_factors: any
  strategic_factors: any
  operational_factors: any
  market_factors: any
  risk_factors: any
  market_position: string
  risk_factors_identified: string[]
  opportunity_areas: string[]
  data_points_used: number
  similarity_explanations?: Array<{
    summary: string
    key_reasons: string[]
    financial_rationale: string
    strategic_rationale: string
    risk_considerations: string[]
    confidence_level: string
    data_quality_note: string
  }>
}

function SimilarCompanyDetailContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const analysisId = params.id as string
  const targetCompanyFromUrl = searchParams.get('target')
  const supabase = createClient()
  const { isDemoMode, demoData } = useDemoMode()
  
  const [analysis, setAnalysis] = useState<SimilarityAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [pageExportLoading, setPageExportLoading] = useState(false)
  const [printLoading, setPrintLoading] = useState(false)
  const [filterCriteria, setFilterCriteria] = useState({
    minScore: 0,
    maxScore: 100,
    confidenceLevel: 'all',
    scoreCategory: 'all'
  })

  useEffect(() => {
    const getUser = async () => {
      if (isDemoMode) {
        setUser(demoData.user)
        // Load demo analysis data
        await loadDemoAnalysis()
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      await loadAnalysis(user.id)
    }
    getUser()
  }, [isDemoMode, analysisId])

  const loadDemoAnalysis = async () => {
    // Get the target company name from URL parameter or fallback to default
    const targetCompanyName = targetCompanyFromUrl || 'Demo Company'
    
    // Intelligent Business Context Analysis Engine
    const analyzeBusinessContext = (companyName: string) => {
      const nameLower = companyName.toLowerCase().trim()
      
      // Curated competitive landscapes based on real market intelligence
      const businessContexts = {
        // Innovation Management & R&D Platforms
        'innovation_management': {
          triggers: ['itonics', 'innovation', 'ideation', 'r&d platform', 'idea management', 'innovation platform'],
          businessFunction: 'Innovation Process Management',
          targetCustomers: 'Enterprise R&D teams, Innovation managers, Corporate venture arms',
          businessModel: 'B2B SaaS - Enterprise innovation platforms ($50K-500K annual contracts)',
          marketSegment: 'Corporate Innovation Management Software',
          companySize: '$10M-100M revenue, 100-500 employees',
          competitors: [
            { name: 'HYPE Innovation', reason: 'Direct competitor - innovation management platform', similarity: 94 },
            { name: 'Brightidea', reason: 'Idea management and innovation software', similarity: 91 },
            { name: 'Qmarkets', reason: 'Enterprise innovation management platform', similarity: 89 },
            { name: 'IdeaScale', reason: 'Crowdsourced innovation and idea management', similarity: 85 },
            { name: 'Planbox', reason: 'Innovation workflow and project management', similarity: 82 },
            { name: 'Spigit (Mindtree)', reason: 'Social innovation platform', similarity: 79 },
            { name: 'Viima', reason: 'Innovation management software for enterprises', similarity: 76 },
            { name: 'Accept Mission', reason: 'Innovation challenge platform', similarity: 73 },
            { name: 'Wazoku', reason: 'Crowdsourced innovation platform', similarity: 71 },
            { name: 'Innovation Cloud', reason: 'Corporate innovation management suite', similarity: 68 }
          ],
          opportunities: ['R&D digital transformation', 'Corporate venture integration', 'AI-enhanced innovation scoring', 'Cross-industry innovation networks'],
          risks: ['Economic R&D budget cuts', 'Internal innovation team consolidation', 'Open innovation platform competition', 'Enterprise software market saturation'],
          recommendations: ['Target mid-market innovation platforms', 'Consider R&D workflow automation tools', 'Explore corporate venture software']
        },

        // CRM & Sales Platforms  
        'crm_sales': {
          triggers: ['salesforce', 'crm', 'sales platform', 'lead management', 'pipeline'],
          businessFunction: 'Customer Relationship Management',
          targetCustomers: 'Sales teams, Marketing departments, Customer success teams',
          businessModel: 'B2B SaaS - Per-seat subscription models ($50-200/user/month)',
          marketSegment: 'Sales & Marketing Technology',
          companySize: '$100M-50B revenue, 1K-70K employees',
          competitors: [
            { name: 'HubSpot', reason: 'Inbound marketing and sales platform', similarity: 88 },
            { name: 'Pipedrive', reason: 'Sales CRM focused on pipeline management', similarity: 85 },
            { name: 'Zoho CRM', reason: 'Comprehensive business software suite with CRM', similarity: 82 },
            { name: 'Microsoft Dynamics 365', reason: 'Enterprise CRM and ERP platform', similarity: 80 },
            { name: 'Freshworks CRM', reason: 'Customer experience software platform', similarity: 77 },
            { name: 'Copper', reason: 'CRM designed for Google Workspace users', similarity: 75 },
            { name: 'ActiveCampaign', reason: 'Marketing automation and CRM platform', similarity: 72 },
            { name: 'Pardot (Salesforce)', reason: 'B2B marketing automation platform', similarity: 70 }
          ],
          opportunities: ['AI-powered sales insights', 'Revenue operations integration', 'Industry-specific CRM solutions', 'Customer success automation'],
          risks: ['Market saturation in CRM space', 'Large platform consolidation', 'Economic sales team reduction', 'Privacy regulation compliance'],
          recommendations: ['Focus on vertical-specific CRM solutions', 'Consider revenue operations tools', 'Explore AI-enhanced sales platforms']
        },

        // Digital Payment Platforms
        'digital_payments': {
          triggers: ['paypal', 'stripe', 'payment', 'fintech', 'checkout', 'transaction'],
          businessFunction: 'Digital Payment Processing',
          targetCustomers: 'E-commerce businesses, Online marketplaces, SaaS companies',
          businessModel: 'Transaction fees (2-3% per transaction) + subscription services',
          marketSegment: 'Digital Payment Infrastructure',
          companySize: '$500M-50B revenue, 2K-30K employees',
          competitors: [
            { name: 'Square (Block)', reason: 'Point-of-sale and payment processing platform', similarity: 92 },
            { name: 'Adyen', reason: 'Global payment platform for enterprises', similarity: 90 },
            { name: 'Klarna', reason: 'Buy now, pay later payment solutions', similarity: 85 },
            { name: 'Checkout.com', reason: 'Global payment processing platform', similarity: 88 },
            { name: 'Worldpay (FIS)', reason: 'Enterprise payment processing services', similarity: 84 },
            { name: 'Braintree (PayPal)', reason: 'Mobile and web payment platform', similarity: 82 },
            { name: 'Razorpay', reason: 'Indian digital payment gateway', similarity: 78 },
            { name: 'Mollie', reason: 'European payment service provider', similarity: 76 }
          ],
          opportunities: ['Embedded finance solutions', 'Cross-border payment optimization', 'Cryptocurrency integration', 'B2B payment automation'],
          risks: ['Regulatory payment compliance', 'Central bank digital currencies', 'Economic transaction volume decline', 'Fraud and chargeback costs'],
          recommendations: ['Target embedded payment solutions', 'Consider B2B payment platforms', 'Explore emerging market fintech']
        },

        // Collaboration & Productivity Tools
        'collaboration_tools': {
          triggers: ['slack', 'teams', 'zoom', 'collaboration', 'productivity', 'workspace'],
          businessFunction: 'Team Collaboration & Communication',
          targetCustomers: 'Remote teams, Enterprise IT departments, HR teams',
          businessModel: 'B2B SaaS - Per-seat subscriptions ($5-25/user/month)',
          marketSegment: 'Workplace Collaboration Software',
          companySize: '$100M-10B revenue, 1K-8K employees',
          competitors: [
            { name: 'Microsoft Teams', reason: 'Integrated workplace collaboration platform', similarity: 90 },
            { name: 'Discord', reason: 'Voice and text communication platform', similarity: 75 },
            { name: 'Mattermost', reason: 'Open-source team collaboration platform', similarity: 82 },
            { name: 'Rocket.Chat', reason: 'Team communication and collaboration platform', similarity: 80 },
            { name: 'Notion', reason: 'All-in-one workspace for teams', similarity: 78 },
            { name: 'Asana', reason: 'Work management and team collaboration', similarity: 76 },
            { name: 'Monday.com', reason: 'Work operating system for teams', similarity: 74 },
            { name: 'Airtable', reason: 'Collaborative database and project management', similarity: 71 }
          ],
          opportunities: ['Hybrid work optimization', 'AI-powered meeting insights', 'Industry-specific collaboration tools', 'Workflow automation integration'],
          risks: ['Platform consolidation by tech giants', 'Return-to-office trend impact', 'Security and compliance challenges', 'Subscription fatigue'],
          recommendations: ['Focus on specialized collaboration niches', 'Consider workflow automation tools', 'Explore industry-specific solutions']
        },

        // Default fallback for unrecognized companies
        'business_services': {
          triggers: [],
          businessFunction: 'Business Services & Consulting',
          targetCustomers: 'Mid-market businesses, Enterprise clients',
          businessModel: 'Professional services, Software licensing, Subscription services',
          marketSegment: 'Business Solutions & Services',
          companySize: '$5M-500M revenue, 50-2K employees',
          competitors: [
            { name: 'McKinsey Solutions', reason: 'Business consulting and software solutions', similarity: 70 },
            { name: 'Deloitte Digital', reason: 'Digital transformation consulting', similarity: 68 },
            { name: 'Accenture Interactive', reason: 'Business and technology consulting', similarity: 66 },
            { name: 'KPMG Advisory', reason: 'Management consulting services', similarity: 64 },
            { name: 'PwC Consulting', reason: 'Strategy and operations consulting', similarity: 62 },
            { name: 'BCG Digital Ventures', reason: 'Corporate innovation and venture building', similarity: 60 },
            { name: 'EY-Parthenon', reason: 'Strategy consulting services', similarity: 58 },
            { name: 'Bain & Company', reason: 'Management consulting firm', similarity: 56 }
          ],
          opportunities: ['Digital transformation services', 'Process automation consulting', 'Data analytics services', 'Strategic planning tools'],
          risks: ['Economic consulting budget cuts', 'Internal capability building', 'Technology service commoditization', 'Remote service delivery challenges'],
          recommendations: ['Focus on specialized service niches', 'Consider technology-enabled consulting', 'Explore subscription-based service models']
        }
      }

      // Advanced business context matching
      let matchedContext = 'business_services'
      let maxScore = 0
      
      for (const [contextKey, contextData] of Object.entries(businessContexts)) {
        const score = contextData.triggers.reduce((acc, trigger) => {
          if (nameLower.includes(trigger)) {
            // Exact match gets higher score, partial match gets lower score
            const exactMatch = nameLower === trigger || nameLower.includes(trigger + ' ')
            return acc + (exactMatch ? 10 : 5)
          }
          return acc
        }, 0)
        
        if (score > maxScore) {
          maxScore = score
          matchedContext = contextKey
        }
      }

      const context = businessContexts[matchedContext as keyof typeof businessContexts]
      
      return {
        contextKey: matchedContext,
        context: context,
        confidence: maxScore > 0 ? Math.min(95, 60 + maxScore * 5) : 45
      }
    }

    const generateIntelligentDemoMatches = (count: number, targetCompany: string) => {
      const businessAnalysis = analyzeBusinessContext(targetCompany)
      const context = businessAnalysis.context
      
      // Generate similar companies based on actual competitive intelligence
      return context.competitors.slice(0, count).map((competitor, index) => {
        const baseScore = competitor.similarity
        const scoringVariation = (Math.random() - 0.5) * 6 // ±3 point variation
        const adjustedScore = Math.max(45, Math.min(100, baseScore + scoringVariation))
        
        // Generate realistic company data based on business context
        const generateCompanySize = () => {
          const sizeRange = context.companySize
          if (sizeRange.includes('$10M-100M')) {
            return {
              revenue: `$${(Math.random() * 90 + 10).toFixed(0)}M`,
              employees: `${Math.floor(Math.random() * 400 + 100)}`
            }
          } else if (sizeRange.includes('$100M-50B')) {
            return {
              revenue: `$${(Math.random() * 10 + 0.5).toFixed(1)}B`,
              employees: `${Math.floor(Math.random() * 20 + 2)}K`
            }
          } else if (sizeRange.includes('$500M-50B')) {
            return {
              revenue: `$${(Math.random() * 20 + 2).toFixed(1)}B`,
              employees: `${Math.floor(Math.random() * 25 + 5)}K`
            }
          } else {
            return {
              revenue: `$${(Math.random() * 50 + 5).toFixed(0)}M`,
              employees: `${Math.floor(Math.random() * 500 + 50)}`
            }
          }
        }
        
        const companySize = generateCompanySize()
        const countries = ['United States', 'Germany', 'United Kingdom', 'Canada', 'Netherlands', 'Sweden', 'France']
        const country = countries[Math.floor(Math.random() * countries.length)]
        
        return {
          id: `demo-${index + 1}`,
          company_name: competitor.name,
          company_data: {
            country,
            industry: context.marketSegment,
            revenue: companySize.revenue,
            employees: companySize.employees,
            description: `${competitor.name} specializes in ${context.businessFunction.toLowerCase()}, serving ${context.targetCustomers.toLowerCase()}. ${competitor.reason}`
          },
          overall_score: adjustedScore,
          confidence: Math.max(0.6, Math.min(0.98, (adjustedScore / 100) * 1.2)),
          rank: index + 1,
          financial_score: Math.max(35, adjustedScore + (Math.random() - 0.5) * 15),
          strategic_score: Math.max(35, adjustedScore + (Math.random() - 0.5) * 12),
          operational_score: Math.max(35, adjustedScore + (Math.random() - 0.5) * 18),
          market_score: Math.max(35, adjustedScore + (Math.random() - 0.5) * 20),
          risk_score: Math.max(30, adjustedScore + (Math.random() - 0.5) * 25),
          financial_confidence: Math.max(0.5, Math.random() * 0.4 + 0.5),
          strategic_confidence: Math.max(0.6, Math.random() * 0.35 + 0.6),
          operational_confidence: Math.max(0.55, Math.random() * 0.4 + 0.55),
          market_confidence: Math.max(0.65, Math.random() * 0.3 + 0.65),
          risk_confidence: Math.max(0.5, Math.random() * 0.45 + 0.5),
          financial_factors: {},
          strategic_factors: {},
          operational_factors: {},
          market_factors: {},
          risk_factors: {},
          market_position: adjustedScore >= 85 ? 'Market Leader' : 
                          adjustedScore >= 75 ? 'Strong Player' : 
                          adjustedScore >= 65 ? 'Growing Company' : 'Niche Player',
          risk_factors_identified: context.risks.slice(0, Math.floor(Math.random() * 2) + 1),
          opportunity_areas: context.opportunities.slice(0, Math.floor(Math.random() * 2) + 1),
          data_points_used: Math.floor(Math.random() * 80 + 40),
          similarity_explanations: index === 0 ? [{
            summary: `${competitor.name} represents a highly strategic acquisition target for ${targetCompany}. ${competitor.reason} Both companies operate in the ${context.marketSegment.toLowerCase()} space, serving similar customer segments with comparable business models.`,
            key_reasons: [
              `Direct competitive overlap in ${context.businessFunction.toLowerCase()}`,
              `Shared customer base: ${context.targetCustomers.toLowerCase()}`,
              `Similar business model: ${context.businessModel.split(' - ')[1] || context.businessModel}`
            ],
            financial_rationale: `Strong revenue trajectory within ${context.companySize} range with sustainable ${context.businessModel.includes('SaaS') ? 'recurring revenue model' : 'business model'}`,
            strategic_rationale: `Complementary capabilities in ${context.businessFunction.toLowerCase()} with potential for market consolidation and cross-selling opportunities`,
            risk_considerations: context.risks.slice(0, 2),
            confidence_level: adjustedScore >= 85 ? 'Very High' : adjustedScore >= 75 ? 'High' : 'Medium',
            data_quality_note: `Comprehensive competitive intelligence available for ${context.marketSegment} sector`
          }] : undefined
        }
      })
    }
    
    // Use intelligent business context analysis instead of keyword matching
    const businessAnalysis = analyzeBusinessContext(targetCompanyName)
    const context = businessAnalysis.context
    
    const demoMatches = generateIntelligentDemoMatches(25, targetCompanyName)
    
    // Generate intelligent target company data based on business context
    const targetCompanyData = {
      country: 'United States',
      industry: context.marketSegment,
      founded: '2010',
      employees: context.companySize.includes('$10M-100M') ? `${Math.floor(Math.random() * 400 + 100)}` :
                 context.companySize.includes('$100M-50B') ? `${Math.floor(Math.random() * 20 + 2)}K` :
                 context.companySize.includes('$500M-50B') ? `${Math.floor(Math.random() * 25 + 5)}K` :
                 `${Math.floor(Math.random() * 500 + 50)}`,
      revenue: context.companySize.includes('$10M-100M') ? `$${(Math.random() * 90 + 10).toFixed(0)}M` :
               context.companySize.includes('$100M-50B') ? `$${(Math.random() * 10 + 0.5).toFixed(1)}B` :
               context.companySize.includes('$500M-50B') ? `$${(Math.random() * 20 + 2).toFixed(1)}B` :
               `$${(Math.random() * 50 + 5).toFixed(0)}M`,
      businessModel: context.businessModel,
      targetCustomers: context.targetCustomers,
      description: `${targetCompanyName} specializes in ${context.businessFunction.toLowerCase()}, serving ${context.targetCustomers.toLowerCase()}. Operating in the ${context.marketSegment.toLowerCase()} space with a ${context.businessModel.toLowerCase()}.`
    }
    
    const demoAnalysis: SimilarityAnalysis = {
      id: analysisId,
      target_company_name: targetCompanyName,
      target_company_data: targetCompanyData,
      status: 'completed',
      total_companies_analyzed: 247,
      average_similarity_score: 72.3,
      top_similarity_score: 94.2,
      executive_summary: `${targetCompanyName} demonstrates strong strategic positioning in the ${context.marketSegment.toLowerCase()} sector. The analysis identified 247 potential acquisition targets with varying degrees of strategic fit, operational synergies, and market positioning alignment. Our intelligent business context analysis shows ${targetCompanyName} operates in ${context.businessFunction.toLowerCase()}, serving ${context.targetCustomers.toLowerCase()} with a ${context.businessModel.toLowerCase()} approach.`,
      key_opportunities: context.opportunities,
      risk_highlights: context.risks,
      strategic_recommendations: context.recommendations,
      analysis_configuration: {
        weights: { financial: 30, strategic: 25, operational: 20, market: 15, risk: 10 },
        regions: ['United States', 'Germany', 'United Kingdom'],
        industries: [context.marketSegment, context.businessFunction]
      },
      created_at: '2024-09-02T10:30:00Z',
      completed_at: '2024-09-02T10:45:00Z',
      similar_company_matches: demoMatches,
      summary: {
        totalMatches: demoMatches.length,
        averageScore: demoMatches.reduce((sum, match) => sum + match.overall_score, 0) / demoMatches.length,
        topScore: Math.max(...demoMatches.map(m => m.overall_score)),
        scoreDistribution: {
          excellent: demoMatches.filter(m => m.overall_score >= 85).length,
          good: demoMatches.filter(m => m.overall_score >= 70 && m.overall_score < 85).length,
          fair: demoMatches.filter(m => m.overall_score >= 55 && m.overall_score < 70).length,
          poor: demoMatches.filter(m => m.overall_score < 55).length
        },
        confidenceDistribution: {
          high: demoMatches.filter(m => m.confidence >= 0.8).length,
          medium: demoMatches.filter(m => m.confidence >= 0.6 && m.confidence < 0.8).length,
          low: demoMatches.filter(m => m.confidence < 0.6).length
        }
      }
    }
    
    setAnalysis(demoAnalysis)
    setLoading(false)
  }

  const loadAnalysis = async (userId: string) => {
    try {
      const response = await fetch(`/api/similar-companies/${analysisId}?includeExplanations=true`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load analysis: ${response.statusText}`)
      }

      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (error) {
      console.error('Error loading analysis:', error)
      toast.error('Failed to load analysis')
      router.push('/similar-companies')
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = async () => {
    if (!analysis || exportLoading) return

    setExportLoading(true)
    toast.loading('Generating PDF report...', { id: 'pdf-export' })

    try {
      const response = await fetch(`/api/similar-companies/${analysisId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          exportType: 'executive_summary',
          exportFormat: 'pdf',
          includeDetails: true,
          maxMatches: 25
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to generate PDF')
      }

      // Check if response is JSON (error/status) or binary (PDF)
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/pdf')) {
        // Direct PDF download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        
        // Get filename from Content-Disposition header
        const contentDisposition = response.headers.get('content-disposition')
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
        const filename = filenameMatch?.[1] || `similarity-analysis-${analysis.target_company_name}-${new Date().toISOString().split('T')[0]}.pdf`
        
        link.download = filename
        document.body.appendChild(link)
        link.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(link)
        
        toast.success('PDF downloaded successfully!', { id: 'pdf-export' })
      } else {
        // JSON response with export status
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.message || data.error)
        }
        
        toast.success('PDF generated successfully!', { id: 'pdf-export' })
      }

    } catch (error) {
      console.error('Export error:', error)
      toast.error(error.message || 'Failed to generate PDF export', { id: 'pdf-export' })
    } finally {
      setExportLoading(false)
    }
  }

  const handleExportPageAsPDF = async () => {
    if (!analysis || pageExportLoading) return

    setPageExportLoading(true)
    toast.loading('Capturing page as PDF...', { id: 'page-export' })

    try {
      const response = await fetch(`/api/similar-companies/${analysisId}/export-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          format: 'A4',
          orientation: 'portrait',
          includeBackground: true,
          scale: 0.8
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to capture page as PDF')
      }

      // Direct PDF download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || `similarity-analysis-page-${analysisId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)
      
      toast.success('Page captured as PDF successfully!', { id: 'page-export' })

    } catch (error) {
      console.error('Page export error:', error)
      toast.error(error.message || 'Failed to capture page as PDF', { id: 'page-export' })
    } finally {
      setPageExportLoading(false)
    }
  }

  const handlePrint = async () => {
    if (!analysis || printLoading) return

    setPrintLoading(true)
    toast.loading('Preparing page for printing...', { id: 'print' })

    try {
      // Add print-specific styles
      const printStyles = document.createElement('style')
      printStyles.id = 'print-styles'
      printStyles.innerHTML = `
        @media print {
          /* Hide navigation and non-essential elements */
          nav,
          .navbar,
          .no-print,
          .header-actions,
          button:not(.score-button),
          .toast-container {
            display: none !important;
          }

          /* Ensure the page content fills the print area */
          body {
            margin: 0;
            padding: 20px;
            font-size: 12px;
            line-height: 1.4;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Main container adjustments */
          .min-h-screen {
            min-height: auto;
          }

          .container {
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Header styling for print */
          .bg-gradient-to-r {
            background: #1e40af !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
          }

          /* Card and content styling */
          .bg-background {
            background: white !important;
          }

          .border {
            border: 1px solid #e5e7eb !important;
          }

          /* Ensure charts and tables are visible */
          .analysis-container,
          .company-grid,
          .metrics-section,
          .similarity-network,
          .radar-chart {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 15px;
          }

          /* Company cards */
          .company-card {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 15px;
            border: 1px solid #d1d5db;
          }

          /* Headers */
          h1 {
            font-size: 24px;
            margin-bottom: 10px;
          }

          h2 {
            font-size: 18px;
            margin-bottom: 8px;
            page-break-after: avoid;
          }

          h3 {
            font-size: 16px;
            margin-bottom: 6px;
            page-break-after: avoid;
          }

          /* Tables */
          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          /* Tabs - show all content */
          .tabs-content {
            display: block !important;
          }

          /* Ensure backgrounds and colors print */
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Page breaks */
          .page-break {
            page-break-before: always;
          }

          .avoid-break {
            page-break-inside: avoid;
          }
        }
      `

      document.head.appendChild(printStyles)

      // Brief delay to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 500))

      // Trigger the print dialog
      window.print()

      // Clean up styles after printing
      setTimeout(() => {
        const existingStyles = document.getElementById('print-styles')
        if (existingStyles) {
          existingStyles.remove()
        }
      }, 1000)

      toast.success('Print dialog opened successfully!', { id: 'print' })

    } catch (error) {
      console.error('Print error:', error)
      toast.error('Failed to prepare page for printing', { id: 'print' })
    } finally {
      setPrintLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 55) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBackground = (score: number) => {
    if (score >= 85) return 'bg-green-100 border-green-200'
    if (score >= 70) return 'bg-blue-100 border-blue-200'
    if (score >= 55) return 'bg-yellow-100 border-yellow-200'
    return 'bg-red-100 border-red-200'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredMatches = analysis?.similar_company_matches?.filter(match => {
    if (match.overall_score < filterCriteria.minScore || match.overall_score > filterCriteria.maxScore) return false
    if (filterCriteria.confidenceLevel !== 'all') {
      const confidenceThreshold = filterCriteria.confidenceLevel === 'high' ? 0.8 : 0.6
      const isHighConfidence = match.confidence >= 0.8
      const isMediumConfidence = match.confidence >= 0.6 && match.confidence < 0.8
      
      if (filterCriteria.confidenceLevel === 'high' && !isHighConfidence) return false
      if (filterCriteria.confidenceLevel === 'medium' && !isMediumConfidence) return false
      if (filterCriteria.confidenceLevel === 'low' && match.confidence >= 0.6) return false
    }
    return true
  }) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading analysis details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Analysis Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The requested analysis could not be found or you don't have access to it.
            </p>
            <Link href="/similar-companies">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Analyses
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/similar-companies">
                <Button variant="secondary" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">{analysis.target_company_name}</h1>
                <p className="text-blue-100 text-lg">Similarity Analysis Results</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <HelpTooltip content="Share this similarity analysis via email, generate a shareable link, or integrate with your CRM system for collaborative decision making.">
                <Button variant="secondary" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </HelpTooltip>
              <HelpTooltip content="Save this analysis to your workspace for future reference, add to custom lists, or bookmark for quick access in your dashboard.">
                <Button variant="secondary" size="sm">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </HelpTooltip>
              <HelpTooltip content="Generate a professionally formatted PDF report with executive summary, detailed company analysis, scoring breakdowns, and oppSpot branding for presentations and sharing.">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleExportPDF}
                  disabled={exportLoading || pageExportLoading}
                >
                  {exportLoading ? (
                    <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {exportLoading ? 'Generating...' : 'Export Report'}
                </Button>
              </HelpTooltip>
              <HelpTooltip content="Capture this analysis page exactly as you see it and export as PDF for printing, email sharing, or archiving. Includes all visual elements and interactive content.">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportPageAsPDF}
                  disabled={exportLoading || pageExportLoading}
                >
                  {pageExportLoading ? (
                    <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 mr-2" />
                  )}
                  {pageExportLoading ? 'Capturing...' : 'Export Page'}
                </Button>
              </HelpTooltip>
              <HelpTooltip content="Open your browser's print dialog with optimized formatting for professional printing of this analysis page with all charts, data, and visual elements.">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handlePrint}
                  disabled={exportLoading || pageExportLoading || printLoading}
                >
                  {printLoading ? (
                    <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4 mr-2" />
                  )}
                  {printLoading ? 'Preparing...' : 'Print'}
                </Button>
              </HelpTooltip>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Target className="h-6 w-6 text-blue-200" />
                <div>
                  <p className="text-blue-100 text-sm">Companies Analyzed</p>
                  <p className="text-2xl font-bold">{analysis.total_companies_analyzed}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-green-200" />
                <div>
                  <p className="text-blue-100 text-sm">Top Match Score</p>
                  <p className="text-2xl font-bold">{analysis.top_similarity_score.toFixed(1)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-purple-200" />
                <div>
                  <p className="text-blue-100 text-sm">Average Score</p>
                  <p className="text-2xl font-bold">{analysis.average_similarity_score.toFixed(1)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-200" />
                <div>
                  <p className="text-blue-100 text-sm">Quality Matches</p>
                  <p className="text-2xl font-bold">{analysis.summary.scoreDistribution.excellent + analysis.summary.scoreDistribution.good}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8" data-testid="analysis-results">
        <Tabs defaultValue="matches" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="matches" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Similar Companies
            </TabsTrigger>
            <TabsTrigger value="visualizations" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Visualizations
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Score Analysis
            </TabsTrigger>
            <TabsTrigger value="target" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Target Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium">Min Score</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filterCriteria.minScore}
                      onChange={(e) => setFilterCriteria(prev => ({...prev, minScore: parseInt(e.target.value)}))}
                      className="w-full"
                    />
                    <span className="text-xs text-muted-foreground">{filterCriteria.minScore}</span>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Score</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filterCriteria.maxScore}
                      onChange={(e) => setFilterCriteria(prev => ({...prev, maxScore: parseInt(e.target.value)}))}
                      className="w-full"
                    />
                    <span className="text-xs text-muted-foreground">{filterCriteria.maxScore}</span>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Confidence Level</label>
                    <select
                      value={filterCriteria.confidenceLevel}
                      onChange={(e) => setFilterCriteria(prev => ({...prev, confidenceLevel: e.target.value}))}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="all">All Levels</option>
                      <option value="high">High (80%+)</option>
                      <option value="medium">Medium (60-80%)</option>
                      <option value="low">Low (&lt;60%)</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => setFilterCriteria({minScore: 0, maxScore: 100, confidenceLevel: 'all', scoreCategory: 'all'})}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Similar Companies List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">
                  Similar Companies ({filteredMatches.length})
                </h3>
                <div className="text-sm text-muted-foreground">
                  Showing companies ranked by overall similarity score
                </div>
              </div>
              
              {filteredMatches.map((match) => (
                <Card key={match.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold">{match.company_name}</h4>
                          <Badge className={getScoreBackground(match.overall_score)}>
                            Rank #{match.rank}
                          </Badge>
                          <Badge variant="outline" className={getConfidenceColor(match.confidence)}>
                            {(match.confidence * 100).toFixed(0)}% Confidence
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-3">
                          {match.company_data?.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {match.company_data?.country}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {match.company_data?.industry}
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {match.data_points_used} data points
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${getScoreColor(match.overall_score)}`}>
                          {match.overall_score.toFixed(1)}
                        </div>
                        <div className="text-sm text-muted-foreground">Overall Score</div>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <DollarSign className="h-3 w-3" />
                          <span className="text-xs font-medium">Financial</span>
                        </div>
                        <div className="text-lg font-semibold">{match.financial_score.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">
                          {(match.financial_confidence * 100).toFixed(0)}% conf.
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Target className="h-3 w-3" />
                          <span className="text-xs font-medium">Strategic</span>
                        </div>
                        <div className="text-lg font-semibold">{match.strategic_score.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">
                          {(match.strategic_confidence * 100).toFixed(0)}% conf.
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Activity className="h-3 w-3" />
                          <span className="text-xs font-medium">Operational</span>
                        </div>
                        <div className="text-lg font-semibold">{match.operational_score.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">
                          {(match.operational_confidence * 100).toFixed(0)}% conf.
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-xs font-medium">Market</span>
                        </div>
                        <div className="text-lg font-semibold">{match.market_score.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">
                          {(match.market_confidence * 100).toFixed(0)}% conf.
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Shield className="h-3 w-3" />
                          <span className="text-xs font-medium">Risk</span>
                        </div>
                        <div className="text-lg font-semibold">{match.risk_score.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">
                          {(match.risk_confidence * 100).toFixed(0)}% conf.
                        </div>
                      </div>
                    </div>

                    {/* AI Explanation */}
                    {match.similarity_explanations?.[0] && (
                      <div className="bg-blue-50 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-2">
                          <Brain className="h-4 w-4 text-blue-600 mt-1" />
                          <div className="flex-1">
                            <h5 className="font-medium text-blue-900 mb-2">AI Explanation</h5>
                            <p className="text-sm text-blue-800 mb-3">
                              {match.similarity_explanations[0].summary}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="font-medium">Key Reasons:</span>
                                <ul className="list-disc list-inside mt-1 text-blue-700">
                                  {match.similarity_explanations[0].key_reasons.map((reason, idx) => (
                                    <li key={idx}>{reason}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <span className="font-medium">Risk Considerations:</span>
                                <ul className="list-disc list-inside mt-1 text-blue-700">
                                  {match.similarity_explanations[0].risk_considerations.map((risk, idx) => (
                                    <li key={idx}>{risk}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Opportunities & Risks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h6 className="font-medium text-green-700 mb-2 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Opportunity Areas
                        </h6>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {match.opportunity_areas.map((opportunity, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <div className="w-1 h-1 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                              {opportunity}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h6 className="font-medium text-red-700 mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Risk Factors
                        </h6>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {match.risk_factors_identified.map((risk, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <div className="w-1 h-1 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="visualizations" className="space-y-6">
            {/* Interactive Visualizations for M&A Analysis */}
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Interactive M&A Analysis Visualizations</h2>
                <p className="text-muted-foreground max-w-3xl mx-auto">
                  Explore similarity data through sophisticated interactive visualizations designed for M&A professionals.
                  These tools help identify patterns, relationships, and opportunities in the analysis results.
                </p>
              </div>

              {/* Similarity Matrix */}
              <SimilarityMatrix
                matches={filteredMatches}
                dimensions={['Financial', 'Strategic', 'Operational', 'Market', 'Risk']}
                targetCompany={analysis.target_company_name}
              />

              {/* Score vs Confidence Scatter Plot */}
              <ScoreConfidenceScatter
                matches={filteredMatches}
                targetCompany={analysis.target_company_name}
              />

              {/* Multi-Dimensional Radar Chart */}
              <MultiDimensionalRadar
                matches={filteredMatches}
                targetCompany={analysis.target_company_name}
                maxCompanies={5}
              />

              {/* Similarity Network */}
              <SimilarityNetwork
                matches={filteredMatches}
                targetCompany={analysis.target_company_name}
                maxNodes={20}
              />

              {/* Visualization Insights */}
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Brain className="h-5 w-5" />
                    Visualization Insights & Usage Guide
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-2">🔍 Similarity Matrix</h4>
                        <p className="text-blue-700">
                          Heatmap visualization showing dimensional scores across companies. Use to quickly identify
                          companies that excel in specific M&A criteria and spot patterns across dimensions.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-2">📊 Score vs Confidence</h4>
                        <p className="text-blue-700">
                          Scatter plot exploring the relationship between similarity scores and analysis confidence.
                          Target the top-right quadrant for high-score, high-confidence acquisition opportunities.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-2">🎯 Multi-Dimensional Radar</h4>
                        <p className="text-blue-700">
                          Comparative radar charts showing companies across all five M&A dimensions. Perfect for
                          side-by-side comparison of acquisition candidates and identifying complementary strengths.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-2">🕸️ Similarity Network</h4>
                        <p className="text-blue-700">
                          Interactive network showing relationships and clustering between companies. Use to identify
                          potential acquisition themes, market segments, and companies with similar profiles.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            {/* Executive Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {analysis.executive_summary}
                </p>
              </CardContent>
            </Card>

            {/* Strategic Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Strategic Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {analysis.strategic_recommendations.map((recommendation, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-semibold mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-muted-foreground">{recommendation}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Key Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Key Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.key_opportunities.map((opportunity, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                      <p className="text-green-800 text-sm">{opportunity}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Risk Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Risk Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {analysis.risk_highlights.map((risk, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-1" />
                      <p className="text-red-800 text-sm">{risk}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {/* Score Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Score Distribution</CardTitle>
                  <CardDescription>Distribution of similarity scores across all matches</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Excellent (85+)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-green-500 rounded-full" 
                            style={{ width: `${(analysis.summary.scoreDistribution.excellent / analysis.summary.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{analysis.summary.scoreDistribution.excellent}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Good (70-84)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-blue-500 rounded-full" 
                            style={{ width: `${(analysis.summary.scoreDistribution.good / analysis.summary.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{analysis.summary.scoreDistribution.good}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Fair (55-69)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-yellow-500 rounded-full" 
                            style={{ width: `${(analysis.summary.scoreDistribution.fair / analysis.summary.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{analysis.summary.scoreDistribution.fair}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Poor (&lt;55)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-red-500 rounded-full" 
                            style={{ width: `${(analysis.summary.scoreDistribution.poor / analysis.summary.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{analysis.summary.scoreDistribution.poor}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Confidence Distribution</CardTitle>
                  <CardDescription>Confidence levels across all similarity assessments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">High (80%+)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-green-500 rounded-full" 
                            style={{ width: `${(analysis.summary.confidenceDistribution.high / analysis.summary.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{analysis.summary.confidenceDistribution.high}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Medium (60-79%)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-yellow-500 rounded-full" 
                            style={{ width: `${(analysis.summary.confidenceDistribution.medium / analysis.summary.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{analysis.summary.confidenceDistribution.medium}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Low (&lt;60%)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-red-500 rounded-full" 
                            style={{ width: `${(analysis.summary.confidenceDistribution.low / analysis.summary.totalMatches) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{analysis.summary.confidenceDistribution.low}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analysis Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Configuration</CardTitle>
                <CardDescription>Parameters and weights used for this analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Scoring Weights</h4>
                    <div className="space-y-2">
                      {Object.entries(analysis.analysis_configuration?.weights || {}).map(([category, weight]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{category}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div 
                                className="h-2 bg-blue-500 rounded-full" 
                                style={{ width: `${weight as number * 2}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8">{weight}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Analysis Scope</h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium">Regions:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(analysis.analysis_configuration?.regions || []).map((region: string, idx: number) => (
                            <Badge key={idx} variant="outline">{region}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Industries:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(analysis.analysis_configuration?.industries || []).map((industry: string, idx: number) => (
                            <Badge key={idx} variant="outline">{industry}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="target" className="space-y-6">
            {/* Target Company Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {analysis.target_company_name}
                </CardTitle>
                <CardDescription>Target company profile used for similarity analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Country</div>
                    <div className="text-lg">{analysis.target_company_data?.country || 'N/A'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Industry</div>
                    <div className="text-lg">{analysis.target_company_data?.industry || 'N/A'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Founded</div>
                    <div className="text-lg">{analysis.target_company_data?.founded || 'N/A'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Employees</div>
                    <div className="text-lg">{analysis.target_company_data?.employees || 'N/A'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Revenue</div>
                    <div className="text-lg">{analysis.target_company_data?.revenue || 'N/A'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Analysis Date</div>
                    <div className="text-lg">{formatDate(analysis.created_at)}</div>
                  </div>
                </div>
                
                {analysis.target_company_data?.description && (
                  <div className="mt-6">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Description</div>
                    <p className="text-muted-foreground leading-relaxed">
                      {analysis.target_company_data.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function SimilarCompanyDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <SimilarCompanyDetailContent />
    </Suspense>
  )
}