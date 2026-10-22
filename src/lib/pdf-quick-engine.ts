import { PDFDocument, degrees } from 'pdf-lib';

export type QuickPdfOperation = 'merge' | 'extract' | 'delete' | 'rotate';
export const MAX_QUICK_PDF_BYTES = 80 * 1024 * 1024;

export function parsePdfPageSelection(input: string, total: number): number[] {
  const selected = new Set<number>();
  for (const item of input.split(',')) {
    const token = item.trim();
    if (!token) continue;
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token);
    if (!match) throw new Error('Invalid page list. Example: 1,3-5');
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end > total || end < start) {
      throw new Error('Page number is outside the document');
    }
    for (let page = start; page <= end; page++) selected.add(page - 1);
  }
  if (!selected.size) throw new Error('Select at least one page');
  return [...selected];
}

export async function processQuickPdf(
  files: readonly File[],
  operation: QuickPdfOperation,
  pageList: string,
  rotation: 90 | 180 | 270,
): Promise<Uint8Array> {
  if (!files.length) throw new Error('Choose a PDF file');
  if (files.some((file) => file.size === 0)) throw new Error('Empty files cannot be processed');
  if (files.reduce((n, file) => n + file.size, 0) > MAX_QUICK_PDF_BYTES) {
    throw new Error('Selected documents exceed the 80 MB safety limit');
  }
  if (operation === 'merge' && files.length < 2) throw new Error('Choose two or more PDF files to merge');
  if (operation !== 'merge' && files.length !== 1) throw new Error('Choose exactly one PDF file');

  const output = await PDFDocument.create();
  if (operation === 'merge') {
    for (const file of files) {
      const source = await PDFDocument.load(await file.arrayBuffer());
      const pages = await output.copyPages(source, source.getPageIndices());
      for (const page of pages) output.addPage(page);
    }
  } else {
    const source = await PDFDocument.load(await files[0].arrayBuffer());
    const indices = parsePdfPageSelection(pageList, source.getPageCount());
    if (operation === 'extract') {
      const pages = await output.copyPages(source, indices);
      for (const page of pages) output.addPage(page);
    } else {
      const pages = await output.copyPages(source, source.getPageIndices());
      for (const page of pages) output.addPage(page);
      if (operation === 'delete') {
        if (indices.length === output.getPageCount()) throw new Error('Cannot delete all pages');
        for (const index of [...indices].sort((a, b) => b - a)) output.removePage(index);
      } else {
        for (const index of indices) {
          const page = output.getPage(index);
          page.setRotation(degrees((page.getRotation().angle + rotation) % 360));
        }
      }
    }
  }
  if (output.getPageCount() === 0) throw new Error('PDF output has no pages');
  return output.save();
}
