'use client'

/**
 * Presence Indicator Component
 * Compact status indicator showing real-time connection
 */

import { motion } from 'framer-motion'
import { Wifi, WifiOff } from 'lucide-react'

interface PresenceIndicatorProps {
  isConnected: boolean
  className?: string
}

export function PresenceIndicator({ isConnected, className = '' }: PresenceIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isConnected ? (
        <>
          <motion.div
            className="w-2 h-2 bg-green-500 rounded-full"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [1, 0.7, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <span className="text-xs font-medium text-green-600 flex items-center gap-1">
            <Wifi className="w-3 h-3" />
            Live
          </span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-gray-400 rounded-full" />
          <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
            <WifiOff className="w-3 h-3" />
            Offline
          </span>
        </>
      )}
    </div>
  )
}

/**
 * Badge variant - More compact for cards
 */
export function PresenceBadge({ isConnected }: { isConnected: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
      isConnected
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-600'
    }`}>
      <motion.div
        className={`w-1.5 h-1.5 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-gray-400'
        }`}
        animate={isConnected ? {
          scale: [1, 1.3, 1],
          opacity: [1, 0.7, 1]
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      {isConnected ? 'Live' : 'Offline'}
    </div>
  )
}
