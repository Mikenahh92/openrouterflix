/**
 * AnalyticsPage — statistical dashboard at /history/analytics.
 *
 * Computes per-model statistics from the persisted run history store
 * and displays summary cards and a sortable data table.
 *
 * Composition:
 *   AnalyticsPage
 *   ├── Back link (← History)
 *   ├── Page header
 *   ├── AnalyticsFilters (date range, type, model multi-select)
 *   ├── StatCard × 4 (total runs, unique models, avg latency, total cost)
 *   ├── ModelStatsTable (sortable per-model stats)
 *   └── EmptyState (when no runs exist)
 */
import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, BarChart3, Activity, Layers, Zap, DollarSign } from 'lucide-react';
import useAnalytics from '../hooks/useAnalytics';
import { formatLatency, formatCost } from '../lib/computeStats';
import StatCard from './StatCard';
import ModelStatsTable from './ModelStatsTable';
import AnalyticsFilters from './AnalyticsFilters';

export default function AnalyticsPage() {
  // Filter state
  const [dateRange, setDateRange] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState([]);

  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: 'runCount', direction: 'desc' });

  // Compute analytics from store
  const { summary, modelStats, filteredRuns } = useAnalytics({
    dateRange,
    typeFilter,
    modelFilter,
  });

  // Available models for multi-select dropdown
  const availableModels = useMemo(
    () =>
      modelStats.map((m) => ({
        modelId: m.modelId,
        modelName: m.modelName,
      })),
    [modelStats]
  );

  // Sort handler — toggle direction on same key, default desc for new key
  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  }, []);

  // Sorted model stats
  const sortedModels = useMemo(() => {
    const sorted = [...modelStats];
    const { key, direction } = sortConfig;
    const dir = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      let aVal, bVal;
      switch (key) {
        case 'runCount':
          aVal = a.runCount;
          bVal = b.runCount;
          break;
        case 'avgLatency':
          aVal = a.latency.avg;
          bVal = b.latency.avg;
          break;
        case 'p95Latency':
          aVal = a.latency.p95;
          bVal = b.latency.p95;
          break;
        case 'avgCost':
          aVal = a.cost.avg ?? -Infinity;
          bVal = b.cost.avg ?? -Infinity;
          break;
        case 'totalTokens':
          aVal = a.tokens.total;
          bVal = b.tokens.total;
          break;
        default:
          aVal = a.runCount;
          bVal = b.runCount;
      }
      return (aVal - bVal) * dir;
    });

    return sorted;
  }, [modelStats, sortConfig]);

  const handleClearFilters = () => {
    setDateRange('all');
    setTypeFilter('all');
    setModelFilter([]);
  };

  const hasFilters = dateRange !== 'all' || typeFilter !== 'all' || modelFilter.length > 0;
  const hasNoMatch = filteredRuns.length > 0 && modelStats.length === 0;

  // --- Empty state (no history data at all) ---
  if (summary.totalRuns === 0 && !hasFilters) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Back link */}
        <div className="mb-6">
          <Link
            to="/history"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to History
          </Link>
        </div>

        {/* Page header */}
        <div className="flex items-center gap-2 mb-8">
          <BarChart3 className="w-5 h-5 text-slate-400" />
          <h1 className="text-2xl font-semibold text-slate-100">Analytics</h1>
        </div>

        {/* Empty state */}
        <div className="py-16 flex flex-col items-center gap-3">
          <BarChart3 className="w-10 h-10 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">No analytics data yet</p>
          <p className="text-xs text-slate-500 text-center max-w-[280px]">
            Run prompts in the Playground to build your run history and see model statistics.
          </p>
          <Link
            to="/playground"
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors mt-1"
          >
            Go to Playground &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Back link */}
      <div className="mb-6">
        <Link
          to="/history"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to History
        </Link>
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-slate-400" />
          <h1 className="text-2xl font-semibold text-slate-100">Analytics</h1>
        </div>
      </div>

      {/* Filters */}
      {summary.totalRuns > 0 && (
        <div className="mb-6">
          <AnalyticsFilters
            dateRange={dateRange}
            typeFilter={typeFilter}
            modelFilter={modelFilter}
            availableModels={availableModels}
            onDateRangeChange={setDateRange}
            onTypeFilterChange={setTypeFilter}
            onModelFilterChange={setModelFilter}
          />
        </div>
      )}

      {/* No match state (filters exclude all models) */}
      {hasNoMatch && (
        <div className="text-center py-16">
          <BarChart3 className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h2 className="text-sm font-medium text-slate-400 mb-1">
            No models match your filters
          </h2>
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Summary cards */}
      {!hasNoMatch && modelStats.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={Activity}
              label="Total Runs"
              value={summary.totalRuns}
              subtitle="across all models"
              accentColor="violet"
            />
            <StatCard
              icon={Layers}
              label="Models"
              value={summary.uniqueModels}
              subtitle="tested"
              accentColor="cyan"
            />
            <StatCard
              icon={Zap}
              label="Avg Latency"
              value={formatLatency(summary.avgLatency)}
              subtitle="across all runs"
              accentColor="amber"
            />
            <StatCard
              icon={DollarSign}
              label="Total Cost"
              value={formatCost(summary.totalCost)}
              subtitle="across all runs"
              accentColor="emerald"
            />
          </div>

          {/* Section heading */}
          <h2 className="text-sm font-medium text-slate-400 mb-3">
            Per-Model Statistics
          </h2>

          {/* Model stats table */}
          <ModelStatsTable
            models={sortedModels}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        </>
      )}
    </div>
  );
}
