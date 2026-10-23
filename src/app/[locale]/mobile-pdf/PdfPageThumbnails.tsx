'use client';
import { useEffect, useState } from 'react';

interface Props {
  file: File;
  pageCount: number;
  selected: readonly number[];
  disabled?: boolean;
  locale: 'ar' | 'en';
  onToggle: (index: number) => void;
}
const MAX_THUMBNAILS = 60;

export default function PdfPageThumbnails({ file, pageCount, selected, disabled, locale, onToggle }: Props) {
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [failed, setFailed] = useState(false);
  const visibleCount = Math.min(pageCount, MAX_THUMBNAILS);

  useEffect(() => {
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | null = null;
    setThumbs({});
    setFailed(false);
    async function renderPages() {
      try {
        const pdfjs = await import('pdfjs-dist');
        // Bundled worker must be supplied locally; do not depend on any external CDN.
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        const data = new Uint8Array(await file.arrayBuffer());
        const loading = pdfjs.getDocument({ data });
        const document = await loading.promise;
        task = document;
        for (let index = 0; index < Math.min(document.numPages, MAX_THUMBNAILS); index++) {
          if (cancelled) break;
          const page = await document.getPage(index + 1);
          const initial = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: Math.min(120 / initial.width, 160 / initial.height) });
          const canvas = window.document.createElement('canvas');
          canvas.width = Math.max(1, Math.ceil(viewport.width));
          canvas.height = Math.max(1, Math.ceil(viewport.height));
          const context = canvas.getContext('2d');
          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            if (!cancelled) setThumbs((before) => ({ ...before, [index]: canvas.toDataURL('image/png') }));
          }
          page.cleanup();
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        await task?.destroy().catch(() => undefined);
      }
    }
    void renderPages();
    return () => { cancelled = true; };
  }, [file]);

  return (
    <section aria-label={locale === 'ar' ? 'معاينة صفحات المستند' : 'Document page previews'} className="space-y-2">
      {failed && <p className="text-xs text-amber-700">{locale === 'ar' ? 'تعذرت الصور المصغرة، يمكنك اختيار الصفحات بأرقامها.' : 'Thumbnails unavailable; you can still select page numbers.'}</p>}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-80 overflow-y-auto">
        {Array.from({ length: visibleCount }, (_, index) => (
          <button key={index} type="button" disabled={disabled} aria-pressed={selected.includes(index)}
            aria-label={(locale === 'ar' ? 'صفحة ' : 'Page ') + (index + 1)}
            onClick={() => onToggle(index)}
            className={`flex min-h-28 flex-col items-center justify-center rounded-xl border p-2 ${selected.includes(index) ? 'border-blue-600 bg-blue-100 text-slate-900' : 'border-slate-300'}`}>
            {thumbs[index] ? <img src={thumbs[index]} alt="" className="max-h-36 w-full object-contain" /> : <span className="text-xs opacity-70">{locale === 'ar' ? 'معاينة' : 'Preview'}</span>}
            <span className="mt-1 text-sm font-semibold">{index + 1}</span>
          </button>
        ))}
      </div>
      {pageCount > MAX_THUMBNAILS && <p className="text-xs opacity-75">{locale === 'ar' ? 'تظهر أول 60 صفحة فقط؛ استخدم حقل الأرقام لبقية الصفحات.' : 'Showing first 60 pages. Use the page range field for later pages.'}</p>}
    </section>
  );
}
