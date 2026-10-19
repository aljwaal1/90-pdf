import { describe, expect, it } from 'vitest';
import { degrees, PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Regression tests for the existing open-source PDF engine.
 * These deliberately generate PDFs in memory: no storage permissions,
 * network connectivity, WebView, or fixture files are required.
 */
describe('pdf-lib integration smoke tests', () => {
  it('merges documents while preserving page order', async () => {
    const first = await PDFDocument.create();
    first.addPage([210, 297]);
    const second = await PDFDocument.create();
    second.addPage([300, 400]);
    second.addPage([400, 500]);

    const merged = await PDFDocument.create();
    for (const input of [first, second]) {
      const copied = await merged.copyPages(input, input.getPageIndices());
      copied.forEach((page) => merged.addPage(page));
    }

    const reopened = await PDFDocument.load(await merged.save());
    expect(reopened.getPageCount()).toBe(3);
    expect(reopened.getPages().map((page) => page.getWidth())).toEqual([210, 300, 400]);
  });

  it('extracts selected pages without changing their dimensions', async () => {
    const input = await PDFDocument.create();
    input.addPage([200, 300]);
    input.addPage([220, 330]);
    input.addPage([240, 360]);

    const extracted = await PDFDocument.create();
    const pages = await extracted.copyPages(input, [2, 0]);
    pages.forEach((page) => extracted.addPage(page));

    const output = await PDFDocument.load(await extracted.save());
    expect(output.getPageCount()).toBe(2);
    expect(output.getPages().map((page) => [page.getWidth(), page.getHeight()]))
      .toEqual([[240, 360], [200, 300]]);
  });

  it('persists page rotation, metadata, and a visible watermark', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([595, 842]);
    const font = await document.embedFont(StandardFonts.Helvetica);
    page.setRotation(degrees(90));
    page.drawText('DRAFT', {
      x: 50,
      y: 400,
      size: 36,
      font,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.4,
    });
    document.setTitle('90 PDF regression');

    const output = await PDFDocument.load(await document.save());
    expect(output.getTitle()).toBe('90 PDF regression');
    expect(output.getPageCount()).toBe(1);
    expect(output.getPage(0).getRotation().angle).toBe(90);
    expect((await output.save()).length).toBeGreaterThan(0);
  });

  it('splits a document into independent single-page PDFs', async () => {
    const input = await PDFDocument.create();
    for (const width of [200, 220, 240]) input.addPage([width, 300]);

    const results: Uint8Array[] = [];
    for (const index of input.getPageIndices()) {
      const part = await PDFDocument.create();
      const [page] = await part.copyPages(input, [index]);
      part.addPage(page);
      results.push(await part.save());
    }

    expect(results).toHaveLength(3);
    const reopened = await Promise.all(results.map((bytes) => PDFDocument.load(bytes)));
    expect(reopened.every((document) => document.getPageCount() === 1)).toBe(true);
    expect(reopened.map((document) => document.getPage(0).getWidth())).toEqual([200, 220, 240]);
  });

  it('deletes a requested page and keeps the remaining pages in order', async () => {
    const input = await PDFDocument.create();
    input.addPage([210, 300]);
    input.addPage([220, 300]);
    input.addPage([230, 300]);

    input.removePage(1);
    const reopened = await PDFDocument.load(await input.save());

    expect(reopened.getPageCount()).toBe(2);
    expect(reopened.getPages().map((page) => page.getWidth())).toEqual([210, 230]);
  });
});
