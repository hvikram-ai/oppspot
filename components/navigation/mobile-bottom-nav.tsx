'use client';

/**
 * Mobile Bottom Navigation Component
 *
 * Fixed bottom bar for mobile devices
 * - 5 main navigation icons
 * - Labels on active item only
 * - iOS safe-area-inset-bottom support
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  Brain,
  Star,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  matchPaths?: string[];
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Home',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    id: 'search',
    label: 'Search',
    href: '/search',
    icon: <Search className="h-5 w-5" />,
    matchPaths: ['/search', '/map'],
  },
  {
    id: 'research',
    label: 'Research',
    href: '/research',
    icon: <Brain className="h-5 w-5" />,
  },
  {
    id: 'saved',
    label: 'Saved',
    href: '/saved',
    icon: <Star className="h-5 w-5" />,
    matchPaths: ['/saved', '/lists'],
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="h-5 w-5" />,
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (item: NavItem) => {
    if (item.href === '/dashboard') {
      return pathname === '/dashboard';
    }

    if (item.matchPaths) {
      return item.matchPaths.some((path) => pathname?.startsWith(path));
    }

    return pathname?.startsWith(item.href);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex items-center justify-around h-16 pb-safe">
        {navItems.map((item) => {
          const active = isActive(item);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 min-w-[64px] h-full transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'transition-transform',
                active && 'scale-110'
              )}>
                {item.icon}
              </div>
              {active && (
                <span className="text-xs font-medium">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
