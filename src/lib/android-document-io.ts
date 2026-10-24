/**
 * Android Storage Access Framework bridge for documents selected by the user.
 * These content:// URIs are NOT native filesystem paths.
 * The Rust backend already registers tauri-plugin-android-fs 29.0.0.
 */
export function isAndroidDocumentUri(uri: string): boolean {
  return /^content:\/\//i.test(uri);
}

/** Read a user-selected document without converting its URI to a filesystem path. */
export async function readAndroidDocument(uri: string): Promise<Uint8Array> {
  if (!isAndroidDocumentUri(uri)) {
    throw new Error('A content:// document URI is required');
  }
  const { readFile } = await import('tauri-plugin-android-fs-api');
  return readFile(uri);
}

/** Write bytes to a document URI with the permission granted by Android's picker. */
export async function writeAndroidDocument(uri: string, bytes: Uint8Array): Promise<void> {
  if (!isAndroidDocumentUri(uri)) {
    throw new Error('A content:// document URI is required');
  }
  const { writeFile } = await import('tauri-plugin-android-fs-api');
  await writeFile(uri, bytes);
}
