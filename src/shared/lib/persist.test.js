/**
 * Unit tests for the createPersistedStore helper.
 *
 * Covers:
 *   - Returns a working Zustand store
 *   - localStorage key uses orf- prefix
 *   - State persists across store recreation
 *   - partialize limits what gets persisted
 *   - Custom version option
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPersistedStore } from './persist';

// Mock localStorage
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
    get _store() {
      return store;
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('createPersistedStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('creates a working Zustand store', () => {
    const useTestStore = createPersistedStore('test-basic', (set) => ({
      count: 0,
      increment: () => set((s) => ({ count: s.count + 1 })),
    }));

    expect(useTestStore.getState().count).toBe(0);
    useTestStore.getState().increment();
    expect(useTestStore.getState().count).toBe(1);
  });

  it('uses orf- prefix for localStorage key', () => {
    createPersistedStore('my-store', (set) => ({
      value: 'hello',
    }));

    // Zustand persist calls localStorage.getItem on initialization
    expect(localStorageMock.getItem).toHaveBeenCalledWith('orf-my-store');
  });

  it('persists state to localStorage', async () => {
    const useTestStore = createPersistedStore('persist-test', (set) => ({
      name: 'initial',
      setName: (name) => set({ name }),
    }));

    useTestStore.getState().setName('updated');

    // Wait for Zustand persist to flush (it uses setTimeout/setImmediate internally)
    await new Promise((r) => setTimeout(r, 100));

    expect(localStorageMock.setItem).toHaveBeenCalled();
    const setCall = localStorageMock.setItem.mock.calls.find(
      (call) => call[0] === 'orf-persist-test'
    );
    expect(setCall).toBeDefined();
    // Value may be a pre-stringified JSON string or an object depending on Zustand internals
    const value = typeof setCall[1] === 'string' ? JSON.parse(setCall[1]) : setCall[1];
    expect(value.state.name).toBe('updated');
  });

  it('partialize limits persisted state', async () => {
    const useTestStore = createPersistedStore(
      'partial-test',
      (set) => ({
        public: 'visible',
        private: 'hidden',
        setValues: (pub, priv) => set({ public: pub, private: priv }),
      }),
      {
        partialize: (state) => ({ public: state.public }),
      }
    );

    useTestStore.getState().setValues('a', 'b');
    await new Promise((r) => setTimeout(r, 100));

    const setCall = localStorageMock.setItem.mock.calls.find(
      (call) => call[0] === 'orf-partial-test'
    );
    expect(setCall).toBeDefined();
    const value = typeof setCall[1] === 'string' ? JSON.parse(setCall[1]) : setCall[1];
    expect(value.state.public).toBe('a');
    expect(value.state.private).toBeUndefined();
  });

  it('supports custom version option', async () => {
    const useTestStore = createPersistedStore(
      'version-test',
      (set) => ({ val: 1, setVal: (v) => set({ val: v }) }),
      { version: 3 }
    );

    // Trigger a state change to force persist to flush
    useTestStore.getState().setVal(42);
    await new Promise((r) => setTimeout(r, 100));

    const setCall = localStorageMock.setItem.mock.calls.find(
      (call) => call[0] === 'orf-version-test'
    );
    expect(setCall).toBeDefined();
    const value = typeof setCall[1] === 'string' ? JSON.parse(setCall[1]) : setCall[1];
    expect(value.version).toBe(3);
  });
});
