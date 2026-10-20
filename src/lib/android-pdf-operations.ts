import { PDFDocument } from 'pdf-lib';
import { readAndroidDocument, writeAndroidDocument, isAndroidDocumentUri } from './android-document-io';

/**
 * Native Android document URI -> PDF processing -> destination document URI.
 * The destination must be created/granted by an Android document picker.
 * Never overwrite a source URI implicitly.
 */
export async function mergeAndroidPdfDocuments(
  sourceUris: readonly string[],
  destinationUri: string,
): Promise<number> {
  if (sourceUris.length < 2) throw new Error('Select at least two PDF documents to merge');
  if (!isAndroidDocumentUri(destinationUri)) throw new Error('A content:// destination URI is required');
  if (sourceUris.some((uri) => !isAndroidDocumentUri(uri))) {
    throw new Error('All source documents must be Android content:// URIs');
  }
  if (sourceUris.includes(destinationUri)) {
    throw new Error('Destination must differ from every source document');
  }

  const merged = await PDFDocument.create();
  for (const sourceUri of sourceUris) {
    const bytes = await readAndroidDocument(sourceUri);
    const source = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  if (merged.getPageCount() === 0) throw new Error('Cannot save an empty merged PDF');

  await writeAndroidDocument(destinationUri, await merged.save());
  return merged.getPageCount();
}

export async function extractAndroidPdfPages(
  sourceUri: string,
  destinationUri: string,
  pageIndices: readonly number[],
): Promise<number> {
  if (!isAndroidDocumentUri(sourceUri) || !isAndroidDocumentUri(destinationUri)) {
    throw new Error('Android content:// source and destination URIs are required');
  }
  if (sourceUri === destinationUri) throw new Error('Destination must differ from source');
  if (!pageIndices.length) throw new Error('Select at least one page');
  const source = await PDFDocument.load(await readAndroidDocument(sourceUri));
  if (pageIndices.some((index) => !Number.isInteger(index) || index < 0 || index >= source.getPageCount())) {
    throw new Error('Selected page index is outside the document');
  }

  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, [...pageIndices]);
  pages.forEach((page) => output.addPage(page));
  await writeAndroidDocument(destinationUri, await output.save());
  return output.getPageCount();
}
