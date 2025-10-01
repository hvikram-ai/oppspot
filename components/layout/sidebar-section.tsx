'use client'

import { useState } from 'react'
import { ChevronDown, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarSectionProps {
  title: string
  icon: LucideIcon
  children: React.ReactNode
  isCollapsed?: boolean
  defaultOpen?: boolean
}

export function SidebarSection({
  title,
  icon: Icon,
  children,
  isCollapsed,
  defaultOpen = true
}: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (isCollapsed) {
    return (
      <div className="space-y-2">
        <div className="flex justify-center py-2">
          <div className="p-1.5 rounded-md bg-muted/50">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-1">{children}</div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span>{title}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      {isOpen && (
        <div className="space-y-1 animate-in fade-in-50 slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}
