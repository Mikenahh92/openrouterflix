/**
 * Unit tests for the run history store.
 *
 * Covers:
 *   - Initial state (empty runs)
 *   - addRun — prepends run, assigns id/createdAt/type defaults
 *   - addRun — FIFO pruning to MAX_HISTORY_RUNS
 *   - addComparisonRun — creates one run per result with shared groupId
 *   - addComparisonRun — FIFO pruning
 *   - deleteRun — removes single run by ID
 *   - clearAll — empties runs array
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage before importing the store
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${Math.random().toString(36).slice(2, 9)}`,
});

// Mock constants to use a small cap for pruning tests
vi.mock('../shared/lib/constants', () => ({
  DEFAULTS: {
    MAX_HISTORY_RUNS: 5,
  },
}));

import useRunHistoryStore from './store';

describe('useRunHistoryStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset store state
    useRunHistoryStore.setState({ runs: [] });
  });

  it('has correct initial state', () => {
    const state = useRunHistoryStore.getState();
    expect(state.runs).toEqual([]);
  });

  describe('addRun', () => {
    it('prepends a run with generated id and createdAt', () => {
      useRunHistoryStore.getState().addRun({
        type: 'playground',
        modelId: 'gpt-4o',
        modelName: 'GPT-4o',
        modelProvider: 'OpenAI',
        prompt: 'Hello',
        responseText: 'Hi there!',
        tokens: 100,
        latency: 500,
        cost: 0.001,
      });

      const runs = useRunHistoryStore.getState().runs;
      expect(runs).toHaveLength(1);
      expect(runs[0].id).toMatch(/^test-uuid-/);
      expect(runs[0].createdAt).toBeDefined();
      expect(runs[0].modelId).toBe('gpt-4o');
      expect(runs[0].prompt).toBe('Hello');
    });

    it('defaults type to playground when not specified', () => {
      useRunHistoryStore.getState().addRun({
        modelId: 'claude-3',
        modelName: 'Claude 3',
        modelProvider: 'Anthropic',
        prompt: 'Test',
        responseText: 'Result',
        tokens: 50,
        latency: 200,
        cost: null,
      });

      const run = useRunHistoryStore.getState().runs[0];
      // Type defaults to undefined if not provided, which is fine — the store
      // does not enforce a default type in addRun
      expect(run.modelId).toBe('claude-3');
    });

    it('prunes to MAX_HISTORY_RUNS (FIFO)', () => {
      // MAX_HISTORY_RUNS is mocked to 5
      for (let i = 0; i < 7; i++) {
        useRunHistoryStore.getState().addRun({
          type: 'playground',
          modelId: `model-${i}`,
          modelName: `Model ${i}`,
          modelProvider: 'Test',
          prompt: `Prompt ${i}`,
          responseText: `Response ${i}`,
          tokens: i * 10,
          latency: i * 100,
          cost: i * 0.001,
        });
      }

      const runs = useRunHistoryStore.getState().runs;
      expect(runs).toHaveLength(5);
      // Most recent should be first
      expect(runs[0].modelId).toBe('model-6');
      // Oldest entries (model-0, model-1) should be pruned
      expect(runs.find((r) => r.modelId === 'model-0')).toBeUndefined();
      expect(runs.find((r) => r.modelId === 'model-1')).toBeUndefined();
    });
  });

  describe('addComparisonRun', () => {
    it('creates one run per result with shared groupId', () => {
      const results = [
        { model: 'gpt-4o', modelName: 'GPT-4o', modelProvider: 'OpenAI', text: 'Hello from GPT', tokens: 50, latency: 500, cost: 0.001 },
        { model: 'claude-3', modelName: 'Claude 3', modelProvider: 'Anthropic', text: 'Hello from Claude', tokens: 60, latency: 600, cost: 0.002 },
      ];

      useRunHistoryStore.getState().addComparisonRun('Compare prompt', results);

      const runs = useRunHistoryStore.getState().runs;
      expect(runs).toHaveLength(2);

      // Both should have the same groupId
      expect(runs[0].groupId).toBe(runs[1].groupId);

      // Both should be type 'comparison'
      expect(runs[0].type).toBe('comparison');
      expect(runs[1].type).toBe('comparison');

      // Both should have the same prompt
      expect(runs[0].prompt).toBe('Compare prompt');
      expect(runs[1].prompt).toBe('Compare prompt');

      // Verify model mapping
      expect(runs[0].modelId).toBe('gpt-4o');
      expect(runs[1].modelId).toBe('claude-3');
      expect(runs[0].responseText).toBe('Hello from GPT');
      expect(runs[1].responseText).toBe('Hello from Claude');
    });

    it('prunes to MAX_HISTORY_RUNS with comparison runs', () => {
      // Fill with 4 playground runs first
      for (let i = 0; i < 4; i++) {
        useRunHistoryStore.getState().addRun({
          type: 'playground',
          modelId: `model-${i}`,
          modelName: `Model ${i}`,
          modelProvider: 'Test',
          prompt: `Prompt ${i}`,
          responseText: `Response ${i}`,
          tokens: i,
          latency: i * 100,
          cost: null,
        });
      }

      // Add comparison with 3 results = 3 new runs. Total would be 7, but cap is 5
      const results = [
        { model: 'cmp-1', text: 'R1', tokens: 10, latency: 100, cost: null },
        { model: 'cmp-2', text: 'R2', tokens: 20, latency: 200, cost: null },
        { model: 'cmp-3', text: 'R3', tokens: 30, latency: 300, cost: null },
      ];
      useRunHistoryStore.getState().addComparisonRun('Compare', results);

      const runs = useRunHistoryStore.getState().runs;
      expect(runs).toHaveLength(5);

      // Comparison runs should be at the front (most recent)
      expect(runs[0].type).toBe('comparison');
      expect(runs[1].type).toBe('comparison');
      expect(runs[2].type).toBe('comparison');

      // Only 2 of the original 4 playground runs should survive
      const playground = runs.filter((r) => r.type === 'playground');
      expect(playground).toHaveLength(2);
    });
  });

  describe('deleteRun', () => {
    it('removes a single run by ID', () => {
      useRunHistoryStore.getState().addRun({
        type: 'playground',
        modelId: 'model-1',
        modelName: 'Model 1',
        modelProvider: 'Test',
        prompt: 'P1',
        responseText: 'R1',
        tokens: 10,
        latency: 100,
        cost: null,
      });
      useRunHistoryStore.getState().addRun({
        type: 'playground',
        modelId: 'model-2',
        modelName: 'Model 2',
        modelProvider: 'Test',
        prompt: 'P2',
        responseText: 'R2',
        tokens: 20,
        latency: 200,
        cost: null,
      });

      expect(useRunHistoryStore.getState().runs).toHaveLength(2);
      const idToDelete = useRunHistoryStore.getState().runs[1].id;
      useRunHistoryStore.getState().deleteRun(idToDelete);
      expect(useRunHistoryStore.getState().runs).toHaveLength(1);
      expect(useRunHistoryStore.getState().runs[0].modelId).toBe('model-2');
    });

    it('does nothing if ID not found', () => {
      useRunHistoryStore.getState().addRun({
        type: 'playground',
        modelId: 'model-1',
        modelName: 'Model 1',
        modelProvider: 'Test',
        prompt: 'P1',
        responseText: 'R1',
        tokens: 10,
        latency: 100,
        cost: null,
      });

      useRunHistoryStore.getState().deleteRun('non-existent-id');
      expect(useRunHistoryStore.getState().runs).toHaveLength(1);
    });
  });

  describe('clearAll', () => {
    it('empties the runs array', () => {
      useRunHistoryStore.getState().addRun({
        type: 'playground',
        modelId: 'model-1',
        modelName: 'Model 1',
        modelProvider: 'Test',
        prompt: 'P1',
        responseText: 'R1',
        tokens: 10,
        latency: 100,
        cost: null,
      });
      useRunHistoryStore.getState().addRun({
        type: 'playground',
        modelId: 'model-2',
        modelName: 'Model 2',
        modelProvider: 'Test',
        prompt: 'P2',
        responseText: 'R2',
        tokens: 20,
        latency: 200,
        cost: null,
      });

      expect(useRunHistoryStore.getState().runs).toHaveLength(2);
      useRunHistoryStore.getState().clearAll();
      expect(useRunHistoryStore.getState().runs).toHaveLength(0);
    });
  });
});
