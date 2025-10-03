'use client'

/**
 * Goal Template Selector Component
 * Displays pre-built goal templates for quick stream creation
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GoalTemplate, GoalCategory } from '@/types/streams'
import { Check, Search, TrendingUp, Star } from 'lucide-react'
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
    </div>
  )
}
