'use client'

import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-[80%]" />
        <Skeleton className="h-4 w-[60%]" />
      </div>
    </div>
  )
}

export function ChatHistorySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }, (_, i) => (
        <MessageSkeleton key={i} />
      ))}
    </div>
  )
}

export function VoiceControlSkeleton() {
  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-12 w-12 rounded-full" />
    </div>
  )
}

export function WidgetSkeleton() {
  return (
    <div className="bg-card/20 backdrop-blur-sm rounded-xl p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  )
}

export function AppLoadingSkeleton() {
  return (
    <div className="h-screen bg-background relative">
      {/* Header skeleton */}
      <div className="absolute top-6 left-6 z-30">
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="absolute top-6 right-6 z-30">
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      
      {/* Main blob skeleton */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <Skeleton className="h-64 w-64 rounded-full" />
      </div>
      
      {/* Voice controls skeleton */}
      <VoiceControlSkeleton />
      
      {/* Widgets skeleton */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-30 flex gap-4">
        <WidgetSkeleton />
        <WidgetSkeleton />
      </div>
      
      {/* App buttons skeleton */}
      <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-10 rounded" />
        ))}
      </div>
    </div>
  )
}