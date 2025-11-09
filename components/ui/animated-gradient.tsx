'use client'

/**
 * Animated Gradient Background Component
 * Provides a smooth, animated gradient background for brand hero sections
 * Respects prefers-reduced-motion for accessibility
 */

import { motion, useReducedMotion } from 'framer-motion'

interface AnimatedGradientProps {
  /**
   * Custom gradient colors (optional)
   * Default: oppSpot brand colors (blues and purples)
   */
  colors?: string[]
  /**
   * Animation duration in seconds
   * Default: 15s for subtle movement
   */
  duration?: number
  /**
   * Disable animation (e.g., for testing or accessibility)
   */
  disableAnimation?: boolean
}

export function AnimatedGradient({
  colors = [
    '#667eea', // Purple (brand)
    '#764ba2', // Deep purple
    '#f093fb', // Light pink
    '#4facfe', // Blue (brand)
    '#667eea', // Loop back to start
  ],
  duration = 15,
  disableAnimation = false,
}: AnimatedGradientProps) {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = !disableAnimation && !prefersReducedMotion

  const gradientString = `linear-gradient(135deg, ${colors.join(', ')})`

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        background: gradientString,
        backgroundSize: '400% 400%',
      }}
      animate={
        shouldAnimate
          ? {
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }
          : {}
      }
      transition={{
        duration,
        ease: 'linear',
        repeat: Infinity,
      }}
    />
  )
}
