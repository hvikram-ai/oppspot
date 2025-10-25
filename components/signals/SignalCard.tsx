'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  DollarSign,
  Users,
  Briefcase,
  Cpu,
  TrendingUp,
  Calendar,
  MoreVertical,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Building2
} from 'lucide-react';
import { BuyingSignal } from '@/lib/signals/types/buying-signals';
import { formatDistanceToNow } from 'date-fns';

interface SignalCardProps {
  signal: BuyingSignal;
  onAction?: (action: string) => void;
  compact?: boolean;
}

export function SignalCard({ signal, onAction, compact = false }: SignalCardProps) {
  const getSignalIcon = () => {
    switch (signal.signal_type) {
      case 'funding_round':
        return <DollarSign className="h-5 w-5" />;
      case 'executive_change':
        return <Users className="h-5 w-5" />;
      case 'job_posting':
        return <Briefcase className="h-5 w-5" />;
      case 'technology_adoption':
        return <Cpu className="h-5 w-5" />;
      case 'expansion':
        return <Building2 className="h-5 w-5" />;
      default:
        return <TrendingUp className="h-5 w-5" />;
    }
  };

  const getStrengthColor = () => {
    switch (signal.signal_strength) {
      case 'very_strong':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'strong':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'weak':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 75) return 'text-green-600';
    if (probability >= 50) return 'text-yellow-600';
    if (probability >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSignalDetails = () => {
    const data = (signal.signal_data || {}) as Record<string, any>;

    switch (signal.signal_type) {
      case 'funding_round':
        return {
          title: `${data.round_type?.replace('_', ' ').toUpperCase()} Funding Round`,
          subtitle: data.amount ? `$${(data.amount / 1000000).toFixed(1)}M raised` : 'Amount undisclosed',
          detail: data.investors?.length ? `${data.investors.length} investors` : null
        };

      case 'executive_change':
        return {
          title: `New ${data.position || 'Executive'}`,
          subtitle: data.department ? `${data.department} Department` : 'Leadership Change',
          detail: data.change_type === 'new_hire' ? 'New Hire' : data.change_type?.replace('_', ' ')
        };

      case 'job_posting':
        return {
          title: data.title || 'New Job Posting',
          subtitle: data.department || 'Multiple Departments',
          detail: data.remote_options ? `${data.remote_options} position` : null
        };

      case 'technology_adoption':
        return {
          title: `${data.technology_name || 'Technology'} Adoption`,
          subtitle: data.adoption_type?.replace('_', ' ') || 'Implementation',
          detail: data.adoption_stage || 'In Progress'
        };

      default:
        return {
          title: signal.signal_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          subtitle: 'Business Signal Detected',
          detail: null
        };
    }
  };

  const details = getSignalDetails();

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100">
            {getSignalIcon()}
          </div>
          <div>
            <p className="font-medium">{details.title}</p>
            <p className="text-sm text-muted-foreground">{details.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStrengthColor()}>
            {signal.signal_strength?.replace('_', ' ')}
          </Badge>
          <span className={`font-semibold ${getProbabilityColor(signal.buying_probability)}`}>
            {signal.buying_probability}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
              {getSignalIcon()}
            </div>
            <div>
              <CardTitle className="text-lg">{details.title}</CardTitle>
              <CardDescription>{details.subtitle}</CardDescription>
              {details.detail && (
                <p className="text-sm text-muted-foreground mt-1">{details.detail}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction?.('email')}>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.('call')}>
                <Phone className="h-4 w-4 mr-2" />
                Schedule Call
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.('task')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Create Task
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction?.('dismiss')}>
                Dismiss Signal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Signal Strength</p>
              <Badge className={getStrengthColor()}>
                {signal.signal_strength?.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Buying Probability</p>
              <p className={`text-lg font-semibold ${getProbabilityColor(signal.buying_probability)}`}>
                {signal.buying_probability}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Confidence</p>
              <p className="text-lg font-semibold">{signal.confidence_score}%</p>
            </div>
          </div>

          {/* Impact Assessment */}
          {signal.impact_assessment && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm font-medium">Impact Assessment</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {signal.impact_assessment.revenue_impact && (
                  <div className="flex items-center gap-2">
                    <ArrowUp className="h-3 w-3 text-green-500" />
                    <span>Revenue: ${(signal.impact_assessment.revenue_impact / 1000).toFixed(0)}k</span>
                  </div>
                )}
                {signal.impact_assessment.urgency_level && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-yellow-500" />
                    <span>Urgency: {signal.impact_assessment.urgency_level}/10</span>
                  </div>
                )}
                {signal.impact_assessment.decision_timeline && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-blue-500" />
                    <span>{signal.impact_assessment.decision_timeline}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {signal.recommended_actions && signal.recommended_actions.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm font-medium">Recommended Actions</p>
              <div className="space-y-1">
                {signal.recommended_actions.slice(0, 2).map((action, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-xs">
                      {action.priority}
                    </Badge>
                    <span className="text-muted-foreground">{action.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Engagement Window */}
          {signal.engagement_window && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Optimal Engagement Window</p>
                <p className="text-sm font-medium">
                  {new Date(signal.engagement_window.optimal_start).toLocaleDateString()} -
                  {' '}{new Date(signal.engagement_window.optimal_end).toLocaleDateString()}
                </p>
              </div>
              <Button size="sm" onClick={() => onAction?.('engage')}>
                Engage Now
              </Button>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>
              Detected {formatDistanceToNow(new Date(signal.detected_at), { addSuffix: true })}
            </span>
            <span>Source: {signal.source || 'Unknown'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}