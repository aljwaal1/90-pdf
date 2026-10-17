'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Undo2,
  Redo2,
  RotateCcw,
  Download,
  Printer,
  X,
  Sparkles,
  LayoutGrid,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  ChevronDown,
  History,
  FileType,
  Image as ImageIcon,
  Clock,
  Loader2,
  Plus,
  Files,
} from 'lucide-react';
import JSZip from 'jszip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StudioLeftRail } from './StudioLeftRail';
import { StudioToolDrawer } from './StudioToolDrawer';
import {
  executeStudioOperation,
  executeStudioExport,
  type StudioToolId,
  STUDIO_TOOLS,
  findStudioToolConfig,
  addStudioRecentTool,
} from './studio-processors';
import { saveBlobFile, isTauri, getSystemPrinters, printPdfFile } from '@/lib/tauri-bridge';
import { withBasePath } from '@/lib/utils/path';
import { getToolContent, type Locale } from '@/config/tool-content';

interface PDFStudioProps {
  locale?: string;
  className?: string;
  initialFile?: File | null;
}

interface HistoryItem {
  blob: Blob;
  name: string;
  action: string;
}

export interface StudioDocument {
  id: string;
  name: string;
  file: File;
  currentBlob: Blob;
  historyStack: HistoryItem[];
  redoStack: HistoryItem[];
}

export const PDFStudio: React.FC<PDFStudioProps> = ({
  locale = 'en',
  className = '',
  initialFile = null,
}) => {
  const router = useRouter();
  const validLocale: Locale = locale === 'ar' ? 'ar' : 'en';
  const isZh = validLocale === 'ar';

  // Multi-document states
  const [documents, setDocuments] = useState<StudioDocument[]>(() => {
    if (initialFile) {
      return [
        {
          id: 'doc-init',
          name: initialFile.name,
          file: initialFile,
          currentBlob: initialFile,
          historyStack: [],
          redoStack: [],
        },
      ];
    }
    return [];
  });
  const [activeDocId, setActiveDocId] = useState<string | null>(() => {
    return initialFile ? 'doc-init' : null;
  });

  const activeDoc = useMemo(() => {
    return documents.find((d) => d.id === activeDocId) || documents[0] || null;
  }, [documents, activeDocId]);

  const file = activeDoc ? activeDoc.file : null;
  const currentBlob = activeDoc ? activeDoc.currentBlob : null;
  const historyStack = activeDoc ? activeDoc.historyStack : [];
  const redoStack = activeDoc ? activeDoc.redoStack : [];

  const availableDocuments = useMemo(() => {
    if (!activeDoc) return [];
    return documents.filter((d) => d.id !== activeDoc.id);
  }, [documents, activeDoc]);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Studio UI states
  const [activeToolId, setActiveToolId] = useState<StudioToolId | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);

  // Feedback notifications
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugEntries, setDebugEntries] = useState<string[]>([]);
  const [pendingExport, setPendingExport] = useState<{ blob: Blob; filename: string } | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Restore sidebar collapse state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pdfcraft_studio_sidebar_collapsed');
      if (saved !== null) {
        setIsSidebarCollapsed(saved === 'true');
      }
    } catch {}
  }, []);

  const toggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pdfcraft_studio_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Update object URL when currentBlob changes
  useEffect(() => {
    if (!currentBlob) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      return;
    }

    const newUrl = URL.createObjectURL(currentBlob);
    setPdfUrl(newUrl);

    return () => {
      URL.revokeObjectURL(newUrl);
    };
  }, [currentBlob]);

  // Show auto-dismiss notifications
  const notify = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setDebugEntries(prev => [...prev.slice(-199), `[${new Date().toISOString()}] ${type.toUpperCase()}: ${message}`]);
    if (type === 'success') {
      setTimeout(() => {
        setNotification((curr) => (curr?.type === 'success' && curr.message === message ? null : curr));
      }, 5000);
    }
  }, []);

  // Handle loading multiple files (or single file)
  const handleAddFiles = useCallback(
    (incomingFiles: FileList | File[]) => {
      const validPdfs = Array.from(incomingFiles).filter(
        (f) => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf'
      );

      if (validPdfs.length === 0) {
        notify('error', isZh ? 'يرجى اختيار ملف PDF صالح' : 'Please select a valid PDF file');
        return;
      }

      const newDocs: StudioDocument[] = validPdfs.map((f, idx) => ({
        id: `doc_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
        name: f.name,
        file: f,
        currentBlob: f,
        historyStack: [],
        redoStack: [],
      }));

      setDocuments((prev) => [...prev, ...newDocs]);
      setActiveDocId(newDocs[0].id);
      setActiveToolId(null);
      notify(
        'success',
        isZh
          ? `تم تحميل ${newDocs.length} مستند PDF بنجاح`
          : `Successfully loaded ${newDocs.length} PDF document(s)`
      );
    },
    [notify, isZh]
  );

  const handleLoadFile = useCallback(
    (selectedFile: File) => {
      handleAddFiles([selectedFile]);
    },
    [handleAddFiles]
  );

  const handleSelectDocument = useCallback((docId: string) => {
    setActiveDocId(docId);
    setActiveToolId(null);
  }, []);

  const handleCloseDocument = useCallback(
    (docId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setDocuments((prev) => {
        const targetDoc = prev.find((d) => d.id === docId);
        if (targetDoc && targetDoc.historyStack.length > 0) {
          if (
            !window.confirm(
              isZh
                ? `المستند «${targetDoc.name}» يحتوي على تعديلات غير محفوظة. هل تريد إغلاقه؟`
                : `Document "${targetDoc.name}" contains unsaved changes. Are you sure you want to close it?`
            )
          ) {
            return prev;
          }
        }
        const remaining = prev.filter((d) => d.id !== docId);
        if (activeDocId === docId) {
          const closedIdx = prev.findIndex((d) => d.id === docId);
          const next = remaining[Math.min(closedIdx, remaining.length - 1)] || null;
          setActiveDocId(next ? next.id : null);
        }
        return remaining;
      });
    },
    [activeDocId]
  );

  // Handle Drag & Drop on Empty State and View Area
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleAddFiles(e.dataTransfer.files);
      }
    },
    [handleAddFiles]
  );

  // Apply a tool operation in-place on current active document
  const handleApplyTool = useCallback(
    async (toolId: StudioToolId, options: Record<string, any> = {}) => {
      if (!currentBlob || !file || !activeDoc) return;

      setIsApplying(true);
      try {
        const tempFile = new File([currentBlob], file.name, { type: 'application/pdf' });
        const newBlob = await executeStudioOperation(tempFile, toolId, options);

        const toolConfig = findStudioToolConfig(toolId);
        const localizedContent = getToolContent(validLocale as Locale, toolId);
        const toolName = localizedContent?.title || toolConfig?.name || toolId;

        // Push current state to active document undo history
        setDocuments((prevDocs) =>
          prevDocs.map((doc) => {
            if (doc.id === activeDoc.id) {
              return {
                ...doc,
                currentBlob: newBlob,
                historyStack: [
                  ...doc.historyStack,
                  { blob: doc.currentBlob, name: doc.name, action: toolName },
                ],
                redoStack: [],
              };
            }
            return doc;
          })
        );

        setActiveToolId(null); // Close drawer
        addStudioRecentTool(toolId);
        notify(
          'success',
          isZh
            ? `تم تطبيق «${toolName}» بنجاح. يمكنك اختيار أداة أخرى.`
            : `Applied "${toolName}" in-place. Select another action on the left`
        );
      } catch (err: any) {
        notify(
          'error',
          err?.message || (isZh ? 'فشل تطبيق العملية. تحقق من الخيارات' : 'Failed to apply operation. Please check options')
        );
      } finally {
        setIsApplying(false);
      }
    },
    [currentBlob, file, activeDoc, notify, validLocale, isZh]
  );

  // Handle export/convert operation without altering central PDF viewer
  const handleExportTool = useCallback(
    async (toolId: StudioToolId, options: Record<string, any> = {}) => {
      if (!currentBlob || !file) return;

      setIsApplying(true);
      try {
        const tempFile = new File([currentBlob], file.name, { type: 'application/pdf' });
        const { blob, filename } = await executeStudioExport(tempFile, toolId, options);
        setPendingExport({ blob, filename });

        const saved = await saveBlobFile(blob, filename);
        if (!saved) {
          notify('error', isZh
            ? `تم إنشاء «${filename}» ولكن لم يُحفظ. يمكنك إعادة المحاولة من لوحة النتائج.`
            : `Created "${filename}" but not saved. Retry from the results panel.`);
          return;
        }
        setPendingExport(null);
        setActiveToolId(null);
        addStudioRecentTool(toolId);
        notify('success', isZh
          ? `تم حفظ «${filename}» في الموقع الذي اخترته.`
          : `Saved "${filename}" in your selected location.`);
      } catch (err: any) {
        notify('error', err?.message || (isZh ? 'فشل تحويل الملف وتصديره' : 'Export conversion failed'));
      } finally {
        setIsApplying(false);
      }
    },
    [currentBlob, file, notify, isZh]
  );

  // Undo last operation on active document
  const handleUndo = useCallback(() => {
    if (!activeDoc || activeDoc.historyStack.length === 0) return;

    const previousItem = activeDoc.historyStack[activeDoc.historyStack.length - 1];
    const newHistory = activeDoc.historyStack.slice(0, -1);

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === activeDoc.id) {
          return {
            ...doc,
            currentBlob: previousItem.blob,
            historyStack: newHistory,
            redoStack: [
              ...doc.redoStack,
              { blob: doc.currentBlob, name: doc.name, action: previousItem.action },
            ],
          };
        }
        return doc;
      })
    );
    notify('success', isZh ? `تم التراجع عن«${previousItem.action}»` : `Undone "${previousItem.action}"`);
  }, [activeDoc, notify, isZh]);

  // Redo operation on active document
  const handleRedo = useCallback(() => {
    if (!activeDoc || activeDoc.redoStack.length === 0) return;

    const nextItem = activeDoc.redoStack[activeDoc.redoStack.length - 1];
    const newRedo = activeDoc.redoStack.slice(0, -1);

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === activeDoc.id) {
          return {
            ...doc,
            currentBlob: nextItem.blob,
            historyStack: [
              ...doc.historyStack,
              { blob: doc.currentBlob, name: doc.name, action: nextItem.action },
            ],
            redoStack: newRedo,
          };
        }
        return doc;
      })
    );
    notify('success', isZh ? `تمت إعادة«${nextItem.action}»` : `Redone "${nextItem.action}"`);
  }, [activeDoc, notify, isZh]);

  // Revert all changes on active document back to initial version
  const handleRevert = useCallback(() => {
    if (!activeDoc || activeDoc.historyStack.length === 0) return;
    if (
      window.confirm(
        isZh
          ? `هل تريد تجاهل جميع تعديلات «${activeDoc.name}» واستعادة النسخة الأصلية؟`
          : `Discard all changes to "${activeDoc.name}" and revert to the original version?`
      )
    ) {
      setDocuments((prev) =>
        prev.map((doc) => {
          if (doc.id === activeDoc.id) {
            return {
              ...doc,
              currentBlob: doc.file,
              historyStack: [],
              redoStack: [],
            };
          }
          return doc;
        })
      );
      setActiveToolId(null);
      setIsHistoryOpen(false);
      notify(
        'success',
        isZh ? `تمت استعادة«${activeDoc.name}»إلى نسخته الأصلية` : `Reverted "${activeDoc.name}" to original version`
      );
    }
  }, [activeDoc, notify, isZh]);

  // Batch Export all opened documents as a single ZIP archive
  const handleExportAllZip = useCallback(async () => {
    if (documents.length === 0) return;
    setIsApplying(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const cleanName = doc.name.replace(/\.pdf$/i, '');
        const filename = `${cleanName}_crafted.pdf`;
        zip.file(filename, doc.currentBlob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipName = `pdfcraft_studio_batch_${Date.now()}.zip`;
      setPendingExport({ blob: zipBlob, filename: zipName });
      const saved = await saveBlobFile(zipBlob, zipName);
      if (!saved) {
        notify('error', isZh ? 'تم تجهيز ZIP ولم يُحفظ. أعد المحاولة من لوحة النتائج.' : 'ZIP created but not saved. Retry from results.');
        return;
      }
      setPendingExport(null);
      notify(
        'success',
        isZh
          ? `تم حفظ الملف المضغوط الذي يحتوي على ${documents.length} مستندات`
          : `Packaged and exported all ${documents.length} documents`
      );
    } catch (err: any) {
      notify('error', err?.message || (isZh ? 'فشل تصدير الملفات المضغوطة' : 'Failed to package export'));
    } finally {
      setIsApplying(false);
      setIsExportMenuOpen(false);
    }
  }, [documents, notify, isZh]);

  // Export / Save final document
  const handleExport = useCallback(async () => {
    if (!currentBlob || !file) return;

    try {
      const fileName = file.name.replace(/\.pdf$/i, '_crafted.pdf');
      setDebugEntries(prev => [...prev.slice(-199), `[${new Date().toISOString()}] START Save & Export: ${fileName} (${currentBlob.size} bytes)`]);
      setPendingExport({ blob: currentBlob, filename: fileName });
      const isDownloaded = await saveBlobFile(currentBlob, fileName);
      if (isDownloaded) {
        setPendingExport(null);
        notify(
          'success',
          isZh ? `تم حفظ المستند وتصديره«${fileName}»` : `Document saved and exported as "${fileName}"`
        );
      } else {
        notify('error', isZh ? 'لم يُحفظ المستند. يمكنك إعادة المحاولة من لوحة النتائج.' : 'Document not saved. Retry from the results panel.');
      }
    } catch (err: any) {
      setDebugEntries(prev => [...prev.slice(-199), `[${new Date().toISOString()}] SAVE ERROR: ${String(err?.stack || err?.message || err)}`]);
      notify('error', err?.message || (isZh ? 'فشل حفظ المستند وتصديره' : 'Failed to save and export document'));
    }
  }, [currentBlob, file, notify, isZh]);

  // Print current in-memory document
  const handlePrint = useCallback(async () => {
    if (!currentBlob) return;

    try {
      if (isTauri()) {
        const printers = await getSystemPrinters();
        if (printers.length > 0) {
          await printPdfFile(currentBlob, printers[0].name);
          notify('success', isZh ? 'أُرسلت مهمة الطباعة' : 'Print job sent');
          return;
        }
      }

      // Web fallback: trigger iframe print
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.print();
      } else {
        window.print();
      }
    } catch (err: any) {
      notify('error', err?.message || (isZh ? 'فشل بدء الطباعة' : 'Failed to trigger print'));
    }
  }, [currentBlob, notify, isZh]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+S, Ctrl+P, Escape, /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (modKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (modKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleExport();
      } else if (modKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      } else if (e.key === 'Escape') {
        setActiveToolId(null);
        setIsHistoryOpen(false);
        setIsExportMenuOpen(false);
      } else if (
        (modKey && e.key.toLowerCase() === 'k') ||
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')
      ) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[data-testid="studio-tool-search"]');
        searchInput?.focus();
        searchInput?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleExport, handlePrint]);

  return (
    <div className={`h-[100dvh] max-h-[100dvh] pb-[var(--app-safe-bottom)] box-border flex flex-col bg-[hsl(var(--color-background))] select-none ${className}`.trim()}>
      {/* Studio Header (Compact Toolbar - 52px) */}
      <header className="h-[52px] flex-shrink-0 border-b border-[hsl(var(--color-border))] bg-[hsl(var(--color-card)/0.9)] backdrop-blur-md px-4 flex items-center justify-between z-30 relative">
        {/* Left: Brand & File Info */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
            title={isZh ? 'العودة للرئيسية' : 'Home'}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-accent))] shadow-sm">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight hidden sm:inline text-[hsl(var(--color-foreground))]">
              PDFCraft <span className="text-[hsl(var(--color-primary))] font-medium">Studio</span>
            </span>
          </Link>

          {file && (
            <>
              <span className="text-[hsl(var(--color-border))] shrink-0">|</span>
              <div className="flex items-center gap-2">
                {/* History Badge button */}
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen((prev) => !prev)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 flex items-center gap-1 transition-all ${
                    historyStack.length > 0
                      ? 'bg-[hsl(var(--color-primary)/0.15)] text-[hsl(var(--color-primary))] hover:bg-[hsl(var(--color-primary)/0.25)]'
                      : 'bg-[hsl(var(--color-muted))] text-[hsl(var(--color-muted-foreground))]'
                  }`}
                  title={isZh ? 'عرض سجل العمليات' : 'View Action History'}
                >
                  <History className="w-2.5 h-2.5" />
                  <span>+{historyStack.length} {isZh ? 'عمليات' : 'action(s)'}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Center: Undo / Redo & Revert Controls */}
        {file && (
          <div className="flex items-center gap-1 bg-[hsl(var(--color-muted)/0.5)] p-1 rounded-xl border border-[hsl(var(--color-border)/0.6)]">
            <button
              onClick={handleUndo}
              disabled={historyStack.length === 0}
              className="p-1.5 rounded-lg text-[hsl(var(--color-foreground))] hover:bg-[hsl(var(--color-background))] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title={isZh ? 'تراجع (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
              aria-label="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded-lg text-[hsl(var(--color-foreground))] hover:bg-[hsl(var(--color-background))] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title={isZh ? 'إعادة (Ctrl+Y)' : 'Redo (Ctrl+Y)'}
              aria-label="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            {historyStack.length > 0 && (
              <>
                <div className="w-[1px] h-3.5 bg-[hsl(var(--color-border))] mx-1" />
                <button
                  onClick={handleRevert}
                  className="px-2 py-1 text-[11px] font-medium text-[hsl(var(--color-muted-foreground))] hover:text-red-500 rounded-lg hover:bg-[hsl(var(--color-background))] transition-all flex items-center gap-1"
                  title={isZh ? 'استعادة النسخة الأصلية' : 'Revert to Initial Version'}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden md:inline">{isZh ? 'استعادة الأصل' : 'Revert'}</span>
                </button>
              </>
            )}
          </div>
        )}

        <button type="button" onClick={() => setDebugOpen(true)} aria-label="Open debug log" className="shrink-0 rounded-lg border border-[hsl(var(--color-border))] px-2 py-1.5 text-xs font-semibold">{isZh ? 'سجل الأخطاء' : 'Debug Log'} ({debugEntries.length})</button>

        {/* Right: Actions & Mode Switch */}
        <div className="flex items-center gap-2 shrink-0">
          {file ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrint}
                title={isZh ? 'طباعة المستند (Ctrl+P)' : 'Print Document (Ctrl+P)'}
                className="h-8 px-2.5 text-xs gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isZh ? 'طباعة' : 'Print'}</span>
              </Button>

              {/* Split Export Button */}
              <div className="relative inline-flex items-center shadow-sm rounded-lg">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExport}
                  title={isZh ? 'حفظ وتصدير PDF النهائي (Ctrl+S)' : 'Save & Export Final PDF (Ctrl+S)'}
                  className="h-8 px-3 text-xs gap-1.5 rounded-r-none border-r border-white/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isZh ? 'حفظ وتصدير' : 'Save & Export'}</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen((prev) => !prev)}
                  className="h-8 px-1.5 rounded-r-lg bg-[hsl(var(--color-primary))] text-white hover:bg-[hsl(var(--color-primary-hover))] transition-colors flex items-center justify-center border-l border-white/20"
                  title={isZh ? 'المزيد من صيغ التصدير' : 'More Export Formats'}
                  aria-label="More export formats"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* Export Dropdown Popover */}
                {isExportMenuOpen && (
                  <div className="absolute right-0 top-10 w-56 bg-[hsl(var(--color-card))] border border-[hsl(var(--color-border))] rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        handleExport();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-left rounded-lg hover:bg-[hsl(var(--color-muted))] text-[hsl(var(--color-foreground))] font-medium transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[hsl(var(--color-primary))]" />
                      <span>{isZh ? 'حفظ PDF المعدّل (Ctrl+S)' : 'Save Edited PDF (Ctrl+S)'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        handleExportTool('pdf-to-docx', {});
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-left rounded-lg hover:bg-[hsl(var(--color-muted))] text-[hsl(var(--color-foreground))] font-medium transition-colors"
                    >
                      <FileType className="w-3.5 h-3.5 text-blue-500" />
                      <span>{isZh ? 'تصدير إلى Word (.docx)' : 'Export as Word (.docx)'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        handleExportTool('pdf-to-image', { quality: 90 });
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-left rounded-lg hover:bg-[hsl(var(--color-muted))] text-[hsl(var(--color-foreground))] font-medium transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isZh ? 'تصدير الصور (.zip)' : 'Export as Images (.zip)'}</span>
                    </button>
                    {documents.length > 1 && (
                      <>
                        <div className="my-1 border-t border-[hsl(var(--color-border)/0.5)]" />
                        <button
                          onClick={handleExportAllZip}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-left rounded-lg hover:bg-[hsl(var(--color-muted))] text-emerald-600 dark:text-emerald-400 font-semibold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>
                            {isZh
                              ? `تصدير جميع المستندات (${documents.length} ملفات .zip)`
                              : `Export All Documents (${documents.length} files .zip)`}
                          </span>
                        </button>
                      </>
                    )}
                    <div className="my-1 border-t border-[hsl(var(--color-border)/0.5)]" />
                    <button
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        handlePrint();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-left rounded-lg hover:bg-[hsl(var(--color-muted))] text-[hsl(var(--color-foreground))] font-medium transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{isZh ? 'طباعة (Ctrl+P)' : 'Native Print (Ctrl+P)'}</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (activeDoc) {
                    handleCloseDocument(activeDoc.id);
                  }
                }}
                className="p-1.5 rounded-lg text-[hsl(var(--color-muted-foreground))] hover:text-red-500 hover:bg-[hsl(var(--color-muted))] transition-colors ml-1"
                title={isZh ? 'إغلاق المستند' : 'Close document'}
                aria-label="Close file"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              href={`/${locale}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[hsl(var(--color-border))] text-xs font-medium text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-foreground))] hover:bg-[hsl(var(--color-muted))] transition-all"
              title={isZh ? 'التبديل إلى عرض الأدوات' : 'Classic Tool Grid View'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{isZh ? 'عرض الأدوات' : 'Classic Grid View'}</span>
            </Link>
          )}
        </div>

        {/* History Timeline Popover */}
        {isHistoryOpen && file && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 w-80 bg-[hsl(var(--color-card))] border border-[hsl(var(--color-border))] rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[hsl(var(--color-border))]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--color-foreground))]">
                <History className="w-3.5 h-3.5 text-[hsl(var(--color-primary))]" />
                <span>{isZh ? 'سجل العمليات' : 'Operation Timeline'}</span>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1 rounded-md text-[hsl(var(--color-muted-foreground))] hover:bg-[hsl(var(--color-muted))]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between p-2 rounded-xl text-xs bg-[hsl(var(--color-muted)/0.3)]">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-[hsl(var(--color-muted-foreground))] shrink-0" />
                  <span className="truncate font-medium">{file.name} ({isZh ? 'الأصل' : 'Original'})</span>
                </div>
                {historyStack.length > 0 && (
                  <button
                    onClick={handleRevert}
                    className="text-[10px] text-[hsl(var(--color-primary))] font-semibold hover:underline"
                  >
                    {isZh ? 'استعادة' : 'Revert'}
                  </button>
                )}
              </div>
              {historyStack.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl text-xs bg-[hsl(var(--color-muted)/0.5)] border border-[hsl(var(--color-border)/0.4)]"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-4 h-4 rounded-full bg-[hsl(var(--color-primary)/0.2)] text-[hsl(var(--color-primary))] text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate font-semibold text-[hsl(var(--color-foreground))]">
                      {item.action}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Multi-Document Tabs Bar */}
      {documents.length > 0 && (
        <div className="h-10 flex-shrink-0 border-b border-[hsl(var(--color-border)/0.8)] bg-[hsl(var(--color-muted)/0.35)] px-3 flex items-center justify-between z-20">
          {/* Scrollable Document Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 flex-1 min-w-0 mr-2">
            {documents.map((doc) => {
              const isActive = doc.id === activeDoc?.id;
              const isModified = doc.historyStack.length > 0;
              return (
                <div
                  key={doc.id}
                  onClick={() => handleSelectDocument(doc.id)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border shrink-0 max-w-[220px] select-none ${
                    isActive
                      ? 'bg-[hsl(var(--color-card))] text-[hsl(var(--color-primary))] border-[hsl(var(--color-border))] shadow-xs font-semibold'
                      : 'bg-transparent text-[hsl(var(--color-muted-foreground))] border-transparent hover:bg-[hsl(var(--color-card)/0.6)] hover:text-[hsl(var(--color-foreground))]'
                  }`}
                  title={isZh ? `المستند: ${doc.name}${isModified ? ' (معدل)' : ''}` : `Document: ${doc.name}${isModified ? ' (Modified)' : ''}`}
                >
                  <FileText
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-[hsl(var(--color-primary))]' : 'text-[hsl(var(--color-muted-foreground))]'
                    }`}
                  />
                  <span className="truncate">{doc.name}</span>
                  {isModified && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--color-primary))] shrink-0"
                      title={isZh ? 'توجد تعديلات غير محفوظة' : 'Unsaved changes'}
                    />
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleCloseDocument(doc.id, e)}
                    className="p-0.5 rounded-md hover:bg-[hsl(var(--color-muted))] text-[hsl(var(--color-muted-foreground))] hover:text-red-500 opacity-60 group-hover:opacity-100 transition-all ml-0.5"
                    title={isZh ? 'إغلاق المستند' : 'Close document'}
                    aria-label={`Close ${doc.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Right Action: Import More Documents */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => multiFileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-[hsl(var(--color-border))] hover:border-[hsl(var(--color-primary))] hover:bg-[hsl(var(--color-primary)/0.08)] text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-primary))] text-xs font-medium transition-all"
              title={isZh ? 'فتح ملفات PDF إضافية (اختيار متعدد)' : 'Open or import more PDFs (multi-select)'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isZh ? 'استيراد المزيد من ملفات PDF' : 'Import More PDFs'}</span>
            </button>
            <input
              ref={multiFileInputRef}
              type="file"
              multiple
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleAddFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />
            {documents.length > 1 && (
              <span className="text-[10px] font-medium text-[hsl(var(--color-muted-foreground))] px-1.5 py-0.5 rounded bg-[hsl(var(--color-muted))]">
                {isZh ? `عدد المستندات: ${documents.length} مستندات` : `${documents.length} Documents`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {file && pdfUrl ? (
          <>
            {/* Left Rail Toolbar */}
            <div className={activeToolId ? 'hidden md:flex min-w-0' : 'flex min-w-0'}>
            <StudioLeftRail
              activeToolId={activeToolId}
              onSelectTool={setActiveToolId}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={toggleSidebarCollapse}
              disabled={isApplying}
              locale={validLocale}
              onQuickApply={(toolId) => handleApplyTool(toolId, {})}
            />
            </div>

            {/* Center: Single Seamless PDF Viewer */}
            <main className="flex-1 relative bg-zinc-900/10 dark:bg-black/40 overflow-hidden">
              <iframe
                ref={iframeRef}
                src={withBasePath(`/pdfjs-viewer/viewer.html?file=${encodeURIComponent(pdfUrl)}`)}
                className="w-full h-full border-0 absolute inset-0"
                title={file.name}
              />

              {/* Processing Overlay Feedback */}
              {isApplying && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-xs z-30 flex flex-col items-center justify-center animate-in fade-in duration-200">
                  <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-[hsl(var(--color-card)/0.95)] border border-[hsl(var(--color-border))] shadow-2xl">
                    <Loader2 className="w-8 h-8 text-[hsl(var(--color-primary))] animate-spin" />
                    <div className="text-center">
                      <p className="text-xs font-bold text-[hsl(var(--color-foreground))]">{isZh ? 'جارٍ معالجة المستند...' : 'Processing document in-place...'}</p>
                      <p className="text-[10px] text-[hsl(var(--color-muted-foreground))] mt-0.5">{isZh ? 'معالجة محلية دون رفع الملفات للإنترنت' : '100% Client-side safe, zero network upload'}</p>
                    </div>
                  </div>
                </div>
              )}
            </main>

            {/* Right: Context Tool Parameter Drawer */}
            <div className={activeToolId ? 'absolute inset-0 z-40 flex justify-end md:static md:inset-auto md:z-auto' : 'hidden'}>
            <StudioToolDrawer
              toolId={activeToolId}
              onClose={() => setActiveToolId(null)}
              onApply={(tid: StudioToolId, opts: Record<string, any>) => handleApplyTool(tid, opts)}
              onExport={(tid: StudioToolId, opts: Record<string, any>) => handleExportTool(tid, opts)}
              isApplying={isApplying}
              locale={validLocale}
              availableDocuments={availableDocuments}
            />
            </div>
          </>
        ) : (
          /* Empty Workspace Welcome & Import Screen */
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleAddFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />

            <div className="max-w-md w-full p-8 rounded-3xl border-2 border-dashed border-[hsl(var(--color-border))] bg-[hsl(var(--color-card)/0.4)] backdrop-blur-md flex flex-col items-center shadow-xl hover:border-[hsl(var(--color-primary))] transition-all duration-300 group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--color-primary)/0.2)] to-[hsl(var(--color-accent))] text-[hsl(var(--color-primary))] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>

              <h2 className="text-xl font-bold text-[hsl(var(--color-foreground))] mb-2">
                {isZh ? 'استورد PDF لبدء العمل' : 'Import PDF to Launch Studio Workspace'}
              </h2>
              <p className="text-xs text-[hsl(var(--color-muted-foreground))] mb-6 leading-relaxed">
                {isZh
                  ? 'اعمل على ملف PDF في مكان واحد: تدوير الصفحات، وإضافة العلامات المائية، والضغط، والتوقيع، واستخراج الصفحات دون إعادة رفع الملف.'
                  : 'No more jumping between tools or re-uploading. Rotate, watermark, compress, sign, and organize pages seamlessly in a single in-place view.'}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 gap-2 shadow-lg shadow-[hsl(var(--color-primary)/0.2)] text-xs font-semibold py-2.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isZh ? 'اختر ملفات PDF (اختيار متعدد)' : 'Select PDF Files (Multi-Select)'}</span>
                </Button>

                <Link
                  href={`/${locale}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[hsl(var(--color-border))] text-xs font-semibold text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-foreground))] hover:bg-[hsl(var(--color-muted))] transition-all"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>{isZh ? 'العودة إلى جميع الأدوات' : 'Back to All Tools'}</span>
                </Link>
              </div>

              <div className="mt-6 flex items-center gap-4 text-[11px] text-[hsl(var(--color-muted-foreground)/0.7)]">
                <span>{isZh ? 'يمكنك سحب عدة ملفات PDF هنا' : 'Drag & drop multiple PDFs here'}</span>
                <span>•</span>
                <span>{isZh ? 'معالجة محلية دون اتصال' : '100% Offline & Private'}</span>
                <span>•</span>
                <span>{isZh ? 'التبديل السريع بين الملفات' : 'Multi-Tab Document Switch'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {debugOpen && (
        <div role="dialog" aria-label="Debug Log" className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-3 app-mobile-safe-dialog" style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="bg-[hsl(var(--color-card))] text-[hsl(var(--color-foreground))] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col p-4 gap-3">
            <h2 className="font-bold">{isZh ? 'سجل العمليات والأخطاء' : 'Operations & Error Log'}</h2>
            <textarea readOnly aria-label="Debug log content" className="w-full flex-1 min-h-[45vh] text-xs font-mono p-2 border rounded bg-[hsl(var(--color-background))]" value={debugEntries.join('\n') || (isZh ? 'لا توجد أحداث بعد' : 'No events yet')} />
            <div className="flex gap-2 flex-wrap">
              <button type="button" className="border rounded px-3 py-2" onClick={() => { void navigator.clipboard?.writeText(debugEntries.join('\n')).catch(() => {}); }}>{isZh ? 'نسخ السجل' : 'Copy Log'}</button>
              <button type="button" className="border rounded px-3 py-2" onClick={() => { const blob = new Blob([debugEntries.join('\n')], { type: 'text/plain' }); void saveBlobFile(blob, '90-pdf-debug-log.txt').catch(err => notify('error', String(err))); }}>{isZh ? 'حفظ السجل' : 'Save Log'}</button>
              <button type="button" className="border rounded px-3 py-2" onClick={() => setDebugEntries([])}>{isZh ? 'مسح' : 'Clear'}</button>
              <button type="button" className="border rounded px-3 py-2" onClick={() => setDebugOpen(false)}>{isZh ? 'إغلاق' : 'Close'}</button>
            </div>
          </div>
        </div>
      )}

      {pendingExport && (
        <div role="region" aria-label={isZh ? 'نتيجة جاهزة للحفظ' : 'Output ready to save'} className="fixed z-[150] left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md rounded-xl border bg-[hsl(var(--color-card))] text-[hsl(var(--color-foreground))] shadow-xl p-3 flex flex-col gap-2" style={{ bottom: 'calc(10rem + var(--app-safe-bottom, 24px))' }}>
          <div className="font-semibold text-sm">{isZh ? 'ملف جاهز للحفظ' : 'Output ready to save'}</div>
          <div className="text-xs break-all">{pendingExport.filename} · {(pendingExport.blob.size / 1024).toFixed(1)} KB</div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" disabled={isApplying} className="rounded bg-[hsl(var(--color-primary))] text-white px-3 py-2 text-sm disabled:opacity-50" onClick={async () => { const item = pendingExport; if (!item) return; setIsApplying(true); try { const saved = await saveBlobFile(item.blob, item.filename); if (saved) { setPendingExport(null); notify('success', isZh ? 'تم حفظ الملف' : 'File saved'); } else { notify('error', isZh ? 'لم يتم حفظ الملف' : 'File was not saved'); } } catch (err) { notify('error', String(err)); } finally { setIsApplying(false); } }}>{isZh ? 'إعادة الحفظ' : 'Retry save'}</button>
            <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => setPendingExport(null)}>{isZh ? 'تجاهل النتيجة' : 'Discard output'}</button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
          className={`fixed left-3 right-3 sm:left-auto sm:right-6 px-4 py-3 max-w-[calc(100vw-1.5rem)] max-h-[45vh] overflow-y-auto break-words rounded-xl shadow-2xl flex items-start gap-2.5 text-sm font-medium z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-600/20'
              : 'bg-red-600 text-white shadow-red-600/20'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="flex-1 whitespace-pre-wrap select-text">{notification.message}</span>
          <button type="button" aria-label="Copy notification" onClick={() => { void navigator.clipboard?.writeText(notification.message).catch(() => {}); }} className="shrink-0 rounded border border-white/50 px-2 py-1 text-xs">نسخ</button>
          <button type="button" aria-label="Dismiss notification" onClick={() => setNotification(null)} className="shrink-0 rounded border border-white/50 px-2 py-1 text-xs">إغلاق</button>
        </div>
      )}
    </div>
  );
};
