"use client"

import { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erro inesperado: {this.state.error?.message}
        </div>
      )
    }
    return this.props.children
  }
}
