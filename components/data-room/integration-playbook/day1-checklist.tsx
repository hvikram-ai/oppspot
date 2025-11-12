'use client';

/**
 * Day 1 Checklist Component
 * Critical tasks for closing day
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { IntegrationDay1ChecklistItem, ChecklistStatus } from '@/lib/data-room/types';

interface Day1ChecklistProps {
  playbookId: string;
}

export function Day1Checklist({ playbookId }: Day1ChecklistProps) {
  const [items, setItems] = useState<IntegrationDay1ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChecklist();
  }, [playbookId]);

  const fetchChecklist = async () => {
    try {
      const response = await fetch(`/api/integration-playbook/${playbookId}/day1-checklist`);
      const result = await response.json();

      if (result.success) {
        setItems(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (itemId: string, currentStatus: ChecklistStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    try {
      const response = await fetch(
        `/api/integration-playbook/${playbookId}/day1-checklist/${itemId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        toast.success(newStatus === 'completed' ? 'Item completed' : 'Item marked pending');
        fetchChecklist();
      }
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const completedCount = items.filter((item) => item.status === 'completed').length;
  const completionPercentage = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const criticalItems = items.filter((item) => item.is_critical);
  const completedCritical = criticalItems.filter((item) => item.status === 'completed').length;

  const categoryColors: Record<string, string> = {
    legal: 'bg-purple-100 text-purple-800',
    communications: 'bg-blue-100 text-blue-800',
    IT: 'bg-green-100 text-green-800',
    HR: 'bg-yellow-100 text-yellow-800',
    finance: 'bg-red-100 text-red-800',
    operations: 'bg-gray-100 text-gray-800',
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Day 1 Checklist</CardTitle>
            <CardDescription>
              {completedCount}/{items.length} items complete
            </CardDescription>
          </div>
          <Badge variant="outline">
            <AlertTriangle className="mr-1 h-3 w-3" />
            {criticalItems.length} critical
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-gray-500">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} />
        </div>

        {criticalItems.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold flex items-center text-yellow-900">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Critical Items
            </h3>
            <p className="text-xs text-yellow-700 mt-1">
              {completedCritical}/{criticalItems.length} critical items completed
            </p>
          </div>
        )}

        <div className="space-y-4">
          {items
            .sort((a, b) => a.item_order - b.item_order)
            .map((item) => (
              <div
                key={item.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border ${
                  item.status === 'completed' ? 'bg-gray-50' : 'bg-white'
                }`}
              >
                <Checkbox
                  id={item.id}
                  checked={item.status === 'completed'}
                  onCheckedChange={() => handleToggle(item.id, item.status)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label
                    htmlFor={item.id}
                    className={`text-sm font-medium cursor-pointer ${
                      item.status === 'completed' ? 'line-through text-gray-500' : ''
                    }`}
                  >
                    {item.checklist_item}
                  </label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className={categoryColors[item.category]}>{item.category}</Badge>
                    <Badge variant="outline">{item.responsible_party}</Badge>
                    {item.is_critical && (
                      <Badge variant="destructive" className="text-xs">
                        Critical
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
