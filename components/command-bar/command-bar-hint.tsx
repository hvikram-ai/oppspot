'use client'

import { useEffect, useState } from 'react'
import { X, Sparkles, Command } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const HINT_KEY = 'oppspot:command-bar-hint-dismissed'
const HINT_DELAY = 3000 // Show after 3 seconds

export function CommandBarHint() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    // Check if already dismissed
    const isDismissed = localStorage.getItem(HINT_KEY)
    if (isDismissed) {
      setDismissed(true)
      return
    }

    setDismissed(false)

    // Show hint after delay
    const timer = setTimeout(() => {
      setVisible(true)
    }, HINT_DELAY)

    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    localStorage.setItem(HINT_KEY, 'true')
    setDismissed(true)
  }

  if (dismissed || !visible) {
    return null
  }

  return (
    <div
      className={cn(
        "fixed bottom-20 right-6 z-50",
        "animate-in slide-in-from-bottom-5 fade-in duration-500"
      )}
    >
      <div className="relative">
        {/* Speech bubble tail */}
        <div className="absolute -bottom-2 right-8 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-primary" />

        {/* Hint card */}
        <div className="bg-primary text-primary-foreground rounded-lg shadow-2xl p-4 max-w-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="absolute top-2 right-2 h-6 w-6 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="size-4" />
          </Button>

          <div className="pr-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-5" />
              <h3 className="font-semibold text-sm">Pro Tip!</h3>
            </div>

            <p className="text-sm mb-3 leading-relaxed">
              Press{' '}
              <kbd className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-foreground/20 font-mono text-xs">
                <Command className="size-3" />K
              </kbd>{' '}
              to instantly search companies, streams, scans, and more. Try it now!
            </p>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleDismiss}
                className="text-xs"
              >
                Got it!
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
