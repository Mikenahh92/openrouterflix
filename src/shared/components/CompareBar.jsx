import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Columns, X } from 'lucide-react';
import { useStore } from '../lib/store.js';

/**
 * Sticky floating CompareBar that appears when 2+ models are selected.
 * Shows a "Compare (N)" button and a "Clear" ghost button.
 * Navigates to /compare?ids=id1,id2,... on Compare click.
 */
export default function CompareBar() {
  const navigate = useNavigate();

  const compareSelections = useStore(
    (s) => s.catalog?.compareSelections ?? []
  );
  const clearCompareSelections = useStore(
    (s) => s.catalog?.clearCompareSelections
  );

  const count = compareSelections.length;
  const visible = count >= 2;

  const handleCompare = useCallback(() => {
    const ids = compareSelections.join(',');
    navigate(`/compare?ids=${encodeURIComponent(ids)}`);
  }, [compareSelections, navigate]);

  const handleClear = useCallback(() => {
    clearCompareSelections?.();
  }, [clearCompareSelections]);

  if (!visible) {
    return (
      <div
        aria-live="polite"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none
          opacity-0 translate-y-24 transition-all duration-200 ease-in"
      />
    );
  }

  return (
    <div aria-live="polite" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className="bg-[#131625] border border-slate-800 rounded-2xl shadow-2xl px-5 py-3
          flex items-center gap-4 max-w-sm
          opacity-100 translate-y-0 transition-all duration-300 ease-out
          animate-[slideUp_300ms_ease-out]"
      >
        {/* Compare icon + button */}
        <button
          type="button"
          onClick={handleCompare}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg px-5 py-2.5
            text-sm font-semibold flex items-center gap-2 transition-colors duration-150
            focus-visible:outline focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#131625]"
        >
          <Columns className="w-5 h-5 text-violet-300" />
          Compare ({count})
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-700" />

        {/* Clear button */}
        <button
          type="button"
          onClick={handleClear}
          className="text-slate-400 hover:text-white hover:bg-surface-overlay rounded-lg px-3 py-2
            text-sm flex items-center gap-1.5 transition-colors duration-150
            focus-visible:outline focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#131625]"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      </div>
    </div>
  );
}
