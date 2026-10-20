'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { locales, defaultLocale, type Locale } from '@/lib/i18n/config';

// Keep a useful page visible while client-side locale routing initializes.
// Users can navigate manually if the router is delayed or JavaScript hydration fails.
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    let destination: Locale = defaultLocale;
    try {
      const primaryLang = navigator.language.split('-')[0]?.toLowerCase();
      if (primaryLang && (locales as readonly string[]).includes(primaryLang)) {
        destination = primaryLang as Locale;
      }
    } catch {
      // Continue with the supported default locale.
    }
    router.replace(`/${destination}/`);
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center" role="main">
      <h1 className="text-3xl font-bold">90 PDF</h1>
      <p className="text-base" role="status" aria-live="polite">
        Opening your PDF tools… / جارٍ فتح أدوات PDF…
      </p>
      <nav aria-label="Choose language / اختيار اللغة" className="flex flex-wrap items-center justify-center gap-4">
        <a href="/ar/" lang="ar" dir="rtl" className="rounded-lg border px-5 py-3 underline">
          العربية
        </a>
        <a href="/en/" lang="en" className="rounded-lg border px-5 py-3 underline">
          English
        </a>
      </nav>
    </main>
  );
}
