'use client'

/**
 * Team Presence Component
 * Shows who's currently viewing a company/entity
 */

import { usePresence } from '@/hooks/use-presence'
import { Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface TeamPresenceProps {
  entityType: 'company' | 'stream' | 'data_room' | 'list'
  entityId: string
  className?: string
}

export function TeamPresence({ entityType, entityId, className = '' }: TeamPresenceProps) {
  const { viewers, isConnected, viewerCount, currentUser } = usePresence({
    entityType,
    entityId
  })

  // Filter out current user from viewers
  const otherViewers = viewers.filter(v => v.user_id !== currentUser?.id)

  if (otherViewers.length === 0) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm ${className}`}
      >
        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 bg-green-500 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.8, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <Users className="w-4 h-4 text-green-600" />
        </div>

        {/* Viewer count and text */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-medium text-green-900">
            {otherViewers.length} teammate{otherViewers.length !== 1 ? 's' : ''} viewing
          </span>

          {!isConnected && (
            <span className="text-xs text-orange-600">(reconnecting...)</span>
          )}
        </div>

        {/* Avatar stack */}
        <div className="flex -space-x-2">
          {otherViewers.slice(0, 5).map((viewer, index) => (
            <motion.div
              key={viewer.user_id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative group"
              title={viewer.user_name}
            >
              {viewer.avatar_url ? (
                <Image
                  src={viewer.avatar_url}
                  alt={viewer.user_name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                />
              ) : (
                <div className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm hover:scale-110 transition-transform">
                  {viewer.user_name.substring(0, 2).toUpperCase()}
                </div>
              )}

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {viewer.user_name}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            </motion.div>
          ))}

          {/* Overflow indicator */}
          {otherViewers.length > 5 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-medium shadow-sm"
            >
              +{otherViewers.length - 5}
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
