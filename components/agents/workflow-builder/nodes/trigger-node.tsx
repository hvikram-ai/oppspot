'use client'

// Trigger Node - Workflow start point

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Zap } from 'lucide-react'

export function TriggerNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white dark:bg-gray-900
        min-w-[180px] shadow-md
        ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300 dark:border-gray-700'}
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-5 h-5 text-blue-500" />
        <div className="font-semibold text-sm">{data.label || 'Trigger'}</div>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400">
        Workflow starts here
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500"
      />
    </div>
  )
}
