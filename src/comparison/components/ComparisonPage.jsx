/**
 * ComparisonPage — route-level page component for /compare.
 *
 * Reads model IDs from URL query params (?ids=id1,id2,...),
 * fetches comparison data via the useComparison hook,
 * and renders empty state, loading skeleton, error state, or ComparisonTable.
 *
 * Lazy-loaded via React.lazy() in App.jsx.
 */
import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AlertTriangle, Plus } from 'lucide-react';
import useComparison from '../hooks/useComparison';
import { useComparisonPresetsStore } from '../store.js';
import ComparisonTable from './ComparisonTable';
import ComparisonEmptyState from './ComparisonEmptyState';
import PresetActions from './PresetActions';
import PresetDropdown from './PresetDropdown';
import DimensionToggle from './DimensionToggle';

/* ─── Skeleton ─────────────────────────────────────────────────────── */

function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse bg-slate-700/50 rounded ${className}`} />;
}

function ComparisonSkeleton() {
  return (
    <div data-testid="comparison-skeleton" aria-busy="true">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-[600px] w-full border-collapse">
          <thead>
            <tr>
              <th className="w-44 px-4 py-3 bg-surface-raised border-b border-slate-800">
                <SkeletonBlock className="h-4 w-28" />
              </th>
              {[1, 2, 3, 4].map((i) => (
                <th key={i} className="px-4 py-4">
                  <SkeletonBlock className="h-4 w-28 mx-auto mb-2" />
                  <SkeletonBlock className="h-4 w-16 mx-auto mb-1" />
                  <div className="flex justify-center gap-1">
                    <SkeletonBlock className="h-5 w-12 rounded-full" />
                    <SkeletonBlock className="h-5 w-14 rounded-full" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 9 }).map((_, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-surface-raised' : ''}>
                <td className="w-44 px-4 py-3">
                  <SkeletonBlock className="h-4 w-28" />
                </td>
                {[1, 2, 3, 4].map((col) => (
                  <td key={col} className="px-4 py-3 text-center">
                    <SkeletonBlock className="h-4 w-16 mx-auto" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Error State ──────────────────────────────────────────────────── */

function ErrorState({ error, onRetry }) {
  return (
    <div
      className="max-w-md mx-auto text-center py-20"
      role="alert"
      data-testid="comparison-error"
    >
      <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h2 className="text-slate-100 text-lg mb-2">Failed to load comparison</h2>
      <p className="text-slate-400 text-sm mb-6">{error}</p>
      <div className="flex justify-center gap-3">
        <button
          onClick={onRetry}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg px-6 py-2 text-sm font-semibold transition-colors cursor-pointer"
        >
          Try again
        </button>
        <Link
          to="/"
          className="inline-block bg-surface-raised border border-slate-800 hover:border-violet-500 text-slate-100 rounded-lg px-6 py-2 text-sm font-semibold transition-colors"
        >
          Back to Catalog
        </Link>
      </div>
    </div>
  );
}

/* ─── ComparisonPage ───────────────────────────────────────────────── */

export default function ComparisonPage() {
  const { models, loading, error, removeModel, ids } = useComparison();
  const [, setSearchParams] = useSearchParams();

  const visibleDimensions = useComparisonPresetsStore((s) => s.visibleDimensions);

  // Load preset: update URL params → triggers useComparison hook to fetch
  const handleLoadPreset = useCallback(
    (modelIds) => {
      setSearchParams({ ids: modelIds.join(',') }, { replace: true });
    },
    [setSearchParams]
  );

  // Empty state: fewer than 2 valid IDs
  if (ids.length < 2 && !loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-12 py-8">
        <ComparisonEmptyState
          modelCount={models.length}
          singleModel={models.length === 1 ? models[0] : undefined}
        />
      </div>
    );
  }

  // Loading state
  if (loading && models.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-12 py-8 animate-fadeIn">
        <ComparisonSkeleton />
      </div>
    );
  }

  // Error state
  if (error && models.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-12 py-8 animate-fadeIn">
        <ErrorState error={error} onRetry={() => {}} />
      </div>
    );
  }

  // Main comparison view
  return (
    <div className="max-w-[1440px] mx-auto px-12 py-8 animate-fadeIn">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-slate-400 hover:text-white text-sm font-medium inline-flex items-center gap-1 transition-colors"
          >
            ← Back to Catalog
          </Link>
          <h2 className="text-2xl font-semibold text-slate-100">
            Comparison ({models.length} {models.length === 1 ? 'model' : 'models'})
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <PresetDropdown currentModelIds={ids} onLoadPreset={handleLoadPreset} />
          <DimensionToggle />
          <PresetActions ids={ids} />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 bg-surface-raised border border-slate-800 hover:border-violet-500 text-slate-100 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add model
          </Link>
        </div>
      </div>

      {/* Error banner (partial success) */}
      {error && models.length > 0 && (
        <div
          className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Comparison table */}
      <ComparisonTable models={models} onRemoveModel={removeModel} visibleDimensions={visibleDimensions} />
    </div>
  );
}
