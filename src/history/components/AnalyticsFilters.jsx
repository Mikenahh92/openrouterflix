/**
 * AnalyticsFilters — date range, run type, and model multi-select filters.
 *
 * Mirrors the HistoryFilters visual pattern with:
 *   - Date range segmented control (All / Today / 7d / 30d)
 *   - Type dropdown (All types / Playground / Comparison)
 *   - Model multi-select dropdown (derived from available models in data)
 *
 * Props:
 *   dateRange        — 'all' | 'today' | '7d' | '30d'
 *   typeFilter       — 'all' | 'playground' | 'comparison'
 *   modelFilter      — string[] (selected model IDs)
 *   availableModels  — Array<{ modelId: string, modelName: string }> (models present in data)
 *   onDateRangeChange(string)
 *   onTypeFilterChange(string)
 *   onModelFilterChange(string[])
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

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

function ModelMultiSelect({ selected, availableModels, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleToggle = (modelId) => {
    if (selected.includes(modelId)) {
      onChange(selected.filter((id) => id !== modelId));
    } else {
      onChange([...selected, modelId]);
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  const handleSelectAll = () => {
    onChange(availableModels.map((m) => m.modelId));
  };

  const label =
    selected.length === 0
      ? 'All models'
      : `${selected.length} model${selected.length > 1 ? 's' : ''} selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 bg-surface-base border border-slate-800 rounded-lg text-sm text-slate-100 px-3 py-1.5 hover:text-slate-300 transition-colors cursor-pointer"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {label}
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {open && availableModels.length > 0 && (
        <div
          className="absolute top-full left-0 mt-1 bg-surface-raised border border-slate-800 rounded-lg shadow-lg z-20 py-1 min-w-[200px] max-h-[240px] overflow-y-auto"
          role="listbox"
          aria-multiselectable="true"
        >
          {/* Select all / clear */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800/50">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs text-violet-400 hover:text-violet-300 cursor-pointer"
            >
              Select all
            </button>
            <span className="text-slate-600 text-xs">&bull;</span>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-slate-400 hover:text-slate-300 cursor-pointer"
            >
              Clear
            </button>
          </div>

          {availableModels.map((model) => {
            const checked = selected.includes(model.modelId);
            return (
              <label
                key={model.modelId}
                className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-surface-overlay/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggle(model.modelId)}
                  className="rounded border-slate-600 bg-surface-base text-violet-500 focus:ring-violet-500/30 focus:ring-1"
                />
                <span className="text-sm text-slate-200 truncate">{model.modelName}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsFilters({
  dateRange,
  typeFilter,
  modelFilter,
  availableModels,
  onDateRangeChange,
  onTypeFilterChange,
  onModelFilterChange,
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

      {/* Model multi-select */}
      <ModelMultiSelect
        selected={modelFilter}
        availableModels={availableModels}
        onChange={onModelFilterChange}
      />
    </div>
  );
}
