'use client';
import { useState, type ChangeEvent } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import type { Locale } from '@/lib/i18n/config';

type Operation = 'merge' | 'extract' | 'delete' | 'rotate';

function selectedPages(text: string, total: number): number[] {
  const selected = new Set<number>();
  for (const piece of text.split(',')) {
    const value = piece.trim();
    if (!value) continue;
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(value);
    if (!match) throw new Error('Invalid page list. Example: 1,3-5');
    const from = Number(match[1]);
    const to = Number(match[2] ?? match[1]);
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 1 || to > total || from > to) {
      throw new Error('Page number is outside the document');
    }
    for (let page = from; page <= to; page++) selected.add(page - 1);
  }
  if (!selected.size) throw new Error('Select at least one page');
  return [...selected];
}

async function processPdf(files: File[], op: Operation, pages: string, rotation: 90 | 180 | 270) {
  if (!files.length) throw new Error('Choose a PDF file');
  if (op === 'merge' && files.length < 2) throw new Error('Choose two or more PDF files to merge');
  const output = await PDFDocument.create();
  if (op === 'merge') {
    for (const file of files) {
      const source = await PDFDocument.load(await file.arrayBuffer());
      const copies = await output.copyPages(source, source.getPageIndices());
      copies.forEach((page) => output.addPage(page));
    }
  } else {
    const source = await PDFDocument.load(await files[0].arrayBuffer());
    const indices = selectedPages(pages, source.getPageCount());
    if (op === 'extract') {
      const copies = await output.copyPages(source, indices);
      copies.forEach((page) => output.addPage(page));
    } else {
      if (op === 'delete' && new Set(indices).size === source.getPageCount()) {
        throw new Error('Cannot delete all pages');
      }
      const copies = await output.copyPages(source, source.getPageIndices());
      copies.forEach((page) => output.addPage(page));
      if (op === 'delete') {
        for (const index of indices.sort((a, b) => b - a)) output.removePage(index);
      } else {
        for (const index of indices) {
          const page = output.getPage(index);
          page.setRotation(degrees((page.getRotation().angle + rotation) % 360));
        }
      }
    }
  }
  if (!output.getPageCount()) throw new Error('PDF output has no pages');
  return output.save();
}

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

  async function run() {
    setBusy(true);
    setStatus('');
    try {
      const bytes = await processPdf(files, op, pages, rotation);
      const name = '90-pdf-' + op + '-' + Date.now() + '.pdf';
      const destination = await savePdf(bytes, name);
      setStatus((ar ? 'تم حفظ الملف: ' : 'Saved PDF: ') + destination);
    } catch (error) {
      setStatus((ar ? 'تعذر إتمام العملية: ' : 'Operation failed: ') + (error instanceof Error ? error.message : String(error)));
    } finally {
      setBusy(false);
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
            onClick={() => { setOp(item.id); setFiles([]); setStatus(''); }}>
            {ar ? item.ar : item.en}
          </button>
        ))}
      </div>
      <label className="block space-y-2">
        <span className="font-semibold">{ar ? 'اختر ملفات PDF' : 'Choose PDF files'}</span>
        <input className="block w-full rounded-lg border p-3" type="file" accept=".pdf,application/pdf"
          multiple={op === 'merge'}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const selection = Array.from(event.target.files ?? []);
            setFiles(selection);
            setStatus('');
          }} />
      </label>
      {files.length > 0 && <p className="text-sm">{files.map((file) => file.name).join('، ')}</p>}
      {op !== 'merge' && (
        <label className="block space-y-2">
          <span className="font-semibold">{ar ? 'الصفحات (مثال 1,3-5)' : 'Pages (example 1,3-5)'}</span>
          <input className="block w-full rounded-lg border p-3" value={pages} onChange={(event) => setPages(event.target.value)} />
        </label>
      )}
      {op === 'rotate' && (
        <label className="block space-y-2">
          <span className="font-semibold">{ar ? 'زاوية التدوير' : 'Rotation angle'}</span>
          <select className="block w-full rounded-lg border p-3" value={rotation}
            onChange={(event) => setRotation(Number(event.target.value) as 90 | 180 | 270)}>
            <option value={90}>90°</option><option value={180}>180°</option><option value={270}>270°</option>
          </select>
        </label>
      )}
      <button type="button" disabled={busy || files.length === 0} onClick={run}
        className="w-full rounded-xl bg-blue-700 p-4 font-bold text-white disabled:opacity-50">
        {busy ? (ar ? 'جارٍ المعالجة…' : 'Processing…') : (ar ? 'معالجة وحفظ PDF' : 'Process and save PDF')}
      </button>
      <p role="status" aria-live="polite" className="break-words">{status}</p>
    </main>
  );
}
