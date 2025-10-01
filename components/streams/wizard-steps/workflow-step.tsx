'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StreamWizardData, WORKFLOW_TEMPLATES, WorkflowTemplateId } from '@/types/stream-wizard'
import { Badge } from '@/components/ui/badge'
import { Plus, GripVertical, X } from 'lucide-react'
import { WorkflowStage } from '@/types/streams'

interface WorkflowStepProps {
  data: StreamWizardData
  onUpdate: (updates: Partial<StreamWizardData>) => void
}

export function WorkflowStep({ data, onUpdate }: WorkflowStepProps) {
  const handleTemplateChange = (templateId: WorkflowTemplateId) => {
    const template = WORKFLOW_TEMPLATES[templateId]
    onUpdate({
      workflowTemplate: templateId,
      stages: [...template.stages],
    })
  }

  const handleAddStage = () => {
    const newStage: WorkflowStage = {
      id: `stage_${Date.now()}`,
      name: 'New Stage',
      color: '#94a3b8',
      order: data.stages.length,
    }
    onUpdate({ stages: [...data.stages, newStage] })
  }

  const handleRemoveStage = (index: number) => {
    const newStages = data.stages.filter((_, i) => i !== index)
    onUpdate({ stages: newStages })
  }

  const handleStageUpdate = (index: number, updates: Partial<WorkflowStage>) => {
    const newStages = [...data.stages]
    newStages[index] = { ...newStages[index]!, ...updates }
    onUpdate({ stages: newStages })
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h3 className="text-lg font-semibold mb-1">Workflow Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Choose a workflow template or create your own custom stages
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Choose Template</CardTitle>
          <CardDescription>Select a pre-built workflow or start from scratch</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={data.workflowTemplate} onValueChange={handleTemplateChange}>
            <div className="grid gap-3">
              {Object.values(WORKFLOW_TEMPLATES).map((template) => (
                <Label
                  key={template.id}
                  htmlFor={template.id}
                  className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <RadioGroupItem value={template.id} id={template.id} />
                  <div className="flex-1">
                    <div className="font-medium mb-1">{template.name}</div>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                    <div className="flex gap-1 mt-2">
                      {template.stages.map((stage) => (
                        <div
                          key={stage.id}
                          className="h-2 w-12 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                      ))}
                    </div>
                  </div>
                </Label>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Customize Stages</CardTitle>
              <CardDescription>Edit stage names and colors to match your workflow</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddStage}>
              <Plus className="h-4 w-4 mr-1" />
              Add Stage
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.stages.map((stage, index) => (
              <div key={stage.id} className="flex items-center gap-3 p-3 border rounded-lg group">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={stage.name}
                  onChange={(e) => handleStageUpdate(index, { name: e.target.value })}
                  className="flex-1"
                />
                <input
                  type="color"
                  value={stage.color}
                  onChange={(e) => handleStageUpdate(index, { color: e.target.value })}
                  className="w-12 h-9 rounded cursor-pointer"
                />
                {data.stages.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveStage(index)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Board */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Board Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {data.stages.map((stage) => (
              <div key={stage.id} className="flex-shrink-0 w-48">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-sm font-medium">{stage.name}</span>
                  <Badge variant="secondary" className="text-xs ml-auto">0</Badge>
                </div>
                <div className="border rounded-lg p-3 bg-muted/30 min-h-[100px]">
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Items will appear here
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
