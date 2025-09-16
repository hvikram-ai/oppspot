'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  MapPin, 
  Building2, 
  Gavel,
  TrendingUp,
  DollarSign,
  Shield,
  Search,
  X,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'

interface Region {
  id: string
  name: string
  country: string
  type: 'country' | 'region' | 'city'
  population?: number
  gdp_per_capita?: number
  business_density: 'low' | 'moderate' | 'high' | 'very_high'
  regulatory_complexity: 'low' | 'moderate' | 'high' | 'very_high'
  tax_rate: number
  ease_of_business: number // 1-100 score
  key_industries: string[]
  brexit_impact: 'minimal' | 'moderate' | 'significant'
  considerations: string[]
}

interface RegulatoryRequirement {
  id: string
  name: string
  description: string
  applies_to: string[]
  complexity: 'low' | 'moderate' | 'high'
  estimated_cost: string
  timeline: string
}

interface RegionSelectionProps {
  config: any
  onChange: (field: string, value: any) => void
}

export function RegionSelectionStep({ config, onChange }: RegionSelectionProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState<'regions' | 'regulatory'>('regions')

  // UK and Ireland regions with business intelligence data
  const regions: Region[] = [
    {
      id: 'london',
      name: 'Greater London',
      country: 'England',
      type: 'region',
      population: 9648110,
      gdp_per_capita: 56431,
      business_density: 'very_high',
      regulatory_complexity: 'high',
      tax_rate: 19,
      ease_of_business: 85,
      key_industries: ['Financial Services', 'Technology', 'Creative Industries', 'Real Estate'],
      brexit_impact: 'significant',
      considerations: [
        'Highest business concentration in UK',
        'Premium property and operational costs',
        'Access to top talent pool',
        'Strong venture capital presence',
        'Post-Brexit regulatory changes affecting financial services'
      ]
    },
    {
      id: 'manchester',
      name: 'Greater Manchester',
      country: 'England',
      type: 'region',
      population: 2867800,
      business_density: 'high',
      regulatory_complexity: 'moderate',
      tax_rate: 19,
      ease_of_business: 78,
      key_industries: ['Manufacturing', 'Technology', 'Healthcare', 'Digital Media'],
      brexit_impact: 'moderate',
      considerations: [
        'Major tech hub outside London',
        'Lower operational costs than London',
        'Strong university partnerships',
        'Growing startup ecosystem'
      ]
    },
    {
      id: 'birmingham',
      name: 'Birmingham & West Midlands',
      country: 'England',
      type: 'region',
      population: 4082000,
      business_density: 'high',
      regulatory_complexity: 'moderate',
      tax_rate: 19,
      ease_of_business: 75,
      key_industries: ['Manufacturing', 'Automotive', 'Professional Services', 'Logistics'],
      brexit_impact: 'moderate',
      considerations: [
        'Central location with good transport links',
        'Strong manufacturing heritage',
        'Automotive industry concentration',
        'Lower costs compared to London'
      ]
    },
    {
      id: 'scotland',
      name: 'Scotland',
      country: 'Scotland',
      type: 'country',
      population: 5479900,
      business_density: 'moderate',
      regulatory_complexity: 'high',
      tax_rate: 19,
      ease_of_business: 72,
      key_industries: ['Energy', 'Financial Services', 'Tourism', 'Technology', 'Whisky'],
      brexit_impact: 'significant',
      considerations: [
        'Different legal system (Scots law)',
        'Strong energy sector (oil, renewables)',
        'Independent regulatory framework for some sectors',
        'Potential for Scottish independence referendum'
      ]
    },
    {
      id: 'edinburgh',
      name: 'Edinburgh',
      country: 'Scotland',
      type: 'city',
      population: 540000,
      business_density: 'very_high',
      regulatory_complexity: 'high',
      tax_rate: 19,
      ease_of_business: 80,
      key_industries: ['Financial Services', 'Technology', 'Tourism', 'Education'],
      brexit_impact: 'moderate',
      considerations: [
        'Major financial center (second only to London)',
        'Strong insurance and asset management sector',
        'Growing fintech ecosystem',
        'High quality of life attracting talent'
      ]
    },
    {
      id: 'dublin',
      name: 'Dublin',
      country: 'Ireland',
      type: 'city',
      population: 1388000,
      gdp_per_capita: 78783,
      business_density: 'very_high',
      regulatory_complexity: 'moderate',
      tax_rate: 12.5,
      ease_of_business: 88,
      key_industries: ['Technology', 'Pharmaceuticals', 'Financial Services', 'Agriculture'],
      brexit_impact: 'minimal',
      considerations: [
        'EU membership with English-speaking workforce',
        'Very competitive corporate tax rate (12.5%)',
        'Major tech companies European HQ location',
        'Strong pharmaceutical manufacturing base',
        'Access to EU single market post-Brexit'
      ]
    },
    {
      id: 'cork',
      name: 'Cork',
      country: 'Ireland',
      type: 'city',
      population: 224000,
      business_density: 'high',
      regulatory_complexity: 'low',
      tax_rate: 12.5,
      ease_of_business: 82,
      key_industries: ['Pharmaceuticals', 'Technology', 'Manufacturing', 'Agriculture'],
      brexit_impact: 'minimal',
      considerations: [
        'Major pharmaceutical manufacturing hub',
        'Lower operational costs than Dublin',
        'Strong connection to US companies',
        'Growing tech sector'
      ]
    },
    {
      id: 'belfast',
      name: 'Belfast',
      country: 'Northern Ireland',
      type: 'city',
      population: 342000,
      business_density: 'moderate',
      regulatory_complexity: 'high',
      tax_rate: 19,
      ease_of_business: 70,
      key_industries: ['Aerospace', 'Technology', 'Financial Services', 'Tourism'],
      brexit_impact: 'significant',
      considerations: [
        'Unique position with access to both UK and EU markets',
        'Complex regulatory environment due to Northern Ireland Protocol',
        'Strong aerospace cluster (Bombardier)',
        'Growing cybersecurity sector'
      ]
    },
    {
      id: 'wales',
      name: 'Wales',
      country: 'Wales',
      type: 'country',
      population: 3136000,
      business_density: 'moderate',
      regulatory_complexity: 'moderate',
      tax_rate: 19,
      ease_of_business: 72,
      key_industries: ['Manufacturing', 'Energy', 'Agriculture', 'Tourism'],
      brexit_impact: 'moderate',
      considerations: [
        'Strong manufacturing base',
        'Growing renewable energy sector',
        'Welsh language requirements for some sectors',
        'Development grants and incentives available'
      ]
    },
    {
      id: 'northern-england',
      name: 'Northern England',
      country: 'England',
      type: 'region',
      population: 15000000,
      business_density: 'moderate',
      regulatory_complexity: 'moderate',
      tax_rate: 19,
      ease_of_business: 75,
      key_industries: ['Manufacturing', 'Energy', 'Agriculture', 'Technology'],
      brexit_impact: 'moderate',
      considerations: [
        'Government "Levelling Up" investment priorities',
        'Lower operational costs',
        'Strong manufacturing heritage',
        'Growing tech hubs in Leeds, Liverpool, Newcastle'
      ]
    }
  ]

  // Regulatory requirements and compliance considerations
  const regulatoryRequirements: RegulatoryRequirement[] = [
    {
      id: 'cma-approval',
      name: 'CMA Merger Approval',
      description: 'Competition and Markets Authority approval for acquisitions above £70m or 25% market share',
      applies_to: ['Large acquisitions', 'Market consolidation'],
      complexity: 'high',
      estimated_cost: '£50,000 - £500,000',
      timeline: '3-9 months'
    },
    {
      id: 'fca-regulatory',
      name: 'FCA Regulatory Approval',
      description: 'Financial Conduct Authority approval for acquisitions in regulated financial services',
      applies_to: ['Financial Services', 'Insurance', 'Investment Management'],
      complexity: 'high',
      estimated_cost: '£100,000 - £1,000,000',
      timeline: '6-12 months'
    },
    {
      id: 'irish-ccpc',
      name: 'CCPC Merger Notification',
      description: 'Competition and Consumer Protection Commission notification for Irish acquisitions',
      applies_to: ['Irish acquisitions above €60m'],
      complexity: 'moderate',
      estimated_cost: '€20,000 - €100,000',
      timeline: '1-4 months'
    },
    {
      id: 'gdpr-compliance',
      name: 'GDPR Data Transfer',
      description: 'Data protection compliance for personal data processing and international transfers',
      applies_to: ['All data processing businesses'],
      complexity: 'moderate',
      estimated_cost: '£10,000 - £100,000',
      timeline: '1-3 months'
    },
    {
      id: 'tax-clearance',
      name: 'Tax Clearance Applications',
      description: 'HMRC/Revenue clearance for tax-efficient acquisition structures',
      applies_to: ['Complex acquisition structures'],
      complexity: 'moderate',
      estimated_cost: '£5,000 - £50,000',
      timeline: '1-6 months'
    },
    {
      id: 'sector-specific',
      name: 'Sector-Specific Licensing',
      description: 'Industry-specific regulatory approvals and license transfers',
      applies_to: ['Healthcare', 'Energy', 'Transportation', 'Telecommunications'],
      complexity: 'high',
      estimated_cost: 'Variable',
      timeline: '2-12 months'
    }
  ]

  const filteredRegions = regions.filter(region =>
    region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    region.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
    region.key_industries.some(industry => 
      industry.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const handleRegionToggle = (region: Region) => {
    const selectedRegions = config.selectedRegions || []
    const existingIndex = selectedRegions.findIndex((r: unknown) => r.id === region.id)

    let newSelection
    if (existingIndex >= 0) {
      newSelection = selectedRegions.filter((_: unknown, index: number) => index !== existingIndex)
    } else {
      newSelection = [...selectedRegions, region]
    }

    onChange('selectedRegions', newSelection)
  }

  const handleRegulatoryRequirementToggle = (requirement: RegulatoryRequirement) => {
    const current = config.regulatoryRequirements || {}
    const newRequirements = { ...current }
    
    if (newRequirements[requirement.id]) {
      delete newRequirements[requirement.id]
    } else {
      newRequirements[requirement.id] = requirement
    }

    onChange('regulatoryRequirements', newRequirements)
  }

  const isRegionSelected = (region: Region) => {
    return config.selectedRegions?.some((r: unknown) => r.id === region.id) || false
  }

  const isRequirementSelected = (requirement: RegulatoryRequirement) => {
    return config.regulatoryRequirements?.[requirement.id] !== undefined
  }

  const getBusinessDensityColor = (density: string) => {
    switch (density) {
      case 'very_high':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'high':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getBrexitImpactColor = (impact: string) => {
    switch (impact) {
      case 'significant':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-green-100 text-green-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setSelectedTab('regions')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'regions'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MapPin className="h-4 w-4 inline mr-2" />
          Geographic Regions
        </button>
        <button
          onClick={() => setSelectedTab('regulatory')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'regulatory'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Gavel className="h-4 w-4 inline mr-2" />
          Regulatory Requirements
        </button>
      </div>

      {selectedTab === 'regions' && (
        <>
          {/* Region Search */}
          <div className="space-y-2">
            <Label>Search Regions</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by region name, country, or industry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Selected Regions */}
          {config.selectedRegions && config.selectedRegions.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Regions ({config.selectedRegions.length})</Label>
              <div className="flex flex-wrap gap-2">
                {config.selectedRegions.map((region: any, index: number) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    {region.name}, {region.country}
                    <button
                      onClick={() => {
                        const newSelection = config.selectedRegions.filter((_: unknown, i: number) => i !== index)
                        onChange('selectedRegions', newSelection)
                      }}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Regions List */}
          <div className="grid gap-4">
            {filteredRegions.map((region) => (
              <Card 
                key={region.id}
                className={`cursor-pointer transition-all ${
                  isRegionSelected(region) ? 'ring-2 ring-primary' : 'hover:shadow-md'
                }`}
                onClick={() => handleRegionToggle(region)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={isRegionSelected(region)} readOnly />
                      <div>
                        <CardTitle className="text-lg">{region.name}</CardTitle>
                        <CardDescription>{region.country}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getBusinessDensityColor(region.business_density)}>
                        {region.business_density.replace('_', ' ')} density
                      </Badge>
                      <Badge className={getBrexitImpactColor(region.brexit_impact)}>
                        {region.brexit_impact} Brexit impact
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {region.population && (
                        <div className="text-center p-3 bg-muted rounded-md">
                          <Building2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-sm font-medium">Population</p>
                          <p className="text-xs text-muted-foreground">
                            {(region.population / 1000000).toFixed(1)}M
                          </p>
                        </div>
                      )}
                      <div className="text-center p-3 bg-muted rounded-md">
                        <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-sm font-medium">Corp Tax</p>
                        <p className="text-xs text-muted-foreground">{region.tax_rate}%</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-sm font-medium">Business Ease</p>
                        <p className="text-xs text-muted-foreground">{region.ease_of_business}/100</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-md">
                        <Shield className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-sm font-medium">Regulatory</p>
                        <p className="text-xs text-muted-foreground">
                          {region.regulatory_complexity} complexity
                        </p>
                      </div>
                    </div>

                    {/* Key Industries */}
                    <div>
                      <p className="text-sm font-medium mb-2">Key Industries:</p>
                      <div className="flex flex-wrap gap-1">
                        {region.key_industries.map((industry, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {industry}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Considerations */}
                    <div>
                      <p className="text-sm font-medium mb-2">Key Considerations:</p>
                      <ul className="space-y-1">
                        {region.considerations.map((consideration, index) => (
                          <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                            <Info className="h-3 w-3 mt-0.5 shrink-0" />
                            {consideration}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRegions.length === 0 && searchTerm && (
            <Card>
              <CardContent className="p-8 text-center">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  No regions found matching "{searchTerm}"
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {selectedTab === 'regulatory' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Regulatory Compliance Requirements
              </CardTitle>
              <CardDescription>
                Select applicable regulatory requirements for your acquisition scan. These will be factored into due diligence and timeline estimates.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Regulatory Requirements */}
          <div className="space-y-4">
            {regulatoryRequirements.map((requirement) => (
              <Card 
                key={requirement.id}
                className={`cursor-pointer transition-all ${
                  isRequirementSelected(requirement) ? 'ring-2 ring-primary' : 'hover:shadow-md'
                }`}
                onClick={() => handleRegulatoryRequirementToggle(requirement)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={isRequirementSelected(requirement)} readOnly />
                      <div>
                        <CardTitle className="text-base">{requirement.name}</CardTitle>
                        <CardDescription>{requirement.description}</CardDescription>
                      </div>
                    </div>
                    <Badge className={getComplexityColor(requirement.complexity)}>
                      {requirement.complexity} complexity
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium mb-1">Estimated Cost</p>
                      <p className="text-muted-foreground">{requirement.estimated_cost}</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Timeline</p>
                      <p className="text-muted-foreground">{requirement.timeline}</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Applies To</p>
                      <div className="flex flex-wrap gap-1">
                        {requirement.applies_to.map((item, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary */}
          {Object.keys(config.regulatoryRequirements || {}).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Selected Regulatory Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.values(config.regulatoryRequirements || {}).map((req: any, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="font-medium">{req.name}</span>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{req.timeline}</span>
                        <span>•</span>
                        <span>{req.estimated_cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}