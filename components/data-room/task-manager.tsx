'use client'

/**
 * Task Manager Component
 * Manage workflow tasks and assignments
 */

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Plus,
  FileText,
  User,
  Users,
  Calendar,
  Loader2
} from 'lucide-react'
import type { WorkflowTask, TaskStatus, TaskPriority } from '@/lib/data-room/types'
import { useToast } from '@/hooks/use-toast'

interface TaskManagerProps {
  tasks: WorkflowTask[]
  currentUserId: string
  onUpdate: () => void
  canCreateTasks: boolean
}

export function TaskManager({ tasks, currentUserId, onUpdate, canCreateTasks }: TaskManagerProps) {
  const { toast } = useToast()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Filter tasks
  const myTasks = tasks.filter(t => t.assigned_to === currentUserId && t.status !== 'completed')
  const completedTasks = tasks.filter(t => t.status === 'completed')
  const otherTasks = tasks.filter(t => t.assigned_to !== currentUserId && t.status !== 'completed')

  // Count overdue tasks
  const overdueTasks = myTasks.filter(t => {
    if (!t.due_date) return false
    return new Date(t.due_date) < new Date()
  })

  const handleUpdateTask = useCallback(async (
    taskId: string,
    updates: Partial<WorkflowTask>
  ) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/data-room/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Task Updated',
          description: 'Task has been updated successfully'
        })
        onUpdate()
        setEditDialogOpen(false)
      } else {
        throw new Error(result.error || 'Failed to update task')
      }
    } catch (error) {
      console.error('Failed to update task:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update task',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast, onUpdate])

  const handleCompleteTask = useCallback(async (taskId: string) => {
    await handleUpdateTask(taskId, { status: 'completed' })
  }, [handleUpdateTask])

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const getPriorityBadge = (priority: TaskPriority) => {
    const styles = {
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }

    return (
      <Badge className={styles[priority]}>
        {priority.toUpperCase()}
      </Badge>
    )
  }

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return null

    const due = new Date(dueDate)
    const now = new Date()
    const diffMs = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffMs < 0) return <span className="text-red-600">Overdue</span>
    if (diffDays === 0) return <span className="text-yellow-600">Due today</span>
    if (diffDays === 1) return <span className="text-yellow-600">Due tomorrow</span>
    if (diffDays <= 7) return <span className="text-blue-600">Due in {diffDays}d</span>
    return due.toLocaleDateString()
  }

  const TaskCard = ({ task, showActions = true }: { task: WorkflowTask; showActions?: boolean }) => (
    <div
      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => {
        if (showActions) {
          setSelectedTask(task)
          setEditDialogOpen(true)
        }
      }}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0 mt-1">
        {getStatusIcon(task.status)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-medium">{task.title}</h4>
          <div className="flex items-center gap-2">
            {getPriorityBadge(task.priority)}
          </div>
        </div>
        {task.description && (
          <p className="text-sm text-muted-foreground mb-2">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDueDate(task.due_date)}
            </div>
          )}
          {task.document_id && (
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>Document attached</span>
            </div>
          )}
          {task.assigned_to !== currentUserId && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>Assigned to: {task.assigned_to}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {showActions && task.status !== 'completed' && task.assigned_to === currentUserId && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              handleCompleteTask(task.id)
            }}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Complete
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Tasks</p>
                <p className="text-2xl font-bold">{myTasks.length}</p>
              </div>
              <Circle className="h-8 w-8 text-blue-600" />
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedTasks.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Tasks */}
      {myTasks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  My Tasks ({myTasks.length})
                </CardTitle>
                <CardDescription>
                  Tasks assigned to you
                </CardDescription>
              </div>
              {canCreateTasks && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {myTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Other Tasks */}
      {otherTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600" />
              Team Tasks ({otherTasks.length})
            </CardTitle>
            <CardDescription>
              Tasks assigned to team members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {otherTasks.map((task) => (
              <TaskCard key={task.id} task={task} showActions={false} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Completed Tasks ({completedTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedTasks.map((task) => (
              <TaskCard key={task.id} task={task} showActions={false} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {tasks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Circle className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">No Tasks Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Tasks will appear here when they are assigned in workflows
            </p>
            {canCreateTasks && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Task
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Task Dialog */}
      {selectedTask && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Task</DialogTitle>
              <DialogDescription>
                Update task status and details
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <h4 className="font-medium mb-1">{selectedTask.title}</h4>
                {selectedTask.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedTask.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={selectedTask.status}
                  onValueChange={(value) =>
                    setSelectedTask({ ...selectedTask, status: value as TaskStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={selectedTask.priority}
                  onValueChange={(value) =>
                    setSelectedTask({ ...selectedTask, priority: value as TaskPriority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleUpdateTask(selectedTask.id, selectedTask)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
