'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import {
  Search,
  Menu,
  Sparkles,
  LogOut,
  Settings,
  User as UserIcon,
} from 'lucide-react'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { useDemoMode } from '@/lib/demo/demo-context'
import { useSidebar } from '@/lib/hooks/use-sidebar'

export function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { isDemoMode, disableDemoMode } = useDemoMode()
  const { toggleMobile } = useSidebar()

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

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Left Section: Mobile Menu + Logo */}
          <div className="flex items-center gap-2">
            {user && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8"
                onClick={toggleMobile}
                aria-label="Toggle menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            <Link href={user ? '/dashboard' : '/'} className="flex items-center space-x-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg hidden sm:inline">oppSpot</span>
            </Link>
          </div>

          {/* Center: Global Search (Desktop) */}
          {user && (
            <div className="hidden md:flex flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Quick search businesses..."
                  className="pl-10 h-9"
                />
              </div>
            </div>
          )}

          {/* Right Section: Notifications + User Menu */}
          <div className="flex items-center gap-2">
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
              </>
            ) : (
              <div className="flex items-center gap-2">
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
      </div>
    </nav>
  )
}