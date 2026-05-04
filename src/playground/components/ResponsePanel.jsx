/**
 * ResponsePanel — State-driven display of the model response with metadata.
 *
 * Four render states:
 *   - Empty: placeholder text
 *   - Loading: skeleton animation + elapsed time counter
 *   - Success: response text (monospace) + metadata badges (tokens/latency/cost)
 *   - Error: error message + retry button
 */
import { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Coins,
  Zap,
  DollarSign,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export default function ResponsePanel({
  response,
  isLoading,
  error,
  onRetry,
  modelName,
  modelProvider,
}) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  // Elapsed timer during loading
  useEffect(() => {
    if (isLoading) {
      setElapsed(0);
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 100);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLoading]);

  const formatElapsed = (ms) => (ms / 1000).toFixed(1) + 's';
  const formatTokens = (n) => (n != null ? new Intl.NumberFormat('en-US').format(n) : '0');
  const formatLatency = (ms) => (ms != null ? (ms / 1000).toFixed(1) + 's' : '0.0s');
  const formatCost = (cost) => {
    if (cost == null) return 'N/A';
    return '$' + Number(cost).toFixed(4);
  };

  const isEmpty = !response && !isLoading && !error;

  return (
    <div className="bg-surface-raised rounded-xl p-5" aria-live="polite">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
        Response
      </div>

      {/* Model header — shown when there is a model selected */}
      {(isLoading || response || error) && modelName && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-100">{modelName}</span>
          {modelProvider && (
            <span className="bg-cyan-500/10 text-cyan-400 rounded-full text-xs px-2 py-0.5">
              {modelProvider}
            </span>
          )}
        </div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <div className="bg-surface-base/50 rounded-lg py-10 flex flex-col items-center justify-center gap-2">
          <Terminal className="w-8 h-8 text-slate-600" />
          <p className="text-slate-500 text-sm text-center">
            Enter a prompt and click Send to test a model.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div aria-label="Loading response">
          <div className="space-y-2 mb-4">
            <div className="animate-pulse bg-surface-overlay rounded h-4 w-full" />
            <div className="animate-pulse bg-surface-overlay rounded h-4 w-4/5" />
            <div className="animate-pulse bg-surface-overlay rounded h-4 w-3/5" />
          </div>
          <div className="text-xs text-slate-500" data-testid="loading-status">
            {'⏳ Waiting for response... ' + formatElapsed(elapsed)}
          </div>
        </div>
      )}

      {/* Success State */}
      {response && !isLoading && !error && (
        <div>
          <div className="font-mono text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {response.text}
          </div>

          <div className="border-t border-slate-800 my-4" />

          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 rounded-full text-xs px-2.5 py-1">
              <Coins className="w-3.5 h-3.5" />
              {formatTokens(response.tokens) + ' tokens'}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 rounded-full text-xs px-2.5 py-1">
              <Zap className="w-3.5 h-3.5" />
              {formatLatency(response.latency)}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs px-2.5 py-1">
              <DollarSign className="w-3.5 h-3.5" />
              {formatCost(response.cost)}
            </span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-sm font-semibold text-red-400">Error</span>
          </div>
          <p className="text-sm text-red-400 mb-4" role="alert">
            {error}
          </p>
          <button
            type="button"
            className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-2 text-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            onClick={onRetry}
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
