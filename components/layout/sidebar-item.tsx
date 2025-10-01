'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { Badge } from '@/components/ui/badge'

interface SidebarItemProps {
  href: string
  icon: LucideIcon
  label: string
  tooltip?: string
  badge?: string | number
  isCollapsed?: boolean
  isPremium?: boolean
  onClick?: () => void
}

export function SidebarItem({
  href,
  icon: Icon,
  label,
  tooltip,
  badge,
  isCollapsed,
  isPremium,
  onClick
}: SidebarItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname?.startsWith(`${href}/`)

  const content = (
    <Link href={href} onClick={onClick} className="block">
      <div
        className={cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
          'hover:bg-accent hover:text-accent-foreground',
          isActive && 'bg-primary/10 text-primary shadow-sm',
          !isActive && 'text-muted-foreground hover:text-foreground',
          isPremium && !isActive && 'bg-gradient-to-r from-purple-600/5 to-pink-600/5 hover:from-purple-600/10 hover:to-pink-600/10',
          isCollapsed && 'justify-center px-2'
        )}
      >
        {/* Active indicator */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
        )}

        {/* Icon */}
        <div className={cn(
          'flex items-center justify-center',
          isActive && 'text-primary',
          isCollapsed ? 'h-6 w-6' : 'h-5 w-5'
        )}>
          <Icon className="h-full w-full" strokeWidth={isActive ? 2.5 : 2} />
        </div>

        {/* Label and badges */}
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{label}</span>
            {badge && (
              <Badge
                variant="secondary"
                className={cn(
                  "ml-auto h-5 min-w-[20px] px-1.5 text-[10px] font-semibold",
                  isActive && "bg-primary/20 text-primary"
                )}
              >
                {badge}
              </Badge>
            )}
            {isPremium && (
              <Badge className="ml-auto h-5 px-2 text-[10px] font-semibold bg-gradient-to-r from-purple-600 to-pink-600 border-0">
                Pro
              </Badge>
            )}
          </>
        )}

        {/* Hover effect */}
        {!isActive && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </Link>
  )

  if (tooltip && isCollapsed) {
    return (
      <HelpTooltip content={tooltip} side="right" delayDuration={0}>
        {content}
      </HelpTooltip>
    )
  }

  return content
}
