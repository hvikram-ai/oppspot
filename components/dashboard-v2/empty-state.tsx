/**
 * Empty State Component
 *
 * Helpful empty states with suggestions
 * - No depressing "You have nothing" messages
 * - Actionable suggestions
 * - Optional illustration
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  Brain,
  FileText,
  Star,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface EmptyStateProps {
  type: 'searches' | 'saved' | 'research' | 'lists' | 'digest' | 'queue' | 'generic';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

const emptyStates: Record<string, {
  icon: React.ReactNode;
  title: string;
  description: string;
  suggestions: string[];
}> = {
  searches: {
    icon: <Search className="h-12 w-12 text-muted-foreground" />,
    title: 'Ready to discover opportunities?',
    description: 'Start your first search to find businesses that match your ideal customer profile.',
    suggestions: [
      'Try searching by industry or location',
      'Use filters to narrow down your results',
      'Save businesses to build your pipeline',
    ],
  },
  saved: {
    icon: <Star className="h-12 w-12 text-muted-foreground" />,
    title: 'Build your prospect list',
    description: 'Save businesses you want to reach out to and organize them into lists.',
    suggestions: [
      'Search for businesses in your target market',
      'Click the star icon to save interesting prospects',
      'Create lists to organize by campaign or segment',
    ],
  },
  research: {
    icon: <Brain className="h-12 w-12 text-muted-foreground" />,
    title: 'Get AI-powered intelligence',
    description: 'Generate deep company research reports in under 30 seconds with ResearchGPT™.',
    suggestions: [
      'Search for a company to get started',
      'Click "Generate Research" on any business',
      'Get buying signals, decision makers, and revenue insights',
    ],
  },
  lists: {
    icon: <FileText className="h-12 w-12 text-muted-foreground" />,
    title: 'Organize your pipeline',
    description: 'Create lists to group businesses by campaign, industry, or any criteria you choose.',
    suggestions: [
      'Click "New List" to get started',
      'Add businesses from your saved items',
      'Share lists with your team',
    ],
  },
  digest: {
    icon: <Sparkles className="h-12 w-12 text-muted-foreground" />,
    title: 'Your AI digest is on the way',
    description: 'We generate personalized insights every morning based on your activity.',
    suggestions: [
      'Search for businesses to start building your profile',
      'Generate research reports to get intelligence',
      'Check back tomorrow for your first digest',
    ],
  },
  queue: {
    icon: <ArrowRight className="h-12 w-12 text-muted-foreground" />,
    title: 'Nothing urgent right now',
    description: 'Your priority queue is empty. We\'ll notify you when there are important actions to take.',
    suggestions: [
      'Explore businesses in your target market',
      'Generate research on prospects',
      'Set up automated workflows',
    ],
  },
  generic: {
    icon: <Sparkles className="h-12 w-12 text-muted-foreground" />,
    title: 'Nothing here yet',
    description: 'Get started to see data appear here.',
    suggestions: [],
  },
};

export function EmptyState({
  type,
  title,
  description,
  action,
  icon
}: EmptyStateProps) {
  const state = emptyStates[type] || emptyStates.generic;

  return (
    <Card className="border-dashed">
      <CardContent className="p-12">
        <div className="flex flex-col items-center text-center space-y-6 max-w-md mx-auto">
          {/* Icon */}
          <div className="p-4 rounded-full bg-muted/50">
            {icon || state.icon}
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">
              {title || state.title}
            </h3>
            <p className="text-muted-foreground">
              {description || state.description}
            </p>
          </div>

          {/* Suggestions */}
          {state.suggestions.length > 0 && (
            <ul className="space-y-2 text-sm text-left w-full">
              {state.suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">→</span>
                  <span className="text-muted-foreground">{suggestion}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Action */}
          {action && (
            <Button onClick={action.onClick} size="lg" className="mt-4">
              {action.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
