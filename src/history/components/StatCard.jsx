/**
 * StatCard — compact metric display card for the analytics summary row.
 *
 * Props:
 *   icon        — Lucide icon component
 *   label       — string (e.g., "Total Runs")
 *   value       — string (formatted, e.g., "42")
 *   subtitle    — optional string (e.g., "across all models")
 *   accentColor — 'violet' | 'cyan' | 'amber' | 'emerald'
 */
const ACCENT_CLASSES = {
  violet: {
    icon: 'text-violet-400',
    border: 'border-l-violet-500/50',
  },
  cyan: {
    icon: 'text-cyan-400',
    border: 'border-l-cyan-500/50',
  },
  amber: {
    icon: 'text-amber-400',
    border: 'border-l-amber-500/50',
  },
  emerald: {
    icon: 'text-emerald-400',
    border: 'border-l-emerald-500/50',
  },
};

export default function StatCard({ icon: Icon, label, value, subtitle, accentColor = 'violet' }) {
  const accent = ACCENT_CLASSES[accentColor] || ACCENT_CLASSES.violet;

  return (
    <div
      className={`bg-surface-raised rounded-xl p-5 border border-slate-800/50 border-l-2 ${accent.border}`}
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${accent.icon}`} />
        <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-100">{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}
