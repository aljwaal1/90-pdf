import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { parsePdfPageSelection, processQuickPdf } from '@/lib/pdf-quick-engine';

async function sample(widths: number[]) {
  const pdf = await PDFDocument.create();
  widths.forEach((width) => pdf.addPage([width, 250]));
  const data = await pdf.save();
  const file = new File([new Uint8Array(data)], 'test.pdf', { type: 'application/pdf' });
  Object.defineProperty(file, 'arrayBuffer', { value: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) });
  return file;
}

describe('shared quick PDF engine', () => {
  it('parses unique pages in the given order', () => {
    expect(parsePdfPageSelection('3, 1-2, 2', 4)).toEqual([2, 0, 1]);
    expect(() => parsePdfPageSelection('2-1', 4)).toThrow();
    expect(() => parsePdfPageSelection('9', 4)).toThrow();
  });

  it('merges documents and retains page order', async () => {
    const result = await processQuickPdf([await sample([100]), await sample([200, 300])], 'merge', '', 90);
    const pdf = await PDFDocument.load(result);
    expect(pdf.getPages().map((page) => page.getWidth())).toEqual([100, 200, 300]);
  });

  it('extracts, deletes and rotates pages', async () => {
    const file = await sample([100, 200, 300]);
    const extract = await PDFDocument.load(await processQuickPdf([file], 'extract', '3,1', 90));
    expect(extract.getPages().map((page) => page.getWidth())).toEqual([300, 100]);
    const deletion = await PDFDocument.load(await processQuickPdf([file], 'delete', '2', 90));
    expect(deletion.getPages().map((page) => page.getWidth())).toEqual([100, 300]);
    const rotated = await PDFDocument.load(await processQuickPdf([file], 'rotate', '2', 90));
    expect(rotated.getPage(1).getRotation().angle).toBe(90);
  });

  it('refuses empty documents or deletion of every page', async () => {
    const file = await sample([100]);
    await expect(processQuickPdf([file], 'delete', '1', 90)).rejects.toThrow('every page');
    await expect(processQuickPdf([], 'merge', '', 90)).rejects.toThrow('Choose');
  });
});
