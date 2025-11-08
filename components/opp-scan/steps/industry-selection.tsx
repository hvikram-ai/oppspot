'use client'

import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search,
  Building2,
  TrendingUp,
  Factory,
  Laptop,
  Heart,
  Banknote,
  Car,
  Home,
  ShoppingBag,
  Plane,
  Zap,
  X,
  LucideIcon
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface IndustryCategory {
  id: string
  name: string
  description: string
  sic_code?: string
  icon: LucideIcon
  consolidation_opportunity: string
  typical_business_size: string
  subcategories?: IndustrySubcategory[]
}

interface IndustrySubcategory {
  id: string
  name: string
  description: string
  sic_code?: string
}

interface OppScanConfig {
  selectedIndustries?: Array<{
    id: string;
    name: string;
    [key: string]: unknown;
  }>;
  marketMaturity?: string[];
  [key: string]: unknown;
}

interface IndustrySelectionProps {
  config: OppScanConfig
  updateConfig: (updates: Partial<OppScanConfig>) => void
}

export function IndustrySelectionStep({ config, updateConfig }: IndustrySelectionProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [industries, setIndustries] = useState<IndustryCategory[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Predefined industry categories with icons and consolidation data
  const predefinedIndustries: IndustryCategory[] = useMemo(() => [
    {
      id: 'manufacturing',
      name: 'Manufacturing',
      description: 'Production and processing of goods',
      sic_code: '10-33',
      icon: Factory,
      consolidation_opportunity: 'high',
      typical_business_size: 'medium',
      subcategories: [
        { id: 'food-processing', name: 'Food Processing', description: 'Food and beverage manufacturing', sic_code: '10-11' },
        { id: 'textiles', name: 'Textiles & Clothing', description: 'Textile and apparel manufacturing', sic_code: '13-15' },
        { id: 'chemicals', name: 'Chemicals & Pharmaceuticals', description: 'Chemical and pharmaceutical products', sic_code: '20-21' },
        { id: 'machinery', name: 'Machinery & Equipment', description: 'Industrial machinery and equipment', sic_code: '28-30' }
      ]
    },
    {
      id: 'technology',
      name: 'Information Technology',
      description: 'Software, hardware, and digital services',
      sic_code: '58-63',
      icon: Laptop,
      consolidation_opportunity: 'very_high',
      typical_business_size: 'small',
      subcategories: [
        { id: 'software', name: 'Software Development', description: 'Custom software and applications', sic_code: '58' },
        { id: 'saas', name: 'SaaS Platforms', description: 'Cloud-based software services', sic_code: '58' },
        { id: 'cybersecurity', name: 'Cybersecurity', description: 'Security software and services', sic_code: '62' },
        { id: 'ai-ml', name: 'AI & Machine Learning', description: 'Artificial intelligence solutions', sic_code: '62' }
      ]
    },
    {
      id: 'healthcare',
      name: 'Healthcare & Life Sciences',
      description: 'Medical services, devices, and pharmaceuticals',
      sic_code: '86-88',
      icon: Heart,
      consolidation_opportunity: 'moderate',
      typical_business_size: 'medium',
      subcategories: [
        { id: 'private-healthcare', name: 'Private Healthcare', description: 'Private medical services', sic_code: '86' },
        { id: 'medical-devices', name: 'Medical Devices', description: 'Healthcare equipment and devices', sic_code: '32' },
        { id: 'biotech', name: 'Biotechnology', description: 'Biological and pharmaceutical research', sic_code: '72' },
        { id: 'health-tech', name: 'Health Technology', description: 'Digital health solutions', sic_code: '62' }
      ]
    },
    {
      id: 'financial-services',
      name: 'Financial Services',
      description: 'Banking, insurance, and financial technology',
      sic_code: '64-66',
      icon: Banknote,
      consolidation_opportunity: 'high',
      typical_business_size: 'large',
      subcategories: [
        { id: 'fintech', name: 'FinTech', description: 'Financial technology solutions', sic_code: '62' },
        { id: 'wealth-management', name: 'Wealth Management', description: 'Investment and advisory services', sic_code: '66' },
        { id: 'insurance', name: 'Insurance Services', description: 'Insurance and risk management', sic_code: '65' },
        { id: 'payment-processing', name: 'Payment Processing', description: 'Payment and transaction services', sic_code: '66' }
      ]
    },
    {
      id: 'automotive',
      name: 'Automotive & Transport',
      description: 'Vehicle manufacturing, services, and logistics',
      sic_code: '49-53',
      icon: Car,
      consolidation_opportunity: 'moderate',
      typical_business_size: 'large',
      subcategories: [
        { id: 'automotive-services', name: 'Automotive Services', description: 'Vehicle maintenance and repair', sic_code: '45' },
        { id: 'logistics', name: 'Logistics & Supply Chain', description: 'Transportation and warehousing', sic_code: '52-53' },
        { id: 'ev-charging', name: 'EV Charging', description: 'Electric vehicle infrastructure', sic_code: '35' },
        { id: 'fleet-management', name: 'Fleet Management', description: 'Vehicle fleet services', sic_code: '77' }
      ]
    },
    {
      id: 'real-estate',
      name: 'Real Estate & Construction',
      description: 'Property development and construction services',
      sic_code: '41-43, 68',
      icon: Home,
      consolidation_opportunity: 'moderate',
      typical_business_size: 'medium',
      subcategories: [
        { id: 'residential-development', name: 'Residential Development', description: 'Housing and residential projects', sic_code: '41' },
        { id: 'commercial-property', name: 'Commercial Property', description: 'Office and commercial developments', sic_code: '68' },
        { id: 'property-management', name: 'Property Management', description: 'Real estate management services', sic_code: '68' },
        { id: 'construction-services', name: 'Construction Services', description: 'Building and construction work', sic_code: '43' }
      ]
    },
    {
      id: 'retail-ecommerce',
      name: 'Retail & E-commerce',
      description: 'Traditional and online retail operations',
      sic_code: '45-47',
      icon: ShoppingBag,
      consolidation_opportunity: 'high',
      typical_business_size: 'small',
      subcategories: [
        { id: 'ecommerce', name: 'E-commerce Platforms', description: 'Online retail and marketplaces', sic_code: '47' },
        { id: 'specialty-retail', name: 'Specialty Retail', description: 'Niche retail categories', sic_code: '47' },
        { id: 'd2c-brands', name: 'D2C Brands', description: 'Direct-to-consumer brands', sic_code: '47' },
        { id: 'retail-tech', name: 'Retail Technology', description: 'Retail software and services', sic_code: '62' }
      ]
    },
    {
      id: 'travel-hospitality',
      name: 'Travel & Hospitality',
      description: 'Tourism, accommodation, and food services',
      sic_code: '55-56',
      icon: Plane,
      consolidation_opportunity: 'high',
      typical_business_size: 'small',
      subcategories: [
        { id: 'hotels-accommodation', name: 'Hotels & Accommodation', description: 'Lodging and hospitality services', sic_code: '55' },
        { id: 'restaurants', name: 'Restaurants & Catering', description: 'Food service establishments', sic_code: '56' },
        { id: 'travel-tech', name: 'Travel Technology', description: 'Travel booking and management platforms', sic_code: '62' },
        { id: 'experience-tourism', name: 'Experience Tourism', description: 'Tours and recreational activities', sic_code: '79' }
      ]
    },
    {
      id: 'energy-utilities',
      name: 'Energy & Utilities',
      description: 'Power generation, utilities, and renewable energy',
      sic_code: '35-39',
      icon: Zap,
      consolidation_opportunity: 'moderate',
      typical_business_size: 'large',
      subcategories: [
        { id: 'renewable-energy', name: 'Renewable Energy', description: 'Solar, wind, and clean energy', sic_code: '35' },
        { id: 'energy-efficiency', name: 'Energy Efficiency', description: 'Energy management and efficiency services', sic_code: '35' },
        { id: 'waste-management', name: 'Waste Management', description: 'Waste collection and recycling', sic_code: '38' },
        { id: 'water-services', name: 'Water Services', description: 'Water treatment and supply', sic_code: '36' }
      ]
    }
  ], [])

  useEffect(() => {
    setIndustries(predefinedIndustries)
  }, [predefinedIndustries])

  const filteredIndustries = industries.filter(industry =>
    industry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    industry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    industry.subcategories?.some(sub => 
      sub.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const handleIndustryToggle = (industry: IndustryCategory, subcategory?: IndustrySubcategory) => {
    const selectedIndustries = config.selectedIndustries || []
    const industryKey = subcategory 
      ? `${industry.id}:${subcategory.id}`
      : industry.id

    const existingIndex = selectedIndustries.findIndex((item: unknown) => 
      (item as any).key === industryKey
    )

    let newSelection
    if (existingIndex >= 0) {
      // Remove if already selected
      newSelection = selectedIndustries.filter((_: unknown, index: number) => index !== existingIndex)
    } else {
      // Add new selection
      const newItem = {
        key: industryKey,
        industry: industry.name,
        subcategory: subcategory?.name,
        consolidation_opportunity: industry.consolidation_opportunity,
        typical_business_size: industry.typical_business_size,
        sic_code: subcategory?.sic_code || industry.sic_code
      }
      newSelection = [...selectedIndustries, newItem]
    }

    updateConfig({ selectedIndustries: newSelection })
  }

  const handleMarketMaturityToggle = (maturity: string) => {
    const current = config.marketMaturity || []
    const newMaturity = current.includes(maturity)
      ? current.filter((m: string) => m !== maturity)
      : [...current, maturity]
    
    updateConfig({ marketMaturity: newMaturity })
  }

  const isIndustrySelected = (industry: IndustryCategory, subcategory?: IndustrySubcategory) => {
    const industryKey = subcategory 
      ? `${industry.id}:${subcategory.id}`
      : industry.id
    
    return config.selectedIndustries?.some((item: unknown) => (item as any).key === industryKey) || false
  }

  const getConsolidationColor = (opportunity: string) => {
    switch (opportunity) {
      case 'very_high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Scan Name and Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="scan-name">Scan Name *</Label>
          <Input
            id="scan-name"
            placeholder="e.g., UK FinTech Acquisition Scan"
            value={(config.name as string | undefined) || ''}
            onChange={(e) => updateConfig({ name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="scan-description">Description</Label>
          <Input
            id="scan-description"
            placeholder="Brief description of your acquisition goals"
            value={(config.description as string | undefined) || ''}
            onChange={(e) => updateConfig({ description: e.target.value })}
          />
        </div>
      </div>

      {/* Market Maturity Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Market Maturity Preferences</CardTitle>
          <CardDescription>
            Select the market stages you&apos;re interested in for acquisition opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'emerging', label: 'Emerging', description: 'Early stage markets with high growth potential' },
              { id: 'scaling', label: 'Scaling', description: 'Growing markets with established players' },
              { id: 'mature', label: 'Mature', description: 'Established markets with stable revenue' },
              { id: 'consolidating', label: 'Consolidating', description: 'Markets ripe for consolidation' }
            ].map((maturity) => (
              <div
                key={maturity.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  config.marketMaturity?.includes(maturity.id)
                    ? 'bg-primary/10 border-primary'
                    : 'bg-muted hover:bg-muted/80'
                }`}
                onClick={() => handleMarketMaturityToggle(maturity.id)}
              >
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={config.marketMaturity?.includes(maturity.id) || false}
                    onCheckedChange={() => {}}
                  />
                  <label className="font-medium text-sm">{maturity.label}</label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{maturity.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Industry Search */}
      <div className="space-y-2">
        <Label>Industry & Sector Selection *</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search industries, sectors, or SIC codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Selected Industries */}
      {config.selectedIndustries && config.selectedIndustries.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Industries ({config.selectedIndustries.length})</Label>
          <div className="flex flex-wrap gap-2">
            {config.selectedIndustries?.map((item: { id: string; name: string }, index: number) => (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-2"
              >
                {(item as { subcategory?: string; industry?: string }).subcategory ? `${(item as { industry?: string }).industry} - ${(item as { subcategory?: string }).subcategory}` : (item as { industry?: string }).industry}
                <button
                  onClick={() => {
                    const newSelection = (config.selectedIndustries ?? []).filter((_: unknown, i: number) => i !== index)
                    updateConfig({ selectedIndustries: newSelection })
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

      {/* Industry Categories */}
      <div className="grid gap-4">
        {filteredIndustries.map((industry) => {
          const Icon = industry.icon
          return (
            <Card key={industry.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{industry.name}</CardTitle>
                      <CardDescription>{industry.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getConsolidationColor(industry.consolidation_opportunity)}>
                      {industry.consolidation_opportunity.replace('_', ' ')} consolidation
                    </Badge>
                    <Badge variant="outline">
                      SIC: {industry.sic_code}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Main Industry Toggle */}
                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isIndustrySelected(industry)
                        ? 'bg-primary/10 border-primary'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => handleIndustryToggle(industry)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox checked={isIndustrySelected(industry)} onCheckedChange={() => {}} />
                        <span className="font-medium">Entire {industry.name} Sector</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {industry.typical_business_size} businesses
                      </Badge>
                    </div>
                  </div>

                  {/* Subcategories */}
                  {industry.subcategories && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                      {industry.subcategories.map((subcategory) => (
                        <div
                          key={subcategory.id}
                          className={`p-2 border rounded-md cursor-pointer transition-colors text-sm ${
                            isIndustrySelected(industry, subcategory)
                              ? 'bg-primary/10 border-primary'
                              : 'bg-background hover:bg-muted'
                          }`}
                          onClick={() => handleIndustryToggle(industry, subcategory)}
                        >
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={isIndustrySelected(industry, subcategory)}
                              onCheckedChange={() => {}}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium">{subcategory.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {subcategory.description}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredIndustries.length === 0 && searchTerm && (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              No industries found matching &quot;{searchTerm}&quot;
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try different search terms or browse the categories above
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}