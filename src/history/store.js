/**
 * Run history store — Zustand persisted store capturing playground runs.
 *
 * State shape:
 *   { runs: Run[] }  — index 0 = most recent
 *
 * Run record:
 *   {
 *     id: string,            — crypto.randomUUID()
 *     type: 'playground' | 'comparison',
 *     modelId: string,
 *     modelName: string,
 *     modelProvider: string,
 *     prompt: string,
 *     responseText: string,
 *     tokens: number,
 *     latency: number,
 *     cost: number | null,
 *     createdAt: string,     — ISO 8601
 *     groupId?: string,      — shared ID for comparison runs
 *   }
 *
 * Actions:
 *   addRun(runData)           — prepend a playground run, prune to MAX_HISTORY_RUNS
 *   addComparisonRun(prompt, results) — create one Run per model result (type: comparison)
 *   deleteRun(id)             — remove single run by ID
 *   clearAll()                — empty runs array
 *
 * Persistence: localStorage key "orf-run-history", version 1
 */
import { createPersistedStore } from '../shared/lib/persist';
import { DEFAULTS } from '../shared/lib/constants';

const { MAX_HISTORY_RUNS } = DEFAULTS;

const useRunHistoryStore = createPersistedStore(
  'run-history',
  (set, get) => ({
    runs: [],

    /**
     * Add a single playground run. Prepends and prunes to MAX_HISTORY_RUNS.
     * @param {Omit<Run, 'id' | 'createdAt'>} runData
     */
    addRun(runData) {
      const run = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...runData,
      };

      set((state) => ({
        runs: [run, ...state.runs].slice(0, MAX_HISTORY_RUNS),
      }));
    },

    /**
     * Add comparison runs — one Run record per model result, all sharing a groupId.
     * @param {string} prompt
     * @param {Array<{ model: string, text: string, tokens: number, latency: number, cost: number|null }>} results
     */
    addComparisonRun(prompt, results) {
      const groupId = crypto.randomUUID();
      const newRuns = results.map((r) => ({
        id: crypto.randomUUID(),
        type: 'comparison',
        groupId,
        prompt,
        modelId: r.model,
        modelName: r.modelName ?? r.model,
        modelProvider: r.modelProvider ?? '',
        responseText: r.text,
        tokens: r.tokens,
        latency: r.latency,
        cost: r.cost,
        createdAt: new Date().toISOString(),
      }));

      set((state) => ({
        runs: [...newRuns, ...state.runs].slice(0, MAX_HISTORY_RUNS),
      }));
    },

    /**
     * Delete a single run by ID.
     * @param {string} id
     */
    deleteRun(id) {
      set((state) => ({
        runs: state.runs.filter((r) => r.id !== id),
      }));
    },

    /**
     * Clear all run history.
     */
    clearAll() {
      set({ runs: [] });
    },
  }),
  {
    partialize: (state) => ({ runs: state.runs }),
  }
);

export default useRunHistoryStore;
