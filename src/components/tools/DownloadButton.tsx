'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, type ButtonProps } from '../ui/Button';
import { addRecentFile } from '@/lib/storage/recent-files';
import { useToolContext } from '@/lib/contexts/ToolContext';
import { sanitizeFilename } from '@/lib/utils/sanitize';
import { isTauri, saveBlobFile } from '@/lib/tauri-bridge';
import { recordToolError } from '@/lib/diagnostics';

export interface DownloadButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  /** Blob data to download */
  file: Blob | null;
  /** Filename for the download */
  filename: string;
  /** Custom button text */
  label?: string;
  /** Callback after download starts */
  onDownloadStart?: () => void;
  /** Callback after download completes */
  onDownloadComplete?: () => void;
  /** Auto-revoke blob URL after download (default: true) */
  autoRevoke?: boolean;
  /** Show file size in button */
  showFileSize?: boolean;
  /** Tool slug for recent files tracking (optional, uses context if not provided) */
  toolSlug?: string;
  /** Tool display name for recent files tracking (optional, uses context if not provided) */
  toolName?: string;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * DownloadButton Component
 * Requirements: 5.4
 * 
 * Generates download link from Blob with custom filename.
 * Uses blob URLs that are revoked after download for security.
 */
export const DownloadButton: React.FC<DownloadButtonProps> = ({
  file,
  filename,
  label,
  onDownloadStart,
  onDownloadComplete,
  autoRevoke = true,
  showFileSize = true,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  toolSlug: propToolSlug,
  toolName: propToolName,
  ...buttonProps
}) => {
  const t = useTranslations('common');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const canPreview = !!file && (/\.pdf$/i.test(filename) || file.type === 'application/pdf');
  
  // Get tool info from context if not provided via props
  const toolContext = useToolContext();
  const toolSlug = propToolSlug || toolContext?.toolSlug;
  const toolName = propToolName || toolContext?.toolName;

  // Create blob URL when file changes
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setBlobUrl(url);
      
      // Cleanup function to revoke URL when component unmounts or file changes
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setBlobUrl(null);
    }
  }, [file]);

  /**
   * Handle download click
   */
  const handleDownload = useCallback(async () => {
    if (!file || isDownloading) return;

    setIsDownloading(true);
    setSaveMessage(null);
    onDownloadStart?.();

    // Sanitize filename to prevent path traversal
    const safeFilename = sanitizeFilename(filename, 'download.pdf');

    // Desktop (Tauri) environment: prompt native Save File dialog and write directly to disk
    if (isTauri()) {
      try {
        const saved = await saveBlobFile(file, safeFilename);
        if (saved) {
          setSaveMessage('Saved successfully. You can find the file in the folder you selected. / تم الحفظ في المجلد الذي اخترته.');
          onDownloadComplete?.();
          if (toolSlug) {
            addRecentFile(safeFilename, file.size, toolSlug, toolName);
          }
        } else {
          setSaveMessage('Save cancelled / تم إلغاء الحفظ');
        }
      } catch (error) {
        setSaveMessage('Save failed. Please try another folder. / تعذر الحفظ، اختر مجلدًا آخر.');
        recordToolError(toolSlug || 'download', 'save', error);
        console.error('Failed to save file in app:', error);
      } finally {
        setIsDownloading(false);
      }
      return;
    }

    if (!blobUrl) {
      setIsDownloading(false);
      return;
    }

    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = safeFilename;
    link.style.display = 'none';
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke the blob URL after a short delay to ensure download starts
    if (autoRevoke) {
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
        
        // Recreate URL for potential re-download
        if (file) {
          const newUrl = URL.createObjectURL(file);
          setBlobUrl(newUrl);
        }
      }, 100);
    }

    setSaveMessage('Download requested. Check your browser downloads. / تم طلب التنزيل؛ تحقق من تنزيلات المتصفح.');
    // The browser does not expose confirmation of successful disk writes.
    // Reset button state, but do not claim the file was saved.
    setTimeout(() => {
      setIsDownloading(false);
    }, 500);
  }, [file, blobUrl, filename, isDownloading, autoRevoke, onDownloadStart, onDownloadComplete, toolSlug, toolName]);

  // Determine if button should be disabled
  const isDisabled = disabled || !file || (!isTauri() && !blobUrl);

  // Build button text
  const buttonText = label || t('buttons.download');
  const fileSizeText = showFileSize && file ? ` (${formatFileSize(file.size)})` : '';

  return (
    <div className="inline-flex flex-col gap-2 max-w-full">
    <Button
      variant={variant}
      size={size}
      disabled={isDisabled}
      loading={isDownloading}
      onClick={handleDownload}
      className={className}
      aria-label={`${buttonText}${fileSizeText}`}
      {...buttonProps}
    >
      {/* Download icon */}
      {!isDownloading && (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      )}
      
      <span>
        {buttonText}
        {fileSizeText}
      </span>
    </Button>
    {canPreview && blobUrl && (
      <a href={blobUrl} onClick={(e) => { e.preventDefault(); setPreviewOpen(true); }} className="text-sm underline text-[hsl(var(--color-primary))] cursor-pointer" aria-label="Preview generated PDF">
        معاينة وفتح PDF / Preview PDF
      </a>
    )}
    {saveMessage && <p role="status" className="text-xs text-[hsl(var(--color-muted-foreground))]">{saveMessage}</p>}
    {previewOpen && blobUrl && (
      <div role="dialog" aria-label="PDF preview" className="fixed inset-0 z-[100] bg-black/80 flex flex-col p-3 sm:p-8">
        <div className="flex items-center justify-between bg-white rounded-t-lg p-3 gap-3">
          <span className="text-sm text-black truncate">{filename}</span>
          <button type="button" onClick={() => setPreviewOpen(false)} className="text-black font-semibold px-3 py-1 border rounded" aria-label="Close PDF preview">إغلاق / Close</button>
        </div>
        <iframe src={blobUrl} title={`Preview ${filename}`} className="flex-1 w-full bg-white rounded-b-lg" />
      </div>
    )}
    </div>
  );
};

export default DownloadButton;
