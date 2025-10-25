'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Sparkles, ArrowRight, Info } from 'lucide-react'
import { useDemoMode } from '@/lib/demo/demo-context'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export function DemoBanner() {
  const { isDemoMode, disableDemoMode } = useDemoMode()
  const [isMinimized, setIsMinimized] = useState(false)
  const router = useRouter()

  if (!isDemoMode) return null

  const handleSignUp = () => {
    disableDemoMode()
    router.push('/register')
  }

  const handleLogin = () => {
    disableDemoMode()
    router.push('/login')
  }

  return (
    <AnimatePresence>
      {!isMinimized && (
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white relative"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-1.5 rounded-full">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                  <span className="font-semibold">Demo Mode Active</span>
                  <span className="text-sm opacity-90">
                    Exploring with sample data • Limited features
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setIsMinimized(true)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleSignUp}
                className="bg-white text-purple-600 hover:bg-white/90"
              >
                Create Free Account
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLogin}
                className="text-white hover:bg-white/20"
              >
                Sign In
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={disableDemoMode}
                className="text-white hover:bg-white/20"
              >
                Exit Demo
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {isMinimized && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-4 right-4 z-50"
        >
          <Button
            size="sm"
            onClick={() => setIsMinimized(false)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Demo Mode
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function DemoRestrictionModal({ 
  isOpen, 
  onClose, 
  feature 
}: { 
  isOpen: boolean
  onClose: () => void
  feature: string 
}) {
  const { disableDemoMode } = useDemoMode()
  const router = useRouter()

  if (!isOpen) return null

  const handleSignUp = () => {
    disableDemoMode()
    router.push('/register')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-background rounded-lg p-6 max-w-md w-full"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full">
            <Info className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold">Feature Restricted</h3>
        </div>

        <p className="text-muted-foreground mb-6">
          The &quot;{feature}&quot; feature is not available in demo mode.
          Create a free account to unlock all features and start using real data.
        </p>

        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm font-medium mb-2">With a free account you get:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Search real UK & Ireland businesses</li>
              <li>• Save searches and create alerts</li>
              <li>• Export data and reports</li>
              <li>• Contact businesses directly</li>
              <li>• Full access to all features</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSignUp} className="flex-1">
              Create Free Account
            </Button>
            <Button onClick={onClose} variant="outline">
              Continue Demo
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}