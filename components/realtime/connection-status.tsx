'use client'

/**
 * Connection Status Indicator
 *
 * Shows real-time WebSocket connection status with visual feedback
 */

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import type { SubscriptionStatus } from '@/lib/realtime/realtime-service'

interface ConnectionStatusProps {
  status: SubscriptionStatus
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ConnectionStatus({
  status,
  showText = true,
  size = 'md',
  className = ''
}: ConnectionStatusProps) {
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (status === 'connecting') {
      const interval = setInterval(() => {
        setPulse((prev) => !prev)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [status])

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          text: 'Live',
          description: 'Connected to real-time updates'
        }
      case 'connecting':
        return {
          icon: Loader2,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          text: 'Connecting...',
          description: 'Establishing connection',
          animate: true
        }
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-gray-400',
          bgColor: 'bg-gray-400/10',
          text: 'Offline',
          description: 'Not connected to real-time updates'
        }
      case 'error':
        return {
          icon: WifiOff,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          text: 'Error',
          description: 'Connection error occurred'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${config.bgColor} ${className}`}
      title={config.description}
    >
      <Icon
        className={`${sizeClasses[size]} ${config.color} ${
          config.animate ? 'animate-spin' : ''
        } ${pulse && status === 'connecting' ? 'opacity-50' : 'opacity-100'}`}
      />
      {showText && (
        <span className={`${textSizeClasses[size]} ${config.color} font-medium`}>
          {config.text}
        </span>
      )}
    </div>
  )
}

/**
 * Multiple Connection Status Indicator
 * Shows status for multiple subscriptions
 */
interface MultiConnectionStatusProps {
  subscriptions: Array<{
    name: string
    status: SubscriptionStatus
  }>
  className?: string
}

export function MultiConnectionStatus({
  subscriptions,
  className = ''
}: MultiConnectionStatusProps) {
  const allConnected = subscriptions.every((sub) => sub.status === 'connected')
  const anyError = subscriptions.some((sub) => sub.status === 'error')
  const anyConnecting = subscriptions.some((sub) => sub.status === 'connecting')

  const overallStatus: SubscriptionStatus = anyError
    ? 'error'
    : anyConnecting
    ? 'connecting'
    : allConnected
    ? 'connected'
    : 'disconnected'

  return (
    <div className={`space-y-2 ${className}`}>
      <ConnectionStatus status={overallStatus} />

      <div className="space-y-1 text-xs text-muted-foreground">
        {subscriptions.map((sub) => (
          <div key={sub.name} className="flex items-center justify-between">
            <span>{sub.name}</span>
            <ConnectionStatus status={sub.status} showText={false} size="sm" />
          </div>
        ))}
      </div>
    </div>
  )
}
