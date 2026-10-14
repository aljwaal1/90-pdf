import { describe, expect, it } from 'vitest';
import { getAllTools } from '@/config/tools';
import { getToolContent, toolContentEn } from '@/config/tool-content';

describe('tool content integrity', () => {
  it('provides content for every configured tool in both supported locales', () => {
    const toolIds = getAllTools().map(tool => tool.id);
    for (const locale of ['en', 'ar'] as const) {
      const missing = toolIds.filter(id => !getToolContent(locale, id));
      expect(missing).toEqual([]);
    }
  });

  it('keeps English content available for all configured tools', () => {
    const missing = getAllTools().map(tool => tool.id).filter(id => !toolContentEn[id]);
    expect(missing).toEqual([]);
  });

  it('returns localized or fallback content for core PDF tools', () => {
    for (const locale of ['en', 'ar'] as const) {
      for (const id of ['merge-pdf', 'split-pdf', 'compress-pdf']) {
        expect(getToolContent(locale, id)?.title).toBeTruthy();
      }
    }
  });
});
