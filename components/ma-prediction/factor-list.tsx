/**
 * Factor List Component
 *
 * Displays top 5 contributing factors for M&A prediction
 *
 * Props:
 * - factors: MAPredictionFactor[]
 *
 * Part of T041 implementation
 */

'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MAPredictionFactor } from '@/lib/types/ma-prediction';

interface FactorListProps {
  factors: MAPredictionFactor[];
}

export default function FactorList({ factors }: FactorListProps) {
  if (!factors || factors.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No factors available
      </div>
    );
  }

  // Get factor type badge color
  const getFactorTypeColor = (type: string): string => {
    switch (type) {
      case 'financial':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'operational':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'market':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'historical':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Get impact direction icon
  const getImpactIcon = (direction: string) => {
    switch (direction) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Top Contributing Factors</h3>

      <Accordion type="single" collapsible className="w-full">
        {factors.map((factor) => (
          <AccordionItem key={`${factor.rank}-${factor.factor_name}`} value={`factor-${factor.rank}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 w-full pr-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {factor.rank}
                </span>

                <Badge variant="secondary" className={getFactorTypeColor(factor.factor_type)}>
                  {factor.factor_type}
                </Badge>

                <span className="flex-1 text-left font-medium truncate">
                  {factor.factor_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>

                <div className="flex items-center gap-2">
                  {getImpactIcon(factor.impact_direction || 'neutral')}
                  <span className="text-sm font-semibold">
                    {Math.round(factor.impact_weight)}%
                  </span>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent>
              <div className="pt-2 pl-12 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {factor.factor_description}
                </p>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Impact Weight</span>
                    <span>{factor.impact_weight.toFixed(1)}%</span>
                  </div>
                  <Progress value={factor.impact_weight} className="h-2" />
                </div>

                {factor.supporting_value && Object.keys(factor.supporting_value).length > 0 && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs font-semibold mb-2">Supporting Data</p>
                    <dl className="space-y-1">
                      {Object.entries(factor.supporting_value).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <dt className="text-muted-foreground">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                          </dt>
                          <dd className="font-mono">
                            {typeof value === 'number' ? value.toLocaleString() : String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
