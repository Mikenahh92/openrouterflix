/**
 * Unit tests for computeStats.js — pure statistical computation functions.
 *
 * Covers:
 *   TC-UNIT-001: computeModelStats — empty runs array
 *   TC-UNIT-002: computeModelStats — single run per model
 *   TC-UNIT-003: computeModelStats — multiple runs same model
 *   TC-UNIT-004: computeModelStats — multiple models
 *   TC-UNIT-005: computePercentile — P95 with 20 values
 *   TC-UNIT-006: computePercentile — P95 edge cases
 *   TC-UNIT-007: computeModelStats — all null costs
 *   TC-UNIT-008: computeModelStats — mixed run types
 */
import { describe, it, expect } from 'vitest';
import {
  filterRecords,
  computePercentile,
  computeLatencyStats,
  computeCostStats,
  computeTokenStats,
  computeModelStats,
  formatLatency,
  formatCost,
  formatTokens,
} from './computeStats';

// --- Test fixtures ---

const NOW = new Date('2026-05-10T12:00:00Z').getTime();

function makeRun(overrides = {}) {
  return {
    id: '1',
    type: 'playground',
    modelId: 'openai/gpt-4',
    modelName: 'gpt-4',
    modelProvider: 'OpenAI',
    prompt: 'Hello',
    responseText: 'Hi there',
    tokens: 350,
    latency: 1200,
    cost: 0.05,
    createdAt: new Date(NOW).toISOString(),
    ...overrides,
  };
}

const FIXTURE_RUNS = [
  makeRun({ id: '1', modelName: 'gpt-4', modelId: 'openai/gpt-4', modelProvider: 'OpenAI', latency: 1200, cost: 0.05, tokens: 350, createdAt: '2026-05-10T10:00:00Z' }),
  makeRun({ id: '2', modelName: 'gpt-4', modelId: 'openai/gpt-4', modelProvider: 'OpenAI', latency: 980, cost: 0.04, tokens: 300, createdAt: '2026-05-10T10:05:00Z' }),
  makeRun({ id: '3', modelName: 'gpt-4', modelId: 'openai/gpt-4', modelProvider: 'OpenAI', latency: 2500, cost: null, tokens: 400, createdAt: '2026-05-10T10:10:00Z' }),
  makeRun({ id: '4', modelName: 'claude-3-opus', modelId: 'anthropic/claude-3-opus', modelProvider: 'Anthropic', latency: 800, cost: 0.03, tokens: 280, createdAt: '2026-05-10T10:15:00Z' }),
  makeRun({ id: '5', modelName: 'claude-3-opus', modelId: 'anthropic/claude-3-opus', modelProvider: 'Anthropic', latency: 900, cost: 0.035, tokens: 290, type: 'comparison', groupId: 'g1', createdAt: '2026-05-10T10:20:00Z' }),
  makeRun({ id: '6', modelName: 'llama-3-70b', modelId: 'meta/llama-3-70b', modelProvider: 'Meta', latency: 600, cost: 0.001, tokens: 250, createdAt: '2026-05-10T10:25:00Z' }),
];

// --- Formatters ---

describe('formatLatency', () => {
  it('formats milliseconds', () => {
    expect(formatLatency(342)).toBe('342ms');
  });

  it('formats seconds', () => {
    expect(formatLatency(1200)).toBe('1.2s');
  });

  it('handles null', () => {
    expect(formatLatency(null)).toBe('0.0s');
  });
});

describe('formatCost', () => {
  it('formats cost with 4 decimals', () => {
    expect(formatCost(0.05)).toBe('$0.0500');
  });

  it('handles null', () => {
    expect(formatCost(null)).toBe('N/A');
  });
});

describe('formatTokens', () => {
  it('formats small numbers', () => {
    expect(formatTokens(350)).toBe('350');
  });

  it('formats thousands', () => {
    expect(formatTokens(8234)).toBe('8.2K');
  });

  it('formats millions', () => {
    expect(formatTokens(1500000)).toBe('1.5M');
  });

  it('handles null', () => {
    expect(formatTokens(null)).toBe('0');
  });
});

// --- filterRecords ---

describe('filterRecords', () => {
  it('returns all records with default filters', () => {
    const result = filterRecords(FIXTURE_RUNS);
    expect(result).toHaveLength(6);
  });

  it('filters by type', () => {
    const result = filterRecords(FIXTURE_RUNS, { typeFilter: 'comparison' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('5');
  });

  it('filters by model IDs', () => {
    const result = filterRecords(FIXTURE_RUNS, { modelFilter: ['openai/gpt-4'] });
    expect(result).toHaveLength(3);
  });

  it('filters by date range (today)', () => {
    // All fixtures are from 2026-05-10T10:xx — use today's date context
    const todayRun = makeRun({ id: 'today', createdAt: new Date().toISOString() });
    const oldRun = makeRun({ id: 'old', createdAt: '2020-01-01T00:00:00Z' });
    const result = filterRecords([todayRun, oldRun], { dateRange: 'today' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('today');
  });

  it('returns empty for no matching filters', () => {
    const result = filterRecords(FIXTURE_RUNS, { typeFilter: 'comparison', modelFilter: ['openai/gpt-4'] });
    expect(result).toHaveLength(0);
  });
});

// --- computePercentile ---

describe('computePercentile', () => {
  it('returns 0 for empty array', () => {
    expect(computePercentile([], 95)).toBe(0);
  });

  it('returns the value for single element', () => {
    expect(computePercentile([500], 95)).toBe(500);
  });

  it('returns max for two elements at P95', () => {
    expect(computePercentile([500, 1000], 95)).toBe(1000);
  });

  it('returns the value when all identical', () => {
    expect(computePercentile([300, 300, 300], 95)).toBe(300);
  });

  it('TC-UNIT-005: computes P95 with 20 values', () => {
    const values = Array.from({ length: 20 }, (_, i) => 100 + i * 100); // 100, 200, ..., 2000
    // nearest-rank: ceil(0.95 * 20) - 1 = 19 - 1 = 18 → values[18] = 1900
    expect(computePercentile(values, 95)).toBe(1900);
  });
});

// --- computeLatencyStats ---

describe('computeLatencyStats', () => {
  it('returns zeros for empty array', () => {
    expect(computeLatencyStats([])).toEqual({ min: 0, avg: 0, max: 0, p95: 0 });
  });

  it('computes stats for single run', () => {
    const result = computeLatencyStats([makeRun({ latency: 1200 })]);
    expect(result).toEqual({ min: 1200, avg: 1200, max: 1200, p95: 1200 });
  });

  it('TC-UNIT-003: computes stats for multiple runs', () => {
    const runs = [
      makeRun({ latency: 800 }),
      makeRun({ latency: 1000 }),
      makeRun({ latency: 1200 }),
      makeRun({ latency: 1500 }),
      makeRun({ latency: 3000 }),
    ];
    const result = computeLatencyStats(runs);
    expect(result.min).toBe(800);
    expect(result.max).toBe(3000);
    expect(result.avg).toBe(1500);
    // P95 for 5 values: ceil(0.95 * 5) - 1 = 4 → sorted[4] = 3000
    expect(result.p95).toBe(3000);
  });
});

// --- computeCostStats ---

describe('computeCostStats', () => {
  it('returns nulls for empty array', () => {
    expect(computeCostStats([])).toEqual({ avg: null, total: null, min: null, max: null });
  });

  it('TC-UNIT-007: returns nulls when all costs are null', () => {
    const runs = [
      makeRun({ cost: null }),
      makeRun({ cost: null }),
      makeRun({ cost: null }),
    ];
    expect(computeCostStats(runs)).toEqual({ avg: null, total: null, min: null, max: null });
  });

  it('excludes null costs from average', () => {
    const runs = [
      makeRun({ cost: 0.03 }),
      makeRun({ cost: 0.04 }),
      makeRun({ cost: null }),
      makeRun({ cost: 0.07 }),
    ];
    const result = computeCostStats(runs);
    // avg of 3 non-null: (0.03 + 0.04 + 0.07) / 3 = 0.04667
    expect(result.avg).toBeCloseTo(0.04667, 4);
    expect(result.total).toBeCloseTo(0.14, 4);
  });

  it('computes cost for single run', () => {
    const result = computeCostStats([makeRun({ cost: 0.05 })]);
    expect(result.avg).toBe(0.05);
    expect(result.total).toBe(0.05);
  });
});

// --- computeTokenStats ---

describe('computeTokenStats', () => {
  it('returns zeros for empty array', () => {
    expect(computeTokenStats([])).toEqual({ avg: 0, total: 0, min: 0, max: 0 });
  });

  it('computes token stats', () => {
    const runs = [
      makeRun({ tokens: 200 }),
      makeRun({ tokens: 300 }),
      makeRun({ tokens: 400 }),
    ];
    const result = computeTokenStats(runs);
    expect(result.avg).toBeCloseTo(300);
    expect(result.total).toBe(900);
    expect(result.min).toBe(200);
    expect(result.max).toBe(400);
  });
});

// --- computeModelStats ---

describe('computeModelStats', () => {
  it('TC-UNIT-001: returns empty array for empty runs', () => {
    expect(computeModelStats([])).toEqual([]);
  });

  it('TC-UNIT-002: computes stats for single run per model', () => {
    const runs = [makeRun({ modelName: 'gpt-4', latency: 1200, cost: 0.05, tokens: 350 })];
    const result = computeModelStats(runs);
    expect(result).toHaveLength(1);
    expect(result[0].runCount).toBe(1);
    expect(result[0].latency).toEqual({ min: 1200, avg: 1200, max: 1200, p95: 1200 });
    expect(result[0].cost.avg).toBe(0.05);
    expect(result[0].tokens.total).toBe(350);
  });

  it('TC-UNIT-003: computes stats for multiple runs of same model', () => {
    const runs = [
      makeRun({ modelName: 'claude-3-opus', modelId: 'anthropic/claude-3-opus', modelProvider: 'Anthropic', latency: 800, cost: 0.03, tokens: 200 }),
      makeRun({ modelName: 'claude-3-opus', modelId: 'anthropic/claude-3-opus', modelProvider: 'Anthropic', latency: 1000, cost: 0.04, tokens: 250 }),
      makeRun({ modelName: 'claude-3-opus', modelId: 'anthropic/claude-3-opus', modelProvider: 'Anthropic', latency: 1200, cost: 0.05, tokens: 300 }),
      makeRun({ modelName: 'claude-3-opus', modelId: 'anthropic/claude-3-opus', modelProvider: 'Anthropic', latency: 1500, cost: null, tokens: 280 }),
      makeRun({ modelName: 'claude-3-opus', modelId: 'anthropic/claude-3-opus', modelProvider: 'Anthropic', latency: 3000, cost: 0.07, tokens: 400 }),
    ];
    const result = computeModelStats(runs);
    expect(result).toHaveLength(1);
    const m = result[0];
    expect(m.runCount).toBe(5);
    expect(m.latency.min).toBe(800);
    expect(m.latency.max).toBe(3000);
    expect(m.latency.avg).toBe(1500);
    expect(m.latency.p95).toBe(3000);
    // avg cost: (0.03 + 0.04 + 0.05 + 0.07) / 4 = 0.0475
    expect(m.cost.avg).toBeCloseTo(0.0475, 4);
    expect(m.tokens.total).toBe(1430);
  });

  it('TC-UNIT-004: groups by model correctly', () => {
    const result = computeModelStats(FIXTURE_RUNS);
    expect(result).toHaveLength(3);

    const gpt4 = result.find((m) => m.modelId === 'openai/gpt-4');
    const claude = result.find((m) => m.modelId === 'anthropic/claude-3-opus');
    const llama = result.find((m) => m.modelId === 'meta/llama-3-70b');

    expect(gpt4).toBeDefined();
    expect(claude).toBeDefined();
    expect(llama).toBeDefined();

    // gpt-4: 3 runs, avg latency = (1200 + 980 + 2500) / 3
    expect(gpt4.runCount).toBe(3);
    expect(gpt4.latency.avg).toBeCloseTo(1560, 0);
    // avg cost: (0.05 + 0.04) / 2 = 0.045 (null excluded)
    expect(gpt4.cost.avg).toBeCloseTo(0.045, 4);

    // claude-3-opus: 2 runs
    expect(claude.runCount).toBe(2);
    expect(claude.latency.avg).toBeCloseTo(850, 0);

    // llama-3-70b: 1 run
    expect(llama.runCount).toBe(1);
    expect(llama.latency.p95).toBe(600);
  });

  it('TC-UNIT-008: aggregates across mixed run types', () => {
    const runs = [
      makeRun({ type: 'playground', latency: 1000 }),
      makeRun({ type: 'comparison', latency: 2000, modelId: 'openai/gpt-4', modelName: 'gpt-4', groupId: 'g1' }),
    ];
    const result = computeModelStats(runs);
    expect(result).toHaveLength(1);
    expect(result[0].runCount).toBe(2);
    expect(result[0].latency.avg).toBe(1500);
  });

  it('uses modelId as fallback for modelName', () => {
    const runs = [makeRun({ modelName: '', modelId: 'unknown/model' })];
    const result = computeModelStats(runs);
    expect(result[0].modelName).toBe('unknown/model');
  });
});
