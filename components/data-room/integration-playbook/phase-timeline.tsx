'use client';

/**
 * Phase Timeline Component
 * Visual timeline showing integration phases (Day 1-30, 31-60, 61-100, 100+)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Target } from 'lucide-react';
import type { IntegrationPhase } from '@/lib/data-room/types';

interface PhaseTimelineProps {
  phases: IntegrationPhase[];
}

export function PhaseTimeline({ phases }: PhaseTimelineProps) {
  // Sort phases by order
  const sortedPhases = [...phases].sort((a, b) => a.phase_order - b.phase_order);

  const getPhaseColor = (index: number) => {
    const colors = [
      'bg-blue-100 border-blue-300',
      'bg-green-100 border-green-300',
      'bg-yellow-100 border-yellow-300',
      'bg-purple-100 border-purple-300',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Integration Timeline</h2>
        <Badge variant="outline">4 Phases</Badge>
      </div>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Phases */}
        <div className="space-y-8">
          {sortedPhases.map((phase, index) => {
            const isFirst = index === 0;
            const isLast = index === sortedPhases.length - 1;

            return (
              <div key={phase.id} className="relative">
                {/* Timeline Dot */}
                <div className="absolute left-8 top-6 -translate-x-1/2 z-10">
                  <div className="w-4 h-4 rounded-full bg-blue-600 border-4 border-white" />
                </div>

                {/* Phase Card */}
                <Card className={`ml-16 border-l-4 ${getPhaseColor(index)}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{phase.phase_name}</CardTitle>
                        <CardDescription className="mt-1">
                          {phase.duration_days
                            ? `${phase.duration_days} days`
                            : phase.phase_type === 'post_100'
                            ? 'Ongoing'
                            : 'TBD'}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">{phase.phase_type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {phase.phase_description && (
                      <p className="text-sm text-gray-700">{phase.phase_description}</p>
                    )}

                    {/* Objectives */}
                    {phase.objectives && phase.objectives.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center">
                          <Target className="h-4 w-4 mr-1.5 text-blue-600" />
                          Key Objectives
                        </h4>
                        <ul className="space-y-1">
                          {phase.objectives.map((objective, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start">
                              <Circle className="h-3 w-3 mr-2 mt-1 flex-shrink-0 text-gray-400" />
                              {objective}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Success Criteria */}
                    {phase.success_criteria && phase.success_criteria.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center">
                          <CheckCircle2 className="h-4 w-4 mr-1.5 text-green-600" />
                          Success Criteria
                        </h4>
                        <ul className="space-y-1">
                          {phase.success_criteria.map((criterion, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start">
                              <CheckCircle2 className="h-3 w-3 mr-2 mt-1 flex-shrink-0 text-green-500" />
                              {criterion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
