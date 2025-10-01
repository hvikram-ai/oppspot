'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboardStore } from '@/lib/stores/dashboard-store'

/**
 * Global keyboard shortcuts for the dashboard
 *
 * Shortcuts:
 * - Cmd/Ctrl + K: Open command palette
 * - G + D: Go to dashboard
 * - G + S: Go to search
 * - N: New search
 * - R: Generate research report
 * - ?: Show help menu
 * - Esc: Close modals/dialogs
 */
export function useKeyboardShortcuts() {
  const router = useRouter()
  const { toggleCommandPalette, setCommandPaletteOpen } = useDashboardStore()

  useEffect(() => {
    let gPressed = false
    let gTimeout: NodeJS.Timeout | null = null

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Cmd/Ctrl + K: Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleCommandPalette()
        return
      }

      // Escape: Close command palette
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false)
        return
      }

      // G key sequences (vim-style navigation)
      if (e.key === 'g' || e.key === 'G') {
        if (gPressed) {
          // Second G press - do nothing (gg not used yet)
          gPressed = false
          if (gTimeout) clearTimeout(gTimeout)
          return
        }

        gPressed = true
        // Reset after 1 second
        gTimeout = setTimeout(() => {
          gPressed = false
        }, 1000)
        return
      }

      // If G was recently pressed, check for navigation keys
      if (gPressed) {
        gPressed = false
        if (gTimeout) clearTimeout(gTimeout)

        switch (e.key) {
          case 'd':
          case 'D':
            e.preventDefault()
            router.push('/dashboard')
            break
          case 's':
          case 'S':
            e.preventDefault()
            router.push('/search')
            break
          case 'p':
          case 'P':
            e.preventDefault()
            router.push('/pipeline')
            break
          case 'r':
          case 'R':
            e.preventDefault()
            router.push('/research')
            break
        }
        return
      }

      // Single key shortcuts
      switch (e.key) {
        case 'n':
        case 'N':
          e.preventDefault()
          router.push('/search')
          break
        case '?':
          e.preventDefault()
          // TODO: Open help modal
          console.log('Help shortcuts:')
          console.log('Cmd/Ctrl + K: Command palette')
          console.log('G + D: Go to dashboard')
          console.log('G + S: Go to search')
          console.log('N: New search')
          console.log('R: Generate research')
          console.log('?: Show this help')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (gTimeout) clearTimeout(gTimeout)
    }
  }, [router, toggleCommandPalette, setCommandPaletteOpen])
}

/**
 * Hook for focus management in modals/dialogs
 */
export function useFocusTrap(
  isOpen: boolean,
  containerRef: React.RefObject<HTMLElement>
) {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus first element when opened
    firstElement?.focus()

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab: backward
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab: forward
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)

    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  }, [isOpen, containerRef])
}

/**
 * Hook to announce changes to screen readers
 */
export function useAriaLiveAnnouncement() {
  useEffect(() => {
    // Create aria-live region if it doesn't exist
    let liveRegion = document.getElementById('aria-live-region')

    if (!liveRegion) {
      liveRegion = document.createElement('div')
      liveRegion.id = 'aria-live-region'
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.className = 'sr-only'
      document.body.appendChild(liveRegion)
    }

    return () => {
      // Keep the live region for the entire app lifecycle
    }
  }, [])

  const announce = (message: string) => {
    const liveRegion = document.getElementById('aria-live-region')
    if (liveRegion) {
      liveRegion.textContent = message

      // Clear after 1 second to allow for multiple announcements
      setTimeout(() => {
        liveRegion.textContent = ''
      }, 1000)
    }
  }

  return { announce }
}
