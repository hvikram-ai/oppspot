'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  User,
  Mail,
  Phone,
  Building2,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Target,
  MessageSquare,
  Calendar,
  ChevronUp,
  ChevronDown,
  Minus
} from 'lucide-react';
import type { Stakeholder, ChampionTracking, DetractorManagement, InfluenceScores } from '@/lib/stakeholder-tracking/types/stakeholder';

interface StakeholderCardProps {
  stakeholder: Stakeholder & {
    champion_tracking?: ChampionTracking;
    detractor_management?: DetractorManagement;
    influence_scores?: InfluenceScores;
  };
  onEdit?: (stakeholder: Stakeholder) => void;
  onDelete?: (stakeholder: Stakeholder) => void;
  onEngagement?: (stakeholder: Stakeholder) => void;
  onViewDetails?: (stakeholder: Stakeholder) => void;
}

export function StakeholderCard({
  stakeholder,
  onEdit,
  onDelete,
  onEngagement,
  onViewDetails
}: StakeholderCardProps) {
  const getRoleIcon = () => {
    switch (stakeholder.role_type) {
      case 'champion':
        return <Shield className="h-4 w-4 text-green-500" />;
      case 'detractor':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'decision_maker':
        return <Target className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = () => {
    switch (stakeholder.role_type) {
      case 'champion':
        return 'success';
      case 'detractor':
        return 'destructive';
      case 'decision_maker':
        return 'default';
      case 'influencer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRelationshipStatusColor = () => {
    switch (stakeholder.relationship_status) {
      case 'strong':
        return 'text-green-600';
      case 'established':
        return 'text-blue-600';
      case 'developing':
        return 'text-yellow-600';
      case 'at_risk':
        return 'text-orange-600';
      case 'lost':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = () => {
    const management = stakeholder.detractor_management;
    const tracking = stakeholder.champion_tracking;

    if (management?.sentiment_trend === 'improving' || tracking?.risk_level === 'low') {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (management?.sentiment_trend === 'declining' || tracking?.risk_level === 'high') {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {getRoleIcon()}
            <div>
              <h3 className="font-semibold text-lg">{stakeholder.name}</h3>
              {stakeholder.title && (
                <p className="text-sm text-muted-foreground">{stakeholder.title}</p>
              )}
              {stakeholder.department && (
                <p className="text-xs text-muted-foreground">{stakeholder.department}</p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onViewDetails && (
                <DropdownMenuItem onClick={() => onViewDetails(stakeholder)}>
                  View Details
                </DropdownMenuItem>
              )}
              {onEngagement && (
                <DropdownMenuItem onClick={() => onEngagement(stakeholder)}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Log Engagement
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(stakeholder)}>
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(stakeholder)}
                  className="text-red-600"
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Role and Status Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={getRoleBadgeColor() as any}>
            {stakeholder.role_type?.replace('_', ' ')}
          </Badge>
          {stakeholder.relationship_status && (
            <Badge variant="outline" className={getRelationshipStatusColor()}>
              {stakeholder.relationship_status.replace('_', ' ')}
            </Badge>
          )}
          {stakeholder.decision_authority && (
            <Badge variant="secondary">Decision Authority</Badge>
          )}
          {stakeholder.budget_authority && (
            <Badge variant="secondary">Budget Authority</Badge>
          )}
        </div>

        {/* Influence and Engagement Scores */}
        <div className="space-y-2">
          {stakeholder.influence_scores?.overall_influence !== undefined && (
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Influence</span>
                <span className="font-medium">
                  {stakeholder.influence_scores.overall_influence}/100
                </span>
              </div>
              <Progress value={stakeholder.influence_scores.overall_influence} />
            </div>
          )}

          {stakeholder.engagement_score !== undefined && (
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Engagement</span>
                <span className="font-medium">{stakeholder.engagement_score}/100</span>
              </div>
              <Progress value={stakeholder.engagement_score} />
            </div>
          )}

          {stakeholder.champion_score !== undefined && stakeholder.role_type === 'champion' && (
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Champion Score</span>
                <span className="font-medium">{stakeholder.champion_score}/100</span>
              </div>
              <Progress value={stakeholder.champion_score} className="bg-green-100" />
            </div>
          )}
        </div>

        {/* Contact Information */}
        <div className="space-y-1">
          {stakeholder.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <a href={`mailto:${stakeholder.email}`} className="hover:underline">
                {stakeholder.email}
              </a>
            </div>
          )}
          {stakeholder.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <a href={`tel:${stakeholder.phone}`} className="hover:underline">
                {stakeholder.phone}
              </a>
            </div>
          )}
        </div>

        {/* Champion/Detractor Specific Info */}
        {stakeholder.champion_tracking && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Development Stage</span>
              <Badge variant="outline">
                {stakeholder.champion_tracking.development_stage}
              </Badge>
            </div>
            {stakeholder.champion_tracking.risk_level && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Risk Level</span>
                <Badge
                  variant={
                    stakeholder.champion_tracking.risk_level === 'critical' ? 'destructive' :
                    stakeholder.champion_tracking.risk_level === 'high' ? 'destructive' :
                    stakeholder.champion_tracking.risk_level === 'medium' ? 'secondary' :
                    'outline'
                  }
                >
                  {stakeholder.champion_tracking.risk_level}
                </Badge>
              </div>
            )}
          </div>
        )}

        {stakeholder.detractor_management && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Mitigation Status</span>
              <Badge variant="outline">
                {stakeholder.detractor_management.mitigation_status?.replace('_', ' ')}
              </Badge>
            </div>
            {stakeholder.detractor_management.business_impact && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Business Impact</span>
                <Badge
                  variant={
                    stakeholder.detractor_management.business_impact === 'critical' ? 'destructive' :
                    stakeholder.detractor_management.business_impact === 'high' ? 'destructive' :
                    'secondary'
                  }
                >
                  {stakeholder.detractor_management.business_impact}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Last Contact and Trend */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Last Contact: {formatDate(stakeholder.last_contact_date)}</span>
          </div>
          {getTrendIcon()}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onEngagement?.(stakeholder)}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Log Engagement
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onViewDetails?.(stakeholder)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}