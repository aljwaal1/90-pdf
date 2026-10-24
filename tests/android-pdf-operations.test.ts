import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { deleteAndroidPdfPages, rotateAndroidPdfPages, extractAndroidPdfPages, mergeAndroidPdfDocuments } from '@/lib/android-pdf-operations';

const { readFile, writeFile, files } = vi.hoisted(() => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  files: new Map<string, Uint8Array>(),
}));

vi.mock('tauri-plugin-android-fs-api', () => ({ readFile, writeFile }));

async function samplePdf(widths: number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const width of widths) doc.addPage([width, 300]);
  return doc.save();
}

beforeEach(() => {
  files.clear();
  readFile.mockReset();
  writeFile.mockReset();
  readFile.mockImplementation(async (uri: string) => {
    const bytes = files.get(uri);
    if (!bytes) throw new Error('Document not found');
    return bytes;
  });
  writeFile.mockImplementation(async (uri: string, bytes: Uint8Array) => {
    files.set(uri, bytes);
  });
});

describe('Android PDF operations through SAF URIs', () => {
  it('merges two documents and writes output only to its destination', async () => {
    const a = 'content://pdf/a';
    const b = 'content://pdf/b';
    const output = 'content://pdf/merged';
    files.set(a, await samplePdf([210]));
    files.set(b, await samplePdf([230, 240]));

    expect(await mergeAndroidPdfDocuments([a, b], output)).toBe(3);
    const merged = await PDFDocument.load(files.get(output)!);
    expect(merged.getPages().map((page) => page.getWidth())).toEqual([210, 230, 240]);
    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledWith(output, expect.any(Uint8Array));
  });

  it('extracts requested pages in selected order', async () => {
    files.set('content://pdf/source', await samplePdf([210, 220, 230]));
    expect(await extractAndroidPdfPages('content://pdf/source', 'content://pdf/out', [2, 0])).toBe(2);
    const out = await PDFDocument.load(files.get('content://pdf/out')!);
    expect(out.getPages().map((page) => page.getWidth())).toEqual([230, 210]);
  });

  it('rejects overwriting inputs and out-of-range page selections', async () => {
    const uri = 'content://pdf/source';
    files.set(uri, await samplePdf([210]));
    await expect(mergeAndroidPdfDocuments([uri, uri], uri)).rejects.toThrow('Destination');
    await expect(extractAndroidPdfPages(uri, 'content://pdf/out', [1])).rejects.toThrow('outside');
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('deletes chosen pages without changing source bytes', async () => {
    const source = 'content://pdf/deletion-source';
    const output = 'content://pdf/deletion-output';
    const original = await samplePdf([210, 220, 230]);
    files.set(source, original);
    expect(await deleteAndroidPdfPages(source, output, [1])).toBe(2);
    const pdf = await PDFDocument.load(files.get(output)!);
    expect(pdf.getPages().map((p) => p.getWidth())).toEqual([210, 230]);
    expect(files.get(source)).toBe(original);
  });

  it('prevents deleting all pages', async () => {
    const source = 'content://pdf/one';
    files.set(source, await samplePdf([210]));
    await expect(deleteAndroidPdfPages(source, 'content://pdf/empty', [0])).rejects.toThrow('every page');
    expect(files.has('content://pdf/empty')).toBe(false);
  });

  it('rotates selected pages and preserves unrelated pages', async () => {
    const source = 'content://pdf/rotation-source';
    const output = 'content://pdf/rotation-output';
    files.set(source, await samplePdf([210, 220]));
    expect(await rotateAndroidPdfPages(source, output, [1], 90)).toBe(2);
    const pdf = await PDFDocument.load(files.get(output)!);
    expect(pdf.getPage(0).getRotation().angle).toBe(0);
    expect(pdf.getPage(1).getRotation().angle).toBe(90);
  });
});
