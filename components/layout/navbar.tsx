'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import {
  Search,
  Map,
  BarChart3,
  Building2,
  Menu,
  X,
  Sparkles,
  LogOut,
  Settings,
  User as UserIcon,
  Newspaper,
  Users,
  Target,
  Brain
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { useDemoMode } from '@/lib/demo/demo-context'

export function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { isDemoMode, disableDemoMode } = useDemoMode()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    if (isDemoMode) {
      disableDemoMode()
      router.push('/login')
    } else {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    }
  }

  const navItems = [
    { 
      href: '/search', 
      label: 'Search', 
      icon: Search,
      tooltip: 'Search and discover UK & Ireland businesses using advanced filters, location-based queries, and AI-powered matching algorithms.'
    },
    { 
      href: '/map', 
      label: 'Map', 
      icon: Map,
      tooltip: 'Visualize business locations on an interactive map with clustering, territory analysis, and demographic insights.'
    },
    { 
      href: '/companies', 
      label: 'Companies', 
      icon: Building2,
      tooltip: 'Search and verify UK company registrations with real-time Companies House data, including directors, filings, and financial information.'
    },
    { 
      href: '/updates', 
      label: 'Updates', 
      icon: Newspaper,
      tooltip: 'Stay informed with the latest business news, market updates, acquisition opportunities, and industry intelligence.'
    },
    { 
      href: '/lists', 
      label: 'Lists', 
      icon: Sparkles,
      tooltip: 'Create, manage, and organize custom prospect lists with tags, notes, and follow-up tracking for your sales pipeline.'
    },
    {
      href: '/ai-scoring',
      label: 'AI Scoring',
      icon: Brain,
      tooltip: 'AI-powered predictive lead scoring with deal probability, optimal timing recommendations, and actionable insights.'
    },
    {
      href: '/analytics',
      label: 'Analytics',
      icon: BarChart3,
      tooltip: 'Access performance metrics, conversion analytics, ROI insights, and detailed reports to optimize your prospecting strategy.'
    },
    {
      href: '/benchmarking',
      label: 'Benchmarking',
      icon: BarChart3,
      tooltip: 'Compare company performance against industry standards and peer companies with AI-powered insights and recommendations.'
    },
    {
      href: '/stakeholders',
      label: 'Stakeholders',
      icon: Users,
      tooltip: 'Track key relationships, identify champions, manage detractors, and measure influence to optimize stakeholder engagement.'
    },
    {
      href: '/qualification',
      label: 'Qualification',
      icon: Target,
      tooltip: 'Manage lead qualification workflows with BANT and MEDDIC frameworks, automated routing, and intelligent recycling.'
    },
  ]

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={user ? '/dashboard' : '/'} className="flex items-center space-x-2">
            <div className="relative">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </div>
            <span className="font-bold text-xl">oppSpot</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {user && navItems.map((item) => {
              const Icon = item.icon
              return (
                <HelpTooltip 
                  key={item.href} 
                  content={item.tooltip}
                  side="bottom"
                  delayDuration={300}
                >
                  <Link href={item.href}>
                    <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                </HelpTooltip>
              )
            })}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.user_metadata?.avatar_url} />
                        <AvatarFallback>
                          {user.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.user_metadata?.full_name || 'User'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <UserIcon className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Menu Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/login">
                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {user && mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <HelpTooltip 
                      key={item.href}
                      content={item.tooltip}
                      side="right"
                      delayDuration={300}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block"
                      >
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </Button>
                      </Link>
                    </HelpTooltip>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}