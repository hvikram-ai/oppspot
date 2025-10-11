'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  Copy, 
  ExternalLink,
  CheckCircle,
  MessageSquare,
  Navigation
} from 'lucide-react'
import { toast } from 'sonner'

interface BusinessContactProps {
  business: {
    id: string
    name: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    phone_numbers?: string[] | any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emails?: string[] | any
    website?: string | null
    address?: {
      street?: string
      city?: string
      state?: string
      country?: string
      postal_code?: string
      [key: string]: unknown
    } | null
    latitude?: number | null
    longitude?: number | null
    [key: string]: unknown
  }
}

export function BusinessContact({ business }: BusinessContactProps) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null)

  const copyToClipboard = async (text: string, item: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItem(item)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedItem(null), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const getPhoneNumbers = () => {
    if (Array.isArray(business.phone_numbers)) {
      return business.phone_numbers
    }
    if (typeof business.phone_numbers === 'string') {
      return [business.phone_numbers]
    }
    return []
  }

  const getEmails = () => {
    if (Array.isArray(business.emails)) {
      return business.emails
    }
    if (typeof business.emails === 'string') {
      return [business.emails]
    }
    return []
  }

  const fullAddress = [
    business.address?.street,
    business.address?.city,
    business.address?.state,
    business.address?.postal_code,
    business.address?.country
  ].filter(Boolean).join(', ')

  const phoneNumbers = getPhoneNumbers()
  const emails = getEmails()

  const openInMaps = () => {
    if (business.latitude && business.longitude) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${business.latitude},${business.longitude}`,
        '_blank'
      )
    } else if (fullAddress) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`,
        '_blank'
      )
    }
  }

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phone Numbers */}
        {phoneNumbers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Phone className="h-4 w-4" />
              Phone
            </div>
            {phoneNumbers.map((phone, index) => (
              <div key={index} className="flex items-center justify-between group">
                <a 
                  href={`tel:${phone}`}
                  className="text-sm hover:underline"
                >
                  {phone}
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                  onClick={() => copyToClipboard(phone, `phone-${index}`)}
                >
                  {copiedItem === `phone-${index}` ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Email Addresses */}
        {emails.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Mail className="h-4 w-4" />
              Email
            </div>
            {emails.map((email, index) => (
              <div key={index} className="flex items-center justify-between group">
                <a 
                  href={`mailto:${email}`}
                  className="text-sm hover:underline break-all"
                >
                  {email}
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                  onClick={() => copyToClipboard(email, `email-${index}`)}
                >
                  {copiedItem === `email-${index}` ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Website */}
        {business.website && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Globe className="h-4 w-4" />
              Website
            </div>
            <div className="flex items-center justify-between group">
              <a 
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline break-all flex items-center gap-1"
              >
                {business.website.replace(/^https?:\/\//, '')}
                <ExternalLink className="h-3 w-3" />
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => copyToClipboard(business.website!, 'website')}
              >
                {copiedItem === 'website' ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Address */}
        {fullAddress && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Address
            </div>
            <div className="space-y-1">
              <p className="text-sm">{business.address?.street}</p>
              <p className="text-sm">
                {[
                  business.address?.city,
                  business.address?.state,
                  business.address?.postal_code
                ].filter(Boolean).join(', ')}
              </p>
              {business.address?.country && (
                <p className="text-sm">{business.address.country}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={openInMaps}
            >
              <Navigation className="h-4 w-4 mr-2" />
              Get Directions
            </Button>
          </div>
        )}

        {/* Contact Actions */}
        <div className="pt-4 border-t space-y-2">
          <Button className="w-full" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Message
          </Button>
          <Button variant="outline" className="w-full" size="sm">
            <Phone className="h-4 w-4 mr-2" />
            Request Callback
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}