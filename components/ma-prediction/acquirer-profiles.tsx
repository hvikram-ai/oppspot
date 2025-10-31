/**
 * Acquirer Profiles Table Component
 *
 * Displays potential acquirer profiles
 * Part of T043 implementation
 */

'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { MAAcquirerProfile } from '@/lib/types/ma-prediction';

interface AcquirerProfilesProps {
  acquirerProfiles: MAAcquirerProfile[];
}

export default function AcquirerProfiles({ acquirerProfiles }: AcquirerProfilesProps) {
  if (!acquirerProfiles || acquirerProfiles.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Acquirer profiles available for High/Very High likelihood predictions only
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Potential Acquirer Profiles</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Industry Match</TableHead>
              <TableHead>Size Ratio</TableHead>
              <TableHead>Geography</TableHead>
              <TableHead>Strategic Rationale</TableHead>
              <TableHead className="w-20">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {acquirerProfiles.map((profile) => (
              <TableRow key={profile.rank}>
                <TableCell className="font-bold">{profile.rank}</TableCell>
                <TableCell className="max-w-xs truncate">{profile.industry_match}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{profile.size_ratio_description}</TableCell>
                <TableCell className="text-sm">{profile.geographic_proximity}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {profile.strategic_rationale.replace(/_/g, ' ')}
                  </Badge>
                  {profile.strategic_rationale_description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {profile.strategic_rationale_description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <span className="font-semibold">{profile.match_score}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
