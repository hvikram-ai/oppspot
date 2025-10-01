'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { StreamWizardData, StreamMemberInvite } from '@/types/stream-wizard'
import { Plus, X, Mail, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

interface TeamStepProps {
  data: StreamWizardData
  onUpdate: (updates: Partial<StreamWizardData>) => void
}

export function TeamStep({ data, onUpdate }: TeamStepProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer')

  const handleAddMember = () => {
    if (!email || !name) return

    const newMember: StreamMemberInvite = {
      email,
      name,
      role,
    }

    onUpdate({ members: [...data.members, newMember] })
    setEmail('')
    setName('')
    setRole('viewer')
  }

  const handleRemoveMember = (index: number) => {
    onUpdate({ members: data.members.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h3 className="text-lg font-semibold mb-1">Team & Permissions</h3>
        <p className="text-sm text-muted-foreground">
          Invite team members and configure access permissions (optional - you can do this later)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy Settings</CardTitle>
          <CardDescription>Control who can access this stream</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={data.privacy} onValueChange={(v) => onUpdate({ privacy: v as any })}>
            <div className="space-y-3">
              <Label className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="private" />
                <div className="flex-1">
                  <div className="font-medium">Private</div>
                  <p className="text-sm text-muted-foreground">Only invited members can access</p>
                </div>
              </Label>
              <Label className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="team" />
                <div className="flex-1">
                  <div className="font-medium">Team</div>
                  <p className="text-sm text-muted-foreground">All team members can view</p>
                </div>
              </Label>
              <Label className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="organization" />
                <div className="flex-1">
                  <div className="font-medium">Organization</div>
                  <p className="text-sm text-muted-foreground">Anyone in your organization</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite Team Members</CardTitle>
          <CardDescription>Add people to collaborate on this stream</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4">
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="col-span-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="col-span-3">
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Button onClick={handleAddMember} className="w-full">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {data.members.length > 0 && (
            <div className="space-y-2">
              <Label>Invited Members ({data.members.length})</Label>
              <div className="space-y-2">
                {data.members.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        <Shield className="h-3 w-3 mr-1" />
                        {member.role}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
