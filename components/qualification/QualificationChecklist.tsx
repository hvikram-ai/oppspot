'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import {
  CheckCircle2,
  Circle,
  Clock,
  Ban,
  ChevronRight,
  FileText,
  AlertCircle
} from 'lucide-react';
import { QualificationChecklist, ChecklistItem } from '@/lib/qualification/types/qualification';

interface QualificationChecklistProps {
  checklist: QualificationChecklist | null;
  onItemUpdate?: (itemId: string, data: Partial<ChecklistItem>) => void;
  onComplete?: () => void;
  loading?: boolean;
}

export function QualificationChecklistComponent({
  checklist,
  onItemUpdate,
  onComplete,
  loading
}: QualificationChecklistProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!checklist) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No checklist available</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'blocked':
        return <Ban className="h-4 w-4 text-red-500" />;
      case 'na':
        return <Circle className="h-4 w-4 text-gray-400" />;
      default:
        return <Circle className="h-4 w-4 text-gray-300" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in_progress':
        return 'text-yellow-600';
      case 'not_started':
        return 'text-gray-600';
      case 'abandoned':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const groupedItems = checklist.items?.reduce((acc, item) => {
    const category = item.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>) || {};

  const handleItemStatusChange = (itemId: string, status: ChecklistItem['status']) => {
    if (onItemUpdate) {
      onItemUpdate(itemId, {
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : undefined
      });
    }
  };

  const handleItemAnswerUpdate = (itemId: string, answer: string) => {
    if (onItemUpdate) {
      onItemUpdate(itemId, { answer });
    }
    setEditingItem(null);
  };

  const completedCount = checklist.items?.filter(i => i.status === 'completed').length || 0;
  const totalCount = checklist.items?.length || 0;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {checklist.framework} Qualification Checklist
            </CardTitle>
            <CardDescription>
              Complete all required items to qualify this lead
            </CardDescription>
          </div>
          <Badge className={getStatusColor(checklist.status)}>
            {checklist.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Progress Overview */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="font-medium">
                {completedCount} of {totalCount} completed ({completionPercentage}%)
              </span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          {/* Checklist Items by Category */}
          <Accordion
            type="multiple"
            value={expandedItems}
            onValueChange={setExpandedItems}
            className="space-y-2"
          >
            {Object.entries(groupedItems).map(([category, items]) => {
              const categoryCompleted = items.filter(i => i.status === 'completed').length;
              const categoryTotal = items.length;

              return (
                <AccordionItem key={category} value={category} className="border rounded-lg">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full mr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{category}</span>
                        <Badge variant="secondary" className="text-xs">
                          {categoryCompleted}/{categoryTotal}
                        </Badge>
                      </div>
                      <Progress
                        value={(categoryCompleted / categoryTotal) * 100}
                        className="w-24 h-2"
                      />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 px-4 pb-4">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`space-y-2 p-3 rounded-lg border ${
                            item.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleItemStatusChange(
                                item.id,
                                item.status === 'completed' ? 'pending' : 'completed'
                              )}
                              className="mt-0.5"
                            >
                              {getStatusIcon(item.status)}
                            </button>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className={`font-medium ${
                                    item.status === 'completed' ? 'line-through text-gray-500' : ''
                                  }`}>
                                    {item.question}
                                    {item.is_required && (
                                      <span className="text-red-500 ml-1">*</span>
                                    )}
                                  </p>
                                  {item.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {item.auto_populate && (
                                    <Badge variant="outline" className="text-xs">
                                      Auto
                                    </Badge>
                                  )}
                                  {item.weight && (
                                    <Badge variant="secondary" className="text-xs">
                                      {item.weight}pts
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Answer/Evidence Section */}
                              {(item.answer || editingItem === item.id) && (
                                <div className="mt-2">
                                  {editingItem === item.id ? (
                                    <div className="space-y-2">
                                      <Textarea
                                        defaultValue={item.answer}
                                        placeholder="Enter your answer..."
                                        className="min-h-[60px]"
                                        onBlur={(e) => handleItemAnswerUpdate(item.id, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && e.ctrlKey) {
                                            handleItemAnswerUpdate(item.id, e.currentTarget.value);
                                          }
                                        }}
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            const textarea = document.querySelector('textarea');
                                            if (textarea) {
                                              handleItemAnswerUpdate(item.id, textarea.value);
                                            }
                                          }}
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setEditingItem(null)}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      className="p-2 bg-gray-50 rounded text-sm cursor-pointer hover:bg-gray-100"
                                      onClick={() => setEditingItem(item.id)}
                                    >
                                      {item.answer}
                                    </div>
                                  )}
                                </div>
                              )}

                              {!item.answer && editingItem !== item.id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingItem(item.id)}
                                  className="text-xs"
                                >
                                  Add answer
                                </Button>
                              )}

                              {/* ML Suggestion */}
                              {item.ml_suggestion && item.confidence_score && item.confidence_score > 0.7 && (
                                <div className="flex items-start gap-2 p-2 bg-blue-50 rounded text-sm">
                                  <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-blue-900">Suggested answer:</p>
                                    <p className="text-blue-700">{item.ml_suggestion}</p>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleItemAnswerUpdate(item.id, item.ml_suggestion!)}
                                      className="text-xs mt-1"
                                    >
                                      Use suggestion
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Status Actions */}
                              {item.status !== 'completed' && item.status !== 'na' && (
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleItemStatusChange(item.id, 'in_progress')}
                                    className={item.status === 'in_progress' ? 'bg-yellow-50' : ''}
                                  >
                                    In Progress
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleItemStatusChange(item.id, 'blocked')}
                                    className={item.status === 'blocked' ? 'bg-red-50' : ''}
                                  >
                                    Blocked
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleItemStatusChange(item.id, 'na')}
                                  >
                                    N/A
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {/* Complete Checklist Button */}
          {checklist.status !== 'completed' && completionPercentage === 100 && onComplete && (
            <div className="flex justify-center pt-4">
              <Button onClick={onComplete} size="lg" className="gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Complete Checklist
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}