"use client"

import * as React from "react"
import { HelpCircle, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface HelpTooltipProps {
  content: React.ReactNode
  children?: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  icon?: "help" | "info" | "none"
  iconClassName?: string
  contentClassName?: string
  delayDuration?: number
}

export function HelpTooltip({
  content,
  children,
  side = "top",
  align = "center",
  icon = "help",
  iconClassName,
  contentClassName,
  delayDuration = 200,
}: HelpTooltipProps) {
  const IconComponent = icon === "help" ? HelpCircle : icon === "info" ? Info : null

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <button className="inline-flex items-center justify-center">
              {IconComponent && (
                <IconComponent
                  className={cn("h-4 w-4 text-muted-foreground hover:text-foreground transition-colors", iconClassName)}
                />
              )}
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          align={align}
          className={cn("max-w-xs", contentClassName)}
        >
          <div className="text-sm">{content}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}