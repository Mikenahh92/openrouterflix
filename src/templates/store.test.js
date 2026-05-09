/**
 * Unit tests for the template store.
 *
 * Covers:
 *   - Initial state (empty templates)
 *   - addTemplate — creates template with correct shape, extracts variables
 *   - addTemplate — deduplicates variables
 *   - addTemplate — handles no variables
 *   - addTemplate — rejects empty name
 *   - addTemplate — rejects empty template text
 *   - updateTemplate — merges updates, re-extracts variables
 *   - updateTemplate — non-existent id is no-op
 *   - deleteTemplate — removes template
 *   - deleteTemplate — non-existent id is no-op
 *   - extractVariables — various edge cases
 *   - substituteVariables — various cases
 *   - Persist round-trip
 *   - localStorage key
 *   - Corrupted localStorage
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

import useTemplateStore, { extractVariables, substituteVariables } from './store';

describe('useTemplateStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    useTemplateStore.setState({ templates: [] });
  });

  it('has correct initial state', () => {
    const state = useTemplateStore.getState();
    expect(state.templates).toEqual([]);
  });

  describe('addTemplate', () => {
    it('creates a template with correct shape (TC-S-01)', () => {
      useTemplateStore.getState().addTemplate({
        name: 'Test',
        template: 'Hello {{name}}',
      });

      const templates = useTemplateStore.getState().templates;
      expect(templates).toHaveLength(1);

      const t = templates[0];
      expect(t.id).toMatch(/^test-uuid-/);
      expect(t.name).toBe('Test');
      expect(t.template).toBe('Hello {{name}}');
      expect(t.variables).toEqual(['name']);
      expect(t.category).toBeNull();
      expect(t.createdAt).toBeDefined();
      expect(t.updatedAt).toBeDefined();
      // ISO 8601 check
      expect(new Date(t.createdAt).toISOString()).toBe(t.createdAt);
      expect(new Date(t.updatedAt).toISOString()).toBe(t.updatedAt);
    });

    it('extracts variables correctly (TC-S-02)', () => {
      useTemplateStore.getState().addTemplate({
        name: 'Test',
        template: 'Summarize {{topic}} in {{language}}',
      });

      expect(useTemplateStore.getState().templates[0].variables).toEqual([
        'topic',
        'language',
      ]);
    });

    it('deduplicates variables (TC-S-03)', () => {
      useTemplateStore.getState().addTemplate({
        name: 'Test',
        template: '{{x}} and {{x}}',
      });

      expect(useTemplateStore.getState().templates[0].variables).toEqual(['x']);
    });

    it('handles template with no variables (TC-S-04)', () => {
      useTemplateStore.getState().addTemplate({
        name: 'Test',
        template: 'Just plain text',
      });

      expect(useTemplateStore.getState().templates[0].variables).toEqual([]);
    });

    it('rejects empty name (TC-S-05)', () => {
      useTemplateStore.getState().addTemplate({
        name: '',
        template: '{{x}}',
      });

      expect(useTemplateStore.getState().templates).toHaveLength(0);
    });

    it('rejects whitespace-only name', () => {
      useTemplateStore.getState().addTemplate({
        name: '   ',
        template: '{{x}}',
      });

      expect(useTemplateStore.getState().templates).toHaveLength(0);
    });

    it('rejects empty template text (TC-S-06)', () => {
      useTemplateStore.getState().addTemplate({
        name: 'Test',
        template: '',
      });

      expect(useTemplateStore.getState().templates).toHaveLength(0);
    });

    it('rejects whitespace-only template text', () => {
      useTemplateStore.getState().addTemplate({
        name: 'Test',
        template: '   ',
      });

      expect(useTemplateStore.getState().templates).toHaveLength(0);
    });

    it('stores category when provided', () => {
      useTemplateStore.getState().addTemplate({
        name: 'Test',
        template: '{{x}}',
        category: 'Coding',
      });

      expect(useTemplateStore.getState().templates[0].category).toBe('Coding');
    });

    it('stores null category when empty string provided', () => {
      useTemplateStore.getState().addTemplate({
        name: 'Test',
        template: '{{x}}',
        category: '  ',
      });

      expect(useTemplateStore.getState().templates[0].category).toBeNull();
    });

    it('prepends new template to the front', () => {
      useTemplateStore.getState().addTemplate({
        name: 'First',
        template: 'First template',
      });
      useTemplateStore.getState().addTemplate({
        name: 'Second',
        template: 'Second template',
      });

      const templates = useTemplateStore.getState().templates;
      expect(templates).toHaveLength(2);
      expect(templates[0].name).toBe('Second');
      expect(templates[1].name).toBe('First');
    });
  });

  describe('updateTemplate', () => {
    it('merges updates and re-extracts variables (TC-S-07)', async () => {
      useTemplateStore.getState().addTemplate({
        name: 'Test',
        template: '{{old_var}}',
        category: 'Coding',
      });

      const id = useTemplateStore.getState().templates[0].id;
      const originalUpdatedAt = useTemplateStore.getState().templates[0].updatedAt;

      // Small delay to ensure updatedAt will differ
      await new Promise((r) => setTimeout(r, 2));

      useTemplateStore.getState().updateTemplate(id, {
        template: 'New {{var}}',
      });

      const t = useTemplateStore.getState().templates[0];
      expect(t.template).toBe('New {{var}}');
      expect(t.variables).toEqual(['var']);
      expect(t.updatedAt).not.toBe(originalUpdatedAt);
      // name and category should be unchanged
      expect(t.name).toBe('Test');
      expect(t.category).toBe('Coding');
    });

    it('is no-op with non-existent id (TC-S-08)', () => {
      useTemplateStore.getState().addTemplate({
        name: 'Test',
        template: 'Original',
      });

      useTemplateStore.getState().updateTemplate('non-existent-id', {
        template: 'Changed',
      });

      expect(useTemplateStore.getState().templates[0].template).toBe('Original');
    });

    it('updates name', () => {
      useTemplateStore.getState().addTemplate({
        name: 'Old Name',
        template: 'Template text',
      });

      const id = useTemplateStore.getState().templates[0].id;
      useTemplateStore.getState().updateTemplate(id, { name: 'New Name' });

      expect(useTemplateStore.getState().templates[0].name).toBe('New Name');
    });

    it('updates category', () => {
      useTemplateStore.getState().addTemplate({
        name: 'Test',
        template: 'Template',
        category: 'Coding',
      });

      const id = useTemplateStore.getState().templates[0].id;
      useTemplateStore.getState().updateTemplate(id, { category: 'Writing' });

      expect(useTemplateStore.getState().templates[0].category).toBe('Writing');
    });

    it('sets category to null when empty string', () => {
      useTemplateStore.getState().addTemplate({
        name: 'Test',
        template: 'Template',
        category: 'Coding',
      });

      const id = useTemplateStore.getState().templates[0].id;
      useTemplateStore.getState().updateTemplate(id, { category: '' });

      expect(useTemplateStore.getState().templates[0].category).toBeNull();
    });
  });

  describe('deleteTemplate', () => {
    it('removes template (TC-S-09)', () => {
      const tpl1 = {
        name: 'To Delete',
        template: 'Template',
      };
      const tpl2 = {
        name: 'To Keep',
        template: 'Template',
      };
      useTemplateStore.getState().addTemplate(tpl1);
      useTemplateStore.getState().addTemplate(tpl2);

      expect(useTemplateStore.getState().templates).toHaveLength(2);
      // 'To Keep' was added last so it's at index 0 (prepended)
      // 'To Delete' is at index 1
      const toDelete = useTemplateStore.getState().templates.find(
        (t) => t.name === 'To Delete'
      );
      expect(toDelete).toBeDefined();
      useTemplateStore.getState().deleteTemplate(toDelete.id);
      expect(useTemplateStore.getState().templates).toHaveLength(1);
      expect(useTemplateStore.getState().templates[0].name).toBe('To Keep');
    });

    it('is no-op with non-existent id (TC-S-10)', () => {
      useTemplateStore.getState().addTemplate({
        name: 'Test',
        template: 'Template',
      });

      useTemplateStore.getState().deleteTemplate('non-existent-id');
      expect(useTemplateStore.getState().templates).toHaveLength(1);
    });
  });
});

describe('extractVariables', () => {
  it('empty string returns [] (TC-S-11)', () => {
    expect(extractVariables('')).toEqual([]);
  });

  it('no variables returns [] (TC-S-12)', () => {
    expect(extractVariables('No placeholders')).toEqual([]);
  });

  it('matches alphanumeric + underscore (TC-S-13)', () => {
    expect(extractVariables('{{var_name_123}}')).toEqual(['var_name_123']);
  });

  it('hyphens are NOT matched (TC-S-14)', () => {
    expect(extractVariables('{{var-name}}')).toEqual([]);
  });

  it('nested braces produce partial match (TC-S-15)', () => {
    // The simple regex does not handle nesting
    const result = extractVariables('{{{{inner}}}}');
    // The regex will match {{inner}} from the inner braces
    expect(result).toContain('inner');
  });

  it('empty braces {{}} produce no match', () => {
    expect(extractVariables('Test {{}}')).toEqual([]);
  });
});

describe('substituteVariables', () => {
  it('full substitution (TC-V-01)', () => {
    expect(
      substituteVariables('Hello {{name}}', { name: 'World' })
    ).toBe('Hello World');
  });

  it('partial substitution — unfilled becomes empty string (TC-V-02)', () => {
    expect(
      substituteVariables('{{a}} and {{b}}', { a: 'X' })
    ).toBe('X and ');
  });

  it('all unfilled returns empty string (TC-V-03)', () => {
    expect(substituteVariables('{{a}}', {})).toBe('');
  });

  it('no variables returns unchanged text (TC-V-04)', () => {
    expect(substituteVariables('Plain text', {})).toBe('Plain text');
  });

  it('multiple occurrences of same variable (TC-V-05)', () => {
    expect(
      substituteVariables('{{x}} {{x}}', { x: 'OK' })
    ).toBe('OK OK');
  });

  it('variable adjacent to text (TC-V-06)', () => {
    expect(
      substituteVariables('prefix{{v}}suffix', { v: 'MID' })
    ).toBe('prefixMIDsuffix');
  });
});

describe('persist behavior', () => {
  it('persists to localStorage with orf- prefix (TC-S-17)', async () => {
    // Create a fresh store to test persist behavior (the module-level store
    // was already initialized before mocks were fully configured)
    const { createPersistedStore } = await import('../shared/lib/persist');
    const useFreshStore = createPersistedStore('templates-persist-test', (set) => ({
      templates: [],
      addTemplate(data) {
        const tpl = {
          id: crypto.randomUUID(),
          name: data.name,
          template: data.template,
          variables: [],
          category: data.category || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ templates: [tpl, ...state.templates] }));
      },
    }));

    useFreshStore.getState().addTemplate({
      name: 'Persist Test',
      template: '{{var}}',
    });

    // Wait for Zustand persist to flush
    await new Promise((r) => setTimeout(r, 100));

    const stored = localStorageMock.getItem('orf-templates-persist-test');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored);
    expect(parsed.state.templates).toBeDefined();
    expect(parsed.state.templates[0].name).toBe('Persist Test');
  });

  it('survives simulated reload — round-trip (TC-S-16)', async () => {
    const { createPersistedStore } = await import('../shared/lib/persist');
    const useFreshStore = createPersistedStore('templates-roundtrip-test', (set) => ({
      templates: [],
      addTemplate(data) {
        const tpl = {
          id: crypto.randomUUID(),
          name: data.name,
          template: data.template,
          variables: [],
          category: data.category || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ templates: [tpl, ...state.templates] }));
      },
    }));

    useFreshStore.getState().addTemplate({
      name: 'First',
      template: '{{a}}',
      category: 'Test',
    });
    useFreshStore.getState().addTemplate({
      name: 'Second',
      template: '{{b}} {{c}}',
    });

    await new Promise((r) => setTimeout(r, 100));

    const stored = localStorageMock.getItem('orf-templates-roundtrip-test');
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored);
    expect(parsed.state.templates).toHaveLength(2);
    expect(parsed.state.templates[0].name).toBe('Second');
    expect(parsed.state.templates[1].name).toBe('First');
  });

  it('corrupted localStorage does not crash (TC-S-18)', async () => {
    const { createPersistedStore } = await import('../shared/lib/persist');
    localStorageMock.setItem('orf-templates-corrupt-test', 'not json');

    // Creating the store with corrupted data should not throw
    const useFreshStore = createPersistedStore('templates-corrupt-test', (set) => ({
      templates: [],
      addTemplate(data) {
        const tpl = {
          id: crypto.randomUUID(),
          name: data.name,
          template: data.template,
          variables: [],
          category: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ templates: [tpl, ...state.templates] }));
      },
    }));

    // Store should still be functional
    const state = useFreshStore.getState();
    expect(Array.isArray(state.templates)).toBe(true);

    useFreshStore.getState().addTemplate({
      name: 'After Corruption',
      template: 'Template',
    });

    const templates = useFreshStore.getState().templates;
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe('After Corruption');
  });
});
