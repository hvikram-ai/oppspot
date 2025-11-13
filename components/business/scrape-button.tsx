'use client'

/**
 * Scrape Button Component
 * Triggers web scraping to enrich company data
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Database, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ScrapeButtonProps {
  businessId: string
  companyName: string
  companyWebsite?: string
  companyNumber?: string
  onComplete?: () => void
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  className?: string
}

export function ScrapeButton({
  businessId,
  companyName,
  companyWebsite,
  companyNumber,
  onComplete,
  variant = 'outline',
  className = 'w-full',
}: ScrapeButtonProps) {
  const [isScraping, setIsScraping] = useState(false)

  const handleScrape = async () => {
    if (!companyName) {
      toast.error('Company name is required')
      return
    }

    setIsScraping(true)

    try {
      // Determine which providers to use
      const providers = ['website']
      if (companyNumber) {
        providers.push('companies_house')
      }

      const response = await fetch('/api/scraping/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          company_website: companyWebsite,
          company_number: companyNumber,
          providers,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Company data scraping started!', {
          description: 'We\'re gathering information from the web. This may take 10-30 seconds.',
        })

        // Optionally poll for completion
        if (data.job_id) {
          pollJobStatus(data.job_id)
        }

        // Call onComplete callback if provided
        if (onComplete) {
          setTimeout(onComplete, 2000)
        }
      } else {
        toast.error('Failed to start scraping', {
          description: data.error || 'Please try again later',
        })
      }
    } catch (error) {
      console.error('Scrape error:', error)
      toast.error('Failed to scrape company data', {
        description: 'An unexpected error occurred',
      })
    } finally {
      setIsScraping(false)
    }
  }

  /**
   * Poll job status and show completion toast
   */
  const pollJobStatus = async (jobId: string) => {
    let attempts = 0
    const maxAttempts = 20 // 20 attempts * 3 seconds = 60 seconds max

    const poll = async () => {
      attempts++

      try {
        const response = await fetch(`/api/scraping/scrape?job_id=${jobId}`)
        const data = await response.json()

        if (response.ok && data.job) {
          const job = data.job

          if (job.status === 'completed') {
            toast.success('Company data enriched!', {
              description: 'Fresh data has been added. Refresh the page to see updates.',
            })
            if (onComplete) onComplete()
            return
          } else if (job.status === 'failed') {
            toast.error('Scraping failed', {
              description: job.error_message || 'Unable to scrape company data',
            })
            return
          } else if (job.status === 'in_progress' || job.status === 'pending') {
            // Continue polling
            if (attempts < maxAttempts) {
              setTimeout(poll, 3000) // Poll every 3 seconds
            } else {
              toast.info('Scraping is taking longer than expected', {
                description: 'Check back in a few minutes',
              })
            }
          }
        }
      } catch (error) {
        console.error('Poll error:', error)
        // Stop polling on error
      }
    }

    // Start polling after 3 seconds
    setTimeout(poll, 3000)
  }

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleScrape}
      disabled={isScraping}
    >
      {isScraping ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Scraping...
        </>
      ) : (
        <>
          <Database className="mr-2 h-4 w-4" />
          Enrich Company Data
        </>
      )}
    </Button>
  )
}
