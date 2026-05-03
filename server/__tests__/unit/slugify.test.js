import { describe, it, expect } from 'vitest';
import { slugify } from '../../routes/categories.js';

describe('slugify', () => {
  // TC-004: Slug generation
  it('TC-004: generates lowercase hyphenated slugs', () => {
    expect(slugify('Image Understanding')).toBe('image-understanding');
    expect(slugify('Chat')).toBe('chat');
    expect(slugify('Function Calling')).toBe('function-calling');
    expect(slugify('Multi-Modal')).toBe('multi-modal');
  });

  // No leading/trailing hyphens
  it('removes leading and trailing hyphens', () => {
    expect(slugify(' Image Understanding ')).toBe('image-understanding');
    expect(slugify('--test--')).toBe('test');
  });

  // Multiple consecutive spaces/special chars → single hyphen
  it('collapses multiple non-alphanumeric chars to single hyphen', () => {
    expect(slugify('Some   Category')).toBe('some-category');
    expect(slugify('Test@@Category')).toBe('test-category');
  });

  // Single word
  it('handles single-word input', () => {
    expect(slugify('reasoning')).toBe('reasoning');
  });
});
