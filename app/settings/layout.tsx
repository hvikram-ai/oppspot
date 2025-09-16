'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  User,
  Brain,
  Shield,
  Palette,
  Bell,
  Lock,
  CreditCard,
  ChevronLeft,
  Settings,
  Database,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

const sidebarItems = [
  {
    title: 'General',
    items: [
      { 
        href: '/settings', 
        label: 'Overview', 
        icon: Settings,
        description: 'General settings overview'
      },
      { 
        href: '/settings/profile', 
        label: 'Profile', 
        icon: User,
        description: 'Manage your profile information'
      },
    ]
  },
  {
    title: 'Configuration',
    items: [
      { 
        href: '/settings/ai', 
        label: 'AI Configuration', 
        icon: Brain,
        description: 'Configure AI providers and models'
      },
      { 
        href: '/settings/notifications', 
        label: 'Notifications', 
        icon: Bell,
        description: 'Email and alert preferences'
      },
      { 
        href: '/settings/appearance', 
        label: 'Appearance', 
        icon: Palette,
        description: 'Theme and display settings'
      },
    ]
  },
  {
    title: 'Security & Privacy',
    items: [
      { 
        href: '/settings/security', 
        label: 'Security', 
        icon: Shield,
        description: 'Password and authentication'
      },
      { 
        href: '/settings/privacy', 
        label: 'Data & Privacy', 
        icon: Lock,
        description: 'Data management and privacy'
      },
    ]
  },
  {
    title: 'Account',
    items: [
      { 
        href: '/settings/billing', 
        label: 'Billing', 
        icon: CreditCard,
        description: 'Subscription and payment'
      },
      { 
        href: '/settings/data', 
        label: 'Data Export', 
        icon: Database,
        description: 'Export and backup your data'
      },
    ]
  }
]

function SettingsSidebar() {
  const pathname = usePathname()
  
  return (
    <div className="w-64 border-r bg-background">
      <div className="p-4 border-b">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-4 space-y-6">
          {sidebarItems.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? 'secondary' : 'ghost'}
                        className={cn(
                          'w-full justify-start',
                          isActive && 'bg-secondary'
                        )}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </Button>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function MobileSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Settings</h2>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100vh-5rem)]">
          <div className="p-4 space-y-6">
            {sidebarItems.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    
                    return (
                      <Link 
                        key={item.href} 
                        href={item.href}
                        onClick={() => setOpen(false)}
                      >
                        <Button
                          variant={isActive ? 'secondary' : 'ghost'}
                          className={cn(
                            'w-full justify-start',
                            isActive && 'bg-secondary'
                          )}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {item.label}
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Find current page info
  let currentPage = { label: 'Settings', description: '' }
  for (const section of sidebarItems) {
    const item = section.items.find(i => i.href === pathname)
    if (item) {
      currentPage = item
      break
    }
  }
  
  return (
    <>
      <Navbar />
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <SettingsSidebar />
        </div>
        
        {/* Main Content */}
        <div className="flex-1">
          <div className="border-b bg-background">
            <div className="container max-w-4xl mx-auto px-4 py-6">
              <div className="flex items-center gap-4">
                <MobileSidebar />
                <div>
                  <h1 className="text-2xl font-bold">{currentPage.label}</h1>
                  {currentPage.description && (
                    <p className="text-muted-foreground text-sm mt-1">
                      {currentPage.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="container max-w-4xl mx-auto px-4 py-6">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}