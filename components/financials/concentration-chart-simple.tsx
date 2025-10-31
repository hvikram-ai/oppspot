/**
 * Revenue Concentration Chart - Simple CSS Version
 *
 * Displays revenue concentration metrics with visual bar chart
 * using pure CSS instead of recharts for better compatibility.
 */

'use client'

import React from 'react'

export interface TopCustomer {
  customer_id: string
  customer_name: string
  revenue: number
  percentage: number
}

export interface ConcentrationData {
  total_revenue: number
  top_1_pct: number
  top_3_pct: number
  top_5_pct: number
  top_10_pct: number
  hhi_index: number
  top_customers: TopCustomer[]
}

export interface ConcentrationChartProps {
  data: ConcentrationData
  currency?: string
  className?: string
}

export function ConcentrationChart({ data, currency = 'GBP', className = '' }: ConcentrationChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getRiskLevel = (hhi: number) => {
    if (hhi < 1000) return { label: 'Low Risk', color: 'text-green-600', bg: 'bg-green-100' }
    if (hhi < 1800) return { label: 'Moderate Risk', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { label: 'High Risk', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const risk = getRiskLevel(data.hhi_index)

  const concentrationMetrics = [
    { label: 'Top 1 Customer', percentage: data.top_1_pct, threshold: 20 },
    { label: 'Top 3 Customers', percentage: data.top_3_pct, threshold: 40 },
    { label: 'Top 5 Customers', percentage: data.top_5_pct, threshold: 60 },
    { label: 'Top 10 Customers', percentage: data.top_10_pct, threshold: 80 },
  ]

  return (
    <div className={`rounded-lg border bg-card p-6 ${className}`}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">Revenue Concentration</h3>
          <p className="text-sm text-muted-foreground">
            Total Revenue: {formatCurrency(data.total_revenue)}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${risk.bg} ${risk.color}`}>
          HHI: {data.hhi_index.toFixed(0)} - {risk.label}
        </div>
      </div>

      {/* Concentration Bars */}
      <div className="space-y-4 mb-6">
        {concentrationMetrics.map((metric, index) => {
          const isRisky = metric.percentage > metric.threshold
          return (
            <div key={index}>
              <div className="flex items-center justify-between mb-1 text-sm">
                <span className="font-medium">{metric.label}</span>
                <span className={`font-semibold ${isRisky ? 'text-red-600' : 'text-gray-700'}`}>
                  {metric.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                {/* Threshold line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 z-10"
                  style={{ left: `${metric.threshold}%` }}
                  title={`Risk threshold: ${metric.threshold}%`}
                />
                {/* Progress bar */}
                <div
                  className={`h-full transition-all duration-500 flex items-center justify-end pr-2 text-xs font-medium text-white ${
                    isRisky ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                >
                  {metric.percentage > 10 && `${metric.percentage.toFixed(1)}%`}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Top Customers Table */}
      {data.top_customers && data.top_customers.length > 0 && (
        <>
          <div className="mb-3">
            <h4 className="text-sm font-semibold">Top Revenue Contributors</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-2 font-medium">Rank</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium text-right">Revenue</th>
                  <th className="pb-2 font-medium text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.top_customers.slice(0, 10).map((customer, index) => (
                  <tr key={customer.customer_id} className="hover:bg-muted/50">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-50 text-blue-700'
                        }`}>
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 font-medium">{customer.customer_name || customer.customer_id}</td>
                    <td className="py-2 text-right font-mono">{formatCurrency(customer.revenue)}</td>
                    <td className="py-2 text-right">
                      <span className={`font-semibold ${
                        customer.percentage > 20 ? 'text-red-600' :
                        customer.percentage > 10 ? 'text-yellow-600' :
                        'text-gray-700'
                      }`}>
                        {customer.percentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* HHI Explanation */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg text-xs text-muted-foreground">
        <p className="font-medium mb-1">HHI (Herfindahl-Hirschman Index)</p>
        <p>
          Measures market concentration. Lower is better:
          <span className="ml-2 text-green-600 font-medium">&lt;1000 = Low Risk</span>
          <span className="ml-2 text-yellow-600 font-medium">1000-1800 = Moderate</span>
          <span className="ml-2 text-red-600 font-medium">&gt;1800 = High Risk</span>
        </p>
      </div>
    </div>
  )
}
