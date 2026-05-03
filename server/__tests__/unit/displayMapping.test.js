import { describe, it, expect } from 'vitest';
import { mapToDisplayCategory } from '../../routes/categories.js';

describe('mapToDisplayCategory', () => {
  // TC-002: Known category mappings
  it('TC-002: maps known raw categories to display names', () => {
    expect(mapToDisplayCategory('chat')).toBe('Chat');
    expect(mapToDisplayCategory('text')).toBe('Chat');
    expect(mapToDisplayCategory('image')).toBe('Image Understanding');
    expect(mapToDisplayCategory('code')).toBe('Code');
    expect(mapToDisplayCategory('reasoning')).toBe('Reasoning');
    expect(mapToDisplayCategory('function_calling')).toBe('Function Calling');
  });

  // TC-003: Unknown categories get titleCase fallback
  it('TC-003: applies titleCase fallback for unknown categories', () => {
    expect(mapToDisplayCategory('multimodal')).toBe('Multimodal');
    expect(mapToDisplayCategory('embedding')).toBe('Embedding');
  });

  // Additional: underscore-separated unknown categories
  it('handles underscore-separated unknown categories with titleCase', () => {
    expect(mapToDisplayCategory('some_new_category')).toBe('Some New Category');
  });

  // Case insensitivity for lookup
  it('handles uppercase input for known categories', () => {
    expect(mapToDisplayCategory('Chat')).toBe('Chat');
    expect(mapToDisplayCategory('IMAGE')).toBe('Image Understanding');
  });
});
