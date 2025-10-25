// Agent Workflows List Page

import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Play, Edit, Trash2, Clock } from 'lucide-react'
import { redirect } from 'next/navigation'
interface AgentWorkflow {
  id: string
  organization_id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'archived'
  is_template: boolean
  nodes?: unknown[]
  edges?: unknown[]
  tags?: string[]
  created_at: string
  created_by?: {
    full_name?: string
  }
}

async function getWorkflows(): Promise<{ workflows: AgentWorkflow[]; total: number }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = (profile as { org_id?: string | null } | null)?.org_id
  if (!orgId) {
    return { workflows: [], total: 0 }
  }

  const { data: workflows, count } = await supabase
    .from('agent_workflows')
    .select('*, created_by:profiles!agent_workflows_created_by_fkey(full_name)', {
      count: 'exact',
    })
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  return { workflows: (workflows as AgentWorkflow[]) || [], total: count || 0 }
}

export default async function WorkflowsPage() {
  const { workflows, total } = await getWorkflows()

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Agent Workflows</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Build and execute multi-agent workflows
          </p>
        </div>

        <Link href="/agent-workflows/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Workflow
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Workflows</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {workflows.filter((w) => w.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Workflows</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {workflows.filter((w) => w.is_template).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Templates</div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List */}
      {workflows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-gray-400 mb-4">
              <Plus className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first workflow to start chaining agents together
            </p>
            <Link href="/agent-workflows/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Workflow
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {workflow.description || 'No description'}
                    </CardDescription>
                  </div>
                  {workflow.is_template && (
                    <Badge variant="secondary" className="ml-2">
                      Template
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {/* Status Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <Badge
                    variant={
                      workflow.status === 'active'
                        ? 'default'
                        : workflow.status === 'draft'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {workflow.status}
                  </Badge>

                  {workflow.tags && workflow.tags.length > 0 && (
                    <>
                      {workflow.tags.slice(0, 2).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </>
                  )}
                </div>

                {/* Metadata */}
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Created {new Date(workflow.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    {workflow.nodes?.length || 0} nodes, {workflow.edges?.length || 0}{' '}
                    connections
                  </div>
                  {workflow.created_by && (
                    <div>By {(workflow.created_by as { full_name?: string }).full_name}</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link href={`/agent-workflows/${workflow.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/agent-workflows/${workflow.id}/execute`}>
                    <Button
                      size="sm"
                      disabled={workflow.status === 'archived'}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Run
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
