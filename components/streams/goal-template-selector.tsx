'use client'

/**
 * Goal Template Selector Component
 * Displays pre-built goal templates for quick stream creation
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GoalTemplate, GoalCategory } from '@/types/streams'
import { TemplateDetailDialog } from './template-detail-dialog'
import { ExtendedGoalTemplate } from '@/lib/templates/template-library'
import { Check, Search, TrendingUp, Star, Info, Sparkles, Award, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GoalTemplateSelectorProps {
  selectedTemplateId: string | null
  onSelectTemplate: (template: GoalTemplate | null) => void
  templates: GoalTemplate[]
}

const CATEGORY_INFO: Record<GoalCategory, { label: string; description: string; icon: string }> = {
  acquisition: {
    label: 'Acquisition',
    description: 'Find companies to acquire',
    icon: '🎯'
  },
  expansion: {
    label: 'Expansion',
    description: 'Enter new markets',
    icon: '🌍'
  },
  partnership: {
    label: 'Partnership',
    description: 'Strategic alliances',
    icon: '🤝'
  },
  research: {
    label: 'Research',
    description: 'Market intelligence',
    icon: '🔍'
  },
  monitoring: {
    label: 'Monitoring',
    description: 'Track competitors',
    icon: '👀'
  },
  custom: {
    label: 'Custom',
    description: 'Build from scratch',
    icon: '⚙️'
  }
}

export function GoalTemplateSelector({
  selectedTemplateId,
  onSelectTemplate,
  templates
}: GoalTemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory | 'all'>('all')
  const [previewTemplate, setPreviewTemplate] = useState<ExtendedGoalTemplate | null>(null)
  const [recommendations, setRecommendations] = useState<Array<{ template: GoalTemplate; reasons: string[] }>>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)

  // Fetch recommendations on mount
  useEffect(() => {
    fetchRecommendations()
  }, [])

  const fetchRecommendations = async () => {
    try {
      setLoadingRecommendations(true)
      const response = await fetch('/api/goal-templates/recommend?limit=3')
      if (response.ok) {
        const data = await response.json()
        setRecommendations(data.recommendations || [])
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setLoadingRecommendations(false)
    }
  }

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Group by category
  const categories = Array.from(new Set(templates.map(t => t.category)))

  const handleSelectTemplate = (template: GoalTemplate) => {
    if (selectedTemplateId === template.id) {
      onSelectTemplate(null) // Deselect
    } else {
      onSelectTemplate(template)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose a Goal Template</h3>
        <p className="text-sm text-muted-foreground">
          Select a pre-built template to get started quickly, or create a custom goal from scratch
        </p>
      </div>

      {/* Recommendations Section */}
      {!loadingRecommendations && recommendations.length > 0 && (
        <div className="p-4 rounded-lg border bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h4 className="font-semibold text-purple-900">Recommended For You</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {recommendations.slice(0, 3).map(({ template, reasons }) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="p-3 rounded-lg border-2 border-purple-200 bg-white hover:border-purple-400 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{template.icon}</span>
                  <span className="font-medium text-sm">{template.name}</span>
                </div>
                {reasons.length > 0 && (
                  <p className="text-xs text-purple-700 line-clamp-2">{reasons[0]}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="template-search"
          name="template-search"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as GoalCategory | 'all')}>
        <TabsList className="w-full grid grid-cols-6">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          {categories.map(category => (
            <TabsTrigger key={category} value={category} className="text-xs">
              <span className="mr-1">{CATEGORY_INFO[category].icon}</span>
              <span className="hidden sm:inline">{CATEGORY_INFO[category].label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-3 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Custom Option */}
            <Card
              className={cn(
                "cursor-pointer transition-all hover:shadow-md border-2",
                selectedTemplateId === null
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border"
              )}
              onClick={() => onSelectTemplate(null)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">⚙️</div>
                    <div>
                      <CardTitle className="text-base">Custom Goal</CardTitle>
                      <CardDescription className="text-xs">
                        Build from scratch
                      </CardDescription>
                    </div>
                  </div>
                  {selectedTemplateId === null && (
                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-xs text-muted-foreground">
                  Define your own criteria, metrics, and success indicators
                </p>
              </CardContent>
            </Card>

            {/* Template Cards */}
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md border-2",
                  selectedTemplateId === template.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border"
                )}
                onClick={() => handleSelectTemplate(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-2xl">{template.icon}</div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {CATEGORY_INFO[template.category].label}
                        </CardDescription>
                      </div>
                    </div>
                    {selectedTemplateId === template.id && (
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pb-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>

                  {/* Template Stats */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {template.use_count > 0 && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {template.use_count} uses
                      </div>
                    )}
                    {template.avg_success_rate !== null && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {Math.round(template.avg_success_rate * 100)}% success
                      </div>
                    )}
                  </div>

                  {/* Suggested Agents */}
                  {template.suggested_agents.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.suggested_agents.map((agent, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {agent.agent_type.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Preview Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPreviewTemplate(template as ExtendedGoalTemplate)
                    }}
                  >
                    <Info className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* No Results */}
          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No templates found matching your search</p>
              <Button
                variant="link"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('all')
                }}
                className="text-xs mt-2"
              >
                Clear filters
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Detail Dialog */}
      <TemplateDetailDialog
        template={previewTemplate}
        open={!!previewTemplate}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
        onUseTemplate={(template) => {
          handleSelectTemplate(template as GoalTemplate)
        }}
      />
    </div>
  )
}
