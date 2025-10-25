'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Phone,
  Mail,
  FileText,
  Users,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface Task {
  id: string
  title: string
  description: string
  type: 'call' | 'email' | 'meeting' | 'review' | 'follow-up'
  priority: 'high' | 'medium' | 'low'
  dueDate: Date
  businessName?: string
  completed: boolean
}

interface UpcomingTasksProps {
  userId: string
}

export function UpcomingTasks({ userId }: UpcomingTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockTasks: Task[] = [
      {
        id: '1',
        title: 'Follow up with TechCorp Ltd',
        description: 'Send proposal after initial meeting',
        type: 'email',
        priority: 'high',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours from now
        businessName: 'TechCorp Ltd',
        completed: false
      },
      {
        id: '2',
        title: 'Call DataSystems Inc',
        description: 'Discuss partnership opportunities',
        type: 'call',
        priority: 'high',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 4), // 4 hours from now
        businessName: 'DataSystems Inc',
        completed: false
      },
      {
        id: '3',
        title: 'Review Q4 prospect list',
        description: 'Prioritize top 20 leads for outreach',
        type: 'review',
        priority: 'medium',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day from now
        completed: false
      },
      {
        id: '4',
        title: 'Team sync on new leads',
        description: 'Weekly sales team meeting',
        type: 'meeting',
        priority: 'medium',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // 2 days from now
        completed: false
      },
      {
        id: '5',
        title: 'Send follow-up to CloudTech',
        description: 'Check on proposal status',
        type: 'follow-up',
        priority: 'low',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days from now
        businessName: 'CloudTech Solutions',
        completed: false
      }
    ]
    
    setTimeout(() => {
      setTasks(mockTasks)
      setLoading(false)
    }, 500)
  }, [userId])

  const toggleTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed }
        : task
    ))
  }

  const getTaskIcon = (type: Task['type']) => {
    switch (type) {
      case 'call':
        return Phone
      case 'email':
        return Mail
      case 'meeting':
        return Users
      case 'review':
        return FileText
      case 'follow-up':
        return Clock
      default:
        return Circle
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30'
      case 'medium':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30'
      case 'low':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30'
    }
  }

  const completedCount = tasks.filter(t => t.completed).length
  const completionRate = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Tasks</CardTitle>
          <CardDescription>Your scheduled follow-ups and actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border animate-pulse">
                <div className="h-8 w-8 rounded bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Upcoming Tasks</CardTitle>
            <CardDescription>Your scheduled follow-ups and actions</CardDescription>
          </div>
          <Link href="/tasks">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Today&apos;s Progress</span>
            <span className="text-sm font-medium">{completedCount}/{tasks.length} completed</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {tasks.map((task) => {
            const Icon = getTaskIcon(task.type)
            const isOverdue = task.dueDate < new Date() && !task.completed
            
            return (
              <div 
                key={task.id} 
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  task.completed ? 'bg-muted/50 opacity-60' : 'hover:bg-muted/50'
                } ${isOverdue ? 'border-red-500/50' : ''}`}
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(task.id)}
                  className="mt-1"
                />
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${getPriorityColor(task.priority)}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${task.completed ? 'line-through' : ''}`}>
                      {task.title}
                    </p>
                    {isOverdue && (
                      <Badge variant="destructive" className="text-xs">
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {task.description}
                  </p>
                  {task.businessName && (
                    <Badge variant="outline" className="text-xs">
                      {task.businessName}
                    </Badge>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(task.dueDate, { addSuffix: true })}
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        task.priority === 'medium' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t">
          <div className="text-center">
            <p className="text-xl font-bold text-red-600">
              {tasks.filter(t => t.priority === 'high' && !t.completed).length}
            </p>
            <p className="text-xs text-muted-foreground">High Priority</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-orange-600">
              {tasks.filter(t => t.dueDate < new Date(Date.now() + 1000 * 60 * 60 * 24) && !t.completed).length}
            </p>
            <p className="text-xs text-muted-foreground">Due Today</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-green-600">
              {completedCount}
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}