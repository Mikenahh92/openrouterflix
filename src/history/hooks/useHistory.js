/**
 * useHistory hook — selector hook wrapping useRunHistoryStore.
 *
 * Provides convenient access to run history state and actions.
 */
import useRunHistoryStore from '../store';

/**
 * @returns {{ runs: Run[], addRun: Function, addComparisonRun: Function, deleteRun: Function, clearAll: Function }}
 */
export default function useHistory() {
  const runs = useRunHistoryStore((s) => s.runs);
  const addRun = useRunHistoryStore((s) => s.addRun);
  const addComparisonRun = useRunHistoryStore((s) => s.addComparisonRun);
  const deleteRun = useRunHistoryStore((s) => s.deleteRun);
  const clearAll = useRunHistoryStore((s) => s.clearAll);

  return { runs, addRun, addComparisonRun, deleteRun, clearAll };
}
