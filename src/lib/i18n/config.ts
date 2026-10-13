/**
 * i18n Configuration for next-intl
 * Defines supported locales and routing configuration
 */

export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeConfig: Record<Locale, {
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
}> = {
  en: { name: 'English', nativeName: 'English', direction: 'ltr', dateFormat: 'MM/DD/YYYY' },
  ar: { name: 'Arabic', nativeName: 'العربية', direction: 'rtl', dateFormat: 'DD/MM/YYYY' },
};

// Strip legacy locale prefixes when generating new Arabic/English routes.
// Only en/ar remain supported as destinations; old bookmarks should not nest prefixes.
const legacyLocales = ['en', 'ar', 'ja', 'ko', 'es', 'fr', 'de', 'zh', 'zh-TW', 'pt', 'it', 'id', 'vi', 'ro', 'pl'] as const;
const escapedLocaleCodes = legacyLocales
  .map((locale) => locale.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .sort((a, b) => b.length - a.length);
const localePrefixPattern = new RegExp(`^/(?:${escapedLocaleCodes.join('|')})(?=/|$)`);

/**
 * Check if a locale is RTL
 */
export function isRTL(locale: Locale): boolean {
  return localeConfig[locale].direction === 'rtl';
}

/**
 * Check if a string is a valid locale
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Get locale from path
 */
export function getLocaleFromPath(path: string): Locale | null {
  const segments = path.split('/').filter(Boolean);
  const firstSegment = segments[0];
  if (firstSegment && isValidLocale(firstSegment)) {
    return firstSegment;
  }
  return null;
}

/**
 * Generate localized path
 */
export function getLocalizedPath(path: string, locale: Locale): string {
  // Remove any existing locale prefix (must be followed by / or end of string)
  const cleanPath = path.replace(localePrefixPattern, '') || '/';
  // Normalize the path - ensure it starts with / and handle empty paths
  const normalizedPath = cleanPath === '/'
    ? '/'
    : `/${cleanPath.replace(/^\/+/, '')}`;
  // Add the new locale prefix
  return `/${locale}${normalizedPath === '/' ? '/' : normalizedPath}`;
}
