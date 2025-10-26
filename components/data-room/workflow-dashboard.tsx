'use client'

/**
 * Workflow Dashboard Component
 * Overview of all workflows, tasks, and approvals in a data room
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Users,
  TrendingUp,
  Play,
  Pause,
  Plus
} from 'lucide-react'
import type { WorkflowWithProgress, ChecklistWithItems, ApprovalRequest, WorkflowTask } from '@/lib/data-room/types'
import { ReviewChecklist } from './review-checklist'
import { ApprovalRequests } from './approval-requests'
import { TaskManager } from './task-manager'

interface WorkflowDashboardProps {
  dataRoomId: string
  workflows: WorkflowWithProgress[]
  checklists: ChecklistWithItems[]
  approvalRequests: ApprovalRequest[]
  tasks: WorkflowTask[]
  currentUserId: string
  canManage: boolean
  onUpdate: () => void
}

export function WorkflowDashboard({
  dataRoomId,
  workflows,
  checklists,
  approvalRequests,
  tasks,
  currentUserId,
  canManage,
  onUpdate
}: WorkflowDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')

  // Calculate stats
  const activeWorkflows = workflows.filter(w => w.status === 'active')
  const pendingApprovals = approvalRequests.filter(r => !r.decision)
  const myTasks = tasks.filter(t => t.assigned_to === currentUserId && t.status !== 'completed')
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false
    return new Date(t.due_date) < new Date()
  })

  const getWorkflowStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-blue-100 text-blue-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }

    return (
      <Badge className={styles[status as keyof typeof styles] || styles.draft}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Workflows</p>
                <p className="text-2xl font-bold">{activeWorkflows.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingApprovals.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Tasks</p>
                <p className="text-2xl font-bold">{myTasks.length}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueTasks.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workflows">
            Workflows
            {activeWorkflows.length > 0 && (
              <Badge className="ml-2 bg-blue-600">{activeWorkflows.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="checklists">
            Checklists
            {checklists.length > 0 && (
              <Badge className="ml-2">{checklists.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approvals">
            Approvals
            {pendingApprovals.length > 0 && (
              <Badge className="ml-2 bg-yellow-600">{pendingApprovals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks
            {myTasks.length > 0 && (
              <Badge className="ml-2">{myTasks.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Active Workflows */}
          {activeWorkflows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Active Workflows</CardTitle>
                <CardDescription>
                  Workflows currently in progress
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeWorkflows.map((workflow) => (
                  <div key={workflow.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      <Play className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-medium">{workflow.name}</h4>
                          {workflow.description && (
                            <p className="text-sm text-muted-foreground">
                              {workflow.description}
                            </p>
                          )}
                        </div>
                        {getWorkflowStatusBadge(workflow.status)}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">
                            {workflow.completed_steps}/{workflow.total_steps} steps
                          </span>
                        </div>
                        <Progress
                          value={(workflow.completed_steps / workflow.total_steps) * 100}
                          className="h-2"
                        />
                      </div>
                      {(workflow.pending_approvals > 0 || workflow.overdue_tasks > 0) && (
                        <div className="flex items-center gap-4 mt-3 text-xs">
                          {workflow.pending_approvals > 0 && (
                            <div className="flex items-center gap-1 text-yellow-600">
                              <Clock className="h-3 w-3" />
                              <span>{workflow.pending_approvals} approvals</span>
                            </div>
                          )}
                          {workflow.overdue_tasks > 0 && (
                            <div className="flex items-center gap-1 text-red-600">
                              <AlertCircle className="h-3 w-3" />
                              <span>{workflow.overdue_tasks} overdue</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {canManage && (
                <>
                  <Button variant="outline" className="justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Workflow
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Create Checklist
                  </Button>
                </>
              )}
              <Button variant="outline" className="justify-start">
                <Users className="h-4 w-4 mr-2" />
                View My Tasks
              </Button>
            </CardContent>
          </Card>

          {/* Empty State */}
          {workflows.length === 0 && checklists.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-semibold mb-2">No Workflows Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create workflows and checklists to streamline your due diligence process
                </p>
                {canManage && (
                  <div className="flex gap-2">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Workflow
                    </Button>
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Create Checklist
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Workflows</CardTitle>
                  <CardDescription>
                    Manage workflows for this data room
                  </CardDescription>
                </div>
                {canManage && (
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Workflow
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {workflows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No workflows created yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workflows.map((workflow) => (
                    <div key={workflow.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{workflow.name}</h4>
                          {workflow.description && (
                            <p className="text-sm text-muted-foreground">
                              {workflow.description}
                            </p>
                          )}
                        </div>
                        {getWorkflowStatusBadge(workflow.status)}
                      </div>
                      <Progress
                        value={(workflow.completed_steps / workflow.total_steps) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklists Tab */}
        <TabsContent value="checklists" className="space-y-4">
          {checklists.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-semibold mb-2">No Checklists</h3>
                <p className="text-muted-foreground mb-4">
                  Create a due diligence checklist to track document requirements
                </p>
                {canManage && (
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Checklist
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            checklists.map((checklist) => (
              <ReviewChecklist
                key={checklist.id}
                checklist={checklist}
                onUpdate={onUpdate}
                canEdit={canManage}
              />
            ))
          )}
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals">
          <ApprovalRequests
            requests={approvalRequests}
            currentUserId={currentUserId}
            onUpdate={onUpdate}
          />
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <TaskManager
            tasks={tasks}
            currentUserId={currentUserId}
            onUpdate={onUpdate}
            canCreateTasks={canManage}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
