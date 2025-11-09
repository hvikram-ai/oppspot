'use client'

/**
 * Login Hero Component
 * Left panel of split-screen login page
 * Showcases oppSpot's value proposition with animated brand elements
 * Features auto-rotating testimonials with interactive controls
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

const testimonials = [
  {
    text: 'oppSpot helped us find 50 qualified leads in our first week. The AI research feature is a game-changer.',
    author: 'Sarah J., Sales Director at TechCorp',
    role: 'Sales',
  },
  {
    text: 'ResearchGPT saved us 20 hours per week on prospect research. ROI paid for itself in the first month.',
    author: 'Michael R., Head of BD at ScaleUp Inc.',
    role: 'Business Development',
  },
  {
    text: 'The geographic filtering and map view helped us identify 100+ local opportunities we were missing.',
    author: 'Emma L., Regional Manager at GrowthCo',
    role: 'Regional Sales',
  },
  {
    text: 'Real-time alerts mean we never miss an opportunity. Increased our close rate by 15%.',
    author: 'James K., Sales Operations at DataFlow',
    role: 'Sales Ops',
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
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Auto-rotate testimonials every 8 seconds
  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 8000)

    return () => clearInterval(interval)
  }, [isPaused])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only if not typing in form inputs
      const activeElement = document.activeElement
      if (
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'BUTTON' ||
        activeElement?.tagName === 'TEXTAREA'
      )
        return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          setCurrentTestimonial((prev) =>
            prev === 0 ? testimonials.length - 1 : prev - 1
          )
          setIsPaused(true)
          setTimeout(() => setIsPaused(false), 10000)
          break
        case 'ArrowRight':
          e.preventDefault()
          setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
          setIsPaused(true)
          setTimeout(() => setIsPaused(false), 10000)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
              <motion.div
                className="flex-shrink-0 h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.5, // Stagger each icon
                }}
              >
                <feature.icon className="h-4 w-4 text-green-300" />
              </motion.div>
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

          {/* Rotating Testimonials */}
          <div
            className="mt-6"
            role="region"
            aria-label="Customer testimonials"
            aria-live="polite"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                <p className="text-sm text-white/90 italic mb-2">
                  "{testimonials[currentTestimonial].text}"
                </p>
                <p className="text-xs text-white/70">
                  — {testimonials[currentTestimonial].author}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Progress indicators */}
            <div className="flex gap-2 justify-center mt-4" role="tablist">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentTestimonial(i)
                    setIsPaused(true)
                    setTimeout(() => setIsPaused(false), 10000)
                  }}
                  onMouseEnter={() => setIsPaused(true)}
                  onMouseLeave={() => setIsPaused(false)}
                  className="group relative"
                  aria-label={`View testimonial ${i + 1} of ${
                    testimonials.length
                  }`}
                  aria-selected={i === currentTestimonial}
                  role="tab"
                >
                  {/* Background track */}
                  <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden">
                    {/* Animated progress fill */}
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{
                        width: i === currentTestimonial ? '100%' : '0%',
                        transitionDuration:
                          i === currentTestimonial && !isPaused
                            ? '8000ms'
                            : '300ms',
                        transitionTimingFunction: 'linear',
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>

            {/* Navigation hint */}
            <p className="text-xs text-white/50 text-center mt-2">
              Press ← → to navigate
            </p>

            {/* Screen reader announcement */}
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              Testimonial {currentTestimonial + 1} of {testimonials.length}.{' '}
              {testimonials[currentTestimonial].author}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent z-[1]" />
    </div>
  )
}
