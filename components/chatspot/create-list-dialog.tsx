'use client'

/**
 * ChatSpot™ - Create List Dialog
 * Dialog for creating a new business list when adding companies to lists
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, FolderPlus } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface CreateListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onListCreated?: (listId: string, listName: string) => void
  companies?: Array<{
    id: string
    name?: string
    company_name?: string
  }>
}

export function CreateListDialog({
  open,
  onOpenChange,
  onListCreated,
  companies = []
}: CreateListDialogProps) {
  const [listName, setListName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!listName.trim()) {
      toast.error('Please enter a list name')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('You must be logged in to create a list')
        return
      }

      console.log('🚀 CreateListDialog - Starting list creation')
      console.log('📋 List details:', { name: listName, description, companyCount: companies.length })
      console.log('🏢 Companies received:', companies)

      // Create the list
      const { data: list, error: listError } = await supabase
        .from('business_lists')
        .insert({
          user_id: user.id,
          name: listName.trim(),
          description: description.trim() || null,
        } as never)
        .select()
        .single()

      if (listError) throw listError

      // If companies are provided, add them to the list
      if (companies.length > 0 && list) {
        console.log('💾 Adding companies to list:', {
          listId: (list as { id: string; name: string }).id,
          listName: (list as { id: string; name: string }).name,
          companyCount: companies.length,
          companies: companies.map((c: { id: string; name?: string; company_name?: string }) => ({ id: c.id, name: c.name || c.company_name }))
        })

        const savedBusinesses = companies.map((company: { id: string }) => ({
          user_id: user.id,
          business_id: company.id,
          list_id: (list as { id: string }).id,
          tags: [],
        }))

        console.log('📝 Prepared records for upsert:', savedBusinesses)

        const { error: saveError, data: savedData } = await supabase
          .from('saved_businesses')
          .upsert(savedBusinesses as never, {
            onConflict: 'user_id,business_id',
            ignoreDuplicates: false
          })
          .select()

        if (saveError) {
          console.error('❌ Error adding companies to list:', saveError)
          toast.error('List created but failed to add some companies')
        } else {
          console.log('✅ Successfully saved businesses:', savedData)
          toast.success(`Created list "${listName}" with ${companies.length} companies`)
        }
      } else {
        toast.success(`Created list "${listName}"`)
      }

      // Reset form
      setListName('')
      setDescription('')

      // Notify parent
      if (list) {
        onListCreated?.((list as { id: string; name: string }).id, (list as { id: string; name: string }).name)
      }

      // Close dialog
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating list:', error)
      toast.error('Failed to create list')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCreate()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-blue-600" />
            Create New List
          </DialogTitle>
          <DialogDescription>
            {companies.length > 0
              ? `Create a new list and add ${companies.length} ${companies.length === 1 ? 'company' : 'companies'} to it`
              : 'Create a new list to organize your businesses'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="list-name">
              List Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="list-name"
              placeholder="e.g., Q1 Prospects, SaaS Companies, London Tech..."
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">
              Description <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Add a description to help you remember what this list is for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          {companies.length > 0 && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>{companies.length}</strong> {companies.length === 1 ? 'company' : 'companies'} will be added to this list
              </p>
              <div className="mt-2 max-h-24 overflow-y-auto">
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  {companies.slice(0, 5).map((company, idx) => (
                    <li key={idx}>• {company.name || company.company_name}</li>
                  ))}
                  {companies.length > 5 && (
                    <li className="text-muted-foreground">...and {companies.length - 5} more</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!listName.trim() || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create List
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
