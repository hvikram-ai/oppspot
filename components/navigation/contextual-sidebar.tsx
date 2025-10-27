'use client';

/**
 * Contextual Sidebar Component
 *
 * Shows relevant context based on current page
 * - Recent searches (last 5)
 * - Saved lists (pinned + recent)
 * - Active research reports
 * - Collapsible on desktop, hidden on mobile
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  List,
  FileText,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pin,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';

interface RecentSearch {
  id: string;
  query: string;
  timestamp: string;
  results_count: number;
}

interface SavedList {
  id: string;
  name: string;
  businesses_count: number;
  pinned: boolean;
  updated_at: string;
}

interface ResearchReport {
  id: string;
  company_name: string;
  status: 'pending' | 'generating' | 'complete' | 'failed';
  generated_at: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ContextualSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch contextual data
  const { data: recentSearches } = useSWR<RecentSearch[]>(
    '/api/searches/recent?limit=5',
    fetcher
  );

  const { data: savedLists } = useSWR<SavedList[]>(
    '/api/lists?limit=10',
    fetcher
  );

  const { data: activeReports } = useSWR<ResearchReport[]>(
    '/api/research/history?status=generating&limit=5',
    fetcher
  );

  const pinnedLists = savedLists?.filter((list) => list.pinned) ?? [];
  const recentLists = savedLists?.filter((list) => !list.pinned).slice(0, 5) ?? [];

  if (isCollapsed) {
    return (
      <aside className="hidden lg:block fixed right-0 top-16 bottom-0 w-12 bg-background border-l border-border z-40">
        <div className="flex flex-col items-center py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(false)}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex flex-col gap-4 text-muted-foreground">
            <Search className="h-4 w-4" />
            <List className="h-4 w-4" />
            <Brain className="h-4 w-4" />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:block fixed right-0 top-16 bottom-0 w-72 bg-background border-l border-border z-40">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-sm font-semibold">Quick Access</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-4 space-y-6">
          {/* Recent Searches */}
          {recentSearches && recentSearches.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Recent Searches</h3>
              </div>
              <div className="space-y-2">
                {recentSearches.map((search) => (
                  <Link
                    key={search.id}
                    href={`/search?q=${encodeURIComponent(search.query)}`}
                    className="block p-2 rounded-md hover:bg-accent text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{search.query}</span>
                      <Badge variant="secondary" className="text-xs">
                        {search.results_count}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(search.timestamp), { addSuffix: true })}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Saved Lists */}
          {(pinnedLists.length > 0 || recentLists.length > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <List className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Saved Lists</h3>
              </div>
              <div className="space-y-2">
                {/* Pinned Lists */}
                {pinnedLists.map((list) => (
                  <Link
                    key={list.id}
                    href={`/lists/${list.id}`}
                    className="block p-2 rounded-md hover:bg-accent text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Pin className="h-3 w-3 text-yellow-600" />
                        <span className="truncate">{list.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {list.businesses_count}
                      </Badge>
                    </div>
                  </Link>
                ))}

                {/* Recent Lists */}
                {recentLists.map((list) => (
                  <Link
                    key={list.id}
                    href={`/lists/${list.id}`}
                    className="block p-2 rounded-md hover:bg-accent text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{list.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {list.businesses_count}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Active Research Reports */}
          {activeReports && activeReports.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Generating Research</h3>
              </div>
              <div className="space-y-2">
                {activeReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/research/${report.id}`}
                    className="block p-2 rounded-md hover:bg-accent text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{report.company_name}</span>
                      <Badge
                        variant={report.status === 'generating' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {report.status}
                      </Badge>
                    </div>
                    {report.status === 'generating' && (
                      <div className="mt-2 h-1 bg-accent rounded-full overflow-hidden">
                        <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }} />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
