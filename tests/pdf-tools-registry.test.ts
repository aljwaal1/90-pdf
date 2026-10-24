import { describe, expect, it } from 'vitest';
import { getAllTools, getPopularTools, getToolsByCategory } from '@/config/tools';
import type { ToolCategory } from '@/types/tool';

const categories: ToolCategory[] = [
  'edit-annotate',
  'convert-to-pdf',
  'convert-from-pdf',
  'organize-manage',
  'optimize-repair',
  'secure-pdf',
];

describe('PDF tools navigation registry', () => {
  const tools = getAllTools();

  it('has unique IDs and route slugs so menu links do not collide', () => {
    expect(tools.length).toBeGreaterThan(0);
    expect(new Set(tools.map((tool) => tool.id)).size).toBe(tools.length);
    expect(new Set(tools.map((tool) => tool.slug)).size).toBe(tools.length);
  });

  it('provides routes and a known category for every tool card', () => {
    for (const tool of tools) {
      expect(tool.id.trim()).not.toBe('');
      expect(tool.slug.trim()).not.toBe('');
      expect(tool.slug).not.toContain('/');
      expect(categories).toContain(tool.category);
    }
  });

  it('keeps category and popular views tied to the master registry', () => {
    const ids = new Set(tools.map((tool) => tool.id));
    for (const category of categories) {
      for (const tool of getToolsByCategory(category)) {
        expect(tool.category).toBe(category);
        expect(ids.has(tool.id)).toBe(true);
      }
    }
    for (const tool of getPopularTools()) {
      expect(ids.has(tool.id)).toBe(true);
    }
  });
});
