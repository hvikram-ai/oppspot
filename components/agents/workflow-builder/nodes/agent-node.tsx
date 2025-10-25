'use client'

// Agent Node - Custom node for executing AI agents

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Bot } from 'lucide-react'

export function AgentNode({ data, selected }: NodeProps) {
  const agentType = data.agentType || 'Not configured'

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white dark:bg-gray-900
        min-w-[200px] shadow-md
        ${selected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-300 dark:border-gray-700'}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-purple-500"
      />

      <div className="flex items-center gap-2 mb-2">
        <Bot className="w-5 h-5 text-purple-500" />
        <div className="font-semibold text-sm">{data.label || 'Agent'}</div>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400">
        Type: <span className="font-medium">{agentType}</span>
      </div>

      {data.description && (
        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
          {data.description}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-purple-500"
      />
    </div>
  )
}
