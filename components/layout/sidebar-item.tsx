'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
    <Link href={href} onClick={onClick}>
      <Button
        variant="ghost"
        className={cn(
          'w-full justify-start gap-3 h-10 px-3',
          isActive && 'bg-primary/10 text-primary border-l-2 border-primary',
          isPremium && 'bg-gradient-to-r from-purple-600/10 to-pink-600/10',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0', isCollapsed && 'h-6 w-6')} />
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate text-sm">{label}</span>
            {badge && (
              <Badge variant="secondary" className="ml-auto h-5 min-w-[20px] px-1 text-xs">
                {badge}
              </Badge>
            )}
            {isPremium && (
              <Badge className="ml-auto h-5 px-2 text-xs bg-gradient-to-r from-purple-600 to-pink-600">
                Pro
              </Badge>
            )}
          </>
        )}
      </Button>
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
