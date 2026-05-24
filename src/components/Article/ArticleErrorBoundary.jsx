import { Component } from "react"

/**
 * Error boundary that isolates article content rendering failures.
 *
 * Wrap any subtree that renders untrusted feed HTML — if a single node
 * causes a React render error, only that boundary resets to the fallback
 * instead of crashing the entire application.
 *
 * Usage:
 *   <ArticleErrorBoundary>
 *     {parsedHtml}
 *   </ArticleErrorBoundary>
 *
 *   // With custom fallback:
 *   <ArticleErrorBoundary fallback={<span>Could not render content.</span>}>
 *     {parsedHtml}
 *   </ArticleErrorBoundary>
 */
class ArticleErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Log to console in development; swap for a real error-reporting
    // service (Sentry, etc.) in production if desired.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ArticleErrorBoundary] Caught render error:", error, info.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null
    }
    return this.props.children
  }
}

export default ArticleErrorBoundary
