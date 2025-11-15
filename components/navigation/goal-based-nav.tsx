'use client';

/**
 * Goal-Based Navigation Component
 *
 * Organizes navigation by user goals instead of features
 * - 5 nav groups: Command Center, Discover, Intelligence, Pipeline, Workspace
 * - Dropdown menus with relevant actions
 * - Active state indication
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  Brain,
  Users,
  Settings,
  ChevronDown,
  Map,
  Building2,
  FileText,
  TrendingUp,
  List,
  Star,
  Target,
} from 'lucide-react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

interface NavGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

const navGroups: NavGroup[] = [
  {
    id: 'command',
    label: 'Command Center',
    icon: <LayoutDashboard className="h-4 w-4" />,
    href: '/dashboard',
    items: [
      {
        label: 'Dashboard',
        description: 'Your personalized command center',
        href: '/dashboard',
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        label: 'Notifications',
        description: 'Stay updated on important changes',
        href: '/notifications',
        icon: <TrendingUp className="h-4 w-4" />,
      },
    ],
  },
  {
    id: 'discover',
    label: 'Discover',
    icon: <Search className="h-4 w-4" />,
    href: '/search',
    items: [
      {
        label: 'Search',
        description: 'Find businesses by criteria',
        href: '/search',
        icon: <Search className="h-4 w-4" />,
      },
      {
        label: 'Ideal Target Profiles',
        description: 'AI-powered target matching',
        href: '/itp',
        icon: <Target className="h-4 w-4" />,
      },
      {
        label: 'Map View',
        description: 'Explore businesses geographically',
        href: '/map',
        icon: <Map className="h-4 w-4" />,
      },
      {
        label: 'Similar Companies',
        description: 'Find companies like your targets',
        href: '/similar',
        icon: <Building2 className="h-4 w-4" />,
      },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    icon: <Brain className="h-4 w-4" />,
    href: '/research',
    items: [
      {
        label: 'ResearchGPT™',
        description: 'AI-powered company intelligence',
        href: '/research',
        icon: <Brain className="h-4 w-4" />,
      },
      {
        label: 'Reports',
        description: 'View generated research reports',
        href: '/research/history',
        icon: <FileText className="h-4 w-4" />,
      },
    ],
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    icon: <Users className="h-4 w-4" />,
    href: '/saved',
    items: [
      {
        label: 'Saved Businesses',
        description: 'Your prospect list',
        href: '/saved',
        icon: <Star className="h-4 w-4" />,
      },
      {
        label: 'Lists',
        description: 'Organize businesses into lists',
        href: '/lists',
        icon: <List className="h-4 w-4" />,
      },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    icon: <Settings className="h-4 w-4" />,
    href: '/settings',
    items: [
      {
        label: 'Settings',
        description: 'Customize your experience',
        href: '/settings',
        icon: <Settings className="h-4 w-4" />,
      },
      {
        label: 'Integrations',
        description: 'Connect your CRM and tools',
        href: '/integrations',
        icon: <TrendingUp className="h-4 w-4" />,
      },
    ],
  },
];

export function GoalBasedNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(href);
  };

  return (
    <NavigationMenu className="hidden md:flex">
      <NavigationMenuList>
        {navGroups.map((group) => (
          <NavigationMenuItem key={group.id}>
            <NavigationMenuTrigger
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                isActive(group.href)
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <span className="flex items-center gap-2">
                {group.icon}
                {group.label}
              </span>
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavigationMenuLink asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                          isActive(item.href) && 'bg-accent'
                        )}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium leading-none">
                          {item.icon}
                          {item.label}
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          {item.description}
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
