import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const saf = vi.hoisted(() => ({
  pick: vi.fn(),
  write: vi.fn(),
  length: vi.fn(),
}));

vi.mock('tauri-plugin-android-fs-api', () => ({
  showSaveFilePicker: saf.pick,
  writeFile: saf.write,
  getFileByteLength: saf.length,
}));

import { saveBlobFile, saveFile, writeFileBytes } from './tauri-bridge';

describe('Android SAF persistence', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 15)' });
    saf.pick.mockResolvedValue('content://documents/123');
    saf.write.mockResolvedValue(undefined);
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

  it('does not write after the picker is cancelled', async () => {
    saf.pick.mockResolvedValue(null);
    await expect(saveBlobFile(new Uint8Array([1]), 'output.pdf')).resolves.toBe(false);
    expect(saf.write).not.toHaveBeenCalled();
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

  it('rejects non-content destinations for Android writes', async () => {
    await expect(writeFileBytes('/tmp/output.pdf', new Uint8Array([1])))
      .rejects.toThrow('document URI');
  });
});
