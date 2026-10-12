'use client';

import React from 'react';
import {
  FileText,
  FileCode,
  Mail,
  BookOpen,
  Image,
  Palette,
} from 'lucide-react';

interface ImportAppendToolOptionsProps {
  toolId: string;
  options: Record<string, any>;
  onChange: (key: string, value: any) => void;
  locale?: string;
}

export function ImportAppendToolOptions({
  toolId,
  options,
  onChange,
  locale = 'en',
}: ImportAppendToolOptionsProps) {
  const validLocale = (locale as string) || 'en';
  const isZh = validLocale.toLowerCase().startsWith('zh');

  switch (toolId) {
    case 'markdown-to-pdf': {
      const pageSize = options.pageSize || 'a4';
      const theme = options.theme || 'github';
      const gfm = options.gfm ?? true;
      const syntaxHighlight = options.syntaxHighlight ?? true;

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? 'Markdown 转 PDF 排版参数' : 'Markdown to PDF Settings'}
            </label>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">{isZh ? '纸张规格' : 'Page Size'}</label>
                <select
                  value={pageSize}
                  onChange={(e) => onChange('pageSize', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background"
                >
                  <option value="a4">A4 (210×297mm)</option>
                  <option value="letter">US Letter</option>
                </select>
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">{isZh ? '排版主题' : 'Theme'}</label>
                <select
                  value={theme}
                  onChange={(e) => onChange('theme', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background"
                >
                  <option value="github">{isZh ? 'GitHub 风格' : 'GitHub Style'}</option>
                  <option value="light">{isZh ? '极简白 (Minimal)' : 'Minimal Light'}</option>
                  <option value="dark">{isZh ? '暗夜黑 (Dark)' : 'Midnight Dark'}</option>
                </select>
              </div>
            </div>
            <div className="space-y-2 pt-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span>{isZh ? '启用 GitHub Flavored 语法 (表格/任务列表)' : 'GFM Flavor'}</span>
                <input
                  type="checkbox"
                  checked={gfm}
                  onChange={(e) => onChange('gfm', e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span>{isZh ? '代码块多语言彩色高亮' : 'Code Syntax Highlighting'}</span>
                <input
                  type="checkbox"
                  checked={syntaxHighlight}
                  onChange={(e) => onChange('syntaxHighlight', e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>
            </div>
          </div>
        </div>
      );
    }

    case 'json-to-pdf': {
      const pageSize = options.pageSize || 'A4';
      const fontSize = options.fontSize ?? 11;
      const indentSpaces = options.indentSpaces ?? 2;
      const showLineNumbers = options.showLineNumbers ?? true;

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? 'JSON 结构体转 PDF 参数' : 'JSON to PDF Settings'}
            </label>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">{isZh ? '字号 (pt)' : 'Font Size'}</label>
                <input
                  type="number"
                  min="8"
                  max="18"
                  value={fontSize}
                  onChange={(e) => onChange('fontSize', parseInt(e.target.value) || 11)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">{isZh ? '缩进空格数' : 'Indent Spaces'}</label>
                <select
                  value={indentSpaces}
                  onChange={(e) => onChange('indentSpaces', parseInt(e.target.value) || 2)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background"
                >
                  <option value={2}>{isZh ? '2 空格' : '2 Spaces'}</option>
                  <option value={4}>{isZh ? '4 空格' : '4 Spaces'}</option>
                </select>
              </div>
            </div>
            <div className="pt-2 flex items-center justify-between text-xs">
              <span>{isZh ? '在左侧显示行号' : 'Show Line Numbers'}</span>
              <input
                type="checkbox"
                checked={showLineNumbers}
                onChange={(e) => onChange('showLineNumbers', e.target.checked)}
                className="w-4 h-4 rounded text-primary"
              />
            </div>
          </div>
        </div>
      );
    }

    case 'txt-to-pdf': {
      const fontSize = options.fontSize ?? 12;
      const lineHeight = options.lineHeight ?? 1.5;
      const fontId = options.fontId || 'helvetica';

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? '纯文本 TXT 排版参数' : 'Text to PDF Settings'}
            </label>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">{isZh ? '字号 (pt)' : 'Font Size'}</label>
                <input
                  type="number"
                  min="9"
                  max="20"
                  value={fontSize}
                  onChange={(e) => onChange('fontSize', parseInt(e.target.value) || 12)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">{isZh ? '行间距倍率' : 'Line Height'}</label>
                <select
                  value={lineHeight}
                  onChange={(e) => onChange('lineHeight', parseFloat(e.target.value) || 1.5)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background"
                >
                  <option value={1.2}>{isZh ? '1.2 倍紧凑' : '1.2x Compact'}</option>
                  <option value={1.5}>{isZh ? '1.5 倍标准' : '1.5x Normal'}</option>
                  <option value={1.8}>{isZh ? '1.8 倍宽松' : '1.8x Relaxed'}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'email-to-pdf': {
      const includeCcBcc = options.includeCcBcc ?? true;
      const includeAttachments = options.includeAttachments ?? true;

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? '电子邮件 EML 转 PDF 参数' : 'Email to PDF Settings'}
            </label>
            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span>{isZh ? '在表头包含抄送 (CC) 与密送 (BCC)' : 'Include CC & BCC Headers'}</span>
                <input
                  type="checkbox"
                  checked={includeCcBcc}
                  onChange={(e) => onChange('includeCcBcc', e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span>{isZh ? '列出邮件附件清单明细' : 'List Attachments Table'}</span>
                <input
                  type="checkbox"
                  checked={includeAttachments}
                  onChange={(e) => onChange('includeAttachments', e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>
            </div>
          </div>
        </div>
      );
    }

    case 'cbz-to-pdf': {
      const quality = options.quality ?? 0.85;
      const maintainAspectRatio = options.maintainAspectRatio ?? true;

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? '漫画归档 CBZ 转 PDF' : 'CBZ to PDF Settings'}
            </label>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>{isZh ? '图片压缩画质' : 'Image Quality'}</span>
                <span className="font-semibold text-primary">{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={quality}
                onChange={(e) => onChange('quality', parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div className="pt-2 flex items-center justify-between text-xs">
              <span>{isZh ? '保持原始漫画页面纵横比' : 'Maintain Aspect Ratio'}</span>
              <input
                type="checkbox"
                checked={maintainAspectRatio}
                onChange={(e) => onChange('maintainAspectRatio', e.target.checked)}
                className="w-4 h-4 rounded text-primary"
              />
            </div>
          </div>
        </div>
      );
    }

    case 'djvu-to-pdf': {
      const dpi = options.dpi ?? 150;

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? 'DJVU 古籍扫描转 PDF' : 'DJVU to PDF Settings'}
            </label>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{isZh ? '解码清晰度 (DPI)' : 'DPI'}</label>
              <select
                value={dpi}
                onChange={(e) => onChange('dpi', parseInt(e.target.value) || 150)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background"
              >
                <option value={150}>{isZh ? '150 DPI (标准平衡)' : '150 DPI (Balanced)'}</option>
                <option value={300}>{isZh ? '300 DPI (高清字迹)' : '300 DPI (Sharp)'}</option>
              </select>
            </div>
          </div>
        </div>
      );
    }

    case 'psd-to-pdf': {
      const margin = options.margin ?? 36;
      const centerImage = options.centerImage ?? true;
      const scaleToFit = options.scaleToFit ?? true;

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? 'Photoshop PSD 转 PDF' : 'PSD to PDF Settings'}
            </label>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>{isZh ? '页边距留白' : 'Margin'}</span>
                <span className="font-semibold text-primary">{margin} pt</span>
              </div>
              <input
                type="range"
                min="0"
                max="72"
                value={margin}
                onChange={(e) => onChange('margin', parseInt(e.target.value) || 0)}
                className="w-full accent-primary"
              />
            </div>
            <div className="space-y-2 pt-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span>{isZh ? '画板内容居中对齐' : 'Center Image'}</span>
                <input
                  type="checkbox"
                  checked={centerImage}
                  onChange={(e) => onChange('centerImage', e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span>{isZh ? '自动缩放适应纸张大小' : 'Scale to Fit'}</span>
                <input
                  type="checkbox"
                  checked={scaleToFit}
                  onChange={(e) => onChange('scaleToFit', e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>
            </div>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
