/**
 * Tests for chartTheme module.
 * TC-UNIT-001 through TC-UNIT-009
 */
import { describe, it, expect } from 'vitest';
import { chartTheme } from './chartTheme';

describe('chartTheme', () => {
  it('exports colors array with 6+ entries (TC-UNIT-001)', () => {
    expect(chartTheme.colors).toBeDefined();
    expect(Array.isArray(chartTheme.colors)).toBe(true);
    expect(chartTheme.colors.length).toBeGreaterThanOrEqual(6);
  });

  it('colors entries are valid hex strings (TC-UNIT-002)', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    for (const color of chartTheme.colors) {
      expect(color, `color "${color}" should match hex pattern`).toMatch(hexPattern);
    }
  });

  it('colors match Neural Glow palette (TC-UNIT-003)', () => {
    expect(chartTheme.colors).toContain('#8b5cf6'); // violet-500
    expect(chartTheme.colors).toContain('#06b6d4'); // cyan-500
    expect(chartTheme.colors).toContain('#10b981'); // emerald-500
    expect(chartTheme.colors).toContain('#f59e0b'); // amber-500
    expect(chartTheme.colors).toContain('#f43f5e'); // rose-500
  });

  it('exports gridColor as #1e293b (TC-UNIT-004)', () => {
    expect(chartTheme.gridColor).toBe('#1e293b');
  });

  it('exports axisColor as #94a3b8 (TC-UNIT-005)', () => {
    expect(chartTheme.axisColor).toBe('#94a3b8');
  });

  it('exports backgroundColor (TC-UNIT-006)', () => {
    expect(chartTheme.backgroundColor).toBeDefined();
  });

  it('exports tooltipStyle with Neural Glow properties (TC-UNIT-007)', () => {
    expect(chartTheme.tooltipStyle).toBeDefined();
    expect(typeof chartTheme.tooltipStyle).toBe('object');
    expect(chartTheme.tooltipStyle.backgroundColor).toBe('#131625');
    expect(chartTheme.tooltipStyle.border).toContain('#1e293b');
    expect(chartTheme.tooltipStyle.color).toBe('#F1F5F9');
  });

  it('exports legendStyle as object (TC-UNIT-008)', () => {
    expect(chartTheme.legendStyle).toBeDefined();
    expect(typeof chartTheme.legendStyle).toBe('object');
    expect(chartTheme.legendStyle.color).toBeDefined();
  });

  it('no export is undefined (TC-UNIT-009)', () => {
    const { colors, gridColor, axisColor, backgroundColor, tooltipStyle, legendStyle } = chartTheme;
    expect(colors).not.toBeUndefined();
    expect(gridColor).not.toBeUndefined();
    expect(axisColor).not.toBeUndefined();
    expect(backgroundColor).not.toBeUndefined();
    expect(tooltipStyle).not.toBeUndefined();
    expect(legendStyle).not.toBeUndefined();
  });
});
