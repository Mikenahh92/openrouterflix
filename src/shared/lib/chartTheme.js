/**
 * chartTheme — Neural Glow palette tokens for Recharts.
 *
 * Single source of truth for all chart colors and styles.
 * Every chart component in ORF-035/036 must import from this module.
 * No hardcoded hex color values in chart files.
 *
 * Contract:
 *   - colors[i] — series color by index (wrap with modulo)
 *   - gridColor — <CartesianGrid stroke>
 *   - axisColor — <XAxis>/<YAxis> stroke and tick fill
 *   - tooltipStyle — spread into <Tooltip contentStyle/wrapperStyle>
 *   - legendStyle — spread into <Legend wrapperStyle>
 */

/** @type {Readonly<string[]>} Series colors from Neural Glow palette */
const colors = Object.freeze([
  '#8b5cf6', // violet-500 — primary series
  '#06b6d4', // cyan-500 — secondary series
  '#10b981', // emerald-500 — cost/positive
  '#f59e0b', // amber-500 — token/warning
  '#f43f5e', // rose-500 — error/negative
  '#a78bfa', // violet-400 — primary light
  '#22d3ee', // cyan-400 — secondary light
  '#34d399', // emerald-400 — cost/positive light
]);

/** @type {Readonly<string>} CartesianGrid stroke color (slate-800) */
const gridColor = '#1e293b';

/** @type {Readonly<string>} Axis stroke/tick color (slate-400) */
const axisColor = '#94a3b8';

/** @type {Readonly<string>} Chart background */
const backgroundColor = 'transparent';

/** @type {Readonly<import('react').CSSProperties>} Tooltip styling */
const tooltipStyle = Object.freeze({
  backgroundColor: '#131625', // surface-raised
  border: '1px solid #1e293b', // slate-800
  borderRadius: '8px',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
  color: '#F1F5F9', // slate-100
  fontSize: '13px',
});

/** @type {Readonly<import('react').CSSProperties>} Legend styling */
const legendStyle = Object.freeze({
  color: '#94a3b8', // slate-400
  fontSize: '12px',
  padding: '4px 12px',
});

/**
 * Aggregated chart theme object.
 * @type {{ colors: string[], gridColor: string, axisColor: string, backgroundColor: string, tooltipStyle: object, legendStyle: object }}
 */
const chartTheme = Object.freeze({
  colors,
  gridColor,
  axisColor,
  backgroundColor,
  tooltipStyle,
  legendStyle,
});

export { chartTheme };
export default chartTheme;
