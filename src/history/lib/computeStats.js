/**
 * computeStats — Pure functions for statistical computation from run history data.
 *
 * Zero dependencies on React, Zustand, or the DOM.
 * All functions accept plain arrays and return plain objects.
 *
 * Functions:
 *   filterRecords(records, { dateRange, typeFilter, modelFilter }) → filtered Run[]
 *   computePercentile(sortedValues, percentile) → number
 *   computeLatencyStats(runs) → { min, avg, max, p95 }
 *   computeCostStats(runs) → { avg, total, min, max }
 *   computeTokenStats(runs) → { avg, total, min, max }
 *   computeModelStats(runs) → ModelStats[]
 *   formatLatency(ms) → string
 *   formatCost(cost) → string
 *   formatTokens(n) → string
 */

// --- Formatters ---

/**
 * Format latency in milliseconds to a human-readable string.
 * @param {number} ms
 * @returns {string}
 */
export function formatLatency(ms) {
  if (ms == null) return '0.0s';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Format cost in USD to a display string.
 * @param {number|null} cost
 * @returns {string}
 */
export function formatCost(cost) {
  if (cost == null) return 'N/A';
  return '$' + Number(cost).toFixed(4);
}

/**
 * Format a token count with K/M suffix for large numbers.
 * @param {number} n
 * @returns {string}
 */
export function formatTokens(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return new Intl.NumberFormat('en-US').format(n);
}

// --- Filtering ---

/**
 * Filter run records by date range, run type, and model IDs.
 * @param {Run[]} records
 * @param {{ dateRange?: string, typeFilter?: string, modelFilter?: string[] }} filters
 * @returns {Run[]}
 */
export function filterRecords(records, { dateRange = 'all', typeFilter = 'all', modelFilter = [] } = {}) {
  return records.filter((run) => {
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

    // Type filter
    if (typeFilter !== 'all' && run.type !== typeFilter) return false;

    // Model filter (array of model IDs)
    if (modelFilter.length > 0 && !modelFilter.includes(run.modelId)) return false;

    return true;
  });
}

// --- Statistical Computation ---

/**
 * Compute a percentile using the nearest-rank method.
 * Assumes the input array is already sorted in ascending order.
 * @param {number[]} sortedValues
 * @param {number} percentile — 0–100
 * @returns {number}
 */
export function computePercentile(sortedValues, percentile) {
  if (sortedValues.length === 0) return 0;
  const rank = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, rank)];
}

/**
 * Compute latency statistics for a set of runs.
 * @param {Run[]} runs
 * @returns {{ min: number, avg: number, max: number, p95: number }}
 */
export function computeLatencyStats(runs) {
  if (runs.length === 0) return { min: 0, avg: 0, max: 0, p95: 0 };

  const latencies = runs.map((r) => r.latency).filter((l) => l != null);
  if (latencies.length === 0) return { min: 0, avg: 0, max: 0, p95: 0 };

  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = latencies.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    avg: sum / latencies.length,
    max: sorted[sorted.length - 1],
    p95: computePercentile(sorted, 95),
  };
}

/**
 * Compute cost statistics for a set of runs.
 * Excludes null costs from averages.
 * @param {Run[]} runs
 * @returns {{ avg: number|null, total: number|null, min: number|null, max: number|null }}
 */
export function computeCostStats(runs) {
  const costs = runs.map((r) => r.cost).filter((c) => c != null);

  if (costs.length === 0) {
    return { avg: null, total: null, min: null, max: null };
  }

  const sorted = [...costs].sort((a, b) => a - b);
  const sum = costs.reduce((a, b) => a + b, 0);

  return {
    avg: sum / costs.length,
    total: sum,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

/**
 * Compute token statistics for a set of runs.
 * @param {Run[]} runs
 * @returns {{ avg: number, total: number, min: number, max: number }}
 */
export function computeTokenStats(runs) {
  if (runs.length === 0) return { avg: 0, total: 0, min: 0, max: 0 };

  const tokens = runs.map((r) => r.tokens ?? 0);
  const sorted = [...tokens].sort((a, b) => a - b);
  const sum = tokens.reduce((a, b) => a + b, 0);

  return {
    avg: sum / tokens.length,
    total: sum,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

/**
 * Compute per-model statistics from a set of run records.
 * Groups by modelId and computes latency, cost, and token aggregates.
 *
 * @param {Run[]} runs
 * @returns {Array<{
 *   modelId: string,
 *   modelName: string,
 *   modelProvider: string,
 *   runCount: number,
 *   latency: { min: number, avg: number, max: number, p95: number },
 *   cost: { avg: number|null, total: number|null, min: number|null, max: number|null },
 *   tokens: { avg: number, total: number, min: number, max: number },
 * }>}
 */
export function computeModelStats(runs) {
  if (runs.length === 0) return [];

  const groups = new Map();

  for (const run of runs) {
    const key = run.modelId;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(run);
  }

  const result = [];

  for (const [modelId, modelRuns] of groups) {
    const first = modelRuns[0];
    result.push({
      modelId,
      modelName: first.modelName || modelId,
      modelProvider: first.modelProvider || '',
      runCount: modelRuns.length,
      latency: computeLatencyStats(modelRuns),
      cost: computeCostStats(modelRuns),
      tokens: computeTokenStats(modelRuns),
    });
  }

  return result;
}
