'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Map,
  Building2,
  Sparkles,
  Home,
  Menu,
  X,
  Brain,
  Users,
  Target,
  Newspaper,
  BarChart3,
  Mic
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VoiceCommandModal } from '@/components/voice/voice-command-modal';

interface MobileNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

// Most frequently used features for bottom nav
const navItems: MobileNavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/opp-scan', label: 'Opp Scan', icon: Target },
  { href: '/lists', label: 'Lists', icon: Sparkles }
];

// All other items accessible via "More" menu - organized by workflow
const menuItems: MobileNavItem[] = [
  // Discover
  { href: '/map', label: 'Map', icon: Map },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/updates', label: 'Updates', icon: Newspaper },
  // Research
  { href: '/ai-scoring', label: 'AI Scoring', icon: Brain },
  { href: '/benchmarking', label: 'Benchmarking', icon: BarChart3 },
  { href: '/stakeholders', label: 'Stakeholders', icon: Users },
  // Outreach
  { href: '/qualification', label: 'Qualification', icon: Target },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 }
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);

  useEffect(() => {
    // Fetch notification count
    fetch('/api/notifications/count')
      .then(res => res.json())
      .then(data => setNotifications(data.count))
      .catch(() => {});
  }, [pathname]);

  // Don't show on auth pages
  if (pathname?.includes('/login') || pathname?.includes('/signup')) {
    return null;
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden z-50">
        <div className="grid grid-cols-5 h-16">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 relative',
                  'transition-colors duration-200',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
                {item.badge && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}

          {/* More Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={cn(
              'flex flex-col items-center justify-center gap-1',
              'transition-colors duration-200',
              isMenuOpen ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* More Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 500 }}
              className="fixed bottom-16 left-0 right-0 bg-background border-t z-40 md:hidden"
            >
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="p-4 space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Button
                          variant={isActive ? 'secondary' : 'ghost'}
                          className="w-full justify-start"
                        >
                          <Icon className="h-4 w-4 mr-3" />
                          {item.label}
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto">
                              {item.badge}
                            </Badge>
                          )}
                        </Button>
                      </Link>
                    );
                  })}

                  <div className="pt-2 mt-2 border-t">
                    <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Profile
                      </Button>
                    </Link>
                    <Link href="/settings" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Settings
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-16 md:hidden" />
    </>
  );
}

// Floating Action Button for quick actions
export function MobileFAB() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Don't show on certain pages
  if (
    pathname?.includes('/login') ||
    pathname?.includes('/signup') ||
    pathname?.includes('/search') ||
    pathname?.includes('/map')
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-30 md:hidden">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-16 right-0 bg-background border rounded-lg shadow-lg p-2 space-y-2 min-w-[150px]"
          >
            <Link href="/search">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setIsOpen(false)}
              >
                <Search className="h-4 w-4 mr-2" />
                Quick Search
              </Button>
            </Link>
            <Link href="/lists/new">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setIsOpen(false)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                New List
              </Button>
            </Link>
            <Link href="/ai-scoring">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setIsOpen(false)}
              >
                <Brain className="h-4 w-4 mr-2" />
                AI Score
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setIsOpen(false);
                setIsVoiceModalOpen(true);
              }}
            >
              <Mic className="h-4 w-4 mr-2" />
              Voice Command
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        size="lg"
        className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-blue-600 to-purple-600"
        onClick={() => setIsOpen(!isOpen)}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        </motion.div>
      </Button>

      {/* Voice Command Modal */}
      <VoiceCommandModal open={isVoiceModalOpen} onOpenChange={setIsVoiceModalOpen} />
    </div>
  );
}