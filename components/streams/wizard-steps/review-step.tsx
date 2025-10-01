'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { StreamWizardData, WORKFLOW_TEMPLATES } from '@/types/stream-wizard'
import { CheckCircle2, Users, Workflow, Settings, Target } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

interface ReviewStepProps {
  data: StreamWizardData
  onUpdate: (updates: Partial<StreamWizardData>) => void
}

export function ReviewStep({ data, onUpdate }: ReviewStepProps) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h3 className="text-lg font-semibold mb-1">Review & Launch</h3>
        <p className="text-sm text-muted-foreground">
          Review your stream configuration before launching
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Stream Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: `${data.color}20` }}
              >
                {data.emoji}
              </div>
              <div>
                <p className="font-medium">{data.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{data.stream_type}</p>
              </div>
            </div>
            {data.description && (
              <p className="text-sm text-muted-foreground pt-2 border-t">
                {data.description}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-2">
              {WORKFLOW_TEMPLATES[data.workflowTemplate].name}
            </p>
            <div className="flex gap-1">
              {data.stages.map((stage) => (
                <div
                  key={stage.id}
                  className="h-2 flex-1 rounded-full"
                  style={{ backgroundColor: stage.color }}
                  title={stage.name}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {data.stages.length} stages configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">Privacy</span>
                <Badge variant="outline" className="capitalize">{data.privacy}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Members</span>
                <Badge variant="outline">{data.members.length} invited</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Integrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`h-4 w-4 ${data.aiProcessing ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span className="text-sm">AI Processing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`h-4 w-4 ${data.enableNotifications ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span className="text-sm">Notifications</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`h-4 w-4 ${data.autoImportCompanies ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span className="text-sm">Auto-import</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Broadcast Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Broadcast Message (Optional)</CardTitle>
          <CardDescription>
            Send a message to all invited members when the stream is created
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.broadcastMessage || ''}
            onChange={(e) => onUpdate({ broadcastMessage: e.target.value })}
            placeholder="Welcome to our new stream! Let's collaborate..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Terms */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={data.termsAccepted}
              onCheckedChange={(checked) => onUpdate({ termsAccepted: checked as boolean })}
            />
            <Label htmlFor="terms" className="text-sm cursor-pointer">
              I confirm that all the information provided is accurate and I agree to the{' '}
              <a href="#" className="text-primary hover:underline">
                terms of service
              </a>{' '}
              and{' '}
              <a href="#" className="text-primary hover:underline">
                privacy policy
              </a>
            </Label>
          </div>
        </CardContent>
      </Card>

      {!data.termsAccepted && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          Please accept the terms and conditions to create your stream
        </div>
      )}
    </div>
  )
}
