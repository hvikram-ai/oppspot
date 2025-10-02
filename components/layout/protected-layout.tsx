'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { Sidebar } from '@/components/layout/sidebar'
import { EmailVerificationBanner } from '@/components/ui/email-verification-banner'
import { CommandPalette } from '@/components/navigation/command-palette'
import { useSidebar } from '@/lib/hooks/use-sidebar'
import { cn } from '@/lib/utils'

interface ProtectedLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
}

/**
 * ProtectedLayout - Consistent layout with Navbar and Sidebar for authenticated pages
 *
 * This component provides a consistent layout structure across all protected pages.
 * It includes:
 * - Top navbar with user menu, notifications, theme toggle
 * - Left sidebar with navigation (collapsible on desktop, drawer on mobile)
 * - Main content area with automatic margin adjustment based on sidebar state
 * - Email verification banner
 * - Command palette for keyboard shortcuts
 *
 * Usage: Wrap any authenticated page content with this component
 */
export function ProtectedLayout({ children, showSidebar = true }: ProtectedLayoutProps) {
  const { isCollapsed } = useSidebar()
  const pathname = usePathname()

  // Public routes that shouldn't show sidebar
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/terms', '/privacy']
  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route))

  // Force hide sidebar on public routes
  const shouldShowSidebar = showSidebar && !isPublicRoute

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {shouldShowSidebar && <Sidebar />}
      <EmailVerificationBanner />
      <CommandPalette />

      {/* Main content with sidebar offset */}
      <div
        className={cn(
          'transition-all duration-200 ease-in-out min-h-screen',
          shouldShowSidebar && 'lg:ml-60', // Default expanded width
          shouldShowSidebar && isCollapsed && 'lg:ml-16' // Collapsed width
        )}
      >
        {children}
      </div>
    </div>
  )
}
