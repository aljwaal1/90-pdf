/**
 * Studio In-Memory Processors Runner
 * Bridges studio tool actions to PDFCraft's headless processors.
 */

import { tools as allTools } from '@/config/tools';
import type { ToolCategory } from '@/types/tool';

export type StudioToolExecutionType = 'in-place' | 'export' | 'append' | 'navigate';

export interface StudioToolConfig {
  id: string;
  slug: string;
  name: string;
  category: ToolCategory;
  icon: string;
  description: string;
  executionType: StudioToolExecutionType;
  featured?: boolean;
}

export const STUDIO_FEATURED_TOOL_IDS = [
  'rotate-pdf',
  'add-watermark',
  'compress-pdf',
  'page-numbers',
  'delete-pages',
  'add-blank-page',
  'flatten-pdf',
  'crop-pdf',
  'reverse-pages',
  'pdf-to-greyscale',
  'encrypt-pdf',
  'pdf-to-docx',
];

export const EXPORT_TOOL_IDS = new Set([
  'pdf-to-docx',
  'pdf-to-excel',
  'pdf-to-pptx',
  'pdf-to-image',
  'pdf-to-jpg',
  'pdf-to-png',
  'pdf-to-webp',
  'pdf-to-bmp',
  'pdf-to-tiff',
  'pdf-to-svg',
  'pdf-to-markdown',
  'pdf-to-json',
  'pdf-to-cbz',
  'extract-images',
  'extract-tables',
  'ocr-pdf',
  'annotation-exporter',
  'global-invoice-parser',
  'vector-extractor',
  'pdf-to-slide',
  'pdf-to-zip',
]);

export const APPEND_TOOL_IDS = new Set([
  'merge-pdf',
  'alternate-merge',
  'image-to-pdf',
  'png-to-pdf',
  'jpg-to-pdf',
  'webp-to-pdf',
  'bmp-to-pdf',
  'svg-to-pdf',
  'tiff-to-pdf',
  'markdown-to-pdf',
  'json-to-pdf',
  'txt-to-pdf',
  'email-to-pdf',
  'cbz-to-pdf',
  'djvu-to-pdf',
  'psd-to-pdf',
]);

export const NAVIGATE_TOOL_IDS = new Set([
  'edit-pdf',
  'organize-pdf',
  'pdf-multi-tool',
]);

export const ZERO_CONFIG_TOOL_IDS = new Set([
  'reverse-pages',
  'repair-pdf',
  'view-metadata',
]);

export function isZeroConfigTool(toolId: string): boolean {
  const normId = normalizeStudioToolId(toolId);
  return ZERO_CONFIG_TOOL_IDS.has(normId);
}

const FAVORITES_STORAGE_KEY = 'pdfcraft_studio_favorites';
const RECENT_STORAGE_KEY = 'pdfcraft_studio_recent';

export function getStudioFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStudioFavorites(favorites: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {}
}

export function getStudioRecentTools(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addStudioRecentTool(toolId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const normId = normalizeStudioToolId(toolId);
    const existing = getStudioRecentTools().filter((id) => id !== normId);
    const updated = [normId, ...existing].slice(0, 12);
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export function clearStudioRecentTools(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_STORAGE_KEY);
  } catch {}
}

// Processor-backed in-place tools; keep in sync with executeStudioOperation.
export const STUDIO_IN_PLACE_TOOL_IDS = new Set([
  "rotate-pdf",
  "add-watermark",
  "compress-pdf",
  "page-numbers",
  "add-blank-page",
  "delete-pages",
  "divide-pages",
  "combine-single-page",
  "grid-combine",
  "overlay-pdf",
  "pdf-booklet",
  "photo-tiling-prepress",
  "pdf-lossless-slicer",
  "passport-id-composer",
  "pdf-two-column-reflower",
  "pdf-spine-bookbinder",
  "pdf-page-resizer-uniform",
  "pdf-scratchpad-canvas",
  "bookmark",
  "table-of-contents",
  "interactive-toc-generator",
  "bookmarks-auto-generator",
  "batch-barcode-injector",
  "signature-ink-optimizer",
  "handwriting-ink-contrast-booster",
  "background-color",
  "text-color",
  "edit-metadata",
  "flatten-pdf",
  "crop-pdf",
  "reverse-pages",
  "remove-blank-pages",
  "header-footer",
  "add-stamps",
  "timestamp-pdf",
  "add-page-labels",
  "remove-annotations",
  "pdf-to-greyscale",
  "invert-colors",
  "deskew-pdf",
  "pdf-deskew-aligner",
  "rasterize-pdf",
  "linearize-pdf",
  "sanitize-pdf",
  "deep-sanitize",
  "find-and-redact",
  "redact-pdf",
  "smart-data-redactor",
  "remove-metadata",
  "encrypt-pdf",
  "remove-restrictions",
  "decrypt-pdf",
  "change-permissions",
  "digital-sign-pdf",
  "cert-cryptor",
  "pdf-signature-anchor-helper",
  "font-to-outline",
  "ocg-manager",
  "batch-watermark-remover",
  "dead-link-debugger",
  "repair-pdf",
  "posterize-pdf",
  "n-up-pdf",
  "fix-page-size",
  "page-dimensions",
  "pdf-to-pdfa",
  "eink-optimizer",
  "extract-pages",
  "merge-pdf",
  "alternate-merge"
]);

export function getToolExecutionType(toolId: string): StudioToolExecutionType {
  const normId = normalizeStudioToolId(toolId);
  if (EXPORT_TOOL_IDS.has(normId)) return 'export';
  if (APPEND_TOOL_IDS.has(normId)) return 'append';
  if (NAVIGATE_TOOL_IDS.has(normId) || normId === 'split-pdf') return 'navigate';
  // Do not route tools without an in-memory processor to the generic Studio runner.
  // Such tools must use their dedicated pages rather than fail at execution time.
  if (!STUDIO_IN_PLACE_TOOL_IDS.has(normId)) return 'navigate';
  return 'in-place';
}

export function normalizeStudioToolId(id: string): string {
  const ALIASES: Record<string, string> = {
    'rotate': 'rotate-pdf',
    'watermark': 'add-watermark',
    'compress': 'compress-pdf',
    'flatten': 'flatten-pdf',
    'crop': 'crop-pdf',
    'stamps': 'add-stamps',
    'reverse': 'reverse-pages',
    'labels': 'add-page-labels',
    'timestamp': 'timestamp-pdf',
    'split': 'split-pdf',
    'delete': 'delete-pages',
    'extract': 'extract-pages',
    'encrypt': 'encrypt-pdf',
    'decrypt': 'decrypt-pdf',
    'deskew': 'deskew-pdf',
    'sanitize': 'sanitize-pdf',
    'repair': 'repair-pdf',
    'ocr': 'ocr-pdf',
    'linearize': 'linearize-pdf',
    'divide': 'divide-pages',
  };
  return ALIASES[id] || id;
}

// Generate complete Studio tools catalog
export const STUDIO_TOOLS: StudioToolConfig[] = allTools.map((tool) => {
  return {
    id: tool.id,
    slug: tool.slug,
    name: tool.id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    category: tool.category,
    icon: tool.icon,
    description: tool.features?.slice(0, 3).join(' • ') || 'PDFCraft professional tool',
    executionType: getToolExecutionType(tool.id),
    featured: STUDIO_FEATURED_TOOL_IDS.includes(tool.id),
  };
});

// Lookup tool config
export function findStudioToolConfig(toolId: string): StudioToolConfig | undefined {
  const normId = normalizeStudioToolId(toolId);
  return STUDIO_TOOLS.find((t) => t.id === normId || t.id === toolId);
}

export type StudioToolId = string;

/**
 * Executes a studio in-place operation on the in-memory document file
 */
export async function executeStudioOperation(
  file: File,
  rawToolId: string,
  options: Record<string, any> = {}
): Promise<Blob> {
  const toolId = normalizeStudioToolId(rawToolId);
  let processor: any;

  switch (toolId) {
    case 'rotate-pdf': {
      const { RotatePDFProcessor } = await import('@/lib/pdf/processors/rotate');
      processor = new RotatePDFProcessor();
      break;
    }
    case 'add-watermark': {
      const { WatermarkProcessor } = await import('@/lib/pdf/processors/watermark');
      processor = new WatermarkProcessor();
      break;
    }
    case 'compress-pdf': {
      const { CompressPDFProcessor } = await import('@/lib/pdf/processors/compress');
      processor = new CompressPDFProcessor();
      break;
    }
    case 'page-numbers': {
      const { PageNumbersProcessor } = await import('@/lib/pdf/processors/page-numbers');
      processor = new PageNumbersProcessor();
      break;
    }
    case 'add-blank-page': {
      const { AddBlankPagePDFProcessor } = await import('@/lib/pdf/processors/add-blank-page');
      processor = new AddBlankPagePDFProcessor();
      break;
    }
    case 'delete-pages': {
      const { DeletePagesPDFProcessor } = await import('@/lib/pdf/processors/delete');
      processor = new DeletePagesPDFProcessor();
      break;
    }
    case 'split-pdf': {
      const { SplitPDFProcessor } = await import('@/lib/pdf/processors/split');
      processor = new SplitPDFProcessor();
      break;
    }
    case 'divide-pages': {
      const { DividePagesPDFProcessor } = await import('@/lib/pdf/processors/divide');
      processor = new DividePagesPDFProcessor();
      break;
    }
    case 'combine-single-page': {
      const { CombineSinglePagePDFProcessor } = await import('@/lib/pdf/processors/combine-single-page');
      processor = new CombineSinglePagePDFProcessor();
      break;
    }
    case 'grid-combine': {
      const { GridCombineProcessor } = await import('@/lib/pdf/processors/grid-combine');
      processor = new GridCombineProcessor();
      break;
    }
    case 'overlay-pdf': {
      const { OverlayPDFProcessor } = await import('@/lib/pdf/processors/overlay');
      processor = new OverlayPDFProcessor();
      break;
    }
    case 'pdf-booklet': {
      const { BookletPDFProcessor } = await import('@/lib/pdf/processors/booklet');
      processor = new BookletPDFProcessor();
      break;
    }
    case 'photo-tiling-prepress': {
      const { PhotoTilingPrepressProcessor } = await import('@/lib/pdf/processors/photo-tiling-prepress');
      processor = new PhotoTilingPrepressProcessor();
      break;
    }
    case 'pdf-lossless-slicer': {
      const { PdfLosslessSlicerProcessor } = await import('@/lib/pdf/processors/pdf-lossless-slicer');
      processor = new PdfLosslessSlicerProcessor();
      break;
    }
    case 'passport-id-composer': {
      const { PassportIdComposerProcessor } = await import('@/lib/pdf/processors/passport-id-composer');
      processor = new PassportIdComposerProcessor();
      break;
    }
    case 'pdf-two-column-reflower': {
      const { PdfTwoColumnReflowerProcessor } = await import('@/lib/pdf/processors/pdf-two-column-reflower');
      processor = new PdfTwoColumnReflowerProcessor();
      break;
    }
    case 'pdf-spine-bookbinder': {
      const { PdfSpineBookbinderProcessor } = await import('@/lib/pdf/processors/pdf-spine-bookbinder');
      processor = new PdfSpineBookbinderProcessor();
      break;
    }
    case 'pdf-page-resizer-uniform': {
      const { PdfPageResizerUniformProcessor } = await import('@/lib/pdf/processors/pdf-page-resizer-uniform');
      processor = new PdfPageResizerUniformProcessor();
      break;
    }
    case 'pdf-scratchpad-canvas': {
      const { PdfScratchpadCanvasProcessor } = await import('@/lib/pdf/processors/pdf-scratchpad-canvas');
      processor = new PdfScratchpadCanvasProcessor();
      break;
    }
    case 'bookmark': {
      const { BookmarkProcessor } = await import('@/lib/pdf/processors/bookmark');
      processor = new BookmarkProcessor();
      break;
    }
    case 'table-of-contents':
    case 'interactive-toc-generator': {
      const { InteractiveTocGeneratorProcessor } = await import('@/lib/pdf/processors/interactive-toc-generator');
      processor = new InteractiveTocGeneratorProcessor();
      break;
    }
    case 'bookmarks-auto-generator': {
      const { BookmarksAutoGeneratorProcessor } = await import('@/lib/pdf/processors/bookmarks-auto-generator');
      processor = new BookmarksAutoGeneratorProcessor();
      break;
    }
    case 'batch-barcode-injector': {
      const { BatchBarcodeInjectorProcessor } = await import('@/lib/pdf/processors/batch-barcode-injector');
      processor = new BatchBarcodeInjectorProcessor();
      break;
    }
    case 'signature-ink-optimizer': {
      const { SignatureInkOptimizerProcessor } = await import('@/lib/pdf/processors/signature-ink-optimizer');
      processor = new SignatureInkOptimizerProcessor();
      break;
    }
    case 'handwriting-ink-contrast-booster': {
      const { HandwritingInkContrastBoosterProcessor } = await import('@/lib/pdf/processors/handwriting-ink-contrast-booster');
      processor = new HandwritingInkContrastBoosterProcessor();
      break;
    }
    case 'background-color': {
      const { BackgroundColorProcessor } = await import('@/lib/pdf/processors/background-color');
      processor = new BackgroundColorProcessor();
      break;
    }
    case 'text-color': {
      const { InvertColorsProcessor } = await import('@/lib/pdf/processors/invert-colors');
      processor = new InvertColorsProcessor();
      break;
    }
    case 'edit-metadata': {
      const { EditMetadataPDFProcessor } = await import('@/lib/pdf/processors/edit-metadata');
      processor = new EditMetadataPDFProcessor();
      break;
    }
    case 'flatten-pdf': {
      const { FlattenPDFProcessor } = await import('@/lib/pdf/processors/flatten');
      processor = new FlattenPDFProcessor();
      break;
    }
    case 'crop-pdf': {
      const { CropProcessor } = await import('@/lib/pdf/processors/crop');
      processor = new CropProcessor();
      break;
    }
    case 'reverse-pages': {
      const { ReversePagesPDFProcessor } = await import('@/lib/pdf/processors/reverse');
      processor = new ReversePagesPDFProcessor();
      break;
    }
    case 'remove-blank-pages': {
      const { RemoveBlankPagesProcessor } = await import('@/lib/pdf/processors/remove-blank-pages');
      processor = new RemoveBlankPagesProcessor();
      break;
    }
    case 'header-footer': {
      const { HeaderFooterProcessor } = await import('@/lib/pdf/processors/header-footer');
      processor = new HeaderFooterProcessor();
      break;
    }
    case 'add-stamps': {
      const { StampsProcessor } = await import('@/lib/pdf/processors/stamps');
      processor = new StampsProcessor();
      break;
    }
    case 'timestamp-pdf': {
      const { TimestampPDFProcessor } = await import('@/lib/pdf/processors/timestamp');
      processor = new TimestampPDFProcessor();
      break;
    }
    case 'add-page-labels': {
      const { PageLabelsProcessor } = await import('@/lib/pdf/processors/page-labels');
      processor = new PageLabelsProcessor();
      break;
    }
    case 'remove-annotations': {
      const { RemoveAnnotationsProcessor } = await import('@/lib/pdf/processors/remove-annotations');
      processor = new RemoveAnnotationsProcessor();
      break;
    }
    case 'pdf-to-greyscale': {
      const { PDFToGreyscaleProcessor } = await import('@/lib/pdf/processors/pdf-to-greyscale');
      processor = new PDFToGreyscaleProcessor();
      break;
    }
    case 'invert-colors': {
      const { InvertColorsProcessor } = await import('@/lib/pdf/processors/invert-colors');
      processor = new InvertColorsProcessor();
      break;
    }
    case 'deskew-pdf': {
      const { DeskewPDFProcessor } = await import('@/lib/pdf/processors/deskew');
      processor = new DeskewPDFProcessor();
      break;
    }
    case 'pdf-deskew-aligner': {
      const { PdfDeskewAlignerProcessor } = await import('@/lib/pdf/processors/pdf-deskew-aligner');
      processor = new PdfDeskewAlignerProcessor();
      break;
    }
    case 'rasterize-pdf': {
      const { RasterizePDFProcessor } = await import('@/lib/pdf/processors/rasterize');
      processor = new RasterizePDFProcessor();
      break;
    }
    case 'linearize-pdf': {
      const { LinearizePDFProcessor } = await import('@/lib/pdf/processors/linearize');
      processor = new LinearizePDFProcessor();
      break;
    }
    case 'sanitize-pdf': {
      const { SanitizePDFProcessor } = await import('@/lib/pdf/processors/sanitize');
      processor = new SanitizePDFProcessor();
      break;
    }
    case 'deep-sanitize': {
      const { DeepSanitizeProcessor } = await import('@/lib/pdf/processors/deep-sanitize');
      processor = new DeepSanitizeProcessor();
      break;
    }
    case 'find-and-redact':
    case 'redact-pdf':
    case 'smart-data-redactor': {
      const { SmartDataRedactorProcessor } = await import('@/lib/pdf/processors/smart-data-redactor');
      processor = new SmartDataRedactorProcessor();
      break;
    }
    case 'remove-metadata': {
      const { RemoveMetadataProcessor } = await import('@/lib/pdf/processors/remove-metadata');
      processor = new RemoveMetadataProcessor();
      break;
    }
    case 'encrypt-pdf': {
      const { EncryptPDFProcessor } = await import('@/lib/pdf/processors/encrypt');
      processor = new EncryptPDFProcessor();
      break;
    }
    case 'remove-restrictions':
    case 'decrypt-pdf': {
      const { RemoveRestrictionsProcessor } = await import('@/lib/pdf/processors/remove-restrictions');
      processor = new RemoveRestrictionsProcessor();
      break;
    }
    case 'change-permissions': {
      const { ChangePermissionsProcessor } = await import('@/lib/pdf/processors/change-permissions');
      processor = new ChangePermissionsProcessor();
      break;
    }
    case 'digital-sign-pdf': {
      const { SignProcessor } = await import('@/lib/pdf/processors/sign');
      processor = new SignProcessor();
      break;
    }
    case 'cert-cryptor': {
      const { CertCryptorProcessor } = await import('@/lib/pdf/processors/cert-cryptor');
      processor = new CertCryptorProcessor();
      break;
    }
    case 'pdf-signature-anchor-helper': {
      const { PdfSignatureAnchorHelperProcessor } = await import('@/lib/pdf/processors/pdf-signature-anchor-helper');
      processor = new PdfSignatureAnchorHelperProcessor();
      break;
    }
    case 'font-to-outline': {
      const { FontToOutlineProcessor } = await import('@/lib/pdf/processors/font-to-outline');
      processor = new FontToOutlineProcessor();
      break;
    }
    case 'ocg-manager': {
      const { OCGManagerProcessor } = await import('@/lib/pdf/processors/ocg-manager');
      processor = new OCGManagerProcessor();
      break;
    }
    case 'batch-watermark-remover': {
      const { BatchWatermarkRemoverProcessor } = await import('@/lib/pdf/processors/batch-watermark-remover');
      processor = new BatchWatermarkRemoverProcessor();
      break;
    }
    case 'dead-link-debugger': {
      const { DeadLinkDebuggerProcessor } = await import('@/lib/pdf/processors/dead-link-debugger');
      processor = new DeadLinkDebuggerProcessor();
      break;
    }
    case 'repair-pdf': {
      const { RepairPDFProcessor } = await import('@/lib/pdf/processors/repair');
      processor = new RepairPDFProcessor();
      break;
    }
    case 'posterize-pdf': {
      const { PosterizePDFProcessor } = await import('@/lib/pdf/processors/posterize');
      processor = new PosterizePDFProcessor();
      break;
    }
    case 'n-up-pdf': {
      const { NUpPDFProcessor } = await import('@/lib/pdf/processors/n-up');
      processor = new NUpPDFProcessor();
      break;
    }
    case 'fix-page-size':
    case 'page-dimensions': {
      const { FixPageSizeProcessor } = await import('@/lib/pdf/processors/fix-page-size');
      processor = new FixPageSizeProcessor();
      break;
    }
    case 'pdf-to-pdfa': {
      const { PdfToPdfAProcessor } = await import('@/lib/pdf/processors/pdf-to-pdfa');
      processor = new PdfToPdfAProcessor();
      break;
    }
    case 'eink-optimizer': {
      const { EinkOptimizerProcessor } = await import('@/lib/pdf/processors/eink-optimizer');
      processor = new EinkOptimizerProcessor();
      break;
    }
    case 'extract-pages': {
      const { ExtractPagesPDFProcessor } = await import('@/lib/pdf/processors/extract');
      processor = new ExtractPagesPDFProcessor();
      break;
    }
    case 'merge-pdf':
    case 'alternate-merge': {
      const { MergePDFProcessor } = await import('@/lib/pdf/processors/merge');
      processor = new MergePDFProcessor();
      break;
    }
    default:
      throw new Error(`Unsupported studio in-place tool: ${toolId}`);
  }

  // Files to pass (supports additional files if append mode)
  const inputFiles = options.additionalFiles?.length
    ? [file, ...options.additionalFiles]
    : [file];

  const output = await processor.process({
    files: inputFiles,
    options,
  });

  if (!output.success || !output.result) {
    throw new Error(output.error?.message || 'Operation failed');
  }

  if (Array.isArray(output.result)) {
    if (output.result.length !== 1 || !(output.result[0] instanceof Blob)) {
      throw new Error('This operation produced multiple files. Use the dedicated export tool to save every result.');
    }
    if (output.result[0].size === 0) throw new Error('The PDF processor returned an empty file.');
    return output.result[0];
  }

  if (!(output.result instanceof Blob)) {
    throw new Error('The operation did not produce a valid PDF document.');
  }
  if (output.result.size === 0) throw new Error('The PDF processor returned an empty file.');
  return output.result;
}

/**
 * Executes a studio export/convert operation on the in-memory document file
 */
export async function executeStudioExport(
  file: File,
  rawToolId: string,
  options: Record<string, any> = {}
): Promise<{ blob: Blob; filename: string }> {
  const toolId = normalizeStudioToolId(rawToolId);
  const baseName = file.name.replace(/\.pdf$/i, '');
  let processor: any;
  let targetExtension = 'bin';

  switch (toolId) {
    case 'pdf-to-docx': {
      const { PDFToDocxProcessor } = await import('@/lib/pdf/processors/pdf-to-docx');
      processor = new PDFToDocxProcessor();
      targetExtension = 'docx';
      break;
    }
    case 'pdf-to-excel': {
      const { PDFToExcelProcessor } = await import('@/lib/pdf/processors/pdf-to-excel');
      processor = new PDFToExcelProcessor();
      targetExtension = 'xlsx';
      break;
    }
    case 'pdf-to-pptx': {
      const { PDFToPptxProcessor } = await import('@/lib/pdf/processors/pdf-to-pptx');
      processor = new PDFToPptxProcessor();
      targetExtension = 'pptx';
      break;
    }
    case 'pdf-to-image':
    case 'pdf-to-jpg':
    case 'pdf-to-webp': {
      const { PDFToImageProcessor } = await import('@/lib/pdf/processors/pdf-to-image');
      processor = new PDFToImageProcessor();
      targetExtension = 'zip';
      break;
    }
    case 'pdf-to-png': {
      const { PDFToImageProcessor } = await import('@/lib/pdf/processors/pdf-to-image');
      processor = new PDFToImageProcessor();
      options = { ...options, format: 'png' };
      targetExtension = 'zip';
      break;
    }
    case 'pdf-to-bmp': {
      const { PDFToImageProcessor } = await import('@/lib/pdf/processors/pdf-to-image');
      processor = new PDFToImageProcessor();
      options = { ...options, format: 'bmp' };
      targetExtension = 'zip';
      break;
    }
    case 'pdf-to-tiff': {
      const { PDFToTIFFProcessor } = await import('@/lib/pdf/processors/pdf-to-tiff');
      processor = new PDFToTIFFProcessor();
      targetExtension = 'tiff';
      break;
    }
    case 'pdf-to-svg': {
      const { PDFToSVGProcessor } = await import('@/lib/pdf/processors/pdf-to-svg');
      processor = new PDFToSVGProcessor();
      targetExtension = 'zip';
      break;
    }
    case 'pdf-to-cbz': {
      const { PDFToCBZProcessor } = await import('@/lib/pdf/processors/pdf-to-cbz');
      processor = new PDFToCBZProcessor();
      targetExtension = 'cbz';
      break;
    }
    case 'extract-images': {
      const { ExtractImagesPDFProcessor } = await import('@/lib/pdf/processors/extract-images');
      processor = new ExtractImagesPDFProcessor();
      targetExtension = 'zip';
      break;
    }
    case 'extract-tables': {
      const { ExtractTablesProcessor } = await import('@/lib/pdf/processors/extract-tables');
      processor = new ExtractTablesProcessor();
      targetExtension = options.format === 'csv' ? 'csv' : 'xlsx';
      break;
    }
    case 'ocr-pdf': {
      const { OCRProcessor } = await import('@/lib/pdf/processors/ocr');
      processor = new OCRProcessor();
      targetExtension = options.outputFormat === 'text' ? 'txt' : 'pdf';
      break;
    }
    case 'pdf-to-markdown': {
      const { PDFToMarkdownProcessor } = await import('@/lib/pdf/processors/pdf-to-markdown');
      processor = new PDFToMarkdownProcessor();
      targetExtension = 'md';
      break;
    }
    case 'pdf-to-json': {
      const { PDFToJSONProcessor } = await import('@/lib/pdf/processors/pdf-to-json');
      processor = new PDFToJSONProcessor();
      targetExtension = 'json';
      break;
    }
    case 'annotation-exporter': {
      const { AnnotationExporterProcessor } = await import('@/lib/pdf/processors/annotation-exporter');
      processor = new AnnotationExporterProcessor();
      targetExtension = options.format || 'md';
      break;
    }
    case 'global-invoice-parser': {
      const { GlobalInvoiceParserProcessor } = await import('@/lib/pdf/processors/global-invoice-parser');
      processor = new GlobalInvoiceParserProcessor();
      targetExtension = 'json';
      break;
    }
    case 'pdf-to-zip': {
      const { PDFToZipProcessor } = await import('@/lib/pdf/processors/pdf-to-zip');
      processor = new PDFToZipProcessor();
      targetExtension = 'zip';
      break;
    }
    case 'vector-extractor': {
      const { VectorExtractorProcessor } = await import('@/lib/pdf/processors/vector-extractor');
      processor = new VectorExtractorProcessor();
      targetExtension = 'svg';
      break;
    }
    case 'pdf-to-slide': {
      const { PDFToSlideProcessor } = await import('@/lib/pdf/processors/pdf-to-slide');
      processor = new PDFToSlideProcessor();
      targetExtension = 'pptx';
      break;
    }
    default:
      throw new Error(`Unsupported studio export tool: ${toolId}`);
  }

  const output = await processor.process({
    files: [file],
    options,
  });

  if (!output.success || !output.result) {
    throw new Error(output.error?.message || 'Export failed');
  }

  if (Array.isArray(output.result) && output.result.length === 0) {
    throw new Error('The export processor returned no files.');
  }

  // Multiple processor outputs must never be silently reduced to the first file.
  // Package them as ZIP so the existing save dialog can preserve every result.
  if (Array.isArray(output.result) && output.result.length > 1) {
    const JSZip = (await import('jszip')).default;
    const archive = new JSZip();
    for (let index = 0; index < output.result.length; index++) {
      const item = output.result[index];
      if (!(item instanceof Blob) || item.size === 0) {
        throw new Error(`Invalid or empty multi-file output at index ${index}`);
      }
      const name = item instanceof File && item.name
        ? item.name
        : `${baseName}_converted_${index + 1}.${targetExtension}`;
      archive.file(`${index + 1}_${name.replace(/[\\/]/g, '_')}`, item);
    }
    return {
      blob: await archive.generateAsync({ type: 'blob' }),
      filename: `${baseName}_converted_files.zip`,
    };
  }

  let finalBlob: Blob;
  if (output.result instanceof Blob) {
    finalBlob = output.result;
  } else if (Array.isArray(output.result) && output.result[0] instanceof Blob) {
    finalBlob = output.result[0];
  } else if (typeof output.result === 'string') {
    finalBlob = new Blob([output.result], { type: 'text/plain;charset=utf-8' });
  } else {
    throw new Error('The export processor returned an unsupported result type.');
  }

  if (finalBlob.size === 0) {
    throw new Error('The export processor returned an empty file.');
  }

  return {
    blob: finalBlob,
    filename: `${baseName}_converted.${targetExtension}`,
  };
}
