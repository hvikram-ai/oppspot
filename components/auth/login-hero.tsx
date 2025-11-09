'use client'

/**
 * Login Hero Component
 * Left panel of split-screen login page
 * Showcases oppSpot's value proposition with animated brand elements
 */

import { motion } from 'framer-motion'
import { AnimatedGradient } from '@/components/ui/animated-gradient'
import { Check, Sparkles, Zap, Target } from 'lucide-react'

const features = [
  {
    icon: Target,
    text: '50,000+ UK & Ireland businesses tracked',
  },
  {
    icon: Sparkles,
    text: 'AI-powered company intelligence in <30s',
  },
  {
    icon: Zap,
    text: 'Real-time opportunity alerts',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
}

export function LoginHero() {
  return (
    <div className="relative hidden lg:flex flex-col justify-center p-12 xl:p-16 overflow-hidden">
      {/* Animated gradient background */}
      <AnimatedGradient />

      {/* Overlay for better text contrast */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/40 z-[1]" />

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-xl"
      >
        {/* Logo/Brand Mark */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center gap-2 text-white/90">
            <div className="h-10 w-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold">oppSpot</span>
          </div>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight"
        >
          Discover your next business opportunity in{' '}
          <span className="text-yellow-300">under 30 seconds</span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-xl text-white/90 mb-10"
        >
          AI-powered intelligence for UK & Ireland businesses
        </motion.p>

        {/* Features list */}
        <motion.ul variants={containerVariants} className="space-y-4 mb-12">
          {features.map((feature, i) => (
            <motion.li
              key={i}
              variants={itemVariants}
              className="flex items-center gap-3 text-white/90"
            >
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <feature.icon className="h-4 w-4 text-green-300" />
              </div>
              <span className="text-base">{feature.text}</span>
            </motion.li>
          ))}
        </motion.ul>

        {/* Social proof */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-white/20"
                />
              ))}
            </div>
            <p className="text-sm text-white/80 ml-2">
              Trusted by <span className="font-semibold text-white">500+</span>{' '}
              sales professionals
            </p>
          </div>

          {/* Testimonial (optional - can be rotated) */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 mt-6">
            <p className="text-sm text-white/90 italic mb-2">
              "oppSpot helped us find 50 qualified leads in our first week. The
              AI research feature is a game-changer."
            </p>
            <p className="text-xs text-white/70">
              — Sarah J., Sales Director at TechCorp
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent z-[1]" />
    </div>
  )
}
