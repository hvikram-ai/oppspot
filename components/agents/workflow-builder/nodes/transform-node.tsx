'use client'

// Transform Node - Data transformation

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Wand2 } from 'lucide-react'

export function TransformNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white dark:bg-gray-900
        min-w-[180px] shadow-md
        ${selected ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-300 dark:border-gray-700'}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-green-500"
      />

      <div className="flex items-center gap-2 mb-2">
        <Wand2 className="w-5 h-5 text-green-500" />
        <div className="font-semibold text-sm">{data.label || 'Transform'}</div>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400">
        {data.transformType || 'Not configured'}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-500"
      />
    </div>
  )
}
