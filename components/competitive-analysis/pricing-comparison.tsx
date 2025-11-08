'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { PricingComparison } from '@/lib/competitive-analysis/types';

export interface PricingComparisonProps {
  targetCompanyName: string;
  targetCompanyPrice?: number;
  competitors: Array<{
    id: string;
    name: string;
  }>;
  pricingComparisons: PricingComparison[];
  currency?: string;
  className?: string;
}

/**
 * Bar chart comparing pricing across companies
 */
export function PricingComparisonChart({
  targetCompanyName,
  targetCompanyPrice,
  competitors,
  pricingComparisons,
  currency = 'USD',
  className,
}: PricingComparisonProps) {
  // Prepare chart data
  const chartData = [
    {
      name: targetCompanyName,
      price: targetCompanyPrice || 0,
      positioning: 'target',
      isTarget: true,
    },
    ...competitors.map((competitor) => {
      const pricing = pricingComparisons.find(
        (p) => p.competitor_company_id === competitor.id
      );
      return {
        name: competitor.name,
        price: pricing?.representative_price || 0,
        positioning: pricing?.pricing_positioning || 'parity',
        isTarget: false,
      };
    }),
  ].filter((item) => item.price > 0); // Only show items with prices

  // Color based on positioning
  const getColor = (positioning: string, isTarget: boolean) => {
    if (isTarget) return '#3b82f6'; // Blue for target
    if (positioning === 'premium') return '#ef4444'; // Red for premium
    if (positioning === 'discount') return '#22c55e'; // Green for discount
    return '#a855f7'; // Purple for parity
  };

  // Calculate price deltas
  const getPriceDelta = (price: number, targetPrice: number) => {
    if (!targetPrice || targetPrice === 0) return null;
    const delta = ((price - targetPrice) / targetPrice) * 100;
    return delta;
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Pricing Comparison</CardTitle>
          <CardDescription>No pricing data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Add pricing information to see comparison chart
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Pricing Comparison</CardTitle>
        <CardDescription>
          Representative pricing across {chartData.length} companies
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelStyle={{ color: '#000' }}
            />
            <Bar dataKey="price" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getColor(entry.positioning, entry.isTarget)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            Target Company
          </Badge>
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
            Premium (Above Market)
          </Badge>
          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
            Parity (At Market)
          </Badge>
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            Discount (Below Market)
          </Badge>
        </div>

        {/* Price Delta Table */}
        {targetCompanyPrice && targetCompanyPrice > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold mb-3">Price Difference vs {targetCompanyName}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {chartData
                .filter((item) => !item.isTarget)
                .map((item) => {
                  const delta = getPriceDelta(item.price, targetCompanyPrice);
                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <span className="font-medium text-sm">{item.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{formatCurrency(item.price)}</span>
                        {delta !== null && (
                          <Badge
                            variant={delta > 0 ? 'destructive' : 'default'}
                            className={delta > 0 ? '' : 'bg-green-100 text-green-800'}
                          >
                            {delta > 0 ? '+' : ''}
                            {delta.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
