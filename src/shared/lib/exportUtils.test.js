/**
 * Unit tests for exportUtils.js.
 *
 * Covers: CSV serialization, JSON envelope, Blob download trigger,
 * base64 encode/decode, import validation, filter-aware export.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordsToCSV,
  downloadFile,
  exportHistoryJSON,
  exportPresetJSON,
  encodePresetToBase64,
  decodePresetFromBase64,
  isPresetTooLarge,
  validateImport,
} from './exportUtils';

/* ─── Mock Data ──────────────────────────────────────────────────────── */

const mockRecords = [
  {
    id: 'run-001',
    type: 'playground',
    modelId: 'anthropic/claude-3.5-sonnet',
    modelName: 'Claude 3.5 Sonnet',
    modelProvider: 'Anthropic',
    prompt: 'Explain quantum computing in simple terms',
    responseText: 'Quantum computing uses quantum bits...',
    tokens: 215,
    latency: 1200,
    cost: 0.0025,
    createdAt: '2026-05-09T10:00:00.000Z',
    groupId: undefined,
  },
  {
    id: 'run-002',
    type: 'comparison',
    modelId: 'openai/gpt-4',
    modelName: 'GPT-4',
    modelProvider: 'OpenAI',
    prompt: 'Compare sorting algorithms',
    responseText: 'Here are the main sorting algorithms...',
    tokens: 350,
    latency: 800,
    cost: 0.005,
    createdAt: '2026-05-09T11:00:00.000Z',
    groupId: 'group-abc',
  },
  {
    id: 'run-003',
    type: 'playground',
    modelId: 'google/gemini-pro',
    modelName: 'Gemini Pro',
    modelProvider: 'Google',
    prompt: 'Write a haiku about code',
    responseText: 'Lines of logic flow / Bugs hide in the silence between / Debug reveals all',
    tokens: 45,
    latency: 500,
    cost: 0.001,
    createdAt: '2026-05-09T12:00:00.000Z',
    groupId: undefined,
  },
];

const specialCharRecord = {
  id: 'run-special',
  type: 'playground',
  modelId: 'openai/gpt-4',
  modelName: 'GPT-4 "Turbo"',
  modelProvider: 'OpenAI',
  prompt: 'Write CSV: name,age\n"Alice, Jr.",25\nBob,30',
  responseText: 'Line 1\nLine 2, with "quotes"\n\tTabbed line',
  tokens: 60,
  latency: 800,
  cost: 0.001,
  createdAt: '2026-05-09T11:00:00.000Z',
};

/* ─── CSV Tests ──────────────────────────────────────────────────────── */

describe('recordsToCSV', () => {
  it('TC-U01: serializes records to CSV with header and data rows', () => {
    const csv = recordsToCSV(mockRecords);

    expect(typeof csv).toBe('string');

    const lines = csv.split('\n');
    expect(lines.length).toBe(4); // 1 header + 3 data rows

    // Verify header
    expect(lines[0]).toContain('id');
    expect(lines[0]).toContain('type');
    expect(lines[0]).toContain('modelId');
    expect(lines[0]).toContain('modelName');
    expect(lines[0]).toContain('modelProvider');
    expect(lines[0]).toContain('prompt');
    expect(lines[0]).toContain('responseText');
    expect(lines[0]).toContain('tokens');
    expect(lines[0]).toContain('latency');
    expect(lines[0]).toContain('cost');
    expect(lines[0]).toContain('createdAt');
    expect(lines[0]).toContain('groupId');

    // Verify each record is present
    expect(csv).toContain('run-001');
    expect(csv).toContain('run-002');
    expect(csv).toContain('run-003');
    expect(csv).toContain('playground');
    expect(csv).toContain('comparison');
  });

  it('TC-U02: returns header only for empty records', () => {
    const csv = recordsToCSV([]);

    const lines = csv.split('\n');
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('id');
  });

  it('TC-U03: properly escapes special characters', () => {
    const csv = recordsToCSV([specialCharRecord]);

    // Fields with commas should be double-quoted
    expect(csv).toContain('"GPT-4 ""Turbo"""');
    expect(csv).toContain('"Write CSV: name,age');
    // The responseText field contains newlines so the whole field is double-quoted
    // and internal quotes are escaped as ""
    expect(csv).toContain('""quotes""');

    // Newlines in fields cause quoting
    expect(csv).toContain('"Write CSV: name,age');
  });
});

/* ─── JSON Export Tests ──────────────────────────────────────────────── */

describe('exportHistoryJSON', () => {
  it('TC-U04: creates correct envelope with metadata', () => {
    const json = exportHistoryJSON(mockRecords);
    const parsed = JSON.parse(json);

    expect(parsed.type).toBe('orf-history');
    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBeDefined();
    // Verify ISO date
    expect(new Date(parsed.exportedAt).getTime()).not.toBeNaN();
    expect(parsed.records).toHaveLength(3);
    expect(parsed.records[0].id).toBe('run-001');
  });

  it('TC-U05: works with empty records', () => {
    const json = exportHistoryJSON([]);
    const parsed = JSON.parse(json);

    expect(parsed.type).toBe('orf-history');
    expect(parsed.version).toBe(1);
    expect(parsed.records).toEqual([]);
  });
});

describe('exportPresetJSON', () => {
  it('creates correct preset envelope', () => {
    const preset = { ids: ['model-1', 'model-2'], prompt: 'test' };
    const json = exportPresetJSON(preset);
    const parsed = JSON.parse(json);

    expect(parsed.type).toBe('orf-preset');
    expect(parsed.version).toBe(1);
    expect(parsed.ids).toEqual(['model-1', 'model-2']);
    expect(parsed.prompt).toBe('test');
  });
});

/* ─── Download Tests ─────────────────────────────────────────────────── */

describe('downloadFile', () => {
  let createObjectURLSpy;
  let revokeObjectURLSpy;

  beforeEach(() => {
    createObjectURLSpy = vi.fn(() => 'blob:http://localhost/fake-url');
    revokeObjectURLSpy = vi.fn();
    vi.spyOn(globalThis.URL, 'createObjectURL').mockImplementation(createObjectURLSpy);
    vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(revokeObjectURLSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('TC-U06: triggers download with correct Blob, filename, and cleanup', () => {
    // Mock DOM methods
    const mockAnchor = {
      href: '',
      download: '',
      style: {},
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    downloadFile('hello world', 'test.txt', 'text/plain');

    // Verify Blob was created via createObjectURL
    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    const blobArg = createObjectURLSpy.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('text/plain');

    // Verify anchor setup
    expect(mockAnchor.href).toBe('blob:http://localhost/fake-url');
    expect(mockAnchor.download).toBe('test.txt');
    expect(mockAnchor.click).toHaveBeenCalledOnce();

    // Verify cleanup
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:http://localhost/fake-url');

    vi.restoreAllMocks();
  });
});

/* ─── Base64 Tests ───────────────────────────────────────────────────── */

describe('encodePresetToBase64 / decodePresetFromBase64', () => {
  it('TC-U07: encodes preset to valid base64', () => {
    const preset = { ids: ['id1', 'id2'], prompt: 'test' };
    const encoded = encodePresetToBase64(preset);

    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    // Decode and verify round-trip
    const decoded = decodePresetFromBase64(encoded);
    expect(decoded).toEqual(preset);
  });

  it('TC-U08: decodes valid base64 preset', () => {
    const preset = { ids: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4'], prompt: 'Compare these' };
    const encoded = encodePresetToBase64(preset);
    const decoded = decodePresetFromBase64(encoded);

    expect(decoded).toEqual(preset);
  });

  it('TC-U09: returns null for invalid base64', () => {
    const result = decodePresetFromBase64('not-base64!!!');
    expect(result).toBeNull();
  });

  it('TC-U10: returns null for valid base64 but invalid JSON', () => {
    const encoded = btoa('hello world');
    const result = decodePresetFromBase64(encoded);
    expect(result).toBeNull();
  });

  it('handles unicode in preset values', () => {
    const preset = { ids: ['model-1'], prompt: '日本語テスト 🎉' };
    const encoded = encodePresetToBase64(preset);
    const decoded = decodePresetFromBase64(encoded);
    expect(decoded).toEqual(preset);
  });
});

/* ─── Preset Size Check ──────────────────────────────────────────────── */

describe('isPresetTooLarge', () => {
  it('returns false for small payloads', () => {
    expect(isPresetTooLarge('abc')).toBe(false);
    expect(isPresetTooLarge('a'.repeat(2000))).toBe(false);
  });

  it('returns true for large payloads', () => {
    expect(isPresetTooLarge('a'.repeat(2001))).toBe(true);
  });
});

/* ─── Import Validation Tests ────────────────────────────────────────── */

describe('validateImport', () => {
  it('TC-U11: validates correct history import', () => {
    const data = {
      type: 'orf-history',
      version: 1,
      exportedAt: '2026-05-09T10:00:00.000Z',
      records: mockRecords,
    };

    const result = validateImport(data);
    expect(result.valid).toBe(true);
    expect(result.type).toBe('orf-history');
    expect(result.records).toHaveLength(3);
  });

  it('TC-U12: rejects missing type field', () => {
    const result = validateImport({ version: 1, records: mockRecords });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('type');
  });

  it('TC-U13: rejects wrong type field', () => {
    const result = validateImport({
      type: 'orf-preset',
      version: 1,
      records: mockRecords,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('models');
  });

  it('TC-U14: rejects version mismatch', () => {
    const result = validateImport({
      type: 'orf-history',
      version: 99,
      records: mockRecords,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('version');
  });

  it('TC-U15: rejects malformed records', () => {
    const result = validateImport({
      type: 'orf-history',
      version: 1,
      records: [{ bad: 'data' }],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('TC-U16: rejects non-JSON input', () => {
    const result = validateImport('not json');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('JSON object');
  });

  it('accepts grouped format records', () => {
    const data = {
      type: 'orf-history',
      version: 1,
      records: [
        {
          id: 'grouped-1',
          type: 'comparison',
          models: ['model-1', 'model-2'],
          prompt: 'test',
          results: [
            { model: 'model-1', text: 'response 1', tokens: 100, latency: 500, cost: 0.001 },
            { model: 'model-2', text: 'response 2', tokens: 120, latency: 600, cost: 0.0015 },
          ],
          createdAt: '2026-05-09T10:00:00.000Z',
        },
      ],
    };

    const result = validateImport(data);
    expect(result.valid).toBe(true);
    expect(result.records).toHaveLength(1);
  });

  it('validates preset import correctly', () => {
    const data = {
      type: 'orf-preset',
      version: 1,
      models: ['model-1', 'model-2'],
      params: { temperature: 0.7 },
    };

    const result = validateImport(data);
    expect(result.valid).toBe(true);
    expect(result.type).toBe('orf-preset');
    expect(result.preset.models).toEqual(['model-1', 'model-2']);
  });

  it('rejects preset with too many models', () => {
    const data = {
      type: 'orf-preset',
      version: 1,
      models: ['m1', 'm2', 'm3', 'm4', 'm5'],
    };

    const result = validateImport(data);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('1-4');
  });

  it('rejects null input', () => {
    expect(validateImport(null).valid).toBe(false);
  });

  it('rejects array input', () => {
    expect(validateImport([1, 2, 3]).valid).toBe(false);
  });

  it('partially validates mixed valid/invalid records with warnings', () => {
    const data = {
      type: 'orf-history',
      version: 1,
      records: [
        mockRecords[0], // valid
        { bad: 'data' }, // invalid
        mockRecords[1], // valid
      ],
    };

    const result = validateImport(data);
    expect(result.valid).toBe(true);
    expect(result.records).toHaveLength(2);
    expect(result.warnings).toBeDefined();
    expect(result.warnings.length).toBe(1);
  });
});

/* ─── Filter-Aware Export ────────────────────────────────────────────── */

describe('TC-U17: export respects filters', () => {
  it('only exports filtered records', () => {
    const playgroundOnly = mockRecords.filter((r) => r.type === 'playground');
    const csv = recordsToCSV(playgroundOnly);

    const lines = csv.split('\n');
    // 1 header + 2 data rows (run-001 and run-003 are playground)
    expect(lines.length).toBe(3);

    // Verify no comparison records
    for (const line of lines.slice(1)) {
      if (line.trim()) {
        expect(line).not.toContain('comparison');
      }
    }
  });

  it('export-import round-trip preserves data (TC-I01)', () => {
    const jsonStr = exportHistoryJSON(mockRecords);
    const parsed = JSON.parse(jsonStr);
    const result = validateImport(parsed);

    expect(result.valid).toBe(true);
    expect(result.records).toEqual(mockRecords);
  });
});
