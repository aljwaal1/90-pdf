import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { locales, type Locale } from '@/lib/i18n/config';
import { generateBaseMetadata } from '@/lib/seo';
import StudioPageClient from './StudioPageClient';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface StudioPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: StudioPageProps): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = locales.includes(locale as Locale) ? (locale as Locale) : 'en';
  const isAr = validLocale === 'ar';

  return generateBaseMetadata({
    locale: validLocale,
    path: '/studio',
    title: isAr ? 'استوديو PDF - مساحة عمل متكاملة لتحرير الملفات' : 'PDF Studio - All-in-One Compact PDF Editor Workspace',
    description: isAr
      ? 'مساحة عمل متكاملة لعرض ملفات PDF وتحريرها وتدويرها وإضافة العلامات المائية وضغطها وتصديرها دون إعادة الرفع.'
      : 'Compact all-in-one PDF workspace: view, edit, rotate, watermark, compress, and export in a single view without re-uploading.',
  });
}

export default async function StudioPage({ params }: StudioPageProps) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  return <StudioPageClient locale={locale as Locale} />;
}
