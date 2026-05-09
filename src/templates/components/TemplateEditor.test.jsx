/**
 * Tests for TemplateEditor component.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TemplateEditor from './TemplateEditor';

describe('TemplateEditor', () => {
  const onSave = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('create mode — empty form renders (TC-E-01)', () => {
    render(<TemplateEditor onSave={onSave} onCancel={onCancel} />);

    expect(screen.getByLabelText('Name')).toBeDefined();
    expect(screen.getByLabelText('Template')).toBeDefined();
    expect(screen.getByText('Category (optional)')).toBeDefined();
    expect(screen.getByText('New Template')).toBeDefined();
    expect(screen.getByText('Save Template')).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  it('edit mode — pre-fills existing template (TC-E-02)', () => {
    const template = {
      id: 't1',
      name: 'Existing Template',
      template: 'Hello {{name}}',
      variables: ['name'],
      category: 'Coding',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    render(
      <TemplateEditor
        template={template}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    expect(screen.getByLabelText('Name')).toHaveValue('Existing Template');
    expect(screen.getByLabelText('Template')).toHaveValue('Hello {{name}}');
    expect(screen.getByText('Edit Template')).toBeDefined();
  });

  it('validation — name required (TC-E-03)', () => {
    render(<TemplateEditor onSave={onSave} onCancel={onCancel} />);

    // Type something then clear it
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.blur(nameInput);

    expect(screen.getByText('Name is required')).toBeDefined();

    // Click Save — should not call onSave
    fireEvent.click(screen.getByText('Save Template'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('validation — template text required (TC-E-04)', () => {
    render(<TemplateEditor onSave={onSave} onCancel={onCancel} />);

    // Fill name but leave template empty
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Test' },
    });

    // Click Save without filling template — validate() should catch it
    fireEvent.click(screen.getByText('Save Template'));

    expect(screen.getByText('Template text is required')).toBeDefined();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Save calls onSave with correct data (TC-E-05)', () => {
    render(<TemplateEditor onSave={onSave} onCancel={onCancel} />);

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Test Template' },
    });
    fireEvent.change(screen.getByLabelText('Template'), {
      target: { value: 'Hello {{x}}' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Coding, Writing, Analysis'), {
      target: { value: 'Coding' },
    });

    fireEvent.click(screen.getByText('Save Template'));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Test Template',
      template: 'Hello {{x}}',
      category: 'Coding',
    });
  });

  it('live variable detection display (TC-E-06)', () => {
    render(<TemplateEditor onSave={onSave} onCancel={onCancel} />);

    expect(screen.queryByText(/Variables detected/)).toBeNull();

    fireEvent.change(screen.getByLabelText('Template'), {
      target: { value: 'Hello {{name}}' },
    });

    expect(screen.getByText(/Variables detected/)).toBeDefined();
    expect(screen.getByText('name')).toBeDefined();
  });

  it('Cancel calls onCancel (TC-E-07)', () => {
    render(<TemplateEditor onSave={onSave} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('category is optional (TC-E-08)', () => {
    render(<TemplateEditor onSave={onSave} onCancel={onCancel} />);

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByLabelText('Template'), {
      target: { value: 'Template text' },
    });

    fireEvent.click(screen.getByText('Save Template'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ category: null })
    );
  });
});
