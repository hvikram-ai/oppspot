'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  ArrowRight, 
  Check,
  Building2,
  MapPin,
  Settings,
  Search,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

// Step Components
import { IndustrySelectionStep } from '@/components/opp-scan/steps/industry-selection'
import { RegionSelectionStep } from '@/components/opp-scan/steps/region-selection'
import { ServicesSelectionStep } from '@/components/opp-scan/steps/services-selection'
import { ScanConfigurationStep } from '@/components/opp-scan/steps/scan-configuration'

interface WorkflowStep {
  id: string
  title: string
  description: string
  icon: any
  component: any
}

interface ScanConfig {
  name: string
  description: string
  selectedIndustries: any[]
  marketMaturity: string[]
  selectedRegions: any[]
  regulatoryRequirements: any
  crossBorderConsiderations: any
  requiredCapabilities: any[]
  strategicObjectives: any
  synergyRequirements: any
  dataSources: string[]
  scanDepth: 'basic' | 'detailed' | 'comprehensive'
}

function NewOppScanPageContent() {
  const router = useRouter()
  const supabase = createClient()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [scanConfig, setScanConfig] = useState<ScanConfig>({
    name: '',
    description: '',
    selectedIndustries: [],
    marketMaturity: [],
    selectedRegions: [],
    regulatoryRequirements: {},
    crossBorderConsiderations: {},
    requiredCapabilities: [],
    strategicObjectives: {},
    synergyRequirements: {},
    dataSources: [
      'companies_house',
      'financial_data',
      'digital_footprint',
      'patents_ip',
      'news_media'
    ],
    scanDepth: 'comprehensive'
  })

  const steps: WorkflowStep[] = [
    {
      id: 'industry',
      title: 'Industry Selection',
      description: 'Choose target industries and market segments',
      icon: Building2,
      component: IndustrySelectionStep
    },
    {
      id: 'region',
      title: 'Geographic Scope',
      description: 'Select regions and regulatory considerations',
      icon: MapPin,
      component: RegionSelectionStep
    },
    {
      id: 'services',
      title: 'Capabilities & Services',
      description: 'Define strategic requirements and synergies',
      icon: Settings,
      component: ServicesSelectionStep
    },
    {
      id: 'scan',
      title: 'Scan Configuration',
      description: 'Configure data sources and scanning parameters',
      icon: Search,
      component: ScanConfigurationStep
    }
  ]

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
    }
    getUser()
  }, [])

  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStepIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }

  const handleStepClick = (stepIndex: number) => {
    setCurrentStepIndex(stepIndex)
  }

  const handleConfigChange = (field: keyof ScanConfig, value: any) => {
    setScanConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const canProceedToNextStep = () => {
    switch (currentStep.id) {
      case 'industry':
        return scanConfig.selectedIndustries.length > 0 && scanConfig.name.trim().length > 0
      case 'region':
        return scanConfig.selectedRegions.length > 0
      case 'services':
        return scanConfig.requiredCapabilities.length > 0
      case 'scan':
        return scanConfig.dataSources.length > 0
      default:
        return true
    }
  }

  const handleStartScan = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()

      // Create the acquisition scan
      const { data: scan, error } = await supabase
        .from('acquisition_scans')
        .insert({
          user_id: user.id,
          org_id: profile?.org_id,
          name: scanConfig.name,
          description: scanConfig.description,
          status: 'configuring',
          selected_industries: scanConfig.selectedIndustries,
          market_maturity: scanConfig.marketMaturity,
          selected_regions: scanConfig.selectedRegions,
          regulatory_requirements: scanConfig.regulatoryRequirements,
          cross_border_considerations: scanConfig.crossBorderConsiderations,
          required_capabilities: scanConfig.requiredCapabilities,
          strategic_objectives: scanConfig.strategicObjectives,
          synergy_requirements: scanConfig.synergyRequirements,
          data_sources: scanConfig.dataSources,
          scan_depth: scanConfig.scanDepth,
          current_step: 'industry_selection',
          config: scanConfig
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Opp Scan configured successfully!')
      router.push(`/opp-scan/${scan.id}`)
    } catch (error) {
      console.error('Error creating scan:', error)
      toast.error('Failed to create acquisition scan')
    } finally {
      setLoading(false)
    }
  }

  const StepComponent = currentStep.component

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/opp-scan')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">New Acquisition Scan</h1>
              <p className="text-muted-foreground">
                Configure your AI-powered acquisition intelligence workflow
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStepIndex + 1} of {steps.length}</span>
              <span>{Math.round(progressPercentage)}% Complete</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Steps Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Workflow Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {steps.map((step, index) => {
                  const Icon = step.icon
                  const isCompleted = index < currentStepIndex
                  const isCurrent = index === currentStepIndex
                  const isAccessible = index <= currentStepIndex

                  return (
                    <button
                      key={step.id}
                      onClick={() => isAccessible && handleStepClick(index)}
                      disabled={!isAccessible}
                      className={`w-full p-3 rounded-md border text-left transition-colors ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground border-primary'
                          : isCompleted
                          ? 'bg-green-50 border-green-200 hover:bg-green-100'
                          : isAccessible
                          ? 'bg-muted hover:bg-muted/80 border-border'
                          : 'bg-muted/50 border-border opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          isCurrent
                            ? 'bg-primary-foreground text-primary'
                            : isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-background text-muted-foreground'
                        }`}>
                          {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium ${
                            isCurrent ? 'text-primary-foreground' : 'text-foreground'
                          }`}>
                            {step.title}
                          </p>
                          <p className={`text-sm ${
                            isCurrent ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}>
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </CardContent>
            </Card>

            {/* Enterprise Features Badge */}
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <Badge variant="outline" className="text-xs">
                    Enterprise Feature
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  £50,000 premium feature with enterprise-grade AI analysis, compliance, and professional reporting.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary text-primary-foreground">
                    <currentStep.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle>{currentStep.title}</CardTitle>
                    <CardDescription>{currentStep.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <StepComponent
                  config={scanConfig}
                  onChange={handleConfigChange}
                />
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstStep}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {isLastStep ? (
                  <Button
                    onClick={handleStartScan}
                    disabled={!canProceedToNextStep() || loading}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Starting Scan...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Start Opp Scan
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceedToNextStep()}
                  >
                    Next Step
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewOppScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <NewOppScanPageContent />
    </Suspense>
  )
}