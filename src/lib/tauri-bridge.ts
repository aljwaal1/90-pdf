/**
 * Tauri Bridge
 * Provides a unified interface for file operations in both Tauri and Browser environments.
 */

export interface FileFilter {
  name: string;
  extensions: string[];
}

const browserFileStore = new Map<string, File>();

export const isTauri = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)
  );
};

/**
 * Dynamically import Tauri invoke to avoid build-time issues in non-Tauri environments
 */
async function getTauriInvoke() {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke;
}

/**
 * Android's Storage Access Framework returns content:// URIs, not regular
 * filesystem paths. Use WebView's native <input type="file"> bridge there
 * so the selected File can be read without assuming a filesystem path.
 */
const isAndroidTauri = (): boolean =>
  isTauri() &&
  typeof navigator !== 'undefined' &&
  /Android/i.test(navigator.userAgent);

export async function openFiles(filters: FileFilter[] = []): Promise<string[]> {
  if (isTauri() && !isAndroidTauri()) {
    const invoke = await getTauriInvoke();
    return invoke<string[]>('open_files', { filters });
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.style.display = 'none';
    const exts = filters.flatMap(f =>
      f.extensions.filter(ext => ext !== '*').map(ext => `.${ext.replace(/^\./, '')}`)
    );
    if (exts.length && !filters.some(f => f.extensions.includes('*'))) {
      input.accept = [...new Set(exts)].join(',');
    }

    let settled = false;
    const finish = (paths: string[]) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onFocus);
      input.remove();
      resolve(paths);
    };
    const onFocus = () => {
      // Some WebViews don't dispatch 'cancel'. After returning from the
      // picker, give the 'change' event time to deliver the selected files.
      setTimeout(() => {
        if (!settled && (!input.files || input.files.length === 0)) finish([]);
      }, 500);
    };
    input.addEventListener('change', () => {
      const paths = Array.from(input.files ?? []).map(file => {
        const browserPath = `__browser__/${typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now()) + '-' + String(browserFileStore.size) + '-' + String(Math.floor(Math.random() * 1000000))}/${file.name}`;
        browserFileStore.set(browserPath, file);
        return browserPath;
      });
      finish(paths);
    }, { once: true });
    input.addEventListener('cancel', () => finish([]), { once: true });
    window.addEventListener('focus', onFocus);
    document.body.appendChild(input);
    try {
      input.click();
    } catch {
      finish([]);
    }
  });
}

export function getFiltersForFilename(filename: string): FileFilter[] {
  const parts = filename.split('.');
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : undefined;
  if (!ext) {
    return [{ name: 'All Files', extensions: ['*'] }];
  }

  const extMap: Record<string, string> = {
    pdf: 'PDF Document',
    xlsx: 'Excel Spreadsheet',
    xls: 'Excel Spreadsheet',
    docx: 'Word Document',
    doc: 'Word Document',
    pptx: 'PowerPoint Presentation',
    ppt: 'PowerPoint Presentation',
    png: 'PNG Image',
    jpg: 'JPEG Image',
    jpeg: 'JPEG Image',
    webp: 'WebP Image',
    svg: 'SVG Image',
    zip: 'ZIP Archive',
    txt: 'Text Document',
    json: 'JSON Document',
    csv: 'CSV Document',
  };

  const label = extMap[ext] || `${ext.toUpperCase()} File`;
  return [
    { name: label, extensions: [ext] },
    { name: 'All Files', extensions: ['*'] },
  ];
}

export async function saveFile(suggestedName: string, filters: FileFilter[] = []): Promise<string | null> {
  if (isAndroidTauri()) {
    const { showSaveFilePicker } = await import('tauri-plugin-android-fs-api');
    const ext = suggestedName.includes('.') ? suggestedName.split('.').pop()?.toLowerCase() || '' : '';
    const mime: Record<string, string> = {
      pdf: 'application/pdf', zip: 'application/zip', txt: 'text/plain',
      svg: 'image/svg+xml', xls: 'application/vnd.ms-excel',
      doc: 'application/msword', ppt: 'application/vnd.ms-powerpoint',
      json: 'application/json', csv: 'text/csv', png: 'image/png',
      jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      odt: 'application/vnd.oasis.opendocument.text',
      ods: 'application/vnd.oasis.opendocument.spreadsheet',
      odp: 'application/vnd.oasis.opendocument.presentation',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
    try {
      const destination = await showSaveFilePicker(suggestedName, mime[ext] || 'application/octet-stream');
      if (destination == null || destination === '') return null;
      if (typeof destination !== 'string' || !destination.startsWith('content://')) {
        throw new Error('Android SAF did not return a document URI');
      }
      return destination;
    } catch (error) {
      if (/\b(cancelled|canceled|user cancel|dismissed|aborted)\b/i.test(String(error))) return null;
      throw error;
    }
  }
  if (isTauri()) {
    try {
      const invoke = await getTauriInvoke();
      return await invoke<string>('save_file', { suggestedName, filters });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (
        errMsg.includes('No file selected') ||
        errMsg.includes('canceled') ||
        errMsg.includes('cancelled')
      ) {
        return null;
      }
      // Only use the dialog fallback when the native command is unavailable.
      // A real write/picker error must not be silently replaced by another dialog.
      if (!/unknown command|command .*not found|not registered/i.test(errMsg)) {
        throw err;
      }
      const { save } = await import('@tauri-apps/plugin-dialog');
      const validFilters = filters
        .map(f => ({ name: f.name, extensions: f.extensions.filter(ext => ext !== '*') }))
        .filter(f => f.extensions.length > 0);
      return save({ defaultPath: suggestedName, filters: validFilters });
    }
  }

  // Browser fallback: no native save path API, use filename as virtual path.
  return suggestedName.replace(/^[/\\]+/, '');
}

export async function readFileBytes(path: string): Promise<Uint8Array> {
  // Files selected through Android's WebView picker live in the in-memory
  // browser store even though the surrounding app is a Tauri application.
  const selectedFile = browserFileStore.get(path);
  if (selectedFile) {
    return new Uint8Array(await selectedFile.arrayBuffer());
  }
  if (isAndroidTauri() && path.startsWith('content://')) {
    const { readFile } = await import('tauri-plugin-android-fs-api');
    const result = await readFile(path);
    return result instanceof Uint8Array ? result : new Uint8Array(result);
  }
  if (isAndroidTauri()) {
    throw new Error('Android can only read selected files or SAF document URIs');
  }
  if (isTauri()) {
    const invoke = await getTauriInvoke();
    const data = await invoke<number[]>('read_file', { path });
    return new Uint8Array(data);
  }

  const file = browserFileStore.get(path);
  if (!file) {
    throw new Error(`File not found in browser session: ${path}`);
  }

  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

export async function writeFileBytes(path: string, data: Uint8Array): Promise<void> {
  if (isAndroidTauri()) {
    if (!path.startsWith('content://')) throw new Error('Android SAF document URI required');
    const { writeFile, getFileByteLength } = await import('tauri-plugin-android-fs-api');
    await writeFile(path, data);
    const length = await getFileByteLength(path);
    if (typeof length !== 'number' || !Number.isSafeInteger(length) || length !== data.byteLength) {
      throw new Error(`Android SAF saved ${length} bytes; expected ${data.byteLength}`);
    }
    return;
  }
  if (isTauri()) {
    try {
      const invoke = await getTauriInvoke();
      await invoke('write_file', { path, data: Array.from(data) });
      return;
    } catch (err) {
      try {
        const { writeFile } = await import('@tauri-apps/plugin-fs');
        await writeFile(path, data);
        return;
      } catch {
        throw err;
      }
    }
  }

  const blobData = new Uint8Array(data.byteLength);
  blobData.set(data);
  const blob = new Blob([blobData.buffer]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const filename = path.split('/').pop() || path.split('\\').pop() || 'download.bin';
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Allow the browser download handler to consume the object URL first.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Saves a Blob or byte array to disk.
 * - In Tauri desktop environment: opens native OS Save File dialog for the user to choose
 *   the destination directory and filename, then writes the file bytes.
 * - In Browser environment: triggers standard browser download via temporary <a> element.
 *
 * @param fileData Blob or Uint8Array containing file content
 * @param suggestedName Suggested filename (e.g., 'converted.pdf')
 * @param filters Optional file dialog filters
 * @returns Promise<boolean> Returns true if file was saved / downloaded, false if cancelled by user.
 */
export async function saveBlobFile(
  fileData: Blob | Uint8Array,
  suggestedName: string,
  filters?: FileFilter[]
): Promise<boolean> {
  const activeFilters =
    filters && filters.length > 0 ? filters : getFiltersForFilename(suggestedName);

  if (isAndroidTauri()) {
    const destination = await saveFile(suggestedName, activeFilters);
    if (!destination) return false;
    const bytes = fileData instanceof Uint8Array ? fileData : new Uint8Array(await fileData.arrayBuffer());
    await writeFileBytes(destination, bytes);
    return true;
  }

  if (isTauri()) {
    const selectedPath = await saveFile(suggestedName, activeFilters);
    if (!selectedPath) {
      // User cancelled dialog
      return false;
    }

    let bytes: Uint8Array;
    if (fileData instanceof Uint8Array) {
      bytes = fileData;
    } else {
      const buffer = await fileData.arrayBuffer();
      bytes = new Uint8Array(buffer);
    }

    await writeFileBytes(selectedPath, bytes);
    return true;
  }

  // Browser fallback: <a> tag download
  let blob: Blob;
  if (fileData instanceof Blob) {
    blob = fileData;
  } else {
    const copy = new Uint8Array(fileData.byteLength);
    copy.set(fileData);
    blob = new Blob([copy.buffer]);
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60000);
  // A browser download cannot be verified as persisted on the device.
  return false;
}

/**
 * Opens a URL in the system's default web browser.
 * In a desktop Tauri environment, it invokes the native open_url command.
 * In a standard browser environment, it falls back to window.open or anchor click.
 */
export async function openExternalUrl(url: string): Promise<boolean> {
  if (!url) return false;

  if (isTauri()) {
    try {
      const invoke = await getTauriInvoke();
      await invoke('open_url', { url });
      return true;
    } catch (err) {
      console.warn('Tauri native open_url failed, trying browser fallbacks:', err);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (win) return true;
    } catch {
      // ignore
    }

    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
      return true;
    } catch (e) {
      console.error('Failed to open link via fallback anchor:', e);
    }
  }

  return false;
}

export interface SystemPrinter {
  name: string;
  is_default: boolean;
  port_name?: string | null;
}

/**
 * Fetch installed system printers.
 * In a desktop Tauri environment: queries real OS printers (local, network, USB).
 * In a standard browser environment: returns empty array.
 */
export async function getSystemPrinters(): Promise<SystemPrinter[]> {
  if (isAndroidTauri()) return [];
  if (isTauri()) {
    try {
      const invoke = await getTauriInvoke();
      return await invoke<SystemPrinter[]>('get_system_printers');
    } catch (err) {
      console.warn('Failed to get system printers via Tauri:', err);
    }
  }
  return [];
}

/**
 * Print a PDF document natively or via browser fallback.
 * In desktop Tauri environment: invokes native print to specific printer or default printer.
 * In browser environment: falls back to window.print().
 */
export async function printPdfFile(
  fileData: Blob | Uint8Array,
  printerName?: string
): Promise<{ success: boolean; error?: string }> {
  if (isAndroidTauri()) {
    return { success: false, error: 'Native PDF printing is not supported by this Android build' };
  }
  if (isTauri()) {
    try {
      const invoke = await getTauriInvoke();
      let bytes: Uint8Array;
      if (fileData instanceof Uint8Array) {
        bytes = fileData;
      } else {
        const buffer = await fileData.arrayBuffer();
        bytes = new Uint8Array(buffer);
      }
      await invoke('print_pdf_file', {
        data: Array.from(bytes),
        printerName: printerName || null,
      });
      return { success: true };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errMsg };
    }
  }

  // Browser fallback
  if (typeof window !== 'undefined') {
    window.print();
    return { success: true };
  }

  return { success: false, error: 'Environment does not support printing' };
}

