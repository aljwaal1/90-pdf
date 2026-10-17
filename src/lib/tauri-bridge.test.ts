import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const saf = vi.hoisted(() => ({
  pick: vi.fn(),
  write: vi.fn(),
  read: vi.fn(),
  length: vi.fn(),
}));

vi.mock('tauri-plugin-android-fs-api', () => ({
  showSaveFilePicker: saf.pick,
  writeFile: saf.write,
  readFile: saf.read,
  getFileByteLength: saf.length,
}));

import { getSystemPrinters, printPdfFile, readFileBytes, saveBlobFile, saveFile, writeFileBytes } from './tauri-bridge';

describe('Android SAF persistence and verification', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 15)' });
    saf.pick.mockResolvedValue('content://documents/123');
    saf.write.mockResolvedValue(undefined);
    saf.read.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
    saf.length.mockResolvedValue(4);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('saves through a native content URI and verifies byte length', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    await expect(saveBlobFile(bytes, 'output.pdf')).resolves.toBe(true);
    expect(saf.pick).toHaveBeenCalledWith('output.pdf', 'application/pdf');
    expect(saf.write).toHaveBeenCalledWith('content://documents/123', bytes);
    expect(saf.length).toHaveBeenCalledWith('content://documents/123');
  });

  it('uses the correct MIME type for legacy Word documents', async () => {
    await expect(saveFile('document.doc')).resolves.toBe('content://documents/123');
    expect(saf.pick).toHaveBeenCalledWith('document.doc', 'application/msword');
  });

  it('supports OpenDocument files in the native save picker', async () => {
    await expect(saveFile('report.odt')).resolves.toBe('content://documents/123');
    expect(saf.pick).toHaveBeenCalledWith('report.odt', 'application/vnd.oasis.opendocument.text');
  });

  it('saves Blob data rather than only Uint8Array input', async () => {
    const data = new Blob([new Uint8Array([1, 2, 3, 4])]);
    await expect(saveBlobFile(data, 'output.pdf')).resolves.toBe(true);
    expect(saf.write).toHaveBeenCalledWith('content://documents/123', new Uint8Array([1, 2, 3, 4]));
  });

  it('does not write after the picker is cancelled', async () => {
    saf.pick.mockResolvedValue(null);
    await expect(saveBlobFile(new Uint8Array([1]), 'output.pdf')).resolves.toBe(false);
    expect(saf.write).not.toHaveBeenCalled();
  });

  it('treats a native picker cancellation exception as cancellation', async () => {
    saf.pick.mockRejectedValue(new Error('User canceled'));
    await expect(saveBlobFile(new Uint8Array([1]), 'output.pdf')).resolves.toBe(false);
    expect(saf.write).not.toHaveBeenCalled();
  });

  it('propagates provider failures instead of silently treating them as cancellation', async () => {
    saf.pick.mockRejectedValue(new Error('Cannot access provider: abortive failure'));
    await expect(saveFile('output.pdf')).rejects.toThrow('abortive failure');
  });

  it('rejects Android reads that are not selected files or content URIs', async () => {
    await expect(readFileBytes('/sdcard/private.pdf'))
      .rejects.toThrow('SAF document URIs');
  });

  it('rejects invalid native picker destinations', async () => {
    saf.pick.mockResolvedValue('/storage/emulated/0/output.pdf');
    await expect(saveFile('output.pdf')).rejects.toThrow('document URI');
    expect(saf.write).not.toHaveBeenCalled();
  });

  it('rejects truncated output instead of reporting successful save', async () => {
    saf.length.mockResolvedValue(2);
    await expect(writeFileBytes('content://documents/123', new Uint8Array([1, 2, 3, 4])))
      .rejects.toThrow('expected 4');
  });

  it('does not report success when the SAF provider rejects a write', async () => {
    saf.write.mockRejectedValue(new Error('Storage full'));
    await expect(saveBlobFile(new Uint8Array([1, 2, 3, 4]), 'output.pdf'))
      .rejects.toThrow('Storage full');
    expect(saf.length).not.toHaveBeenCalled();
  });

  it('rejects invalid file length responses from the SAF provider', async () => {
    saf.length.mockResolvedValue('unknown');
    await expect(writeFileBytes('content://documents/123', new Uint8Array([1, 2, 3, 4])))
      .rejects.toThrow('expected 4');
  });

  it('rejects a numeric string length rather than trusting coercion', async () => {
    saf.length.mockResolvedValue('4');
    await expect(writeFileBytes('content://documents/123', new Uint8Array([1, 2, 3, 4])))
      .rejects.toThrow('expected 4');
  });

  it('does not confuse an empty document with a failed save', async () => {
    saf.length.mockResolvedValue(0);
    await expect(writeFileBytes('content://documents/123', new Uint8Array()))
      .resolves.toBeUndefined();
  });

  it('reads Android content URIs through the SAF provider', async () => {
    await expect(readFileBytes('content://documents/123'))
      .resolves.toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(saf.read).toHaveBeenCalledWith('content://documents/123');
  });

  it('normalizes native SAF reads returned as number arrays', async () => {
    saf.read.mockResolvedValue([10, 20, 30]);
    await expect(readFileBytes('content://documents/123'))
      .resolves.toEqual(new Uint8Array([10, 20, 30]));
  });

  it('does not attempt desktop printer discovery on Android', async () => {
    await expect(getSystemPrinters()).resolves.toEqual([]);
  });

  it('does not claim successful native printing on Android', async () => {
    await expect(printPdfFile(new Uint8Array([1, 2, 3])))
      .resolves.toMatchObject({ success: false });
  });

  it('rejects non-content destinations for Android writes', async () => {
    await expect(writeFileBytes('/tmp/output.pdf', new Uint8Array([1])))
      .rejects.toThrow('document URI');
  });
});
