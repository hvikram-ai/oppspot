'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DollarSign,
  Users,
  Briefcase,
  Cpu,
  TrendingUp,
  Building2,
  ChevronRight,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { BuyingSignal } from '@/lib/signals/types/buying-signals';
import { format, formatDistanceToNow } from 'date-fns';

interface SignalTimelineProps {
  signals: BuyingSignal[];
  onSignalClick?: (signal: BuyingSignal) => void;
  maxHeight?: string;
}

export function SignalTimeline({ signals, onSignalClick, maxHeight = '600px' }: SignalTimelineProps) {
  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'funding_round':
        return <DollarSign className="h-4 w-4" />;
      case 'executive_change':
        return <Users className="h-4 w-4" />;
      case 'job_posting':
        return <Briefcase className="h-4 w-4" />;
      case 'technology_adoption':
        return <Cpu className="h-4 w-4" />;
      case 'expansion':
        return <Building2 className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getSignalColor = (strength?: string) => {
    switch (strength) {
      case 'very_strong':
        return 'bg-red-500';
      case 'strong':
        return 'bg-orange-500';
      case 'moderate':
        return 'bg-yellow-500';
      case 'weak':
        return 'bg-gray-400';
      default:
        return 'bg-blue-500';
    }
  };

  const getSignalBadgeColor = (strength?: string) => {
    switch (strength) {
      case 'very_strong':
        return 'bg-red-100 text-red-800';
      case 'strong':
        return 'bg-orange-100 text-orange-800';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800';
      case 'weak':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getSignalTitle = (signal: BuyingSignal) => {
    const data = signal.signal_data || {};

    switch (signal.signal_type) {
      case 'funding_round':
        return `${(data as { round_type?: string }).round_type?.replace('_', ' ').toUpperCase() || 'Funding'} - $${((data as { amount?: number }).amount || 0 / 1000000).toFixed(1)}M`;
      case 'executive_change':
        return `New ${data.position || 'Executive'} - ${data.department || 'Leadership'}`;
      case 'job_posting':
        return `${data.title || 'Job Posting'} - ${data.department || 'Hiring'}`;
      case 'technology_adoption':
        return `${(data as { technology_name?: string }).technology_name || 'Technology'} ${(data as { adoption_type?: string }).adoption_type?.replace('_', ' ') || 'Adoption'}`;
      default:
        return signal.signal_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Group signals by date
  const signalsByDate = signals.reduce((acc, signal) => {
    const date = format(new Date(signal.detected_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(signal);
    return acc;
  }, {} as Record<string, BuyingSignal[]>);

  const sortedDates = Object.keys(signalsByDate).sort((a, b) => b.localeCompare(a));

  if (signals.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-muted-foreground">No buying signals detected yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Signals will appear here as they are detected
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Signal Timeline</CardTitle>
          <Badge variant="secondary">
            {signals.length} signal{signals.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ height: maxHeight }}>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Timeline items */}
            <div className="space-y-6">
              {sortedDates.map((date) => (
                <div key={date} className="relative">
                  {/* Date header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-white px-2">
                      <Badge variant="outline" className="font-normal">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(date), 'MMM d, yyyy')}
                      </Badge>
                    </div>
                  </div>

                  {/* Signals for this date */}
                  <div className="space-y-3 ml-12">
                    {signalsByDate[date].map((signal) => (
                      <div
                        key={signal.id}
                        className="group relative flex items-start gap-4 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => onSignalClick?.(signal)}
                      >
                        {/* Timeline dot */}
                        <div className={`absolute -left-[2.9rem] top-5 w-3 h-3 rounded-full ${getSignalColor(signal.signal_strength)} ring-4 ring-white`} />

                        {/* Signal icon */}
                        <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200">
                          {getSignalIcon(signal.signal_type)}
                        </div>

                        {/* Signal content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {getSignalTitle(signal)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(signal.detected_at), { addSuffix: true })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${getSignalBadgeColor(signal.signal_strength)}`}>
                                {signal.signal_strength?.replace('_', ' ')}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {signal.buying_probability}%
                              </Badge>
                            </div>
                          </div>

                          {/* Additional details */}
                          {signal.impact_assessment && (
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {signal.impact_assessment.revenue_impact && (
                                <span>
                                  Revenue: ${(signal.impact_assessment.revenue_impact / 1000).toFixed(0)}k
                                </span>
                              )}
                              {signal.impact_assessment.urgency_level && (
                                <span>
                                  Urgency: {signal.impact_assessment.urgency_level}/10
                                </span>
                              )}
                              {signal.impact_assessment.decision_timeline && (
                                <span>
                                  Timeline: {signal.impact_assessment.decision_timeline}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Engagement window indicator */}
                          {signal.engagement_window && (
                            <div className="mt-2">
                              {new Date() >= new Date(signal.engagement_window.optimal_start) &&
                               new Date() <= new Date(signal.engagement_window.optimal_end) ? (
                                <Badge variant="default" className="text-xs">
                                  Optimal engagement window now
                                </Badge>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Engage: {format(new Date(signal.engagement_window.optimal_start), 'MMM d')} -
                                  {' '}{format(new Date(signal.engagement_window.optimal_end), 'MMM d')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action indicator */}
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}