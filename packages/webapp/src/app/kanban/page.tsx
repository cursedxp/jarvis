'use client'

import dynamic from 'next/dynamic'

const KanbanClient = dynamic(() => import('./KanbanClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
      <div className="text-cyan-400">Loading Kanban Board...</div>
    </div>
  )
})

export default function KanbanPage() {
  return <KanbanClient />
}