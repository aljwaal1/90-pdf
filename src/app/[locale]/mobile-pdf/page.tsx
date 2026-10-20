import { setRequestLocale } from 'next-intl/server';
import { locales, type Locale } from '@/lib/i18n/config';
import MobilePdfWorkspace from './MobilePdfWorkspace';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function MobilePdfPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MobilePdfWorkspace locale={locale as Locale} />;
}
