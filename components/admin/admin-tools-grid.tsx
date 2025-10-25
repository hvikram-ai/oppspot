'use client';

/**
 * AdminToolsGrid Component
 * Displays grid of administrative tool cards with navigation
 */

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import type { AdminToolsGridProps } from '@/types/admin-components';

// Re-export AdminTool type for backward compatibility
export type { AdminTool } from '@/types/admin-components';

export function AdminToolsGrid({ tools, isSuperAdmin = false }: AdminToolsGridProps) {
  const visibleTools = tools.filter(
    (tool) => !tool.requiresSuperAdmin || isSuperAdmin
  );

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Administrative Tools</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.href} href={tool.href}>
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:border-primary/50 cursor-pointer group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {tool.title}
                          {tool.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {tool.badge}
                            </Badge>
                          )}
                        </CardTitle>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {tool.description}
                  </CardDescription>
                  {tool.isPremium && (
                    <Badge className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 border-0">
                      Premium
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
