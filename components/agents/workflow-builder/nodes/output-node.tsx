'use client'

// Output Node - Final workflow output

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { FileOutput } from 'lucide-react'

export function OutputNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white dark:bg-gray-900
        min-w-[180px] shadow-md
        ${selected ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 dark:border-gray-700'}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-red-500"
      />

      <div className="flex items-center gap-2 mb-2">
        <FileOutput className="w-5 h-5 text-red-500" />
        <div className="font-semibold text-sm">{data.label || 'Output'}</div>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400">
        Workflow ends here
      </div>
    </div>
  )
}
