'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, X, Download } from 'lucide-react';
import { useState } from 'react';
import type { FeatureMatrixEntry } from '@/lib/competitive-analysis/types';

export interface FeatureMatrixProps {
  targetCompanyName: string;
  competitors: Array<{
    id: string;
    name: string;
  }>;
  featureMatrix: FeatureMatrixEntry[];
  className?: string;
}

/**
 * Side-by-side feature comparison table
 */
export function FeatureMatrix({
  targetCompanyName,
  competitors,
  featureMatrix,
  className,
}: FeatureMatrixProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Extract unique features and categories
  const uniqueFeatures = Array.from(
    new Set(featureMatrix.map((entry) => entry.feature_name))
  );
  const uniqueCategories = Array.from(
    new Set(featureMatrix.map((entry) => entry.feature_category))
  );

  // Filter features by category
  const filteredFeatures =
    selectedCategory === 'all'
      ? uniqueFeatures
      : uniqueFeatures.filter((featureName) => {
          const entry = featureMatrix.find((e) => e.feature_name === featureName);
          return entry?.feature_category === selectedCategory;
        });

  // Check if a company has a feature
  const hasFeature = (featureName: string, companyId: string | 'target'): boolean => {
    if (companyId === 'target') {
      const entry = featureMatrix.find((e) => e.feature_name === featureName);
      return entry?.target_company_has || false;
    }
    const entry = featureMatrix.find(
      (e) => e.feature_name === featureName && e.competitor_company_id === companyId
    );
    return entry?.competitor_has || false;
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Feature', 'Category', targetCompanyName, ...competitors.map((c) => c.name)];
    const rows = filteredFeatures.map((feature) => {
      const entry = featureMatrix.find((e) => e.feature_name === feature);
      return [
        feature,
        entry?.feature_category || '',
        hasFeature(feature, 'target') ? 'Yes' : 'No',
        ...competitors.map((c) => (hasFeature(feature, c.id) ? 'Yes' : 'No')),
      ];
    });

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'feature-matrix.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Feature Matrix</CardTitle>
            <CardDescription>
              Side-by-side comparison of features across {competitors.length + 1} companies
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Category Filter */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory('all')}
          >
            All ({uniqueFeatures.length})
          </Badge>
          {uniqueCategories.map((category) => {
            const count = uniqueFeatures.filter((f) => {
              const entry = featureMatrix.find((e) => e.feature_name === f);
              return entry?.feature_category === category;
            }).length;
            return (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => setSelectedCategory(category)}
              >
                {category} ({count})
              </Badge>
            );
          })}
        </div>

        {/* Feature Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px] font-semibold">Feature</TableHead>
                <TableHead className="text-center font-semibold">
                  {targetCompanyName}
                </TableHead>
                {competitors.map((competitor) => (
                  <TableHead key={competitor.id} className="text-center font-semibold">
                    {competitor.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeatures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={competitors.length + 2} className="text-center py-8">
                    No features found. Add features to start comparing.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFeatures.map((feature, index) => {
                  const entry = featureMatrix.find((e) => e.feature_name === feature);
                  return (
                    <TableRow key={index} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div>
                          <div>{feature}</div>
                          {entry?.feature_category && (
                            <Badge variant="outline" className="mt-1 text-xs capitalize">
                              {entry.feature_category}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {hasFeature(feature, 'target') ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-gray-300 mx-auto" />
                        )}
                      </TableCell>
                      {competitors.map((competitor) => (
                        <TableCell key={competitor.id} className="text-center">
                          {hasFeature(feature, competitor.id) ? (
                            <Check className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-gray-300 mx-auto" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        {filteredFeatures.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{filteredFeatures.length}</div>
              <div className="text-xs text-muted-foreground">Total Features</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {filteredFeatures.filter((f) => hasFeature(f, 'target')).length}
              </div>
              <div className="text-xs text-muted-foreground">{targetCompanyName} Has</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Math.round(
                  (filteredFeatures.filter((f) => hasFeature(f, 'target')).length /
                    filteredFeatures.length) *
                    100
                )}
                %
              </div>
              <div className="text-xs text-muted-foreground">Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{uniqueCategories.length}</div>
              <div className="text-xs text-muted-foreground">Categories</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
