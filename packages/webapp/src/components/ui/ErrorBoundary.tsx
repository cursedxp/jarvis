'use client'

import React from 'react'
import { Button } from './button'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{
    error: Error | null
    resetError: () => void
  }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    this.props.onError?.(error, errorInfo)
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ 
  error, 
  resetError 
}: { 
  error: Error | null
  resetError: () => void 
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-destructive mb-4">
          Something went wrong
        </h2>
        <p className="text-muted-foreground mb-6">
          {error?.message || 'An unexpected error occurred'}
        </p>
        <Button 
          onClick={resetError}
          variant="outline"
          className="mr-4"
        >
          Try again
        </Button>
        <Button 
          onClick={() => window.location.reload()}
          variant="default"
        >
          Reload page
        </Button>
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Error details
          </summary>
          <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap bg-muted p-2 rounded">
            {error?.stack}
          </pre>
        </details>
      </div>
    </div>
  )
}