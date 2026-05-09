/**
 * DiffView — Presentational component that renders a line-level diff between
 * two response texts. Supports unified (inline) and side-by-side display modes.
 *
 * Purely client-side diff computation using the `diff` npm package.
 * Self-contained — no dependency on playground store or routing.
 */
import { useMemo } from 'react';
import { diffLines } from 'diff';
import { ArrowLeft, Info, AlignJustify, Columns2 } from 'lucide-react';

/**
 * Unified renderer — single column with +/- prefixes and color-coded lines.
 */
function UnifiedRenderer({ changes }) {
  return (
    <div className="bg-surface-base rounded-xl overflow-hidden">
      <div className="max-h-[600px] overflow-auto font-mono text-xs leading-relaxed">
        {changes.map((change, idx) => {
          if (change.added) {
            return (
              <div
                key={idx}
                className="flex bg-emerald-500/10 text-emerald-300 hover:bg-white/[0.02]"
                aria-label="added line"
              >
                <span className="w-8 shrink-0 text-right pr-2 text-slate-600 select-none">
                  +
                </span>
                <span className="whitespace-pre-wrap flex-1">
                  {change.value}
                </span>
              </div>
            );
          }
          if (change.removed) {
            return (
              <div
                key={idx}
                className="flex bg-red-500/10 text-red-300 hover:bg-white/[0.02]"
                aria-label="removed line"
              >
                <span className="w-8 shrink-0 text-right pr-2 text-slate-600 select-none">
                  &minus;
                </span>
                <span className="whitespace-pre-wrap flex-1">
                  {change.value}
                </span>
              </div>
            );
          }
          return (
            <div
              key={idx}
              className="flex text-slate-200 hover:bg-white/[0.02]"
              aria-label="unchanged line"
            >
              <span className="w-8 shrink-0 text-right pr-2 text-slate-600 select-none">
                {' '}
              </span>
              <span className="whitespace-pre-wrap flex-1">{change.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Side-by-side renderer — two aligned columns with synchronized scrolling.
 * Removed lines appear in left column, added lines in right column.
 */
function SideBySideRenderer({ changes, labelA, labelB }) {
  const rows = useMemo(() => {
    const result = [];
    let i = 0;
    while (i < changes.length) {
      const change = changes[i];
      if (change.removed && changes[i + 1]?.added) {
        // Pair removed + added as a side-by-side row
        const removedLines = change.value.split('\n');
        const addedLines = changes[i + 1].value.split('\n');
        // Remove trailing empty string from split if original ended with \n
        if (removedLines[removedLines.length - 1] === '') removedLines.pop();
        if (addedLines[addedLines.length - 1] === '') addedLines.pop();
        const maxLen = Math.max(removedLines.length, addedLines.length);
        for (let j = 0; j < maxLen; j++) {
          result.push({
            left: j < removedLines.length ? removedLines[j] : null,
            right: j < addedLines.length ? addedLines[j] : null,
            type: 'changed',
          });
        }
        i += 2;
      } else if (change.added) {
        const lines = change.value.split('\n');
        if (lines[lines.length - 1] === '') lines.pop();
        for (const line of lines) {
          result.push({ left: null, right: line, type: 'added' });
        }
        i += 1;
      } else if (change.removed) {
        const lines = change.value.split('\n');
        if (lines[lines.length - 1] === '') lines.pop();
        for (const line of lines) {
          result.push({ left: line, right: null, type: 'removed' });
        }
        i += 1;
      } else {
        const lines = change.value.split('\n');
        if (lines[lines.length - 1] === '') lines.pop();
        for (const line of lines) {
          result.push({ left: line, right: line, type: 'unchanged' });
        }
        i += 1;
      }
    }
    return result;
  }, [changes]);

  return (
    <div className="hidden lg:block">
      {/* Column headers */}
      <div className="grid grid-cols-2 gap-0 mb-2">
        <div className="text-sm font-semibold text-slate-100 truncate pr-3 pb-2 border-b border-slate-800">
          {labelA}
        </div>
        <div className="text-sm font-semibold text-slate-100 truncate pl-3 pb-2 border-b border-slate-800">
          {labelB}
        </div>
      </div>

      <div className="bg-surface-base rounded-xl overflow-hidden">
        <div className="max-h-[600px] overflow-auto font-mono text-xs leading-relaxed">
          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-0">
              <div
                className={`border-r border-slate-800 pr-2 hover:bg-white/[0.02] ${
                  row.type === 'unchanged'
                    ? 'text-slate-200'
                    : row.type === 'removed'
                      ? 'bg-red-500/10 text-red-300'
                      : 'text-slate-200'
                } ${row.left === null ? 'bg-surface-base/50' : ''}`}
              >
                {row.left !== null ? (
                  <span className="whitespace-pre-wrap pl-2">
                    {row.type === 'removed' ? '\u2212 ' : '  '}
                    {row.left}
                  </span>
                ) : (
                  <span className="text-slate-600">&nbsp;</span>
                )}
              </div>
              <div
                className={`pl-2 hover:bg-white/[0.02] ${
                  row.type === 'unchanged'
                    ? 'text-slate-200'
                    : row.type === 'added'
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'text-slate-200'
                } ${row.right === null ? 'bg-surface-base/50' : ''}`}
              >
                {row.right !== null ? (
                  <span className="whitespace-pre-wrap">
                    {row.type === 'added' ? '+ ' : '  '}
                    {row.right}
                  </span>
                ) : (
                  <span className="text-slate-600">&nbsp;</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Summary bar showing counts of added/removed/unchanged lines.
 */
function SummaryBar({ changes }) {
  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let unchanged = 0;
    for (const change of changes) {
      if (change.added) {
        added += change.count;
      } else if (change.removed) {
        removed += change.count;
      } else {
        unchanged += change.count;
      }
    }
    return { added, removed, unchanged };
  }, [changes]);

  return (
    <div className="flex flex-wrap gap-3 text-xs border-t border-slate-800 mt-3 pt-3">
      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[11px] px-2 py-0.5">
        +{stats.added} added
      </span>
      <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 rounded-full text-[11px] px-2 py-0.5">
        &minus;{stats.removed} removed
      </span>
      <span className="text-slate-500 text-[11px]">
        {stats.unchanged} unchanged
      </span>
    </div>
  );
}

/**
 * DiffView — main component.
 */
export default function DiffView({
  textA = '',
  textB = '',
  labelA = 'Model A',
  labelB = 'Model B',
  displayMode = 'unified',
  onDisplayModeChange = () => {},
  onBack = () => {},
}) {
  const changes = useMemo(() => diffLines(textA, textB), [textA, textB]);

  // Both empty
  if (textA === '' && textB === '') {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            className="text-slate-400 hover:text-white hover:bg-surface-overlay rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Grid
          </button>
        </div>
        <div className="bg-violet-500/10 text-violet-300 rounded-lg p-4 text-center text-sm flex flex-col items-center gap-2">
          <Info className="w-5 h-5" />
          <span>No responses to compare</span>
        </div>
      </div>
    );
  }

  // Identical texts
  const hasChanges = changes.some((c) => c.added || c.removed);

  return (
    <div
      role="region"
      aria-label={`Text comparison between ${labelA} and ${labelB}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          className="text-slate-400 hover:text-white hover:bg-surface-overlay rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Grid
        </button>

        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Comparison
        </span>

        {/* Mode toggle */}
        <div
          className="flex items-center gap-1 bg-surface-base rounded-lg p-0.5"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={displayMode === 'unified'}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 ${
              displayMode === 'unified'
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => onDisplayModeChange('unified')}
          >
            <AlignJustify className="w-3 h-3" />
            Unified
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={displayMode === 'side-by-side'}
            className={`hidden lg:inline-flex px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer items-center gap-1 ${
              displayMode === 'side-by-side'
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => onDisplayModeChange('side-by-side')}
          >
            <Columns2 className="w-3 h-3" />
            Side by Side
          </button>
        </div>
      </div>

      {/* Identical text banner */}
      {!hasChanges ? (
        <div className="bg-violet-500/10 text-violet-300 rounded-lg p-4 text-center text-sm flex flex-col items-center gap-2">
          <Info className="w-5 h-5" />
          <span>No differences found</span>
          <span className="text-xs text-violet-400/70">
            Both responses are identical.
          </span>
        </div>
      ) : (
        <>
          {/* Diff content */}
          {displayMode === 'unified' ? (
            <UnifiedRenderer changes={changes} />
          ) : (
            <SideBySideRenderer
              changes={changes}
              labelA={labelA}
              labelB={labelB}
            />
          )}

          {/* Fallback unified view for mobile when side-by-side is selected */}
          {displayMode === 'side-by-side' && (
            <div className="lg:hidden mt-4">
              <div className="text-xs text-slate-500 mb-2 text-center">
                Side-by-side is available on desktop. Showing unified view:
              </div>
              <UnifiedRenderer changes={changes} />
            </div>
          )}

          {/* Summary bar */}
          <SummaryBar changes={changes} />
        </>
      )}
    </div>
  );
}
