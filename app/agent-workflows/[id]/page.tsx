'use client'

// Agent Workflow Builder Page

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WorkflowCanvas } from '@/components/agents/workflow-builder/workflow-canvas'
import { WorkflowConfig } from '@/types/agent-workflow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function WorkflowBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [workflow, setWorkflow] = useState<{
    id: string
    name: string
    description: string | null
    config: WorkflowConfig
    status: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load workflow
  useEffect(() => {
    async function loadWorkflow() {
      try {
        const response = await fetch(`/api/agent-workflows/${resolvedParams.id}`)
        if (!response.ok) {
          throw new Error('Failed to load workflow')
        }

        const data = await response.json()
        setWorkflow(data.workflow)
      } catch (error) {
        console.error('Error loading workflow:', error)
        toast.error('Failed to load workflow')
      } finally {
        setIsLoading(false)
      }
    }

    if (resolvedParams.id !== 'new') {
      loadWorkflow()
    } else {
      setWorkflow({
        id: 'new',
        name: 'New Workflow',
        description: '',
        config: { nodes: [], edges: [] },
        status: 'draft',
      })
      setIsLoading(false)
    }
  }, [resolvedParams.id])

  // Save workflow
  const handleSave = async (config: WorkflowConfig) => {
    if (!workflow) return

    setIsSaving(true)

    try {
      if (resolvedParams.id === 'new') {
        // Create new workflow
        const response = await fetch('/api/agent-workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: workflow.name,
            description: workflow.description,
            config,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to create workflow')
        }

        const data = await response.json()
        toast.success('Workflow created successfully')
        router.push(`/agent-workflows/${data.workflow.id}`)
      } else {
        // Update existing workflow
        const response = await fetch(`/api/agent-workflows/${resolvedParams.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: workflow.name,
            description: workflow.description,
            config,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to update workflow')
        }

        toast.success('Workflow updated successfully')
      }
    } catch (error) {
      console.error('Error saving workflow:', error)
      toast.error('Failed to save workflow')
    } finally {
      setIsSaving(false)
    }
  }

  // Execute workflow
  const handleExecute = async () => {
    if (!workflow || resolvedParams.id === 'new') {
      toast.error('Please save the workflow before executing')
      return
    }

    try {
      const response = await fetch(`/api/agent-workflows/${resolvedParams.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error('Failed to execute workflow')
      }

      const data = await response.json()
      toast.success('Workflow execution started', {
        description: `Execution ID: ${data.execution.id}`,
      })

      // Navigate to execution page
      router.push(`/agent-workflows/executions/${data.execution.id}`)
    } catch (error) {
      console.error('Error executing workflow:', error)
      toast.error('Failed to execute workflow')
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading workflow...</p>
        </div>
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Workflow not found</p>
          <Link href="/agent-workflows">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Workflows
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/agent-workflows">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <div className="flex-1">
            <Input
              value={workflow.name}
              onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
              className="text-lg font-semibold border-0 focus-visible:ring-0 px-0"
              placeholder="Workflow name"
            />
            <Textarea
              value={workflow.description || ''}
              onChange={(e) =>
                setWorkflow({ ...workflow, description: e.target.value })
              }
              className="text-sm text-gray-600 dark:text-gray-400 border-0 focus-visible:ring-0 px-0 resize-none"
              placeholder="Add a description..."
              rows={1}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleSave(workflow.config)}
              disabled={isSaving}
              variant="outline"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <WorkflowCanvas
          workflowId={resolvedParams.id !== 'new' ? resolvedParams.id : undefined}
          initialConfig={workflow.config}
          onSave={handleSave}
          onExecute={handleExecute}
        />
      </div>
    </div>
  )
}
