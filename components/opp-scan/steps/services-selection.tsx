'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Target, 
  Zap,
  Users,
  Cog,
  TrendingUp,
  Shield,
  Search,
  X,
  Plus,
  Lightbulb,
  Building,
  Globe,
  Database
} from 'lucide-react'

interface Capability {
  id: string
  name: string
  category: string
  description: string
  strategic_value: 'critical' | 'high' | 'medium' | 'low'
  complexity: 'low' | 'medium' | 'high'
  examples: string[]
  synergy_potential: string[]
}

interface StrategicObjective {
  id: string
  name: string
  description: string
  priority: 'must_have' | 'should_have' | 'nice_to_have'
  impact: 'transformational' | 'significant' | 'moderate' | 'incremental'
  examples: string[]
}

interface ServicesSelectionProps {
  config: any
  onChange: (field: string, value: any) => void
}

export function ServicesSelectionStep({ config, onChange }: ServicesSelectionProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState<'capabilities' | 'objectives' | 'synergies'>('capabilities')
  const [customCapability, setCustomCapability] = useState('')
  const [customObjective, setCustomObjective] = useState('')

  // Comprehensive capability categories
  const capabilities: Capability[] = [
    // Technology & Digital Capabilities
    {
      id: 'software-development',
      name: 'Software Development',
      category: 'Technology',
      description: 'Custom software development, web applications, mobile apps',
      strategic_value: 'high',
      complexity: 'medium',
      examples: ['Full-stack development', 'Mobile app development', 'API development', 'Legacy system modernization'],
      synergy_potential: ['Cross-selling to existing clients', 'Technology integration', 'Development team expansion']
    },
    {
      id: 'data-analytics',
      name: 'Data Analytics & AI',
      category: 'Technology',
      description: 'Data science, machine learning, business intelligence',
      strategic_value: 'critical',
      complexity: 'high',
      examples: ['Predictive analytics', 'Machine learning models', 'Data visualization', 'Business intelligence'],
      synergy_potential: ['Enhanced product intelligence', 'Customer insights', 'Operational optimization']
    },
    {
      id: 'cybersecurity',
      name: 'Cybersecurity Services',
      category: 'Technology',
      description: 'Information security, threat detection, compliance',
      strategic_value: 'high',
      complexity: 'high',
      examples: ['Security auditing', 'Penetration testing', 'Compliance consulting', 'Incident response'],
      synergy_potential: ['Client trust enhancement', 'Regulatory compliance', 'Risk mitigation']
    },
    {
      id: 'cloud-infrastructure',
      name: 'Cloud Infrastructure',
      category: 'Technology',
      description: 'Cloud migration, DevOps, infrastructure management',
      strategic_value: 'high',
      complexity: 'medium',
      examples: ['AWS/Azure migrations', 'Kubernetes orchestration', 'CI/CD pipelines', 'Infrastructure as Code'],
      synergy_potential: ['Cost optimization', 'Scalability improvement', 'Technical expertise']
    },

    // Sales & Marketing Capabilities
    {
      id: 'digital-marketing',
      name: 'Digital Marketing',
      category: 'Sales & Marketing',
      description: 'SEO, PPC, content marketing, social media',
      strategic_value: 'high',
      complexity: 'medium',
      examples: ['Search engine optimization', 'Pay-per-click advertising', 'Content strategy', 'Social media management'],
      synergy_potential: ['Lead generation', 'Brand visibility', 'Customer acquisition']
    },
    {
      id: 'sales-automation',
      name: 'Sales Automation',
      category: 'Sales & Marketing',
      description: 'CRM implementation, sales process optimization',
      strategic_value: 'medium',
      complexity: 'medium',
      examples: ['Salesforce implementation', 'Sales funnel optimization', 'Lead scoring', 'Marketing automation'],
      synergy_potential: ['Sales efficiency', 'Customer retention', 'Revenue predictability']
    },
    {
      id: 'customer-experience',
      name: 'Customer Experience',
      category: 'Sales & Marketing',
      description: 'UX/UI design, customer journey optimization',
      strategic_value: 'high',
      complexity: 'medium',
      examples: ['User interface design', 'Customer journey mapping', 'A/B testing', 'Conversion optimization'],
      synergy_potential: ['Customer satisfaction', 'Retention improvement', 'Revenue growth']
    },

    // Operations & Process
    {
      id: 'business-process',
      name: 'Business Process Optimization',
      category: 'Operations',
      description: 'Process improvement, automation, efficiency gains',
      strategic_value: 'medium',
      complexity: 'low',
      examples: ['Workflow automation', 'Process mapping', 'Lean implementation', 'Quality management'],
      synergy_potential: ['Cost reduction', 'Operational efficiency', 'Quality improvement']
    },
    {
      id: 'supply-chain',
      name: 'Supply Chain Management',
      category: 'Operations',
      description: 'Logistics, procurement, inventory management',
      strategic_value: 'medium',
      complexity: 'medium',
      examples: ['Inventory optimization', 'Supplier management', 'Logistics coordination', 'Demand forecasting'],
      synergy_potential: ['Cost savings', 'Supplier relationships', 'Operational resilience']
    },
    {
      id: 'quality-assurance',
      name: 'Quality Assurance',
      category: 'Operations',
      description: 'Testing, compliance, quality control',
      strategic_value: 'medium',
      complexity: 'low',
      examples: ['Automated testing', 'Quality control systems', 'Compliance auditing', 'Process validation'],
      synergy_potential: ['Risk reduction', 'Customer confidence', 'Regulatory compliance']
    },

    // Financial & Professional Services
    {
      id: 'financial-planning',
      name: 'Financial Planning & Analysis',
      category: 'Financial Services',
      description: 'Financial modeling, budgeting, forecasting',
      strategic_value: 'high',
      complexity: 'medium',
      examples: ['Financial modeling', 'Budget planning', 'Performance analysis', 'Scenario planning'],
      synergy_potential: ['Strategic planning', 'Investment decisions', 'Risk management']
    },
    {
      id: 'compliance-regulatory',
      name: 'Compliance & Regulatory',
      category: 'Professional Services',
      description: 'Regulatory compliance, risk management, auditing',
      strategic_value: 'high',
      complexity: 'high',
      examples: ['Regulatory reporting', 'Compliance monitoring', 'Risk assessment', 'Audit preparation'],
      synergy_potential: ['Risk mitigation', 'Regulatory confidence', 'Market access']
    },
    {
      id: 'legal-services',
      name: 'Legal Services',
      category: 'Professional Services',
      description: 'Legal advisory, contract management, IP protection',
      strategic_value: 'medium',
      complexity: 'high',
      examples: ['Contract review', 'IP management', 'Legal advisory', 'Dispute resolution'],
      synergy_potential: ['Legal protection', 'Contract optimization', 'IP value']
    },

    // Specialized Industry Capabilities
    {
      id: 'healthcare-compliance',
      name: 'Healthcare Compliance',
      category: 'Industry Specific',
      description: 'Healthcare regulations, patient data protection',
      strategic_value: 'critical',
      complexity: 'high',
      examples: ['HIPAA compliance', 'Medical device regulations', 'Clinical data management', 'Patient privacy'],
      synergy_potential: ['Healthcare market entry', 'Regulatory expertise', 'Patient trust']
    },
    {
      id: 'financial-regulations',
      name: 'Financial Regulations',
      category: 'Industry Specific',
      description: 'Financial services compliance, regulatory reporting',
      strategic_value: 'critical',
      complexity: 'high',
      examples: ['FCA compliance', 'Anti-money laundering', 'Basel III compliance', 'Stress testing'],
      synergy_potential: ['Financial market access', 'Regulatory confidence', 'Risk management']
    },
    {
      id: 'manufacturing-expertise',
      name: 'Manufacturing Expertise',
      category: 'Industry Specific',
      description: 'Production optimization, quality control, lean manufacturing',
      strategic_value: 'high',
      complexity: 'medium',
      examples: ['Production planning', 'Quality systems', 'Lean manufacturing', 'Equipment optimization'],
      synergy_potential: ['Cost reduction', 'Quality improvement', 'Production efficiency']
    }
  ]

  // Strategic objectives for acquisitions
  const strategicObjectives: StrategicObjective[] = [
    {
      id: 'market-expansion',
      name: 'Geographic Market Expansion',
      description: 'Enter new geographic markets or strengthen presence in existing ones',
      priority: 'must_have',
      impact: 'transformational',
      examples: ['New country market entry', 'Regional presence expansion', 'Local market expertise']
    },
    {
      id: 'customer-base-growth',
      name: 'Customer Base Growth',
      description: 'Acquire established customer relationships and expand market reach',
      priority: 'must_have',
      impact: 'significant',
      examples: ['Enterprise customer acquisition', 'SMB market entry', 'Customer loyalty programs']
    },
    {
      id: 'technology-acquisition',
      name: 'Technology & IP Acquisition',
      description: 'Acquire proprietary technology, patents, or technical capabilities',
      priority: 'should_have',
      impact: 'transformational',
      examples: ['Proprietary algorithms', 'Patent portfolios', 'Technical expertise', 'R&D capabilities']
    },
    {
      id: 'talent-acquisition',
      name: 'Talent & Expertise Acquisition',
      description: 'Acquire skilled teams, domain expertise, or leadership talent',
      priority: 'should_have',
      impact: 'significant',
      examples: ['Technical teams', 'Industry expertise', 'Leadership talent', 'Cultural integration']
    },
    {
      id: 'vertical-integration',
      name: 'Vertical Integration',
      description: 'Control more of the supply chain or value delivery process',
      priority: 'nice_to_have',
      impact: 'moderate',
      examples: ['Supplier acquisition', 'Distribution control', 'Manufacturing capabilities']
    },
    {
      id: 'horizontal-expansion',
      name: 'Horizontal Market Expansion',
      description: 'Expand into adjacent or complementary markets',
      priority: 'should_have',
      impact: 'significant',
      examples: ['Adjacent market entry', 'Complementary services', 'Cross-selling opportunities']
    },
    {
      id: 'cost-synergies',
      name: 'Cost Reduction & Synergies',
      description: 'Achieve operational efficiencies and cost savings through consolidation',
      priority: 'should_have',
      impact: 'moderate',
      examples: ['Operational consolidation', 'Shared services', 'Economies of scale']
    },
    {
      id: 'competitive-positioning',
      name: 'Competitive Positioning',
      description: 'Strengthen market position and competitive advantages',
      priority: 'must_have',
      impact: 'significant',
      examples: ['Market leadership', 'Competitive differentiation', 'Barrier creation']
    }
  ]

  const filteredCapabilities = capabilities.filter(capability =>
    capability.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    capability.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    capability.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    capability.examples.some(example => 
      example.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const handleCapabilityToggle = (capability: Capability) => {
    const selected = config.requiredCapabilities || []
    const existingIndex = selected.findIndex((c: any) => c.id === capability.id)

    let newSelection
    if (existingIndex >= 0) {
      newSelection = selected.filter((_: any, index: number) => index !== existingIndex)
    } else {
      newSelection = [...selected, capability]
    }

    onChange('requiredCapabilities', newSelection)
  }

  const handleObjectiveToggle = (objective: StrategicObjective) => {
    const current = config.strategicObjectives || {}
    const newObjectives = { ...current }
    
    if (newObjectives[objective.id]) {
      delete newObjectives[objective.id]
    } else {
      newObjectives[objective.id] = objective
    }

    onChange('strategicObjectives', newObjectives)
  }

  const addCustomCapability = () => {
    if (!customCapability.trim()) return

    const custom: Capability = {
      id: `custom-${Date.now()}`,
      name: customCapability,
      category: 'Custom',
      description: 'Custom capability requirement',
      strategic_value: 'medium',
      complexity: 'medium',
      examples: [],
      synergy_potential: []
    }

    const selected = config.requiredCapabilities || []
    onChange('requiredCapabilities', [...selected, custom])
    setCustomCapability('')
  }

  const isCapabilitySelected = (capability: Capability) => {
    return config.requiredCapabilities?.some((c: any) => c.id === capability.id) || false
  }

  const isObjectiveSelected = (objective: StrategicObjective) => {
    return config.strategicObjectives?.[objective.id] !== undefined
  }

  const getStrategicValueColor = (value: string) => {
    switch (value) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'must_have':
        return 'bg-red-100 text-red-800'
      case 'should_have':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-green-100 text-green-800'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'transformational':
        return 'bg-purple-100 text-purple-800'
      case 'significant':
        return 'bg-blue-100 text-blue-800'
      case 'moderate':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setSelectedTab('capabilities')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'capabilities'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Cog className="h-4 w-4 inline mr-2" />
          Required Capabilities
        </button>
        <button
          onClick={() => setSelectedTab('objectives')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'objectives'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Target className="h-4 w-4 inline mr-2" />
          Strategic Objectives
        </button>
        <button
          onClick={() => setSelectedTab('synergies')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'synergies'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Zap className="h-4 w-4 inline mr-2" />
          Synergy Requirements
        </button>
      </div>

      {selectedTab === 'capabilities' && (
        <>
          {/* Capabilities Search */}
          <div className="space-y-2">
            <Label>Search Capabilities</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search capabilities, categories, or examples..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Add Custom Capability */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Custom Capability</CardTitle>
              <CardDescription>
                Can't find what you're looking for? Add a custom capability requirement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter custom capability name"
                  value={customCapability}
                  onChange={(e) => setCustomCapability(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={addCustomCapability} disabled={!customCapability.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Selected Capabilities */}
          {config.requiredCapabilities && config.requiredCapabilities.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Capabilities ({config.requiredCapabilities.length})</Label>
              <div className="flex flex-wrap gap-2">
                {config.requiredCapabilities.map((capability: any, index: number) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    {capability.name}
                    <button
                      onClick={() => {
                        const newSelection = config.requiredCapabilities.filter((_: any, i: number) => i !== index)
                        onChange('requiredCapabilities', newSelection)
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

          {/* Capabilities by Category */}
          {['Technology', 'Sales & Marketing', 'Operations', 'Financial Services', 'Professional Services', 'Industry Specific', 'Custom'].map(category => {
            const categoryCapabilities = filteredCapabilities.filter(c => c.category === category)
            if (categoryCapabilities.length === 0) return null

            return (
              <div key={category} className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {category === 'Technology' && <Database className="h-5 w-5" />}
                  {category === 'Sales & Marketing' && <TrendingUp className="h-5 w-5" />}
                  {category === 'Operations' && <Cog className="h-5 w-5" />}
                  {category === 'Financial Services' && <Building className="h-5 w-5" />}
                  {category === 'Professional Services' && <Users className="h-5 w-5" />}
                  {category === 'Industry Specific' && <Globe className="h-5 w-5" />}
                  {category === 'Custom' && <Lightbulb className="h-5 w-5" />}
                  {category}
                </h3>
                <div className="grid gap-3">
                  {categoryCapabilities.map((capability) => (
                    <Card 
                      key={capability.id}
                      className={`cursor-pointer transition-all ${
                        isCapabilitySelected(capability) ? 'ring-2 ring-primary' : 'hover:shadow-md'
                      }`}
                      onClick={() => handleCapabilityToggle(capability)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox checked={isCapabilitySelected(capability)} readOnly />
                            <div>
                              <CardTitle className="text-base">{capability.name}</CardTitle>
                              <CardDescription>{capability.description}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStrategicValueColor(capability.strategic_value)}>
                              {capability.strategic_value} value
                            </Badge>
                            <Badge variant="outline">
                              {capability.complexity} complexity
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      {(capability.examples.length > 0 || capability.synergy_potential.length > 0) && (
                        <CardContent>
                          <div className="space-y-3">
                            {capability.examples.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-1">Examples:</p>
                                <div className="flex flex-wrap gap-1">
                                  {capability.examples.slice(0, 3).map((example, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {example}
                                    </Badge>
                                  ))}
                                  {capability.examples.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{capability.examples.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                            {capability.synergy_potential.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-1">Synergy Potential:</p>
                                <div className="flex flex-wrap gap-1">
                                  {capability.synergy_potential.map((synergy, index) => (
                                    <Badge key={index} variant="outline" className="text-xs text-green-700">
                                      {synergy}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}

          {filteredCapabilities.length === 0 && searchTerm && (
            <Card>
              <CardContent className="p-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  No capabilities found matching "{searchTerm}"
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {selectedTab === 'objectives' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Strategic Acquisition Objectives</CardTitle>
              <CardDescription>
                Define your strategic goals for this acquisition scan. These objectives will influence target scoring and prioritization.
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4">
            {strategicObjectives.map((objective) => (
              <Card 
                key={objective.id}
                className={`cursor-pointer transition-all ${
                  isObjectiveSelected(objective) ? 'ring-2 ring-primary' : 'hover:shadow-md'
                }`}
                onClick={() => handleObjectiveToggle(objective)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={isObjectiveSelected(objective)} readOnly />
                      <div>
                        <CardTitle className="text-base">{objective.name}</CardTitle>
                        <CardDescription>{objective.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(objective.priority)}>
                        {objective.priority.replace('_', ' ')}
                      </Badge>
                      <Badge className={getImpactColor(objective.impact)}>
                        {objective.impact}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="text-sm font-medium mb-1">Examples:</p>
                    <div className="flex flex-wrap gap-1">
                      {objective.examples.map((example, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {example}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Custom Objective */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Custom Objective</CardTitle>
              <CardDescription>
                Add specific strategic objectives not covered above.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Input
                  placeholder="Enter custom objective name"
                  value={customObjective}
                  onChange={(e) => setCustomObjective(e.target.value)}
                />
                <Button onClick={() => {
                  if (customObjective.trim()) {
                    const custom: StrategicObjective = {
                      id: `custom-${Date.now()}`,
                      name: customObjective,
                      description: 'Custom strategic objective',
                      priority: 'should_have',
                      impact: 'moderate',
                      examples: []
                    }
                    
                    const current = config.strategicObjectives || {}
                    onChange('strategicObjectives', { ...current, [custom.id]: custom })
                    setCustomObjective('')
                  }
                }} disabled={!customObjective.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Objective
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {selectedTab === 'synergies' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Synergy Requirements</CardTitle>
              <CardDescription>
                Define specific synergy requirements and value creation expectations from potential acquisitions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="revenue-synergies">Revenue Synergy Expectations</Label>
                  <Textarea
                    id="revenue-synergies"
                    placeholder="Describe expected revenue synergies (cross-selling, new markets, pricing power, etc.)"
                    value={config.synergyRequirements?.revenue_synergies || ''}
                    onChange={(e) => onChange('synergyRequirements', {
                      ...config.synergyRequirements,
                      revenue_synergies: e.target.value
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost-synergies">Cost Synergy Expectations</Label>
                  <Textarea
                    id="cost-synergies"
                    placeholder="Describe expected cost synergies (economies of scale, operational efficiencies, shared services, etc.)"
                    value={config.synergyRequirements?.cost_synergies || ''}
                    onChange={(e) => onChange('synergyRequirements', {
                      ...config.synergyRequirements,
                      cost_synergies: e.target.value
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strategic-synergies">Strategic Synergy Expectations</Label>
                  <Textarea
                    id="strategic-synergies"
                    placeholder="Describe expected strategic synergies (capabilities, market position, competitive advantages, etc.)"
                    value={config.synergyRequirements?.strategic_synergies || ''}
                    onChange={(e) => onChange('synergyRequirements', {
                      ...config.synergyRequirements,
                      strategic_synergies: e.target.value
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="integration-requirements">Integration Requirements</Label>
                  <Textarea
                    id="integration-requirements"
                    placeholder="Describe integration requirements and potential challenges"
                    value={config.synergyRequirements?.integration_requirements || ''}
                    onChange={(e) => onChange('synergyRequirements', {
                      ...config.synergyRequirements,
                      integration_requirements: e.target.value
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Synergy Assessment Framework */}
          <Card>
            <CardHeader>
              <CardTitle>Synergy Assessment Priorities</CardTitle>
              <CardDescription>
                Rate the importance of different synergy types for target evaluation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: 'revenue', label: 'Revenue Synergies', description: 'Cross-selling, market expansion, pricing power' },
                  { id: 'cost', label: 'Cost Synergies', description: 'Operational efficiencies, shared services, economies of scale' },
                  { id: 'technology', label: 'Technology Synergies', description: 'IP, technical capabilities, innovation' },
                  { id: 'talent', label: 'Talent Synergies', description: 'Skills, expertise, leadership capabilities' },
                  { id: 'market', label: 'Market Synergies', description: 'Customer base, distribution, brand strength' }
                ].map((synergy) => (
                  <div key={synergy.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{synergy.label}</p>
                      <p className="text-sm text-muted-foreground">{synergy.description}</p>
                    </div>
                    <div className="flex gap-2">
                      {['Low', 'Medium', 'High', 'Critical'].map((priority) => (
                        <button
                          key={priority}
                          onClick={() => {
                            onChange('synergyRequirements', {
                              ...config.synergyRequirements,
                              priorities: {
                                ...config.synergyRequirements?.priorities,
                                [synergy.id]: priority.toLowerCase()
                              }
                            })
                          }}
                          className={`px-3 py-1 text-xs rounded ${
                            config.synergyRequirements?.priorities?.[synergy.id] === priority.toLowerCase()
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {priority}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}