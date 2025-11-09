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
import {
  Sparkles,
  Zap,
  Target,
  MapPin,
  Globe,
  Radar,
  Bell,
  Clock,
  Filter,
  Rocket,
  TrendingUp,
  BarChart3,
} from 'lucide-react'

interface ValueProposition {
  id: number
  theme: string
  accentColor: string
  headline: string
  headlineEmphasis: string
  subheadline: string
  features: Array<{
    icon: React.ComponentType<{ className?: string }>
    text: string
  }>
  testimonial: {
    text: string
    author: string
  }
}

const valuePropositions: ValueProposition[] = [
  {
    id: 1,
    theme: 'speed',
    accentColor: 'text-yellow-300',
    headline: 'Discover your next business opportunity in',
    headlineEmphasis: 'under 30 seconds',
    subheadline: 'AI-powered intelligence for UK & Ireland businesses',
    features: [
      {
        icon: Zap,
        text: 'ResearchGPT™ generates reports in <30 seconds',
      },
      {
        icon: Target,
        text: '50,000+ UK & Ireland businesses tracked',
      },
      {
        icon: Sparkles,
        text: 'AI-powered company intelligence',
      },
    ],
    testimonial: {
      text: 'oppSpot helped us find 50 qualified leads in our first week. The AI research feature is a game-changer.',
      author: 'Sarah J., Sales Director at TechCorp',
    },
  },
  {
    id: 2,
    theme: 'geographic',
    accentColor: 'text-blue-400',
    headline: 'Every business opportunity in',
    headlineEmphasis: 'UK & Ireland, mapped',
    subheadline: 'Geographic intelligence for targeted prospecting',
    features: [
      {
        icon: MapPin,
        text: 'Interactive map with 50,000+ businesses',
      },
      {
        icon: Globe,
        text: 'Complete UK & Ireland coverage',
      },
      {
        icon: Radar,
        text: 'Location-based filtering and search',
      },
    ],
    testimonial: {
      text: 'The geographic filtering and map view helped us identify 100+ local opportunities we were missing.',
      author: 'Emma L., Regional Manager at GrowthCo',
    },
  },
  {
    id: 3,
    theme: 'alerts',
    accentColor: 'text-green-400',
    headline: 'Stay ahead with',
    headlineEmphasis: 'real-time opportunity alerts',
    subheadline: 'Automated intelligence delivered to your inbox',
    features: [
      {
        icon: Bell,
        text: 'Real-time notifications for new opportunities',
      },
      {
        icon: Clock,
        text: 'Automated daily/weekly digest emails',
      },
      {
        icon: Filter,
        text: 'Custom alert rules based on your criteria',
      },
    ],
    testimonial: {
      text: 'Real-time alerts mean we never miss an opportunity. Increased our close rate by 15%.',
      author: 'James K., Sales Operations at DataFlow',
    },
  },
  {
    id: 4,
    theme: 'efficiency',
    accentColor: 'text-purple-400',
    headline: 'Save',
    headlineEmphasis: '20+ hours per week',
    subheadline: 'on prospect research - Let AI do the heavy lifting',
    features: [
      {
        icon: BarChart3,
        text: 'Automated company research (no manual work)',
      },
      {
        icon: TrendingUp,
        text: 'Instant competitive analysis reports',
      },
      {
        icon: Rocket,
        text: '10x faster than traditional methods',
      },
    ],
    testimonial: {
      text: 'ResearchGPT saved us 20 hours per week on prospect research. ROI paid for itself in the first month.',
      author: 'Michael R., Head of BD at ScaleUp Inc.',
    },
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
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const currentProp = valuePropositions[currentSlide]

  // Auto-rotate slides every 10 seconds
  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % valuePropositions.length)
    }, 10000)

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
          setCurrentSlide((prev) =>
            prev === 0 ? valuePropositions.length - 1 : prev - 1
          )
          setIsPaused(true)
          setTimeout(() => setIsPaused(false), 15000)
          break
        case 'ArrowRight':
          e.preventDefault()
          setCurrentSlide((prev) => (prev + 1) % valuePropositions.length)
          setIsPaused(true)
          setTimeout(() => setIsPaused(false), 15000)
          break
        case 'Home':
          e.preventDefault()
          setCurrentSlide(0)
          setIsPaused(true)
          setTimeout(() => setIsPaused(false), 15000)
          break
        case 'End':
          e.preventDefault()
          setCurrentSlide(valuePropositions.length - 1)
          setIsPaused(true)
          setTimeout(() => setIsPaused(false), 15000)
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

        {/* Dynamic Content - Slides change */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          >
            {/* Main Headline */}
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
              {currentProp.headline}{' '}
              <span className={currentProp.accentColor}>
                {currentProp.headlineEmphasis}
              </span>
            </h1>

            <p className="text-xl text-white/90 mb-10">
              {currentProp.subheadline}
            </p>

            {/* Features list */}
            <ul className="space-y-4 mb-12">
              {currentProp.features.map((feature, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
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
                      delay: i * 0.5,
                    }}
                  >
                    <feature.icon className="h-4 w-4 text-green-300" />
                  </motion.div>
                  <span className="text-base">{feature.text}</span>
                </motion.li>
              ))}
            </ul>

            {/* Social proof */}
            <div className="space-y-4">
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
                  Trusted by{' '}
                  <span className="font-semibold text-white">500+</span> sales
                  professionals
                </p>
              </div>

              {/* Testimonial */}
              <div
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 mt-6"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                <p className="text-sm text-white/90 italic mb-2">
                  "{currentProp.testimonial.text}"
                </p>
                <p className="text-xs text-white/70">
                  — {currentProp.testimonial.author}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress indicators */}
        <div
          className="flex gap-2 justify-center mt-6"
          role="tablist"
          aria-label="Value proposition carousel"
        >
          {valuePropositions.map((prop, i) => (
            <button
              key={prop.id}
              onClick={() => {
                setCurrentSlide(i)
                setIsPaused(true)
                setTimeout(() => setIsPaused(false), 15000)
              }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              className="group relative"
              aria-label={`View ${prop.theme} value proposition (${i + 1} of ${
                valuePropositions.length
              })`}
              aria-selected={i === currentSlide}
              role="tab"
            >
              {/* Background track */}
              <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden">
                {/* Animated progress fill */}
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{
                    width: i === currentSlide ? '100%' : '0%',
                    transitionDuration:
                      i === currentSlide && !isPaused ? '10000ms' : '300ms',
                    transitionTimingFunction: 'linear',
                  }}
                />
              </div>
            </button>
          ))}
        </div>

        {/* Navigation hint */}
        <p className="text-xs text-white/50 text-center mt-2">
          Press ← → to navigate • Home/End for first/last
        </p>

        {/* Screen reader announcement */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          Value proposition {currentSlide + 1} of {valuePropositions.length}:{' '}
          {currentProp.theme}. {currentProp.headline}{' '}
          {currentProp.headlineEmphasis}
        </div>
      </motion.div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent z-[1]" />
    </div>
  )
}
