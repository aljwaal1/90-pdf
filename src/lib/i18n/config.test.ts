import { describe, expect, it } from 'vitest';
import { getLocalizedPath, isRTL, isValidLocale, locales } from './config';

describe('Arabic and English routing', () => {
  it('exposes only the two requested languages', () => {
    expect(locales).toEqual(['en', 'ar']);
    expect(isValidLocale('ar')).toBe(true);
    expect(isValidLocale('ja')).toBe(false);
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('en')).toBe(false);
  });

  it('normalizes legacy language prefixes without nesting routes', () => {
    expect(getLocalizedPath('/zh-TW/tools/merge', 'ar')).toBe('/ar/tools/merge');
    expect(getLocalizedPath('/ja/tools/merge', 'en')).toBe('/en/tools/merge');
    expect(getLocalizedPath('/en/tools/merge', 'ar')).toBe('/ar/tools/merge');
    expect(getLocalizedPath('/tools/merge', 'en')).toBe('/en/tools/merge');
    expect(getLocalizedPath('/', 'ar')).toBe('/ar/');
  });
});
