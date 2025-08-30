'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  Building2, 
  Users, 
  Target, 
  ChevronRight, 
  ChevronLeft,
  Check,
  Sparkles,
  Search,
  Map,
  FileText,
  Loader2
} from 'lucide-react'

const steps = [
  {
    id: 'company',
    title: 'Tell us about your company',
    description: 'Help us personalize your experience',
    icon: Building2,
  },
  {
    id: 'goals',
    title: 'What are you looking for?',
    description: 'Set your search preferences',
    icon: Target,
  },
  {
    id: 'features',
    title: 'Quick tour',
    description: 'Learn about key features',
    icon: Sparkles,
  },
]

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Education',
  'Real Estate',
  'Hospitality',
  'Professional Services',
  'Other',
]

const companySizes = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '500+ employees',
]

const searchGoals = [
  { id: 'leads', label: 'Find new leads', icon: Users },
  { id: 'partners', label: 'Identify partners', icon: Building2 },
  { id: 'competitors', label: 'Research competitors', icon: Target },
  { id: 'suppliers', label: 'Find suppliers', icon: FileText },
  { id: 'market', label: 'Market research', icon: Search },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    industry: '',
    companySize: '',
    goals: [] as string[],
    interests: [] as string[],
  })
  
  const router = useRouter()
  const supabase = createClient()

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    }
  }, [router, supabase])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const toggleGoal = (goalId: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter(g => g !== goalId)
        : [...prev.goals, goalId]
    }))
  }

  const completeOnboarding = async () => {
    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update profile with onboarding data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: profileError } = await (supabase
        .from('profiles') as any)
        .update({
          preferences: {
            ...formData,
            onboarding_completed: true,
            onboarding_date: new Date().toISOString(),
          },
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (profile?.org_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase
          .from('organizations') as any)
          .update({
            settings: {
              industry: formData.industry,
              company_size: formData.companySize,
            },
          })
          .eq('id', profile.org_id)
      }

      toast.success('Welcome aboard! Let&apos;s start discovering opportunities.')
      router.push('/dashboard')
    } catch (error) {
      console.error('Onboarding error:', error)
      toast.error('Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div
                  key={step.id}
                  className={`flex items-center ${
                    index < steps.length - 1 ? 'flex-1' : ''
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      index <= currentStep
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/30'
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        index < currentStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{steps[currentStep].title}</CardTitle>
                <CardDescription>{steps[currentStep].description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Company Info */}
                {currentStep === 0 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select
                        value={formData.industry}
                        onValueChange={(value) =>
                          setFormData({ ...formData, industry: value })
                        }
                      >
                        <SelectTrigger id="industry">
                          <SelectValue placeholder="Select your industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {industries.map((industry) => (
                            <SelectItem key={industry} value={industry.toLowerCase()}>
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="size">Company Size</Label>
                      <Select
                        value={formData.companySize}
                        onValueChange={(value) =>
                          setFormData({ ...formData, companySize: value })
                        }
                      >
                        <SelectTrigger id="size">
                          <SelectValue placeholder="Select company size" />
                        </SelectTrigger>
                        <SelectContent>
                          {companySizes.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Step 2: Goals */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Select all that apply:
                    </p>
                    {searchGoals.map((goal) => {
                      const Icon = goal.icon
                      const isSelected = formData.goals.includes(goal.id)
                      return (
                        <div
                          key={goal.id}
                          onClick={() => toggleGoal(goal.id)}
                          className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-muted hover:border-primary/50'
                          }`}
                        >
                          <Icon className="h-5 w-5 mr-3" />
                          <span className="flex-1">{goal.label}</span>
                          {isSelected && <Check className="h-5 w-5 text-primary" />}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Step 3: Features Tour */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="text-center py-4">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <h3 className="text-lg font-semibold mb-2">You&apos;re all set!</h3>
                      <p className="text-muted-foreground">
                        Here are some features to get you started:
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <Search className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Smart Search</p>
                          <p className="text-sm text-muted-foreground">
                            Use natural language to find businesses
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Map className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Map Explorer</p>
                          <p className="text-sm text-muted-foreground">
                            Visualize businesses on an interactive map
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <FileText className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Export Data</p>
                          <p className="text-sm text-muted-foreground">
                            Download your findings in CSV or Excel
                          </p>
                        </div>
                      </div>
                    </div>

                    <Badge className="w-full justify-center py-2" variant="secondary">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Your 30-day trial has started
                    </Badge>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>

                  {currentStep < steps.length - 1 ? (
                    <Button onClick={handleNext}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={completeOnboarding} disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          Start Exploring
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Skip Option */}
        <div className="text-center mt-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}