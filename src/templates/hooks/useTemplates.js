/**
 * useTemplates hook — selector hook wrapping useTemplateStore.
 *
 * Provides convenient access to template state and actions.
 */
import useTemplateStore from '../store';

/**
 * @returns {{ templates: Template[], addTemplate: Function, updateTemplate: Function, deleteTemplate: Function }}
 */
export default function useTemplates() {
  const templates = useTemplateStore((s) => s.templates);
  const addTemplate = useTemplateStore((s) => s.addTemplate);
  const updateTemplate = useTemplateStore((s) => s.updateTemplate);
  const deleteTemplate = useTemplateStore((s) => s.deleteTemplate);

  return { templates, addTemplate, updateTemplate, deleteTemplate };
}
