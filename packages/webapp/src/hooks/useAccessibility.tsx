'use client'

import React, { useEffect, useRef, useCallback } from 'react'

interface UseAccessibilityOptions {
  announceMessages?: boolean
  keyboardNavigation?: boolean
  focusTrap?: boolean
}

export function useAccessibility({
  announceMessages = true,
  keyboardNavigation = true,
  focusTrap = false
}: UseAccessibilityOptions = {}) {
  const announcementRef = useRef<HTMLDivElement>(null)

  // Announce messages to screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announceMessages) return

    if (announcementRef.current) {
      announcementRef.current.setAttribute('aria-live', priority)
      announcementRef.current.textContent = message
      
      // Clear after a short delay
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = ''
        }
      }, 1000)
    }
  }, [announceMessages])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!keyboardNavigation) return

    // Escape key to close modals/dialogs
    if (event.key === 'Escape') {
      const event_esc = new CustomEvent('jarvis:escape', { bubbles: true })
      document.dispatchEvent(event_esc)
    }

    // Tab navigation improvements
    if (event.key === 'Tab') {
      // Add visual focus indicators
      document.body.classList.add('keyboard-navigation')
    }
  }, [keyboardNavigation])

  // Focus management
  const focusElement = useCallback((selector: string, delay = 0) => {
    setTimeout(() => {
      const element = document.querySelector(selector) as HTMLElement
      if (element) {
        element.focus()
      }
    }, delay)
  }, [])

  // Skip to main content
  const skipToMain = useCallback(() => {
    focusElement('main, [role="main"], #main', 0)
  }, [focusElement])

  useEffect(() => {
    if (keyboardNavigation) {
      document.addEventListener('keydown', handleKeyDown)
      
      // Remove keyboard navigation class on mouse use
      const handleMouseDown = () => {
        document.body.classList.remove('keyboard-navigation')
      }
      document.addEventListener('mousedown', handleMouseDown)

      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.removeEventListener('mousedown', handleMouseDown)
      }
    }
  }, [handleKeyDown, keyboardNavigation])

  // Reduced motion detection
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false

  // High contrast detection
  const prefersHighContrast = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-contrast: high)').matches
    : false

  return {
    announce,
    focusElement,
    skipToMain,
    prefersReducedMotion,
    prefersHighContrast,
    // Screen reader announcement element
    AnnouncementComponent: () => (
      <div
        ref={announcementRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />
    )
  }
}