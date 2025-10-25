'use client';

/**
 * QuickActionsGrid Component
 * Displays quick action buttons for common administrative tasks
 */

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Bot, Upload } from 'lucide-react';
import type { QuickAction, QuickActionsGridProps } from '@/types/admin-components';

// Re-export QuickAction type for backward compatibility
export type { QuickAction } from '@/types/admin-components';

export function QuickActionsGrid({ actions }: QuickActionsGridProps) {
  const router = useRouter();

  // Default quick actions if none provided
  const defaultActions: QuickAction[] = [
    {
      title: 'Assign Roles',
      description: 'Manage team member permissions',
      icon: ShieldCheck,
      action: () => router.push('/admin/roles'),
    },
    {
      title: 'Create AI Agent',
      description: 'Set up automated workflows',
      icon: Bot,
      action: () => router.push('/admin/agents/create'),
    },
    {
      title: 'Import Data',
      description: 'Bulk import business records',
      icon: Upload,
      action: () => router.push('/admin/import'),
    },
  ];

  const quickActions = actions || defaultActions;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Common administrative tasks and shortcuts
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.title}
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={action.action}
            >
              <div className="flex items-start gap-3 text-left">
                <Icon className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <div className="font-semibold">{action.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {action.description}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
