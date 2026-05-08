/**
 * HistoryList — filterable list of run history records.
 *
 * Renders a flat list of record rows inside a container card.
 * Supports accordion expansion (one at a time), individual delete,
 * and empty/no-match states.
 *
 * Props:
 *   runs      — Run[] to display
 *   expandedId — string | null (currently expanded record ID)
 *   onToggle   — (id: string) => void
 *   onDelete   — (id: string) => void
 */
import { Link } from 'react-router';
import { Clock, Coins, Zap, DollarSign, Trash2, ChevronUp } from 'lucide-react';

// --- Utility functions ---

function relativeTime(iso) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTokens(n) {
  return n != null ? new Intl.NumberFormat('en-US').format(n) : '0';
}

function formatLatency(ms) {
  if (ms == null) return '0.0s';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(cost) {
  if (cost == null) return 'N/A';
  return '$' + Number(cost).toFixed(4);
}

// --- Sub-components ---

function TypeBadge({ type }) {
  const isComparison = type === 'comparison';
  const label = isComparison ? 'Comparison' : 'Playground';
  const styles = isComparison
    ? 'bg-violet-500/10 text-violet-400'
    : 'bg-violet-500/10 text-violet-400';
  return (
    <span className={`rounded-full text-xs px-2 py-0.5 font-medium ${styles}`}>
      {label}
    </span>
  );
}

function ProviderBadge({ provider }) {
  if (!provider) return null;
  return (
    <span className="bg-cyan-500/10 text-cyan-400 rounded-full text-xs px-2 py-0.5">
      {provider}
    </span>
  );
}

function MetaBadges({ tokens, latency, cost }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 rounded-full text-xs px-2.5 py-1">
        <Coins className="w-3.5 h-3.5" />
        {formatTokens(tokens)} tokens
      </span>
      <span className="inline-flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 rounded-full text-xs px-2.5 py-1">
        <Zap className="w-3.5 h-3.5" />
        {formatLatency(latency)}
      </span>
      <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs px-2.5 py-1">
        <DollarSign className="w-3.5 h-3.5" />
        {formatCost(cost)}
      </span>
    </div>
  );
}

function RecordRow({ run, isExpanded, onToggle, onDelete }) {
  const promptPreview =
    run.prompt.length > 80 ? run.prompt.slice(0, 80) + '...' : run.prompt;

  return (
    <div
      className={`border-b border-slate-800/50 last:border-b-0 ${
        !isExpanded ? 'hover:bg-surface-overlay/50 transition-colors' : ''
      }`}
    >
      {/* Collapsed row — clickable */}
      <div
        className="px-5 py-4 flex items-start justify-between gap-4 cursor-pointer"
        onClick={() => onToggle(run.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle(run.id);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <div className="flex-1 min-w-0">
          {/* Top line: type badge + timestamp */}
          <div className="flex items-center gap-2 mb-1">
            <TypeBadge type={run.type} />
            <span className="text-slate-600 text-xs">&bull;</span>
            <span className="text-xs text-slate-500">{relativeTime(run.createdAt)}</span>
          </div>

          {/* Second line: model name + provider */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-slate-100">{run.modelName}</h3>
            <ProviderBadge provider={run.modelProvider} />
          </div>

          {/* Third line: prompt preview (collapsed only) */}
          {!isExpanded && (
            <p className="text-xs text-slate-400 truncate">
              &ldquo;{promptPreview}&rdquo;
            </p>
          )}

          {/* Metadata badges — collapsed */}
          {!isExpanded && (
            <div className="mt-2">
              <MetaBadges tokens={run.tokens} latency={run.latency} cost={run.cost} />
            </div>
          )}
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(run.id);
          }}
          aria-label="Delete this run record"
          className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-5 pb-4">
          {/* Prompt block */}
          <div className="bg-surface-base/50 rounded-lg p-3 mt-3">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Prompt</div>
            <p className="text-sm text-slate-300 whitespace-pre-wrap mt-1">
              {run.prompt}
            </p>
          </div>

          {/* Response block */}
          {run.responseText && (
            <div className="bg-surface-base/50 rounded-lg p-3 mt-3">
              <div className="text-xs text-slate-500 uppercase tracking-wide">Response</div>
              <p className="font-mono text-sm text-slate-200 whitespace-pre-wrap mt-1">
                {run.responseText}
              </p>
            </div>
          )}

          {/* Metadata badges — expanded */}
          <div className="mt-3">
            <MetaBadges tokens={run.tokens} latency={run.latency} cost={run.cost} />
          </div>

          {/* Collapse link */}
          <button
            type="button"
            onClick={() => onToggle(run.id)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors mt-3 inline-flex items-center gap-1 cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            Collapse
          </button>
        </div>
      )}
    </div>
  );
}

// --- Main component ---

export default function HistoryList({ runs, expandedId, onToggle, onDelete }) {
  if (runs.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-3">
        <Clock className="w-8 h-8 text-slate-600" />
        <h2 className="text-sm font-medium text-slate-400">No run history yet</h2>
        <p className="text-xs text-slate-500 text-center">
          Run a prompt in the Playground to start building your history.
        </p>
        <Link
          to="/playground"
          className="text-sm text-violet-400 hover:text-violet-300 transition-colors mt-1"
        >
          Go to Playground &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface-raised rounded-xl overflow-hidden" aria-live="polite">
      {runs.map((run) => (
        <RecordRow
          key={run.id}
          run={run}
          isExpanded={expandedId === run.id}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
