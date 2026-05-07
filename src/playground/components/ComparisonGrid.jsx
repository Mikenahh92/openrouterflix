/**
 * ComparisonGrid — Responsive grid displaying side-by-side model responses.
 *
 * Layout strategy (AC-4 & AC-7):
 *   - Desktop (≥1024px, `lg`): 2-col grid for all model counts (2-col for 2, 2×2 for 3–4).
 *   - Tablet (768–1023px, `md`): 2-col for 2 models; 1-col stacked for 3+.
 *   - Mobile (<768px): Always 1-col stacked.
 */
import { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Coins,
  Zap,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Clock,
} from 'lucide-react';

function formatTokens(n) {
  return n != null ? new Intl.NumberFormat('en-US').format(n) : '0';
}

function formatLatency(ms) {
  return ms != null ? (ms / 1000).toFixed(1) + 's' : '0.0s';
}

function formatCost(cost) {
  if (cost == null) return 'N/A';
  return '$' + Number(cost).toFixed(4);
}

/**
 * Single model result card within the comparison grid.
 */
function ModelResultCard({ modelData, result, error, isLoading, models, onRetry }) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  const modelInfo = models.find((m) => m.id === modelData?.model);

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

  const displayName = modelInfo?.name || modelData?.model || 'Unknown';
  const provider = modelInfo?.provider || null;

  return (
    <div className="bg-surface-base border border-slate-800 rounded-xl p-4 flex flex-col">
      {/* Model header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <span className="text-sm font-semibold text-slate-100 truncate mr-2">
          {displayName}
        </span>
        {provider && (
          <span className="bg-cyan-500/10 text-cyan-400 rounded-full text-xs px-2 py-0.5 shrink-0">
            {provider}
          </span>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex-1" aria-label={`Loading response for ${displayName}`}>
          <div className="space-y-2 mb-3">
            <div className="animate-pulse bg-surface-overlay rounded h-3 w-full" />
            <div className="animate-pulse bg-surface-overlay rounded h-3 w-4/5" />
            <div className="animate-pulse bg-surface-overlay rounded h-3 w-3/5" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            {(elapsed / 1000).toFixed(1)}s
          </div>
        </div>
      )}

      {/* Error state — with individual retry button (AC-5) */}
      {!isLoading && error && (
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-semibold text-red-400">Error</span>
          </div>
          <p className="text-xs text-red-400 mb-3">{error}</p>
          <button
            type="button"
            className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
            onClick={onRetry}
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Success state */}
      {!isLoading && result && (
        <div className="flex-1 flex flex-col">
          <div className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap flex-1 overflow-auto max-h-64">
            {result.text}
          </div>

          <div className="border-t border-slate-800 my-3" />

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 rounded-full text-[11px] px-2 py-0.5">
              <Coins className="w-3 h-3" />
              {formatTokens(result.tokens)} tokens
            </span>
            <span className="inline-flex items-center gap-1 bg-cyan-500/10 text-cyan-400 rounded-full text-[11px] px-2 py-0.5">
              <Zap className="w-3 h-3" />
              {formatLatency(result.latency)}
            </span>
            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[11px] px-2 py-0.5">
              <DollarSign className="w-3 h-3" />
              {formatCost(result.cost)}
            </span>
          </div>
        </div>
      )}

      {/* Empty state (not loading, no result, no error) */}
      {!isLoading && !result && !error && (
        <div className="flex-1 flex items-center justify-center py-4">
          <p className="text-xs text-slate-500">Waiting...</p>
        </div>
      )}
    </div>
  );
}

/**
 * Resolve Tailwind grid classes for the comparison layout.
 *
 * Desktop (lg ≥1024px): Always 2 columns — `lg:grid-cols-2`
 * Tablet (md 768–1023px): 2 columns for 2 models, 1 column for 3+ — `md:grid-cols-2` or `md:grid-cols-1`
 * Mobile (<768px): Always 1 column — base `grid-cols-1`
 */
function getGridClasses(modelCount) {
  const base = 'grid gap-4 grid-cols-1';

  if (modelCount <= 2) {
    // 2 models: side-by-side on tablet+, stacked on mobile
    return `${base} md:grid-cols-2`;
  }

  // 3–4 models: 2×2 on desktop, stacked on tablet
  return `${base} md:grid-cols-1 lg:grid-cols-2`;
}

/**
 * ComparisonGrid — takes the full comparison state and renders a grid.
 */
export default function ComparisonGrid({
  models,
  selectedModels,
  compareResults,
  compareErrors,
  isCompareLoading,
  onRetry,
}) {
  if (selectedModels.length === 0 && !isCompareLoading) {
    return (
      <div className="bg-surface-raised rounded-xl p-5" aria-live="polite">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Comparison
        </div>
        <div className="bg-surface-base/50 rounded-lg py-10 flex flex-col items-center justify-center gap-2">
          <Terminal className="w-8 h-8 text-slate-600" />
          <p className="text-slate-500 text-sm text-center">
            Select 2–4 models and send a prompt to compare responses.
          </p>
        </div>
      </div>
    );
  }

  // Build a map of model -> result and model -> error for quick lookup
  const resultMap = new Map(compareResults.map((r) => [r.model, r]));
  const errorMap = new Map(compareErrors.map((e) => [e.model, e]));

  const gridClasses = getGridClasses(selectedModels.length);

  return (
    <div className="bg-surface-raised rounded-xl p-5" aria-live="polite">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Comparison
        </div>
        {compareErrors.length > 0 && compareResults.length > 0 && (
          <span className="text-xs text-amber-400">
            {compareErrors.length} model{compareErrors.length > 1 ? 's' : ''} failed
          </span>
        )}
      </div>

      <div className={gridClasses}>
        {selectedModels.map((modelId) => (
          <ModelResultCard
            key={modelId}
            modelData={{ model: modelId }}
            result={resultMap.get(modelId) || null}
            error={errorMap.get(modelId)?.error || null}
            isLoading={isCompareLoading && !resultMap.has(modelId) && !errorMap.has(modelId)}
            models={models}
            onRetry={onRetry}
          />
        ))}
      </div>

      {/* All failed state */}
      {!isCompareLoading &&
        compareResults.length === 0 &&
        compareErrors.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-sm font-semibold text-red-400">
                All models failed
              </span>
            </div>
            <p className="text-sm text-red-400 mb-4">
              None of the selected models could process your prompt.
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
