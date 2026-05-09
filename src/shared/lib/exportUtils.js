/**
 * Export/Import utilities for OpenRouterFlix.
 *
 * Pure frontend — Blob + URL.createObjectURL(), no backend, no new dependencies.
 *
 * Functions:
 *   recordsToCSV(records)          — serialize run records to CSV string
 *   downloadFile(content, filename, mimeType) — trigger browser download via Blob
 *   exportHistoryJSON(records)     — wrap records in orf-history envelope JSON string
 *   exportPresetJSON(preset)       — wrap preset in orf-preset envelope JSON string
 *   encodePresetToBase64(preset)   — JSON → base64 for URL sharing
 *   decodePresetFromBase64(encoded)— base64 → JSON preset (or null on error)
 *   validateImport(data)           — validate imported JSON structure
 *   isPresetTooLarge(encoded)      — check if base64 exceeds URL-safe length
 */

/* ─── CSV Serialization ──────────────────────────────────────────────── */

/** Columns for CSV export — matches the Run record shape from history store. */
const CSV_COLUMNS = [
  'id',
  'type',
  'modelId',
  'modelName',
  'modelProvider',
  'prompt',
  'responseText',
  'tokens',
  'latency',
  'cost',
  'createdAt',
  'groupId',
];

/**
 * Escape a single CSV field value.
 * - Wraps in double-quotes if it contains comma, double-quote, or newline.
 * - Escapes internal double-quotes by doubling them ("").
 */
function escapeCSVField(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serialize an array of run records to a CSV string with header row.
 * @param {Array<object>} records — history run records
 * @returns {string} CSV string
 */
export function recordsToCSV(records) {
  const header = CSV_COLUMNS.join(',');
  const rows = records.map((r) =>
    CSV_COLUMNS.map((col) => escapeCSVField(r[col])).join(',')
  );
  return [header, ...rows].join('\n');
}

/* ─── Blob Download ──────────────────────────────────────────────────── */

/**
 * Trigger a browser file download using Blob + URL.createObjectURL().
 * Creates a temporary <a> element, clicks it, then revokes the object URL.
 *
 * @param {string|Blob} content — file content (string or Blob)
 * @param {string} filename — download filename
 * @param {string} mimeType — MIME type for the Blob
 */
export function downloadFile(content, filename, mimeType) {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/* ─── JSON Export Envelopes ──────────────────────────────────────────── */

/**
 * Wrap history records in an orf-history envelope and return as JSON string.
 * @param {Array<object>} records
 * @returns {string} pretty-printed JSON
 */
export function exportHistoryJSON(records) {
  const envelope = {
    type: 'orf-history',
    version: 1,
    exportedAt: new Date().toISOString(),
    records,
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Wrap a comparison preset in an orf-preset envelope and return as JSON string.
 * @param {{ ids: string[], prompt: string, params?: object }} preset
 * @returns {string} pretty-printed JSON
 */
export function exportPresetJSON(preset) {
  const envelope = {
    type: 'orf-preset',
    version: 1,
    ...preset,
  };
  return JSON.stringify(envelope, null, 2);
}

/* ─── Base64 URL Sharing ─────────────────────────────────────────────── */

/** Maximum safe length for a base64-encoded URL param (~2000 chars total URL). */
const MAX_BASE64_LENGTH = 2000;

/**
 * Encode a preset object to base64 for URL sharing.
 * @param {object} preset
 * @returns {string} base64-encoded string
 */
export function encodePresetToBase64(preset) {
  const json = JSON.stringify(preset);
  return btoa(unescape(encodeURIComponent(json)));
}

/**
 * Decode a base64-encoded preset string.
 * Returns null on any error (invalid base64, invalid JSON, etc.)
 * @param {string} encoded
 * @returns {object|null}
 */
export function decodePresetFromBase64(encoded) {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Check if a base64-encoded preset exceeds the URL-safe length.
 * @param {string} encoded
 * @returns {boolean}
 */
export function isPresetTooLarge(encoded) {
  return encoded.length > MAX_BASE64_LENGTH;
}

/* ─── Import Validation ──────────────────────────────────────────────── */

/**
 * Required fields for a history record within the envelope.
 */
const HISTORY_RECORD_FIELDS = ['id', 'type', 'models', 'results'];

/**
 * Validate an imported JSON object.
 *
 * Supports two envelope types:
 *   - "orf-history" — must have records array with valid run records
 *   - "orf-preset" — must have models array (1-4 items), optional params
 *
 * @param {any} data — parsed JSON value to validate
 * @returns {{ valid: boolean, error?: string, type?: string, records?: Array, preset?: object }}
 */
export function validateImport(data) {
  // Must be a non-null object
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: 'Import data must be a JSON object.' };
  }

  // Must have type field
  if (!data.type || typeof data.type !== 'string') {
    return { valid: false, error: 'Missing or invalid "type" field.' };
  }

  // Must have version field
  if (data.version !== 1) {
    return { valid: false, error: `Unsupported version: ${data.version}. Only version 1 is supported.` };
  }

  if (data.type === 'orf-history') {
    return validateHistoryImport(data);
  }

  if (data.type === 'orf-preset') {
    return validatePresetImport(data);
  }

  return { valid: false, error: `Unknown type: "${data.type}". Expected "orf-history" or "orf-preset".` };
}

/**
 * Validate an orf-history envelope.
 * Supports both the new format (with records[]) and the flat run-record format.
 */
function validateHistoryImport(data) {
  if (!Array.isArray(data.records)) {
    return { valid: false, error: 'History import must contain a "records" array.' };
  }

  const validRecords = [];
  const errors = [];

  for (let i = 0; i < data.records.length; i++) {
    const record = data.records[i];
    if (!record || typeof record !== 'object') {
      errors.push(`Record ${i}: not an object.`);
      continue;
    }

    // Check for either the ORF-022 flat format or the grouped format
    const hasFlatFields = record.id && record.modelId && record.createdAt;
    const hasGroupedFields = record.id && Array.isArray(record.models) && Array.isArray(record.results);

    if (!hasFlatFields && !hasGroupedFields) {
      errors.push(`Record ${i}: missing required fields (id, modelId/models, createdAt/results).`);
      continue;
    }

    validRecords.push(record);
  }

  if (validRecords.length === 0 && data.records.length > 0) {
    return { valid: false, error: `No valid records found. ${errors.join(' ')}` };
  }

  return {
    valid: true,
    type: 'orf-history',
    records: validRecords,
    ...(errors.length > 0 ? { warnings: errors } : {}),
  };
}

/**
 * Validate an orf-preset envelope.
 */
function validatePresetImport(data) {
  if (!Array.isArray(data.models)) {
    return { valid: false, error: 'Preset import must contain a "models" array.' };
  }

  if (data.models.length < 1 || data.models.length > 4) {
    return { valid: false, error: 'Preset must have 1-4 models.' };
  }

  // params is optional but must be an object if present
  if (data.params !== undefined && (typeof data.params !== 'object' || Array.isArray(data.params))) {
    return { valid: false, error: 'Preset "params" must be an object.' };
  }

  const preset = {
    models: data.models,
    ...(data.params ? { params: data.params } : {}),
  };

  return {
    valid: true,
    type: 'orf-preset',
    preset,
  };
}
