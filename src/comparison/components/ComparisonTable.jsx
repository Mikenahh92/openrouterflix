/**
 * ComparisonTable — horizontal comparison table for 2-4 AI models.
 *
 * Renders dimension rows (provider, pricing, latency, context window,
 * quality score, max output, modalities, categories) with per-model columns.
 * Computes best-value highlighting per row using emerald accent.
 * Handles null values with "—" display.
 *
 * Follows Style Guide: semantic <table>, alternating row backgrounds,
 * surface-raised card styling, scrollbar-thin horizontal scroll.
 */
import { useMemo } from 'react';
import {
  Server,
  Coins,
  Zap,
  Ruler,
  Star,
  ArrowUpFromLine,
  Tag,
} from 'lucide-react';
import ComparisonCard from './ComparisonCard';

/* ─── Helpers ──────────────────────────────────────────────────────── */

/** Format token count: show as K if >= 1000 */
function formatTokens(value) {
  if (value == null) return null;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return `${value}`;
}

/** Format price per 1M tokens */
function formatPrice(value) {
  if (value == null) return null;
  if (value === 0) return 'Free';
  return `$${value.toFixed(2)}/1M`;
}

/** Null display */
function Fallback({ value }) {
  if (value == null) return <span className="text-slate-500">—</span>;
  return value;
}

/* ─── Dimension Row Config ─────────────────────────────────────────── */

const DIMENSIONS = [
  {
    key: 'provider',
    label: 'Provider',
    icon: Server,
    getValue: (m) => m.provider,
    bestMode: null, // categorical — no highlighting
    format: (v) => v,
  },
  {
    key: 'pricing.prompt',
    label: 'Input Price',
    icon: Coins,
    getValue: (m) => m.pricing?.prompt,
    bestMode: 'min',
    format: (v) => formatPrice(v),
  },
  {
    key: 'pricing.completion',
    label: 'Output Price',
    icon: Coins,
    getValue: (m) => m.pricing?.completion,
    bestMode: 'min',
    format: (v) => formatPrice(v),
  },
  {
    key: 'latency',
    label: 'Latency',
    icon: Zap,
    getValue: (m) => m.latency,
    bestMode: 'min',
    format: (v) => (v != null ? `${v}ms` : null),
  },
  {
    key: 'contextWindow',
    label: 'Context Window',
    icon: Ruler,
    getValue: (m) => m.contextWindow,
    bestMode: 'max',
    format: (v) => (v != null ? `${formatTokens(v)} tokens` : null),
  },
  {
    key: 'qualityScore',
    label: 'Quality Score',
    icon: Star,
    getValue: (m) => m.qualityScore,
    bestMode: 'max',
    format: (v) => (v != null ? `${v}/5` : null),
  },
  {
    key: 'maxOutput',
    label: 'Max Output',
    icon: ArrowUpFromLine,
    getValue: (m) => m.maxOutput,
    bestMode: 'max',
    format: (v) => (v != null ? `${formatTokens(v)} tokens` : null),
  },
  {
    key: 'modalities',
    label: 'Modalities',
    icon: Tag,
    getValue: (m) => m.modalities,
    bestMode: null, // badge list — no highlighting
    isArray: true,
    badgeClass: 'bg-cyan-500/10 text-cyan-400 rounded-full text-xs px-3 py-1',
  },
  {
    key: 'categories',
    label: 'Categories',
    icon: Tag,
    getValue: (m) => m.categories,
    bestMode: null, // badge list — no highlighting
    isArray: true,
    badgeClass: 'bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full text-xs px-2 py-0.5',
  },
];

/* ─── Best-Value Highlighting ──────────────────────────────────────── */

/**
 * Compute a map of (dimension key) -> Set<modelIndex> for best values.
 * Memoized on models array reference.
 *
 * @param {Array} models — array of normalized model objects
 * @returns {Map<string, Set<number>>}
 */
function computeHighlights(models, dimensions = DIMENSIONS) {
  const highlights = new Map();

  for (const dim of dimensions) {
    if (!dim.bestMode) continue;

    // Collect non-null numeric values with their indices
    const values = models
      .map((m, i) => ({ index: i, value: dim.getValue(m) }))
      .filter((v) => v.value != null && typeof v.value === 'number');

    if (values.length === 0) continue;

    // Compute target (min or max)
    const numericValues = values.map((v) => v.value);
    const target =
      dim.bestMode === 'min' ? Math.min(...numericValues) : Math.max(...numericValues);

    // Find all indices matching the target (handles ties)
    const bestIndices = new Set(
      values.filter((v) => v.value === target).map((v) => v.index)
    );

    highlights.set(dim.key, bestIndices);
  }

  return highlights;
}

/* ─── Cell Renderer ────────────────────────────────────────────────── */

function DataCell({ model, dim, isHighlighted }) {
  const value = dim.getValue(model);

  if (dim.isArray) {
    // Array field: render badge pills or nothing
    if (!Array.isArray(value) || value.length === 0) {
      return <td className="px-4 py-3 text-center border-r border-slate-800/50 last:border-r-0" />;
    }
    return (
      <td className="px-4 py-3 text-center border-r border-slate-800/50 last:border-r-0">
        <div className="flex flex-wrap justify-center gap-1">
          {value.map((v) => (
            <span key={v} className={dim.badgeClass}>
              {v}
            </span>
          ))}
        </div>
      </td>
    );
  }

  // Null handling
  if (value == null) {
    return (
      <td className="px-4 py-3 text-center text-sm border-r border-slate-800/50 last:border-r-0">
        <Fallback value={null} />
      </td>
    );
  }

  const formatted = dim.format(value);
  return (
    <td className="px-4 py-3 text-center text-sm border-r border-slate-800/50 last:border-r-0">
      <span className={`font-mono ${isHighlighted ? 'text-emerald-400 font-semibold' : 'text-slate-100'}`}>
        {formatted}
      </span>
      {isHighlighted && (
        <span className="text-emerald-500/60 text-[10px] ml-1">★</span>
      )}
    </td>
  );
}

/* ─── ComparisonTable ──────────────────────────────────────────────── */

/**
 * @param {object} props
 * @param {Array} props.models — array of normalized model objects (2-4)
 * @param {Function} props.onRemoveModel — callback(modelId) when × is clicked
 * @param {string[]} [props.visibleDimensions] — dimension keys to show (defaults to all)
 */
export default function ComparisonTable({ models, onRemoveModel, visibleDimensions }) {
  const filteredDimensions = useMemo(
    () => (visibleDimensions ? DIMENSIONS.filter((d) => visibleDimensions.includes(d.key)) : DIMENSIONS),
    [visibleDimensions]
  );

  const highlights = useMemo(() => computeHighlights(models, filteredDimensions), [models, filteredDimensions]);

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="min-w-[600px] w-full border-collapse">
        {/* Column headers */}
        <thead>
          <tr>
            {/* Empty corner cell for dimension labels column */}
            <th className="w-44 px-4 py-3 bg-surface-raised border-b border-slate-800" />
            {models.map((model) => (
              <ComparisonCard
                key={model.id}
                model={model}
                onRemove={onRemoveModel}
              />
            ))}
          </tr>
        </thead>

        {/* Dimension rows */}
        <tbody>
          {filteredDimensions.map((dim, rowIdx) => {
            const Icon = dim.icon;
            const isEvenRow = rowIdx % 2 === 0;
            const dimHighlights = highlights.get(dim.key);

            return (
              <tr
                key={dim.key}
                className={isEvenRow ? 'bg-surface-raised' : 'bg-surface-base'}
              >
                {/* Dimension label */}
                <th
                  scope="row"
                  className="w-44 px-4 py-3 text-left text-sm text-slate-400 font-medium bg-surface-raised whitespace-nowrap border-b border-slate-800/50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-500 shrink-0" />
                    {dim.label}
                  </span>
                </th>

                {/* Model data cells */}
                {models.map((model, modelIdx) => (
                  <DataCell
                    key={model.id}
                    model={model}
                    dim={dim}
                    isHighlighted={dimHighlights?.has(modelIdx) ?? false}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
