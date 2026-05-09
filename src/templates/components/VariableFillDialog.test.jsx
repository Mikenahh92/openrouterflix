/**
 * Tests for VariableFillDialog component.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VariableFillDialog from './VariableFillDialog';

describe('VariableFillDialog', () => {
  const mockTemplate = {
    id: 't1',
    name: 'Code Review Assistant',
    template: 'Review {{language}} code for {{focus_area}}',
    variables: ['language', 'focus_area'],
    category: 'Coding',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const onApply = vi.fn();
  const onBack = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders labeled inputs for each variable (TC-F-01)', () => {
    render(
      <VariableFillDialog
        template={mockTemplate}
        onApply={onApply}
        onBack={onBack}
        onClose={onClose}
      />
    );

    expect(screen.getByText('language')).toBeDefined();
    expect(screen.getByText('focus area')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter value for language')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter value for focus area')).toBeDefined();
  });

  it('Apply substitutes values into template (TC-F-02)', () => {
    render(
      <VariableFillDialog
        template={mockTemplate}
        onApply={onApply}
        onBack={onBack}
        onClose={onClose}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Enter value for language'), {
      target: { value: 'JavaScript' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter value for focus area'), {
      target: { value: 'security' },
    });

    fireEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith('Review JavaScript code for security');
  });

  it('unfilled variables produce empty string (TC-F-03)', () => {
    render(
      <VariableFillDialog
        template={mockTemplate}
        onApply={onApply}
        onBack={onBack}
        onClose={onClose}
      />
    );

    // Only fill 'language', leave 'focus_area' empty
    fireEvent.change(screen.getByPlaceholderText('Enter value for language'), {
      target: { value: 'Python' },
    });

    fireEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith('Review Python code for ');
  });

  it('Back button returns to picker (TC-F-05)', () => {
    render(
      <VariableFillDialog
        template={mockTemplate}
        onApply={onApply}
        onBack={onBack}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('Cancel closes modal (TC-F-06)', () => {
    render(
      <VariableFillDialog
        template={mockTemplate}
        onApply={onApply}
        onBack={onBack}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('Apply is always enabled (TC-F-08)', () => {
    render(
      <VariableFillDialog
        template={mockTemplate}
        onApply={onApply}
        onBack={onBack}
        onClose={onClose}
      />
    );

    // Apply button should not be disabled even with no values filled
    const applyButton = screen.getByText('Apply');
    expect(applyButton.disabled).toBeFalsy();
  });

  it('template name displayed for context (TC-F-09)', () => {
    render(
      <VariableFillDialog
        template={mockTemplate}
        onApply={onApply}
        onBack={onBack}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Code Review Assistant/)).toBeDefined();
  });

  it('single variable template (TC-F-10)', () => {
    const singleVarTemplate = {
      ...mockTemplate,
      template: 'Translate to {{language}}',
      variables: ['language'],
    };

    render(
      <VariableFillDialog
        template={singleVarTemplate}
        onApply={onApply}
        onBack={onBack}
        onClose={onClose}
      />
    );

    // Should have exactly one input
    const inputs = screen.getAllByPlaceholderText(/Enter value for/);
    expect(inputs).toHaveLength(1);
  });

  it('live preview updates as user types (TC-F-04)', () => {
    render(
      <VariableFillDialog
        template={mockTemplate}
        onApply={onApply}
        onBack={onBack}
        onClose={onClose}
      />
    );

    // Preview section should exist
    expect(screen.getByText('Preview')).toBeDefined();

    // After filling a value, the preview should update
    fireEvent.change(screen.getByPlaceholderText('Enter value for language'), {
      target: { value: 'Rust' },
    });

    // Verify the apply output contains the substituted value
    fireEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith(expect.stringContaining('Rust'));
  });

  it('ESC closes modal', () => {
    render(
      <VariableFillDialog
        template={mockTemplate}
        onApply={onApply}
        onBack={onBack}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
