/**
 * Tests for TemplateLibraryPage component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import useTemplateStore from '../store';

// Mock localStorage
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

import TemplateLibraryPage from './TemplateLibraryPage';

function makeTemplate(overrides = {}) {
  return {
    id: `t-${Math.random().toString(36).slice(2, 7)}`,
    name: 'Test Template',
    template: 'Hello {{name}}',
    variables: ['name'],
    category: 'Coding',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('TemplateLibraryPage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    useTemplateStore.setState({ templates: [] });
  });

  it('renders page with template list (TC-L-01)', () => {
    useTemplateStore.setState({
      templates: [makeTemplate({ name: 'T1' }), makeTemplate({ name: 'T2' }), makeTemplate({ name: 'T3' })],
    });

    render(<TemplateLibraryPage />);
    expect(screen.getByText('Templates')).toBeDefined();
    expect(screen.getByText('T1')).toBeDefined();
    expect(screen.getByText('T2')).toBeDefined();
    expect(screen.getByText('T3')).toBeDefined();
  });

  it('templates grouped by category (TC-L-02)', () => {
    useTemplateStore.setState({
      templates: [
        makeTemplate({ name: 'T1', category: 'Coding' }),
        makeTemplate({ name: 'T2', category: 'Coding' }),
        makeTemplate({ name: 'T3', category: 'Writing' }),
      ],
    });

    render(<TemplateLibraryPage />);
    expect(screen.getByText(/Coding \(2\)/)).toBeDefined();
    expect(screen.getByText(/Writing \(1\)/)).toBeDefined();
  });

  it('create template flow (TC-L-03)', () => {
    render(<TemplateLibraryPage />);

    // Should show empty state initially
    expect(screen.getByText('No templates yet')).toBeDefined();

    // Click create button
    fireEvent.click(screen.getByText('Create Template'));

    // Should show editor
    expect(screen.getByText('New Template')).toBeDefined();
  });

  it('edit template flow (TC-L-04)', () => {
    useTemplateStore.setState({
      templates: [makeTemplate({ name: 'Editable' })],
    });

    render(<TemplateLibraryPage />);

    // Click edit button
    fireEvent.click(screen.getByLabelText('Edit template: Editable'));

    // Should show editor in edit mode
    expect(screen.getByText('Edit Template')).toBeDefined();
  });

  it('delete template with confirmation (TC-L-05)', () => {
    useTemplateStore.setState({
      templates: [makeTemplate({ name: 'Deletable', id: 'del-1' })],
    });

    render(<TemplateLibraryPage />);

    // Click delete button
    fireEvent.click(screen.getByLabelText('Delete template: Deletable'));

    // Should show confirmation
    expect(screen.getByText(/Delete "Deletable"\?/)).toBeDefined();

    // Confirm deletion
    fireEvent.click(screen.getByText('Delete'));

    // Template should be gone
    expect(screen.queryByText('Deletable')).toBeNull();
  });

  it('search filters templates (TC-L-06)', () => {
    useTemplateStore.setState({
      templates: [
        makeTemplate({ name: 'Code Review' }),
        makeTemplate({ name: 'Blog Post' }),
      ],
    });

    render(<TemplateLibraryPage />);
    fireEvent.change(screen.getByPlaceholderText('Search templates...'), {
      target: { value: 'Code' },
    });

    expect(screen.getByText('Code Review')).toBeDefined();
    expect(screen.queryByText('Blog Post')).toBeNull();
  });

  it('category dropdown filter (TC-L-07)', () => {
    useTemplateStore.setState({
      templates: [
        makeTemplate({ name: 'T1', category: 'Coding' }),
        makeTemplate({ name: 'T2', category: 'Writing' }),
      ],
    });

    render(<TemplateLibraryPage />);
    fireEvent.change(screen.getByDisplayValue('All categories'), {
      target: { value: 'Coding' },
    });

    expect(screen.getByText('T1')).toBeDefined();
    expect(screen.queryByText('T2')).toBeNull();
  });

  it('empty state when no templates (TC-L-08)', () => {
    render(<TemplateLibraryPage />);
    expect(screen.getByText('No templates yet')).toBeDefined();
    expect(screen.getByText('Create Template')).toBeDefined();
  });

  it('no-match state (TC-L-09)', () => {
    useTemplateStore.setState({
      templates: [makeTemplate({ name: 'Existing' })],
    });

    render(<TemplateLibraryPage />);
    fireEvent.change(screen.getByPlaceholderText('Search templates...'), {
      target: { value: 'zzz' },
    });

    expect(screen.getByText('No templates match your filters')).toBeDefined();
    expect(screen.getByText('Clear filters')).toBeDefined();
  });

  it('clear-all with confirmation (TC-L-10)', () => {
    useTemplateStore.setState({
      templates: [makeTemplate({ name: 'T1' }), makeTemplate({ name: 'T2' })],
    });

    render(<TemplateLibraryPage />);

    // Click Clear all
    fireEvent.click(screen.getByText('Clear all'));

    // Should show confirmation bar
    expect(screen.getByText('Confirm Clear All')).toBeDefined();

    // Confirm
    fireEvent.click(screen.getByText('Confirm Clear All'));

    // All templates should be gone
    expect(screen.queryByText('T1')).toBeNull();
    expect(screen.queryByText('T2')).toBeNull();
    expect(screen.getByText('No templates yet')).toBeDefined();
  });

  it('clear-all cancel (TC-L-11)', () => {
    useTemplateStore.setState({
      templates: [makeTemplate({ name: 'T1' })],
    });

    render(<TemplateLibraryPage />);

    // Click Clear all
    fireEvent.click(screen.getByText('Clear all'));

    // Cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Template should still be there
    expect(screen.getByText('T1')).toBeDefined();
  });
});
