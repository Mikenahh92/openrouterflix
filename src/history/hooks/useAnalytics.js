/**
 * useAnalytics hook — subscribes to run history store and computes model statistics.
 *
 * Returns memoized { summary, modelStats } that update when runs or filters change.
 * Filters are applied before aggregation.
 */
import { useMemo } from 'react';
import useRunHistoryStore from '../store';
import { filterRecords, computeModelStats } from '../lib/computeStats';

/**
 * @param {{ dateRange?: string, typeFilter?: string, modelFilter?: string[] }} filters
 * @returns {{
 *   summary: { totalRuns: number, uniqueModels: number, avgLatency: number, totalCost: number|null },
 *   modelStats: ReturnType<typeof computeModelStats>,
 *   filteredRuns: Run[],
 * }}
 */
export default function useAnalytics({ dateRange = 'all', typeFilter = 'all', modelFilter = [] } = {}) {
  const runs = useRunHistoryStore((s) => s.runs);

  const filteredRuns = useMemo(
    () => filterRecords(runs, { dateRange, typeFilter, modelFilter }),
    [runs, dateRange, typeFilter, modelFilter]
  );

  const modelStats = useMemo(
    () => computeModelStats(filteredRuns),
    [filteredRuns]
  );

  const summary = useMemo(() => {
    const totalRuns = filteredRuns.length;
    const uniqueModels = modelStats.length;

    // Average latency across all filtered runs
    let avgLatency = 0;
    if (totalRuns > 0) {
      const totalLatency = filteredRuns.reduce((sum, r) => sum + (r.latency ?? 0), 0);
      avgLatency = totalLatency / totalRuns;
    }

    // Total cost across all filtered runs (excluding nulls)
    let totalCost = null;
    const costs = filteredRuns.map((r) => r.cost).filter((c) => c != null);
    if (costs.length > 0) {
      totalCost = costs.reduce((sum, c) => sum + c, 0);
    }

    return { totalRuns, uniqueModels, avgLatency, totalCost };
  }, [filteredRuns, modelStats]);

  return { summary, modelStats, filteredRuns };
}
