'use client'

// Node Palette - Draggable node types for workflow builder

import React from 'react'
import {
  Zap,
  Bot,
  GitBranch,
  Wand2,
  Clock,
  FileOutput,
  Layers,
  Merge,
} from 'lucide-react'

const nodeTypes = [
  {
    type: 'trigger',
    label: 'Trigger',
    description: 'Start point for workflow',
    icon: Zap,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    type: 'agent',
    label: 'Agent',
    description: 'Execute an AI agent',
    icon: Bot,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'Branch based on condition',
    icon: GitBranch,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  {
    type: 'transform',
    label: 'Transform',
    description: 'Transform data',
    icon: Wand2,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
  },
  {
    type: 'delay',
    label: 'Delay',
    description: 'Wait for time period',
    icon: Clock,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
  },
  {
    type: 'parallel',
    label: 'Parallel',
    description: 'Execute branches in parallel',
    icon: Layers,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
  },
  {
    type: 'merge',
    label: 'Merge',
    description: 'Merge parallel branches',
    icon: Merge,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
  },
  {
    type: 'output',
    label: 'Output',
    description: 'Final workflow output',
    icon: FileOutput,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
  },
]

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm mb-2">Node Types</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Drag nodes onto the canvas to build your workflow
        </p>
      </div>

      <div className="space-y-2">
        {nodeTypes.map((nodeType) => {
          const Icon = nodeType.icon
          return (
            <div
              key={nodeType.type}
              draggable
              onDragStart={(e) => onDragStart(e, nodeType.type)}
              className={`
                ${nodeType.bgColor}
                border border-gray-200 dark:border-gray-700
                rounded-lg p-3 cursor-move
                hover:shadow-md transition-shadow
                select-none
              `}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${nodeType.color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{nodeType.label}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {nodeType.description}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-xs mb-2 text-gray-700 dark:text-gray-300">
          Quick Tips
        </h4>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Drag nodes to the canvas</li>
          <li>• Connect nodes by dragging from handles</li>
          <li>• Click a node to configure it</li>
          <li>• Use validation to check for errors</li>
        </ul>
      </div>
    </div>
  )
}
