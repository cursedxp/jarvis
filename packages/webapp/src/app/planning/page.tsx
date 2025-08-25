'use client'

import dynamic from 'next/dynamic'
import { ThemeProvider } from '@/contexts/ThemeContext'

const PlanningClient = dynamic(() => import('./PlanningClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-foreground">Loading Planning App...</div>
    </div>
  )
})

export default function PlanningPage() {
  return (
    <ThemeProvider>
      <PlanningClient />
    </ThemeProvider>
  )
}