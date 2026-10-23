'use client';
import { useRef, useState, type ChangeEvent } from 'react';
import { PDFDocument } from 'pdf-lib';
import { processQuickPdf, MAX_QUICK_PDF_BYTES, type QuickPdfOperation } from '@/lib/pdf-quick-engine';
import type { Locale } from '@/lib/i18n/config';

type Operation = QuickPdfOperation;

async function savePdf(bytes: Uint8Array, name: string): Promise<string> {
  const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  if (inTauri) {
    const fs = await import('tauri-plugin-android-fs-api');
    if (fs.isAndroid()) {
      let uri: string | undefined;
      try {
        uri = await fs.createNewPublicFile(fs.PublicGeneralPurposeDir.Download, '90 PDF/' + name, 'application/pdf', { isPending: true });
        await fs.writeFile(uri, bytes);
        await fs.setPublicFilePending(uri, false);
        await fs.scanPublicFile(uri);
        return 'Downloads/90 PDF/' + name;
      } catch (error) {
        if (uri) await fs.removeFile(uri).catch(() => undefined);
        throw error;
      }
    }
  }
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  return name;
}

export default function MobilePdfWorkspace({ locale }: { locale: Locale }) {
  const ar = locale === 'ar';
  const [op, setOp] = useState<Operation>('merge');
  const [files, setFiles] = useState<File[]>([]);
  const [pages, setPages] = useState('1');
  const [rotation, setRotation] = useState<90 | 180 | 270>(90);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(false);
  const [outputName, setOutputName] = useState('90-pdf-result.pdf');
  const [phase, setPhase] = useState<'idle' | 'processing' | 'saving'>('idle');
  const [selectedPreview, setSelectedPreview] = useState<number[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState('');
  const selectionVersion = useRef(0);

  async function run() {
    setBusy(true);
    setPhase('processing');
    setStatus('');
    setError(false);
    try {
      const bytes = await processQuickPdf(files, op, pages, rotation);
      const cleaned = outputName.trim().replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').replace(/[. ]+$/g, '').slice(0, 100);
      const name = cleaned.toLowerCase().endsWith('.pdf') ? cleaned : cleaned + '.pdf';
      if (name === '.pdf' || !cleaned) throw new Error('Enter a valid output file name');
      setPhase('saving');
      const destination = await savePdf(bytes, name);
      setStatus((ar ? 'تم حفظ الملف: ' : 'Saved PDF: ') + destination);
    } catch (error) {
      setError(true);
      setStatus((ar ? 'تعذر إتمام العملية: ' : 'Operation failed: ') + (error instanceof Error ? error.message : String(error)));
    } finally {
      setBusy(false);
      setPhase('idle');
    }
  }

  const operations: { id: Operation; ar: string; en: string }[] = [
    { id: 'merge', ar: 'دمج', en: 'Merge' },
    { id: 'extract', ar: 'استخراج', en: 'Extract' },
    { id: 'delete', ar: 'حذف صفحات', en: 'Delete pages' },
    { id: 'rotate', ar: 'تدوير', en: 'Rotate' },
  ];

  return (
    <main id="main-content" className="mx-auto max-w-2xl space-y-6 p-5">
      <a href={`/${locale}/studio`} className="underline">{ar ? 'العودة للاستوديو' : 'Back to studio'}</a>
      <h1 className="text-3xl font-bold">{ar ? 'أدوات PDF السريعة' : 'Quick PDF tools'}</h1>
      <p>{ar ? 'تعمل المعالجة محليًا على جهازك. لا تُرفع ملفاتك إلى خادم.' : 'Files are processed locally on your device without uploading to a server.'}</p>
      <div className="grid grid-cols-2 gap-2">
        {operations.map((item) => (
          <button key={item.id} type="button" aria-pressed={op === item.id}
            className={`rounded-xl border px-3 py-3 ${op === item.id ? 'border-blue-600 bg-blue-100 text-slate-900' : ''}`}
            disabled={busy}
            onClick={() => { setOp(item.id); setFiles([]); setStatus(''); setError(false); setSelectedPreview([]); setPreviewCount(null); setPreviewError(''); setPages('1'); selectionVersion.current += 1; }}>
            {ar ? item.ar : item.en}
          </button>
        ))}
      </div>
      <label className="block space-y-2">
        <span className="font-semibold">{ar ? 'اختر ملفات PDF' : 'Choose PDF files'}</span>
        <input key={op} disabled={busy} className="block w-full rounded-lg border p-3" type="file" accept=".pdf,application/pdf"
          multiple={op === 'merge'}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const selection = Array.from(event.target.files ?? []);
            setFiles(selection);
            setStatus('');
            setSelectedPreview([]);
            setPreviewCount(null);
            setPreviewError('');
            setPages('1');
            const version = ++selectionVersion.current;
            if (selection.length === 1 && op !== 'merge' && selection[0].size > MAX_QUICK_PDF_BYTES) {
              setPreviewError(ar ? 'الملف أكبر من حد 80 ميغابايت' : 'File exceeds the 80 MB limit');
            } else if (selection.length === 1 && op !== 'merge') {
              void selection[0].arrayBuffer().then((bytes) => PDFDocument.load(bytes)).then((doc) => {
                if (selectionVersion.current === version) setPreviewCount(doc.getPageCount());
              }).catch(() => { if (selectionVersion.current === version) {
                setPreviewCount(null);
                setPreviewError(ar ? 'تعذرت معاينة الملف. تأكد أنه PDF صالح وغير مشفر.' : 'Could not preview the PDF. It may be invalid or encrypted.');
              } });
            }
          }} />
      </label>
      {previewError && <p role="alert" className="text-sm text-red-600">{previewError}</p>}
      {files.length > 0 && <p className="text-sm">{files.map((file) => file.name).join('، ')}</p>}
      {op !== 'merge' && (
        <label className="block space-y-2">
          <span className="font-semibold">{ar ? 'الصفحات (مثال 1,3-5)' : 'Pages (example 1,3-5)'}</span>
          <input disabled={busy} inputMode="text" dir="ltr" className="block w-full rounded-lg border p-3" value={pages} onChange={(event) => { setPages(event.target.value); setSelectedPreview([]); }} />
        </label>
      )}
      {op !== 'merge' && previewCount !== null && previewCount <= 150 && (
        <section aria-label={ar ? 'اختيار الصفحات' : 'Choose pages'} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{ar ? 'حدد الصفحات بالضغط عليها' : 'Tap pages to select'}</span>
            <span className="text-sm opacity-70">{previewCount} {ar ? 'صفحة' : 'pages'}</span>
          </div>
          <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto">
            {Array.from({ length: previewCount }, (_, i) => {
              const active = selectedPreview.includes(i);
              return <button key={i} type="button" disabled={busy}
                aria-pressed={active} aria-label={(ar ? 'صفحة ' : 'Page ') + (i + 1)}
                onClick={() => {
                  const chosen = active ? selectedPreview.filter((p) => p !== i) : [...selectedPreview, i].sort((a,b) => a-b);
                  setSelectedPreview(chosen);
                  setPages(chosen.map((p) => p + 1).join(','));
                }}
                className={`min-h-11 rounded-lg border text-sm ${active ? 'border-blue-700 bg-blue-100 text-blue-900' : 'bg-transparent'}`}>
                {i + 1}
              </button>;
            })}
          </div>
        </section>
      )}
      {op === 'rotate' && (
        <label className="block space-y-2">
          <span className="font-semibold">{ar ? 'زاوية التدوير' : 'Rotation angle'}</span>
          <select disabled={busy} className="block w-full rounded-lg border p-3" value={rotation}
            onChange={(event) => setRotation(Number(event.target.value) as 90 | 180 | 270)}>
            <option value={90}>90°</option><option value={180}>180°</option><option value={270}>270°</option>
          </select>
        </label>
      )}
      <label className="block space-y-2">
        <span className="font-semibold">{ar ? 'اسم الملف الناتج' : 'Output file name'}</span>
        <input disabled={busy} className="block w-full rounded-lg border p-3" value={outputName} onChange={(event) => setOutputName(event.target.value)} />
      </label>
      <p className="text-xs opacity-75">{ar ? 'الحد الآمن للمدخلات: 80 ميغابايت إجمالًا' : 'Input safety limit: 80 MB total'}</p>
      <button type="button" disabled={busy || files.length === 0 || !!previewError} onClick={run}
        className="w-full rounded-xl bg-blue-700 p-4 font-bold text-white disabled:opacity-50">
        {busy ? (phase === 'saving' ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'جارٍ المعالجة…' : 'Processing…')) : (ar ? 'معالجة وحفظ PDF' : 'Process and save PDF')}
      </button>
      <p role={error ? "alert" : "status"} aria-live="polite" className={`break-words ${error ? "text-red-600" : "text-green-700"}`}>{status}</p>
    </main>
  );
}
