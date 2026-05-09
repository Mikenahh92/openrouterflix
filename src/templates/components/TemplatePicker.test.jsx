/**
 * Tests for TemplatePicker component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import useTemplateStore from '../store';

// Mock localStorage before importing
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${Math.random().toString(36).slice(2, 9)}`,
});

import TemplatePicker from './TemplatePicker';

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('TemplatePicker', () => {
  const onClose = vi.fn();
  const onApply = vi.fn();

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    useTemplateStore.setState({ templates: [] });
  });

  it('renders template list from store (TC-P-01)', () => {
    useTemplateStore.setState({
      templates: [
        {
          id: 't1',
          name: 'Code Review',
          template: 'Review {{lang}} code',
          variables: ['lang'],
          category: 'Coding',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 't2',
          name: 'Blog Post',
          template: 'Write about {{topic}}',
          variables: ['topic'],
          category: 'Writing',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    renderWithRouter(<TemplatePicker onClose={onClose} onApply={onApply} />);
    expect(screen.getByText('Code Review')).toBeDefined();
    expect(screen.getByText('Blog Post')).toBeDefined();
  });

  it('search filters by name (TC-P-02)', () => {
    useTemplateStore.setState({
      templates: [
        {
          id: 't1',
          name: 'Code Review',
          template: 'Review code',
          variables: [],
          category: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 't2',
          name: 'Blog Post',
          template: 'Write blog',
          variables: [],
          category: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    renderWithRouter(<TemplatePicker onClose={onClose} onApply={onApply} />);
    fireEvent.change(screen.getByPlaceholderText('Search templates...'), {
      target: { value: 'Code' },
    });

    expect(screen.getByText('Code Review')).toBeDefined();
    expect(screen.queryByText('Blog Post')).toBeNull();
  });

  it('category filter dropdown (TC-P-03)', () => {
    useTemplateStore.setState({
      templates: [
        {
          id: 't1',
          name: 'Template 1',
          template: 'Text',
          variables: [],
          category: 'Coding',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 't2',
          name: 'Template 2',
          template: 'Text',
          variables: [],
          category: 'Writing',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    renderWithRouter(<TemplatePicker onClose={onClose} onApply={onApply} />);
    fireEvent.change(screen.getByDisplayValue('All categories'), {
      target: { value: 'Coding' },
    });

    expect(screen.getByText('Template 1')).toBeDefined();
    expect(screen.queryByText('Template 2')).toBeNull();
  });

  it('selecting a template calls onSelect for no-variable template (TC-P-07)', () => {
    useTemplateStore.setState({
      templates: [
        {
          id: 't1',
          name: 'Plain Template',
          template: 'No variables here',
          variables: [],
          category: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    renderWithRouter(<TemplatePicker onClose={onClose} onApply={onApply} />);
    fireEvent.click(screen.getByText('Plain Template'));

    expect(onApply).toHaveBeenCalledWith('No variables here');
    expect(onClose).toHaveBeenCalled();
  });

  it('selecting a template with variables shows fill dialog (TC-P-04)', () => {
    useTemplateStore.setState({
      templates: [
        {
          id: 't1',
          name: 'Var Template',
          template: 'Hello {{name}}',
          variables: ['name'],
          category: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    renderWithRouter(<TemplatePicker onClose={onClose} onApply={onApply} />);
    fireEvent.click(screen.getByText('Var Template'));

    // Should show the variable fill dialog instead
    expect(screen.getByText('Fill Variables')).toBeDefined();
    // onClose should NOT have been called (modal stays open for fill dialog)
    expect(onClose).not.toHaveBeenCalled();
    // Apply should not have been called yet
    expect(onApply).not.toHaveBeenCalled();
  });

  it('empty state when no templates (TC-P-05)', () => {
    renderWithRouter(<TemplatePicker onClose={onClose} onApply={onApply} />);
    expect(screen.getByText('No templates yet')).toBeDefined();
    expect(screen.getByText('Go to Templates →')).toBeDefined();
  });

  it('no-match state when search excludes all (TC-P-06)', () => {
    useTemplateStore.setState({
      templates: [
        {
          id: 't1',
          name: 'Code Review',
          template: 'Review code',
          variables: [],
          category: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    renderWithRouter(<TemplatePicker onClose={onClose} onApply={onApply} />);
    fireEvent.change(screen.getByPlaceholderText('Search templates...'), {
      target: { value: 'zzz' },
    });

    expect(screen.getByText('No templates match your search')).toBeDefined();
    expect(screen.getByText('Clear filters')).toBeDefined();
  });

  it('ESC closes modal (TC-P-09)', () => {
    renderWithRouter(<TemplatePicker onClose={onClose} onApply={onApply} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
