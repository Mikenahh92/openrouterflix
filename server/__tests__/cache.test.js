import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as cache from '../services/cache.js';

describe('cache', () => {
  beforeEach(() => {
    cache.invalidateAll();
  });

  // TC-003: Cache expiry
  it('TC-003: returns undefined for expired entries', async () => {
    cache.set('test-key', { data: 'hello' }, 1); // 1ms TTL
    // Wait for expiry
    await new Promise((r) => setTimeout(r, 10));
    expect(cache.get('test-key')).toBeUndefined();
  });

  // TC-019: Single key invalidation
  it('TC-019: invalidate removes a specific key', () => {
    cache.set('models', [{ id: 'a' }]);
    cache.set('model:a', { id: 'a' });

    cache.invalidate('models');

    expect(cache.get('models')).toBeUndefined();
    expect(cache.get('model:a')).toEqual({ id: 'a' }); // Still present
  });

  // TC-020: InvalidateAll
  it('TC-020: invalidateAll clears all entries', () => {
    cache.set('key1', 'val1');
    cache.set('key2', 'val2');
    cache.set('key3', 'val3');

    cache.invalidateAll();

    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
    expect(cache.get('key3')).toBeUndefined();
  });

  it('stores and retrieves values within TTL', () => {
    cache.set('test', { foo: 'bar' });
    expect(cache.get('test')).toEqual({ foo: 'bar' });
  });

  it('returns undefined for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('allowStale returns expired data', async () => {
    cache.set('stale-key', { old: true }, 1); // 1ms TTL
    await new Promise((r) => setTimeout(r, 10));

    // Normal get returns undefined
    expect(cache.get('stale-key')).toBeUndefined();

    // allowStale returns the expired data
    expect(cache.get('stale-key', { allowStale: true })).toEqual({ old: true });
  });

  it('allowStale returns undefined for never-set keys', () => {
    expect(cache.get('never-set', { allowStale: true })).toBeUndefined();
  });
});
