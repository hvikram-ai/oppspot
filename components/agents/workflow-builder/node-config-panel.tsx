'use client'

// Node Configuration Panel - Configure node properties

import React, { useState, useEffect } from 'react'
import { Node } from 'reactflow'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface NodeConfigPanelProps {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
  onClose: () => void
}

const agentTypes = [
  { value: 'enrichment', label: 'Enrichment Agent' },
  { value: 'scoring', label: 'Scoring Agent' },
  { value: 'insight', label: 'Insight Generator' },
  { value: 'research', label: 'Research Agent' },
  { value: 'financial', label: 'Financial Agent' },
  { value: 'legal', label: 'Legal Agent' },
  { value: 'market', label: 'Market Agent' },
  { value: 'technical', label: 'Technical Agent' },
  { value: 'contacts', label: 'Contacts Agent' },
]

const conditionOperators = [
  { value: 'eq', label: 'Equals (=)' },
  { value: 'ne', label: 'Not Equals (≠)' },
  { value: 'gt', label: 'Greater Than (>)' },
  { value: 'lt', label: 'Less Than (<)' },
  { value: 'gte', label: 'Greater or Equal (≥)' },
  { value: 'lte', label: 'Less or Equal (≤)' },
  { value: 'contains', label: 'Contains' },
  { value: 'exists', label: 'Exists' },
]

export function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  const [config, setConfig] = useState(node.data)

  useEffect(() => {
    setConfig(node.data)
  }, [node])

  const handleUpdate = () => {
    onUpdate(config)
  }

  const updateField = (field: string, value: unknown) => {
    setConfig((prev: Record<string, unknown>) => ({
      ...prev,
      [field]: value,
    }))
  }

  const renderConfigForm = () => {
    switch (node.type) {
      case 'agent':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="agentType">Agent Type</Label>
              <Select
                value={config.agentType as string}
                onValueChange={(value) => updateField('agentType', value)}
              >
                <SelectTrigger id="agentType">
                  <SelectValue placeholder="Select agent type" />
                </SelectTrigger>
                <SelectContent>
                  {agentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="agentConfig">Agent Configuration (JSON)</Label>
              <Textarea
                id="agentConfig"
                placeholder='{"key": "value"}'
                value={
                  typeof config.agentConfig === 'string'
                    ? config.agentConfig
                    : JSON.stringify(config.agentConfig || {}, null, 2)
                }
                onChange={(e) => {
                  try {
                    updateField('agentConfig', JSON.parse(e.target.value))
                  } catch {
                    updateField('agentConfig', e.target.value)
                  }
                }}
                rows={6}
                className="font-mono text-xs"
              />
            </div>
          </div>
        )

      case 'condition':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="field">Field Path</Label>
              <Input
                id="field"
                placeholder="e.g., data.score"
                value={(config.condition as { field?: string })?.field || ''}
                onChange={(e) =>
                  updateField('condition', {
                    ...(config.condition as object),
                    field: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="operator">Operator</Label>
              <Select
                value={(config.condition as { operator?: string })?.operator || 'eq'}
                onValueChange={(value) =>
                  updateField('condition', {
                    ...(config.condition as object),
                    operator: value,
                  })
                }
              >
                <SelectTrigger id="operator">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditionOperators.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                placeholder="Comparison value"
                value={String((config.condition as { value?: unknown })?.value || '')}
                onChange={(e) =>
                  updateField('condition', {
                    ...(config.condition as object),
                    value: e.target.value,
                  })
                }
              />
            </div>
          </div>
        )

      case 'transform':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="transformType">Transform Type</Label>
              <Select
                value={config.transformType as string}
                onValueChange={(value) => updateField('transformType', value)}
              >
                <SelectTrigger id="transformType">
                  <SelectValue placeholder="Select transform type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="transformScript">Transform Script</Label>
              <Textarea
                id="transformScript"
                placeholder={
                  config.transformType === 'template'
                    ? 'Hello {{input.name}}!'
                    : 'return { ...input, processed: true }'
                }
                value={config.transformScript as string}
                onChange={(e) => updateField('transformScript', e.target.value)}
                rows={8}
                className="font-mono text-xs"
              />
            </div>
          </div>
        )

      case 'delay':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="delayMs">Delay (milliseconds)</Label>
              <Input
                id="delayMs"
                type="number"
                placeholder="1000"
                value={config.delayMs as number}
                onChange={(e) => updateField('delayMs', parseInt(e.target.value))}
              />
            </div>
          </div>
        )

      default:
        return (
          <div className="text-sm text-gray-500">
            No additional configuration needed for this node type.
          </div>
        )
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        <div>
          <h3 className="font-semibold">Configure Node</h3>
          <p className="text-xs text-gray-500 mt-1">{node.type}</p>
        </div>
        <Button onClick={onClose} variant="ghost" size="sm">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Common fields */}
      <div className="flex-1 overflow-y-auto space-y-4">
        <div>
          <Label htmlFor="label">Label</Label>
          <Input
            id="label"
            placeholder="Node label"
            value={config.label as string}
            onChange={(e) => updateField('label', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Optional description"
            value={(config.description as string) || ''}
            onChange={(e) => updateField('description', e.target.value)}
            rows={2}
          />
        </div>

        {/* Type-specific fields */}
        {renderConfigForm()}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t">
        <Button onClick={handleUpdate} className="w-full">
          Apply Changes
        </Button>
      </div>
    </div>
  )
}
