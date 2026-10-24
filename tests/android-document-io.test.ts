import { describe, expect, it, vi } from 'vitest';
import { isAndroidDocumentUri, readAndroidDocument, writeAndroidDocument } from '@/lib/android-document-io';

vi.mock('tauri-plugin-android-fs-api', () => ({
  readFile: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
  writeFile: vi.fn(async () => undefined),
}));

describe('Android document URI bridge', () => {
  it('recognizes content URIs without mistaking native paths for them', () => {
    expect(isAndroidDocumentUri('content://provider/document/1')).toBe(true);
    expect(isAndroidDocumentUri('/storage/emulated/0/example.pdf')).toBe(false);
    expect(isAndroidDocumentUri('file:///sdcard/example.pdf')).toBe(false);
  });

  it('rejects filesystem paths before accessing the Android plugin', async () => {
    await expect(readAndroidDocument('/tmp/file.pdf')).rejects.toThrow('content://');
    await expect(writeAndroidDocument('/tmp/file.pdf', new Uint8Array())).rejects.toThrow('content://');
  });

  it('round-trips calls using the selected URI unchanged', async () => {
    const api = await import('tauri-plugin-android-fs-api');
    const uri = 'content://documents/document/primary%3ADownload%2Ftest.pdf';
    expect(Array.from(await readAndroidDocument(uri))).toEqual([37, 80, 68, 70]);
    expect(api.readFile).toHaveBeenCalledWith(uri);
    const data = new Uint8Array([1, 2, 3]);
    await writeAndroidDocument(uri, data);
    expect(api.writeFile).toHaveBeenCalledWith(uri, data);
  });
});
