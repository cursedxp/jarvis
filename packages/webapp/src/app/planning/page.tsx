'use client'

import dynamic from 'next/dynamic'

const PlanningClient = dynamic(() => import('./PlanningClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
      <div className="text-cyan-400">Loading Planning App...</div>
    </div>
  )
})

export default function PlanningPage() {
  return <PlanningClient />
}