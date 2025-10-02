'use client'

import { Navbar } from '@/components/layout/navbar'

interface PublicLayoutProps {
  children: React.ReactNode
}

/**
 * PublicLayout - Layout for public pages (login, signup, landing, etc.)
 *
 * This component provides a simple layout for unauthenticated pages.
 * It includes:
 * - Top navbar (without user menu)
 * - No sidebar
 * - Clean, minimal layout for authentication flows
 *
 * Usage: Wrap public pages like login, signup with this component
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      {children}
    </div>
  )
}
