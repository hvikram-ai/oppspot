'use client'

import { useState } from 'react'
import { ChevronDown, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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
      <div className="space-y-1">
        <div className="px-2 py-2">
          <Icon className="h-5 w-5 mx-auto text-muted-foreground" />
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between h-8 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="uppercase tracking-wide">{title}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen && 'transform rotate-180'
          )}
        />
      </Button>
      {isOpen && <div className="space-y-1 px-2">{children}</div>}
    </div>
  )
}
