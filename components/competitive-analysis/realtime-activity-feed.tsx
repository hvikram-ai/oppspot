'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Grid3x3,
  Shield,
  Clock,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * Activity Feed Event Types
 */
type ActivityEvent = {
  id: string;
  timestamp: Date;
  type: 'moat_update' | 'parity_update' | 'pricing_update' | 'competitor_added' | 'refresh_complete';
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
};

type RealtimeActivityFeedProps = {
  analysisId: string;
  maxEvents?: number;
};

/**
 * Real-time Activity Feed Component
 *
 * Displays live updates for competitive analysis changes:
 * - Moat score updates
 * - Feature parity changes
 * - Pricing updates
 * - Competitor additions
 * - Data refresh completions
 */
export function RealtimeActivityFeed({
  analysisId,
  maxEvents = 20
}: RealtimeActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  /**
   * Add new event to the feed
   */
  const addEvent = useCallback((event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    const newEvent: ActivityEvent = {
      ...event,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };

    setEvents(prev => {
      const updated = [newEvent, ...prev];
      return updated.slice(0, maxEvents); // Keep only recent events
    });
  }, [maxEvents]);

  /**
   * Set up real-time subscriptions for activity tracking
   */
  useEffect(() => {
    if (!analysisId) return;

    const supabase = createClient();

    console.log('[Activity Feed] Setting up subscriptions for analysis:', analysisId);

    const channel = supabase
      .channel(`activity-${analysisId}`)
      // Listen for competitive_analyses updates (refresh completions)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'competitive_analyses',
          filter: `id=eq.${analysisId}`
        },
        (payload) => {
          console.log('[Activity Feed] Analysis updated:', payload);

          // Check if last_refreshed_at changed
          if (payload.new.last_refreshed_at !== payload.old?.last_refreshed_at) {
            addEvent({
              type: 'refresh_complete',
              title: 'Data Refresh Complete',
              description: 'Competitive intelligence data has been updated',
              metadata: { last_refreshed_at: payload.new.last_refreshed_at }
            });
          }
        }
      )
      // Listen for moat score updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'competitive_moat_scores',
          filter: `analysis_id=eq.${analysisId}`
        },
        (payload) => {
          console.log('[Activity Feed] Moat score updated:', payload);

          const eventType = payload.eventType;
          const newScore = payload.new?.overall_moat_score;
          const oldScore = payload.old?.overall_moat_score;

          if (eventType === 'INSERT') {
            addEvent({
              type: 'moat_update',
              title: 'Moat Strength Calculated',
              description: `Overall moat score: ${newScore}`,
              metadata: { score: newScore }
            });
          } else if (eventType === 'UPDATE' && newScore !== oldScore) {
            const change = newScore - oldScore;
            const trend = change > 0 ? 'increased' : 'decreased';

            addEvent({
              type: 'moat_update',
              title: 'Moat Strength Updated',
              description: `Score ${trend} from ${oldScore} to ${newScore} (${change > 0 ? '+' : ''}${change.toFixed(1)})`,
              metadata: { old_score: oldScore, new_score: newScore, change }
            });
          }
        }
      )
      // Listen for feature parity updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_parity_scores',
          filter: `analysis_id=eq.${analysisId}`
        },
        (payload) => {
          console.log('[Activity Feed] Parity score updated:', payload);

          const eventType = payload.eventType;
          const competitorId = payload.new?.competitor_company_id;
          const newParity = payload.new?.parity_score;
          const oldParity = payload.old?.parity_score;

          if (eventType === 'INSERT') {
            addEvent({
              type: 'parity_update',
              title: 'Feature Parity Calculated',
              description: `New competitor analyzed - parity score: ${newParity}%`,
              metadata: { competitor_id: competitorId, score: newParity }
            });
          } else if (eventType === 'UPDATE' && newParity !== oldParity) {
            const change = newParity - oldParity;

            addEvent({
              type: 'parity_update',
              title: 'Feature Parity Updated',
              description: `Parity score changed from ${oldParity}% to ${newParity}% (${change > 0 ? '+' : ''}${change.toFixed(1)}%)`,
              metadata: { competitor_id: competitorId, old_score: oldParity, new_score: newParity }
            });
          }
        }
      )
      // Listen for pricing updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pricing_comparisons',
          filter: `analysis_id=eq.${analysisId}`
        },
        (payload) => {
          console.log('[Activity Feed] Pricing updated:', payload);

          const eventType = payload.eventType;
          const priceTier = payload.new?.price_tier;
          const newPrice = payload.new?.representative_price;
          const oldPrice = payload.old?.representative_price;

          if (eventType === 'INSERT') {
            addEvent({
              type: 'pricing_update',
              title: 'Pricing Data Added',
              description: `New pricing information: ${priceTier} - ${payload.new?.currency} ${newPrice}`,
              metadata: { price_tier: priceTier, price: newPrice }
            });
          } else if (eventType === 'UPDATE' && newPrice !== oldPrice) {
            const change = ((newPrice - oldPrice) / oldPrice * 100).toFixed(1);

            addEvent({
              type: 'pricing_update',
              title: 'Pricing Updated',
              description: `Price changed from ${oldPrice} to ${newPrice} (${change > 0 ? '+' : ''}${change}%)`,
              metadata: { old_price: oldPrice, new_price: newPrice }
            });
          }
        }
      )
      // Listen for competitor additions
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'competitive_analysis_competitors',
          filter: `analysis_id=eq.${analysisId}`
        },
        (payload) => {
          console.log('[Activity Feed] Competitor added:', payload);

          addEvent({
            type: 'competitor_added',
            title: 'Competitor Added',
            description: 'New competitor added to analysis',
            metadata: { competitor_id: payload.new.competitor_company_id }
          });
        }
      )
      .subscribe((status) => {
        console.log('[Activity Feed] Channel status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Cleanup on unmount
    return () => {
      console.log('[Activity Feed] Cleaning up subscriptions');
      supabase.removeChannel(channel);
    };
  }, [analysisId, addEvent]);

  /**
   * Get icon for event type
   */
  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'moat_update':
        return <Shield className="h-4 w-4" />;
      case 'parity_update':
        return <Grid3x3 className="h-4 w-4" />;
      case 'pricing_update':
        return <DollarSign className="h-4 w-4" />;
      case 'competitor_added':
        return <TrendingUp className="h-4 w-4" />;
      case 'refresh_complete':
        return <Activity className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  /**
   * Get badge variant for event type
   */
  const getEventVariant = (type: ActivityEvent['type']): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'moat_update':
        return 'default';
      case 'parity_update':
        return 'secondary';
      case 'pricing_update':
        return 'outline';
      case 'competitor_added':
        return 'default';
      case 'refresh_complete':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Live Activity Feed</span>
            </CardTitle>
            <CardDescription>
              Real-time updates from competitive analysis
            </CardDescription>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-green-600" : ""}>
            {isConnected ? '● Live' : '○ Offline'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No activity yet. Updates will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-1">
                    <Badge variant={getEventVariant(event.type)} className="p-1">
                      {getEventIcon(event.type)}
                    </Badge>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    <p className="text-xs text-muted-foreground flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(event.timestamp, { addSuffix: true })}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
