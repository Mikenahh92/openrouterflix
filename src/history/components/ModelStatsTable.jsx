/**
 * ModelStatsTable — sortable data table of per-model statistics.
 *
 * Props:
 *   models      — array of computed model stats from computeModelStats()
 *   sortConfig  — { key: string, direction: 'asc' | 'desc' }
 *   onSort      — (key: string) => void
 */
import { ChevronUp, ChevronDown } from 'lucide-react';
import { formatLatency, formatCost, formatTokens } from '../lib/computeStats';

// --- LatencyRangeBar (decorative) ---

function LatencyRangeBar({ min, max, globalMin, globalMax }) {
  if (globalMax <= globalMin) return null;

  const leftPct = ((min - globalMin) / (globalMax - globalMin)) * 100;
  const widthPct = ((max - min) / (globalMax - globalMin)) * 100;

  return (
    <div
      className="h-1 rounded-full bg-slate-800 mt-1 w-full max-w-[120px]"
      aria-hidden="true"
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
        style={{
          marginLeft: `${leftPct}%`,
          width: `${Math.max(widthPct, 2)}%`,
        }}
      />
    </div>
  );
}

// --- Sortable column header ---

function SortHeader({ label, sortKey, sortConfig, onSort }) {
  const isActive = sortConfig.key === sortKey;
  const direction = isActive ? sortConfig.direction : null;

  return (
    <th
      scope="col"
      className="text-right text-xs text-slate-400 font-medium uppercase tracking-wide px-3 py-3"
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 cursor-pointer transition-colors ${
          isActive ? 'text-slate-200' : 'text-slate-400 hover:text-slate-300'
        }`}
        aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
      >
        {label}
        {direction === 'asc' && <ChevronUp className="w-3 h-3" />}
        {direction === 'desc' && <ChevronDown className="w-3 h-3" />}
      </button>
    </th>
  );
}

// --- Main component ---

export default function ModelStatsTable({ models, sortConfig, onSort }) {
  if (models.length === 0) return null;

  // Compute global latency range for LatencyRangeBar
  const allLatencyMins = models.map((m) => m.latency.min).filter((v) => v > 0);
  const allLatencyMaxes = models.map((m) => m.latency.max).filter((v) => v > 0);
  const globalMin = allLatencyMins.length > 0 ? Math.min(...allLatencyMins) : 0;
  const globalMax = allLatencyMaxes.length > 0 ? Math.max(...allLatencyMaxes) : 1;

  return (
    <div className="bg-surface-raised rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th scope="col" className="text-left text-xs text-slate-400 font-medium uppercase tracking-wide px-4 py-3">
                Model
              </th>
              <SortHeader label="Runs" sortKey="runCount" sortConfig={sortConfig} onSort={onSort} />
              <SortHeader label="Avg Latency" sortKey="avgLatency" sortConfig={sortConfig} onSort={onSort} />
              <SortHeader label="P95 Latency" sortKey="p95Latency" sortConfig={sortConfig} onSort={onSort} />
              <SortHeader label="Avg Cost" sortKey="avgCost" sortConfig={sortConfig} onSort={onSort} />
              <SortHeader label="Tokens" sortKey="totalTokens" sortConfig={sortConfig} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {models.map((model) => {
              const isLowConfidence = model.runCount < 20;
              return (
                <tr
                  key={model.modelId}
                  className="border-b border-slate-800/50 last:border-b-0 hover:bg-surface-overlay/50 transition-colors"
                >
                  {/* Model name + provider */}
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-100">{model.modelName}</div>
                    {model.modelProvider && (
                      <span className="bg-cyan-500/10 text-cyan-400 rounded-full text-xs px-2 py-0.5">
                        {model.modelProvider}
                      </span>
                    )}
                    <LatencyRangeBar
                      min={model.latency.min}
                      max={model.latency.max}
                      globalMin={globalMin}
                      globalMax={globalMax}
                    />
                  </td>
                  {/* Runs */}
                  <td className="text-right text-slate-200 px-3 py-3 tabular-nums">
                    {model.runCount}
                  </td>
                  {/* Avg Latency */}
                  <td className="text-right text-slate-200 px-3 py-3 tabular-nums">
                    {formatLatency(model.latency.avg)}
                  </td>
                  {/* P95 Latency */}
                  <td className="text-right px-3 py-3 tabular-nums">
                    <span className={isLowConfidence ? 'text-slate-400' : 'text-slate-200'} title={isLowConfidence ? 'P95 is approximate — fewer than 20 data points.' : undefined}>
                      {isLowConfidence ? '~' : ''}{formatLatency(model.latency.p95)}
                    </span>
                  </td>
                  {/* Avg Cost */}
                  <td className="text-right text-slate-200 px-3 py-3 tabular-nums">
                    {formatCost(model.cost.avg)}
                  </td>
                  {/* Total Tokens */}
                  <td className="text-right text-slate-200 px-3 py-3 tabular-nums">
                    {formatTokens(model.tokens.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
