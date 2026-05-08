/**
 * HistoryFilters — date range, model, and type filter controls.
 *
 * Renders a horizontal row of filter controls that compose client-side.
 * Filters are component-local state (not in store).
 *
 * Props:
 *   dateRange   — 'all' | 'today' | '7d' | '30d'
 *   modelFilter — free text string
 *   typeFilter  — 'all' | 'playground' | 'comparison'
 *   onDateRangeChange(string)
 *   onModelFilterChange(string)
 *   onTypeFilterChange(string)
 */
import { Search } from 'lucide-react';

const DATE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'playground', label: 'Playground' },
  { value: 'comparison', label: 'Comparison' },
];

export default function HistoryFilters({
  dateRange,
  modelFilter,
  typeFilter,
  onDateRangeChange,
  onModelFilterChange,
  onTypeFilterChange,
}) {
  return (
    <div className="bg-surface-raised rounded-xl p-4 flex items-center gap-4 flex-wrap">
      {/* Date range segmented control */}
      <div className="flex items-center gap-2">
        {DATE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onDateRangeChange(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer ${
              dateRange === opt.value
                ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                : 'bg-surface-base text-slate-400 border border-slate-800 hover:text-slate-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Model text filter */}
      <div className="relative w-48">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={modelFilter}
          onChange={(e) => onModelFilterChange(e.target.value)}
          placeholder="Filter by model..."
          className="w-full bg-surface-base border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 pl-8 pr-3 py-1.5 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 focus:outline-none"
        />
      </div>

      {/* Type dropdown */}
      <select
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value)}
        className="bg-surface-base border border-slate-800 rounded-lg text-sm text-slate-100 py-1.5 pl-3 pr-8 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 focus:outline-none cursor-pointer"
      >
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
