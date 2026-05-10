/**
 * HistoryPage — displays run history with filters, delete, clear-all, and export/import.
 *
 * Composes HistoryFilters + HistoryList + ExportControls + ImportDialog with local filter state.
 * Filters are client-side (all records in memory, max 50).
 *
 * UX patterns:
 *   - Date range segmented control (All / Today / 7d / 30d)
 *   - Model text search
 *   - Type dropdown (All / Playground / Comparison)
 *   - Accordion expansion (one record at a time)
 *   - Clear all with inline confirmation
 *   - Export CSV/JSON and Import from JSON file
 */
import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router';
import { Clock, Trash2, AlertTriangle, BarChart3 } from 'lucide-react';
import useHistory from '../hooks/useHistory';
import HistoryFilters from './HistoryFilters';
import HistoryList from './HistoryList';
import ExportControls from './ExportControls';
import ImportDialog from './ImportDialog';

// --- Filter logic ---

function filterRuns(runs, dateRange, modelFilter, typeFilter) {
  return runs.filter((run) => {
    // Date range filter
    if (dateRange !== 'all') {
      const now = Date.now();
      const runTime = new Date(run.createdAt).getTime();
      const cutoff =
        dateRange === 'today'
          ? new Date().setHours(0, 0, 0, 0)
          : dateRange === '7d'
            ? now - 7 * 86400000
            : dateRange === '30d'
              ? now - 30 * 86400000
              : 0;
      if (runTime < cutoff) return false;
    }

    // Model filter (case-insensitive substring)
    if (modelFilter) {
      const q = modelFilter.toLowerCase();
      if (!run.modelName.toLowerCase().includes(q)) return false;
    }

    // Type filter
    if (typeFilter !== 'all' && run.type !== typeFilter) return false;

    return true;
  });
}

export default function HistoryPage() {
  const { runs, addRun, deleteRun, clearAll } = useHistory();

  // Filter state (local component state, not in store)
  const [dateRange, setDateRange] = useState('all');
  const [modelFilter, setModelFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Accordion state
  const [expandedId, setExpandedId] = useState(null);

  // Clear-all confirmation
  const [confirmClear, setConfirmClear] = useState(false);

  // Import dialog state
  const [importOpen, setImportOpen] = useState(false);

  // Filtered runs (memoized)
  const filteredRuns = useMemo(
    () => filterRuns(runs, dateRange, modelFilter, typeFilter),
    [runs, dateRange, modelFilter, typeFilter]
  );

  const hasAnyFilters = dateRange !== 'all' || modelFilter || typeFilter !== 'all';
  const hasNoResults = runs.length > 0 && filteredRuns.length === 0;

  const handleToggle = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleClearAll = () => {
    if (confirmClear) {
      clearAll();
      setConfirmClear(false);
      setExpandedId(null);
    } else {
      setConfirmClear(true);
    }
  };

  const handleClearFilters = () => {
    setDateRange('all');
    setModelFilter('');
    setTypeFilter('all');
  };

  const handleImport = useCallback(
    (records) => {
      // Merge imported records into the store
      for (const record of records) {
        addRun(record);
      }
    },
    [addRun]
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          <h1 className="text-2xl font-semibold text-slate-100">Run History</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/history/analytics"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg px-3 py-1.5 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            View Analytics
            <span className="text-xs">&rarr;</span>
          </Link>
          <ExportControls
            records={filteredRuns}
            disabled={filteredRuns.length === 0}
            onImportClick={() => setImportOpen(true)}
          />
          {runs.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className={`inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                confirmClear
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              {confirmClear ? 'Confirm Clear All' : 'Clear all'}
            </button>
          )}
        </div>
      </div>

      {/* Clear-all confirmation bar */}
      {confirmClear && (
        <div
          className="bg-surface-overlay rounded-lg p-4 border border-red-500/20 mb-6"
          role="alertdialog"
          aria-label="Confirm clear all history"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-slate-300">
              Clear all run history? This cannot be undone.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-2 text-sm transition-colors cursor-pointer"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Filters — only shown when there are runs */}
      {runs.length > 0 && (
        <div className="mb-6">
          <HistoryFilters
            dateRange={dateRange}
            modelFilter={modelFilter}
            typeFilter={typeFilter}
            onDateRangeChange={setDateRange}
            onModelFilterChange={setModelFilter}
            onTypeFilterChange={setTypeFilter}
          />
        </div>
      )}

      {/* No-match state (records exist but filters exclude them) */}
      {hasNoResults && (
        <div className="text-center py-16">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h2 className="text-sm font-medium text-slate-400 mb-1">
            No records match your filters
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

      {/* List (includes empty state for zero records) */}
      {!hasNoResults && (
        <HistoryList
          runs={filteredRuns}
          expandedId={expandedId}
          onToggle={handleToggle}
          onDelete={deleteRun}
        />
      )}

      {/* Import Dialog */}
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}
