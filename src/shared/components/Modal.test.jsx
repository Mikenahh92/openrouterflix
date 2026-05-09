/**
 * Tests for Modal component.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Modal from './Modal';

describe('Modal', () => {
  let onClose;

  const defaultProps = () => ({
    isOpen: true,
    onClose,
    title: 'Test Modal',
    children: <div>Modal body</div>,
  });

  beforeEach(() => {
    onClose = vi.fn();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders when isOpen=true (TC-M-01)', () => {
    render(<Modal {...defaultProps()} />);
    expect(screen.getByText('Test Modal')).toBeDefined();
    expect(screen.getByText('Modal body')).toBeDefined();
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('returns null when isOpen=false (TC-M-02)', () => {
    const { container } = render(<Modal {...defaultProps()} isOpen={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('closes via X button (TC-M-03)', () => {
    render(<Modal {...defaultProps()} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes via overlay click (TC-M-04)', () => {
    const { container } = render(<Modal {...defaultProps()} />);
    // Click the overlay (the fixed inset-0 div, not the dialog card)
    const overlay = container.firstChild;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes via ESC key (TC-M-05)', () => {
    render(<Modal {...defaultProps()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('content inside card click does NOT close (TC-M-06)', () => {
    render(<Modal {...defaultProps()} />);
    fireEvent.click(screen.getByText('Modal body'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('footer renders when provided (TC-M-07)', () => {
    render(
      <Modal {...defaultProps()} footer={<button>OK</button>} />
    );
    expect(screen.getByText('OK')).toBeDefined();
  });

  it('footer omitted when not provided (TC-M-08)', () => {
    const { container } = render(<Modal {...defaultProps()} />);
    // No element with border-t (footer separator) should exist
    const footerElements = container.querySelectorAll('.border-t');
    expect(footerElements).toHaveLength(0);
  });

  it('has aria-modal and role=dialog (TC-M-10)', () => {
    render(<Modal {...defaultProps()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('restores body overflow on unmount', () => {
    const { unmount } = render(<Modal {...defaultProps()} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
