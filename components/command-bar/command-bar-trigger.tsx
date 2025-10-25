'use client'

import { Search, Command } from 'lucide-react'
import { useCommandBar } from '@/hooks/use-command-bar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CommandBarTriggerProps {
  variant?: 'default' | 'compact' | 'mobile'
  className?: string
}

export function CommandBarTrigger({ variant = 'default', className }: CommandBarTriggerProps) {
  const { setOpen } = useCommandBar()

  if (variant === 'compact') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full justify-start gap-2 text-muted-foreground hover:text-foreground transition-colors",
          className
        )}
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 text-left font-normal">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <Command className="size-3" />K
        </kbd>
      </Button>
    )
  }

  if (variant === 'mobile') {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        className={cn(
          "rounded-full size-14 shadow-lg hover:shadow-xl transition-all",
          className
        )}
        aria-label="Search"
      >
        <Search className="size-5" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      onClick={() => setOpen(true)}
      className={cn(
        "w-full justify-between group hover:bg-accent/50",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Search className="size-4 text-primary" />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">Quick Search</span>
          <span className="text-xs text-muted-foreground">Find anything</span>
        </div>
      </div>
      <kbd className="hidden lg:inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium text-muted-foreground">
        <Command className="size-3" />K
      </kbd>
    </Button>
  )
}
