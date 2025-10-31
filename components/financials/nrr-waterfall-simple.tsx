/**
 * NRR Waterfall Chart - Simple CSS Version
 *
 * Displays Net Revenue Retention breakdown as a waterfall chart
 * using pure CSS instead of recharts for better compatibility.
 */

'use client'

import React from 'react'

export interface NRRWaterfallData {
  start_mrr: number
  expansion_mrr: number
  contraction_mrr: number
  churn_mrr: number
  end_mrr: number
  nrr_percentage: number
}

export interface NRRWaterfallProps {
  data: NRRWaterfallData
  currency?: string
  className?: string
}

export function NRRWaterfall({ data, currency = 'GBP', className = '' }: NRRWaterfallProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const maxValue = Math.max(
    data.start_mrr,
    data.start_mrr + data.expansion_mrr,
    data.end_mrr
  )

  const getHeight = (value: number) => {
    return Math.max((Math.abs(value) / maxValue) * 100, 5) // Min 5% for visibility
  }

  const getColor = (type: 'start' | 'expansion' | 'contraction' | 'churn' | 'end') => {
    switch (type) {
      case 'start':
        return 'bg-gray-400'
      case 'expansion':
        return 'bg-green-500'
      case 'contraction':
        return 'bg-orange-500'
      case 'churn':
        return 'bg-red-500'
      case 'end':
        return data.nrr_percentage >= 100 ? 'bg-green-600' : 'bg-red-600'
    }
  }

  const bars = [
    { label: 'Start MRR', value: data.start_mrr, type: 'start' as const },
    { label: 'Expansion', value: data.expansion_mrr, type: 'expansion' as const },
    { label: 'Contraction', value: -data.contraction_mrr, type: 'contraction' as const },
    { label: 'Churn', value: -data.churn_mrr, type: 'churn' as const },
    { label: 'End MRR', value: data.end_mrr, type: 'end' as const },
  ]

  return (
    <div className={`rounded-lg border bg-card p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Net Revenue Retention Waterfall</h3>
        <p className="text-sm text-muted-foreground">
          NRR: <span className={`font-bold ${data.nrr_percentage >= 100 ? 'text-green-600' : 'text-red-600'}`}>
            {data.nrr_percentage.toFixed(1)}%
          </span>
        </p>
      </div>

      {/* Waterfall Chart */}
      <div className="flex items-end justify-around gap-4 h-64">
        {bars.map((bar, index) => (
          <div key={index} className="flex flex-col items-center flex-1 max-w-24">
            {/* Value Label */}
            <div className="text-xs font-medium mb-2 text-center min-h-8">
              {formatCurrency(Math.abs(bar.value))}
            </div>

            {/* Bar Container */}
            <div className="relative w-full flex-1 flex flex-col justify-end">
              {/* Bar */}
              <div
                className={`w-full ${getColor(bar.type)} rounded-t transition-all duration-300`}
                style={{ height: `${getHeight(bar.value)}%` }}
              >
                {/* Connector line to next bar (except last) */}
                {index < bars.length - 1 && (
                  <div className="absolute top-0 left-full w-4 h-0.5 bg-gray-300 hidden md:block" />
                )}
              </div>
            </div>

            {/* Label */}
            <div className="text-xs text-center mt-2 font-medium">
              {bar.label}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded"></div>
          <span>Starting MRR</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Expansion (Upsells)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span>Contraction (Downgrades)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Churn (Lost)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-600 rounded"></div>
          <span>Ending MRR</span>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <div className="text-muted-foreground">Gross Adds</div>
          <div className="font-semibold text-green-600">{formatCurrency(data.expansion_mrr)}</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">Gross Losses</div>
          <div className="font-semibold text-red-600">
            {formatCurrency(data.contraction_mrr + data.churn_mrr)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">Net Change</div>
          <div className={`font-semibold ${data.end_mrr >= data.start_mrr ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(data.end_mrr - data.start_mrr)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">Growth Rate</div>
          <div className={`font-semibold ${data.nrr_percentage >= 100 ? 'text-green-600' : 'text-red-600'}`}>
            {((data.nrr_percentage - 100)).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  )
}
