/**
 * ChartContainer — Universal chart wrapper for OpenRouterFlix.
 *
 * Features:
 *   - ARIA: role="img", aria-label, aria-busy
 *   - Skeleton loading state (animate-pulse bg-surface-overlay)
 *   - Error fallback display
 *   - React error boundary (internal class component)
 *   - Entry animation (animate-fadeIn) respecting prefers-reduced-motion
 *   - Responsive sizing (w-full) with optional aspect-ratio
 *
 * Props:
 *   ariaLabel  (string, required)  — Accessible description for screen readers
 *   children   (ReactNode, required) — Chart component to render
 *   title      (string)            — Chart title rendered as <h3>
 *   subtitle   (string)            — Secondary text rendered as <p>
 *   loading    (boolean)           — Shows skeleton placeholder
 *   error      (string|null)       — Shows error fallback message
 *   aspectRatio(string)            — CSS aspect-ratio (default: 'auto')
 */
import { Component } from 'react';
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Internal error boundary (class component — React requirement)      */
/* ------------------------------------------------------------------ */

class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ChartErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="flex flex-col items-center justify-center gap-2 p-6 text-slate-400">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
          <p className="text-sm">Unable to load chart</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/*  ChartContainer (default export)                                   */
/* ------------------------------------------------------------------ */

export default function ChartContainer({
  ariaLabel,
  children,
  title,
  subtitle,
  loading = false,
  error = null,
  aspectRatio = 'auto',
}) {
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setAnimate(!mq.matches);

    const handler = (e) => setAnimate(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const animClass = animate ? 'animate-fadeIn' : '';

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      className={`w-full rounded-lg ${animClass}`}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-3">
          {title && (
            <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      )}

      {/* Chart area */}
      <ChartErrorBoundary>
        {error ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center gap-2 rounded-lg bg-surface-overlay p-6"
            style={{ aspectRatio }}
          >
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <p className="text-sm text-slate-400">{error}</p>
          </div>
        ) : loading ? (
          <div
            className="animate-pulse rounded-lg bg-surface-overlay"
            style={{ aspectRatio }}
          />
        ) : (
          <div style={{ aspectRatio }}>
            {children}
          </div>
        )}
      </ChartErrorBoundary>
    </div>
  );
}
