'use client'

// Condition Node - Conditional branching

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch } from 'lucide-react'

export function ConditionNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white dark:bg-gray-900
        min-w-[180px] shadow-md
        ${selected ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-gray-300 dark:border-gray-700'}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-yellow-500"
      />

      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="w-5 h-5 text-yellow-500" />
        <div className="font-semibold text-sm">{data.label || 'Condition'}</div>
      </div>

      {data.condition ? (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {data.condition.field} {data.condition.operator} {String(data.condition.value)}
        </div>
      ) : (
        <div className="text-xs text-gray-500 italic">Not configured</div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="w-3 h-3 !bg-green-500 !-left-2"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="w-3 h-3 !bg-red-500 !-right-2"
      />
    </div>
  )
}
