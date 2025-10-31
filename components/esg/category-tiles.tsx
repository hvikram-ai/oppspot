'use client';

import React from 'react';
import { Leaf, Users, Building2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ESGCategory, ESGLevel, ESGCategoryScore } from '@/types/esg';
import { cn } from '@/lib/utils';

interface CategoryTilesProps {
  scores: {
    environmental: ESGCategoryScore;
    social: ESGCategoryScore;
    governance: ESGCategoryScore;
  };
  onCategoryClick?: (category: ESGCategory) => void;
}

const categoryConfig = {
  environmental: {
    icon: Leaf,
    title: 'Environmental',
    description: 'Climate, energy, water, waste management',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  social: {
    icon: Users,
    title: 'Social',
    description: 'Workforce, diversity, health & safety',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  governance: {
    icon: Building2,
    title: 'Governance',
    description: 'Board composition, ethics, ESG oversight',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
};

const levelConfig: Record<ESGLevel, { label: string; color: string; icon: any }> = {
  leading: {
    label: 'Leading',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    icon: TrendingUp,
  },
  par: {
    label: 'On Par',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    icon: Minus,
  },
  lagging: {
    label: 'Lagging',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    icon: TrendingDown,
  },
};

export default function CategoryTiles({ scores, onCategoryClick }: CategoryTilesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {(Object.entries(categoryConfig) as [ESGCategory, typeof categoryConfig.environmental][]).map(
        ([category, config]) => {
          const score = scores[category];
          const levelInfo = levelConfig[score.level];
          const Icon = config.icon;
          const LevelIcon = levelInfo.icon;

          return (
            <Card
              key={category}
              className={cn(
                'cursor-pointer transition-all hover:shadow-lg border-2',
                config.borderColor
              )}
              onClick={() => onCategoryClick?.(category)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={cn('p-3 rounded-lg', config.bgColor)}>
                    <Icon className={cn('h-6 w-6', config.color)} />
                  </div>
                  <Badge className={levelInfo.color}>
                    <LevelIcon className="h-3 w-3 mr-1" />
                    {levelInfo.label}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{config.title}</CardTitle>
                <CardDescription className="text-sm">{config.description}</CardDescription>
              </CardHeader>

              <CardContent>
                {/* Overall Score */}
                <div className="mb-4">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Overall Score
                    </span>
                    <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {score.score.toFixed(0)}
                      <span className="text-lg text-gray-500">/100</span>
                    </span>
                  </div>
                  <Progress value={score.score} className="h-2" />
                </div>

                {/* Benchmark Position */}
                {score.benchmark_position !== undefined && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        vs. Industry Peers
                      </span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {score.benchmark_position}th percentile
                      </span>
                    </div>
                    <Progress value={score.benchmark_position} className="h-1" />
                  </div>
                )}

                {/* Subcategories */}
                {score.subcategories && Object.keys(score.subcategories).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Subcategories
                    </p>
                    {Object.entries(score.subcategories)
                      .slice(0, 3)
                      .map(([name, subScore]) => (
                        <div
                          key={name}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">
                            {name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {subScore.score.toFixed(0)}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs',
                                levelConfig[subScore.level].color
                              )}
                            >
                              {levelConfig[subScore.level].label}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    {Object.keys(score.subcategories).length > 3 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                        +{Object.keys(score.subcategories).length - 3} more
                      </p>
                    )}
                  </div>
                )}

                {/* Data Completeness Indicator */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Data Coverage</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {Object.values(score.subcategories || {}).reduce(
                        (acc, sub) => acc + (sub.data_completeness || 0),
                        0
                      ) /
                        Math.max(Object.keys(score.subcategories || {}).length, 1) *
                        100}
                      %
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }
      )}
    </div>
  );
}
