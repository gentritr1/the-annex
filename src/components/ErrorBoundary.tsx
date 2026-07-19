import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { clearGame } from '../game/persistence'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('The Annex could not render the current case state.', error, info)
  }

  private recover = () => {
    clearGame()
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="recovery-screen">
        <p className="case-code">Local case recovery</p>
        <h1>The record could not be opened safely.</h1>
        <p>
          The current local case is incompatible or damaged. Access preferences can be preserved
          while the case state is cleared.
        </p>
        <button className="button button-primary" type="button" onClick={this.recover}>
          Clear case and restart
        </button>
      </main>
    )
  }
}
