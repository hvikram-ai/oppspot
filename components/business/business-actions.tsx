'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bookmark,
  Share2,
  Download,
  Flag,
  Edit,
  MoreVertical,
  Star,
  FileText,
  Printer,
  Link,
  Facebook,
  Twitter,
  Linkedin,
  BookmarkCheck,
  Shield
} from 'lucide-react'
import NextLink from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { SaveToCollectionButton } from '@/components/collections/save-to-collection-button'

interface BusinessActionsProps {
  business: {
    id: string
    name: string
    description?: string | null
    [key: string]: unknown
  }
}

export function BusinessActions({ business }: BusinessActionsProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const checkIfSaved = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('saved_businesses')
        .select('id')
        .eq('user_id', user.id)
        .eq('business_id', business.id)
        .single()

      setIsSaved(!!data)
    } catch (error) {
      // Business not saved, which is fine
      setIsSaved(false)
    }
  }, [business.id, supabase])

  // Check if business is already saved on mount
  useEffect(() => {
    checkIfSaved()
  }, [checkIfSaved])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please sign in to save businesses')
        return
      }

      // Toggle save status
      if (isSaved) {
        // Remove from saved
        const response = await fetch(`/api/saved-businesses?business_id=${business.id}`, {
          method: 'DELETE',
          credentials: 'include'
        })

        if (!response.ok) throw new Error('Failed to remove')
        
        setIsSaved(false)
        toast.success('Removed from saved businesses')
      } else {
        // Add to saved
        const response = await fetch('/api/saved-businesses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            business_id: business.id,
            tags: []
          })
        })

        if (!response.ok) {
          const error = await response.json()
          if (error.error === 'Business already saved') {
            setIsSaved(true)
            toast.info('Business is already saved')
          } else {
            throw new Error('Failed to save')
          }
        } else {
          setIsSaved(true)
          toast.success('Business saved successfully')
        }
      }
    } catch (error) {
      console.error('Error saving business:', error)
      toast.error('Failed to save business')
    } finally {
      setSaving(false)
    }
  }

  const handleShare = (platform?: string) => {
    const url = window.location.href
    const text = `Check out ${business.name} on OppSpot`

    switch (platform) {
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          '_blank'
        )
        break
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
          '_blank'
        )
        break
      case 'linkedin':
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
          '_blank'
        )
        break
      case 'copy':
        navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard')
        break
      default:
        if (navigator.share) {
          navigator.share({
            title: business.name,
            text: business.description || undefined,
            url: url,
          }).catch(() => {
            // User cancelled share
          })
        } else {
          navigator.clipboard.writeText(url)
          toast.success('Link copied to clipboard')
        }
    }
  }

  const handleExport = async (format: 'pdf' | 'csv') => {
    toast.info(`Exporting as ${format.toUpperCase()}...`)
    // Implementation would go here
  }

  const handlePrint = () => {
    window.print()
  }

  const handleReport = () => {
    toast.info('Report form will open here')
    // Implementation would go here
  }

  const handleEdit = () => {
    toast.info('Edit suggestions will open here')
    // Implementation would go here
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Actions</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <Download className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Suggest Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleReport} className="text-red-600">
                <Flag className="mr-2 h-4 w-4" />
                Report Issue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Save Button */}
        <Button
          className="w-full"
          variant={isSaved ? "secondary" : "default"}
          onClick={handleSave}
          disabled={saving}
        >
          {isSaved ? (
            <>
              <BookmarkCheck className="mr-2 h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Bookmark className="mr-2 h-4 w-4" />
              Save Business
            </>
          )}
        </Button>

        {/* Save to Collection */}
        <SaveToCollectionButton
          itemType="business"
          itemId={business.id}
          variant="outline"
          size="default"
          className="w-full"
          showLabel={true}
        />

        {/* Red Flag Radar */}
        <NextLink href={`/business/${business.id}/red-flags`} className="w-full">
          <Button variant="outline" className="w-full">
            <Shield className="mr-2 h-4 w-4 text-red-600" />
            Red Flag Radar
          </Button>
        </NextLink>

        {/* Share Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleShare('facebook')}>
              <Facebook className="mr-2 h-4 w-4" />
              Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShare('twitter')}>
              <Twitter className="mr-2 h-4 w-4" />
              Twitter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShare('linkedin')}>
              <Linkedin className="mr-2 h-4 w-4" />
              LinkedIn
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleShare('copy')}>
              <Link className="mr-2 h-4 w-4" />
              Copy Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Write Review */}
        <Button variant="outline" className="w-full">
          <Star className="mr-2 h-4 w-4" />
          Write Review
        </Button>

        {/* Compare */}
        <Button variant="outline" className="w-full">
          <FileText className="mr-2 h-4 w-4" />
          Add to Compare
        </Button>
      </CardContent>
    </Card>
  )
}