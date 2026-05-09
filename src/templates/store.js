/**
 * Template store — Zustand persisted store for prompt templates.
 *
 * State shape:
 *   { templates: Template[] }
 *
 * Template record:
 *   {
 *     id: string,            — crypto.randomUUID()
 *     name: string,          — user-entered, non-empty
 *     template: string,      — may contain {{variableName}} placeholders
 *     variables: string[],   — auto-extracted unique variable names
 *     category: string|null, — free-form, optional
 *     createdAt: string,     — ISO 8601
 *     updatedAt: string,     — ISO 8601
 *   }
 *
 * Actions:
 *   addTemplate({ name, template, category }) — extract variables, generate UUID, add
 *   updateTemplate(id, updates) — merge updates, re-extract variables
 *   deleteTemplate(id) — remove by ID
 *
 * Utility:
 *   extractVariables(templateText) — returns unique {{var}} names
 *   substituteVariables(templateText, values) — replaces {{var}} with values
 *
 * Persistence: localStorage key "orf-templates", version 1
 */
import { createPersistedStore } from '../shared/lib/persist';

const VARIABLE_REGEX = /\{\{(\w+)\}\}/g;

/**
 * Extract unique variable names from template text.
 * @param {string} templateText
 * @returns {string[]}
 */
export function extractVariables(templateText) {
  const matches = templateText.matchAll(VARIABLE_REGEX);
  return [...new Set([...matches].map((m) => m[1]))];
}

/**
 * Substitute variable values into template text.
 * Unfilled variables are replaced with empty string.
 * @param {string} templateText
 * @param {Record<string, string>} values
 * @returns {string}
 */
export function substituteVariables(templateText, values) {
  return templateText.replace(VARIABLE_REGEX, (_, key) => values[key] ?? '');
}

const useTemplateStore = createPersistedStore(
  'templates',
  (set) => ({
    templates: [],

    /**
     * Add a new template. Extracts variables automatically.
     * @param {{ name: string, template: string, category?: string }} data
     */
    addTemplate(data) {
      const name = (data.name || '').trim();
      const template = (data.template || '').trim();

      if (!name || !template) return;

      const now = new Date().toISOString();
      const tpl = {
        id: crypto.randomUUID(),
        name,
        template,
        variables: extractVariables(template),
        category: (data.category || '').trim() || null,
        createdAt: now,
        updatedAt: now,
      };

      set((state) => ({
        templates: [tpl, ...state.templates],
      }));
    },

    /**
     * Update an existing template by ID. Re-extracts variables.
     * @param {string} id
     * @param {{ name?: string, template?: string, category?: string }} updates
     */
    updateTemplate(id, updates) {
      set((state) => ({
        templates: state.templates.map((t) => {
          if (t.id !== id) return t;

          const merged = {
            ...t,
            ...updates,
            category: updates.category !== undefined
              ? (updates.category || '').trim() || null
              : t.category,
          };

          // If template text changed, re-extract variables
          if (updates.template !== undefined) {
            merged.template = (updates.template || '').trim();
            merged.variables = extractVariables(merged.template);
          }

          if (updates.name !== undefined) {
            merged.name = (updates.name || '').trim();
          }

          merged.updatedAt = new Date().toISOString();
          return merged;
        }),
      }));
    },

    /**
     * Delete a template by ID.
     * @param {string} id
     */
    deleteTemplate(id) {
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
      }));
    },
  }),
  {
    partialize: (state) => ({ templates: state.templates }),
  }
);

export default useTemplateStore;
