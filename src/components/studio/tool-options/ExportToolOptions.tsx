'use client';

import React from 'react';
import {
  FileText,
  FileCode,
  Image,
  Layers,
  BookOpen,
  Presentation,
  Table,
  Archive,
  Receipt,
  FileDown,
} from 'lucide-react';

interface ExportToolOptionsProps {
  toolId: string;
  options: Record<string, any>;
  onChange: (key: string, value: any) => void;
  totalPages?: number;
  locale?: string;
}

export function ExportToolOptions({
  toolId,
  options,
  onChange,
  totalPages = 1,
  locale = 'en',
}: ExportToolOptionsProps) {
  const validLocale = (locale as string) || 'en';
  const isZh = validLocale.toLowerCase().startsWith('zh');

  switch (toolId) {
    case 'pdf-to-markdown': {
      const includePageNumbers = options.includePageNumbers ?? false;
      const preserveLineBreaks = options.preserveLineBreaks ?? true;
      const pageRange = options.pageRange || '';

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? '导出 Markdown 结构化选项' : 'Markdown Export Options'}
            </label>
            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span>{isZh ? '在各节标注页码来源注释' : 'Include Page Number Headers'}</span>
                <input
                  type="checkbox"
                  checked={includePageNumbers}
                  onChange={(e) => onChange('includePageNumbers', e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span>{isZh ? '忠实保留原文物理硬换行' : 'Preserve Physical Line Breaks'}</span>
                <input
                  type="checkbox"
                  checked={preserveLineBreaks}
                  onChange={(e) => onChange('preserveLineBreaks', e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>
            </div>
            <div className="space-y-1.5 pt-2">
              <label className="text-xs text-muted-foreground">{isZh ? '导出页码范围 (留空全本)' : 'Page Range'}</label>
              <input
                type="text"
                value={pageRange}
                onChange={(e) => onChange('pageRange', e.target.value)}
                placeholder={isZh ? '例如: 1-5, 8' : 'e.g. 1-5, 8'}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background"
              />
            </div>
          </div>
        </div>
      );
    }

    case 'pdf-to-json': {
      const includeText = options.includeText ?? true;
      const includeMetadata = options.includeMetadata ?? true;
      const includePageInfo = options.includePageInfo ?? true;
      const includeOutline = options.includeOutline ?? true;
      const prettyPrint = options.prettyPrint ?? true;

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? '导出 JSON 字段选择' : 'JSON Export Fields'}
            </label>
            <div className="space-y-2 text-xs">
              {[
                { key: 'includeText', label: isZh ? '包含各页完整文本块与坐标' : 'Full Page Text Blocks', val: includeText },
                { key: 'includeMetadata', label: isZh ? '包含文档基础元数据 (Title/Author)' : 'Document Metadata', val: includeMetadata },
                { key: 'includePageInfo', label: isZh ? '包含页面尺寸与方向 (Width/Height)' : 'Page Dimensions & Layout', val: includePageInfo },
                { key: 'includeOutline', label: isZh ? '包含大纲层级与目录书签树' : 'Outline & Bookmark Tree', val: includeOutline },
                { key: 'prettyPrint', label: isZh ? '缩进格式化美化输出 (2 空格)' : 'Pretty Print (Indented)', val: prettyPrint },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                  <span>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={item.val}
                    onChange={(e) => onChange(item.key, e.target.checked)}
                    className="w-4 h-4 rounded text-primary"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'pdf-to-tiff': {
      const colorMode = options.colorMode || 'color';
      const compression = options.compression || 'packbits';
      const dpi = options.dpi ?? 150;

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? '导出 TIFF 传真/印刷参数' : 'TIFF Export Settings'}
            </label>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{isZh ? '色彩模式' : 'Color Mode'}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'color', label: isZh ? '全彩 RGB' : 'RGB Color' },
                  { id: 'grayscale', label: isZh ? '灰度' : 'Grayscale' },
                  { id: 'mono', label: isZh ? '黑白单色' : 'Monochrome' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onChange('colorMode', c.id)}
                    className={`py-1.5 px-2 text-xs rounded-lg border text-center ${
                      colorMode === c.id
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border/60 hover:bg-muted/50'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div>
                <label className="text-muted-foreground block mb-1">{isZh ? '压缩算法' : 'Compression'}</label>
                <select
                  value={compression}
                  onChange={(e) => onChange('compression', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background"
                >
                  <option value="packbits">{isZh ? 'PackBits (兼容性佳)' : 'PackBits (Compatible)'}</option>
                  <option value="lzw">{isZh ? 'LZW (无损高压)' : 'LZW (Lossless)'}</option>
                  <option value="none">{isZh ? '无压缩 (RAW)' : 'No Compression (RAW)'}</option>
                </select>
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">{isZh ? '图像解析度 (DPI)' : 'Resolution'}</label>
                <select
                  value={dpi}
                  onChange={(e) => onChange('dpi', parseInt(e.target.value) || 150)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background"
                >
                  <option value={96}>{isZh ? '96 DPI (屏幕)' : '96 DPI (Screen)'}</option>
                  <option value={150}>{isZh ? '150 DPI (普通)' : '150 DPI (Normal)'}</option>
                  <option value={300}>{isZh ? '300 DPI (高清)' : '300 DPI (High-res)'}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'pdf-to-svg': {
      const scale = options.scale ?? 2;
      const pageRange = options.pageRange || '';

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? '导出矢量 SVG 选项' : 'Vector SVG Options'}
            </label>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>{isZh ? '矢量渲染缩放倍率' : 'Scale Factor'}</span>
                <span className="font-semibold text-primary">{scale}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.5"
                value={scale}
                onChange={(e) => onChange('scale', parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div className="space-y-1.5 pt-2">
              <label className="text-xs text-muted-foreground">{isZh ? '页码范围 (留空全本)' : 'Page Range'}</label>
              <input
                type="text"
                value={pageRange}
                onChange={(e) => onChange('pageRange', e.target.value)}
                placeholder="1-5"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background"
              />
            </div>
          </div>
        </div>
      );
    }

    case 'pdf-to-cbz': {
      const title = options.title || '';
      const series = options.series || '';
      const format = options.format || 'jpg';
      const quality = options.quality ?? 0.85;
      const manga = options.manga || 'No';

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? '导出漫画电子书 (CBZ)' : 'CBZ Comic Archive'}
            </label>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">{isZh ? '漫画作品名' : 'Title'}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => onChange('title', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">{isZh ? '系列/卷号' : 'Series'}</label>
                <input
                  type="text"
                  value={series}
                  onChange={(e) => onChange('series', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="text-muted-foreground block mb-1">{isZh ? '内嵌图片格式' : 'Image Format'}</label>
                <select
                  value={format}
                  onChange={(e) => onChange('format', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background"
                >
                  <option value="jpg">{isZh ? 'JPG (高兼容)' : 'JPG (Standard)'}</option>
                  <option value="webp">{isZh ? 'WebP (超轻量)' : 'WebP (Compact)'}</option>
                  <option value="png">{isZh ? 'PNG (无损)' : 'PNG (Lossless)'}</option>
                </select>
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">{isZh ? '日漫翻页方向' : 'Manga Reading Flow'}</label>
                <select
                  value={manga}
                  onChange={(e) => onChange('manga', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background"
                >
                  <option value="No">{isZh ? '从左到右 (常规)' : 'Left to Right'}</option>
                  <option value="Yes">{isZh ? '从右向左 (日漫标准)' : 'Right to Left (Manga)'}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'pdf-to-pptx': {
      const dpi = options.dpi ?? 150;

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? '转换为 PowerPoint (PPTX) 参数' : 'PPTX Conversion Settings'}
            </label>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{isZh ? '幻灯片底图清晰度 (DPI)' : 'Slide Resolution (DPI)'}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 96, label: '96 DPI', desc: isZh ? '小体积' : 'Compact' },
                  { id: 150, label: '150 DPI', desc: isZh ? '推荐标准' : 'Standard' },
                  { id: 300, label: '300 DPI', desc: isZh ? '高清演讲' : 'Ultra HD' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onChange('dpi', d.id)}
                    className={`flex flex-col items-center py-2 px-1 text-xs rounded-lg border ${
                      dpi === d.id
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border/60 hover:bg-muted/50'
                    }`}
                  >
                    <span>{d.label}</span>
                    <span className="text-[10px] text-muted-foreground">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'extract-images': {
      const minWidth = options.minWidth ?? 100;
      const minHeight = options.minHeight ?? 100;

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? '图片提取过滤规则' : 'Image Extraction Filter'}
            </label>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">{isZh ? '最小宽度 (px)' : 'Min Width (px)'}</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={minWidth}
                  onChange={(e) => onChange('minWidth', parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">{isZh ? '最小高度 (px)' : 'Min Height (px)'}</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={minHeight}
                  onChange={(e) => onChange('minHeight', parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isZh ? '自动过滤网页图标、小点或装饰性微小底图。' : 'Filters out tiny icons and decorative fragments.'}
            </p>
          </div>
        </div>
      );
    }

    case 'extract-tables': {
      const format = options.format || 'xlsx';
      const minColumns = options.minColumns ?? 2;
      const minRows = options.minRows ?? 2;
      const includePageNumbers = options.includePageNumbers ?? true;

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? '表格提取参数' : 'Table Extraction Settings'}
            </label>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{isZh ? '导出表格格式' : 'Export Format'}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'xlsx', label: isZh ? 'Excel 工作簿 (.xlsx)' : 'Excel (.xlsx)' },
                  { id: 'csv', label: isZh ? '通用 CSV 逗号分隔' : 'Standard CSV' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onChange('format', f.id)}
                    className={`py-1.5 px-2 text-xs rounded-lg border text-center ${
                      format === f.id
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border/60 hover:bg-muted/50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="text-muted-foreground block mb-1">{isZh ? '最小列数' : 'Min Columns'}</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={minColumns}
                  onChange={(e) => onChange('minColumns', parseInt(e.target.value) || 2)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">{isZh ? '最小行数' : 'Min Rows'}</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={minRows}
                  onChange={(e) => onChange('minRows', parseInt(e.target.value) || 2)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background"
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'annotation-exporter': {
      const format = options.format || 'markdown';
      const incHighlights = options.incHighlights ?? true;
      const incNotes = options.incNotes ?? true;
      const incUnderlines = options.incUnderlines ?? true;

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? '批注与笔记导出选项' : 'Annotation Exporter'}
            </label>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{isZh ? '导出报告格式' : 'Report Format'}</label>
              <div className="grid grid-cols-3 gap-2">
                {['markdown', 'json', 'txt'].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => onChange('format', fmt)}
                    className={`py-1 px-2 text-xs rounded-lg border text-center uppercase ${
                      format === fmt
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border/60 hover:bg-muted/50'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 pt-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span>{isZh ? '包含高亮选中文本' : 'Include Highlights'}</span>
                <input
                  type="checkbox"
                  checked={incHighlights}
                  onChange={(e) => onChange('incHighlights', e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span>{isZh ? '包含便签注释与留言' : 'Include Sticky Notes'}</span>
                <input
                  type="checkbox"
                  checked={incNotes}
                  onChange={(e) => onChange('incNotes', e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
              </label>
            </div>
          </div>
        </div>
      );
    }

    case 'global-invoice-parser': {
      const targetCurrency = options.targetCurrency || 'USD';
      const customRate = options.customRate ?? 1.0;

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? '全球发票智能解析与汇率转换' : 'Invoice Parser'}
            </label>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{isZh ? '统一结算目标币种' : 'Target Currency'}</label>
              <select
                value={targetCurrency}
                onChange={(e) => onChange('targetCurrency', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background"
              >
                <option value="CNY">{isZh ? '人民币 (CNY ¥)' : 'Chinese Yuan (CNY ¥)'}</option>
                <option value="USD">{isZh ? '美元 (USD $)' : 'US Dollar (USD $)'}</option>
                <option value="EUR">{isZh ? '欧元 (EUR €)' : 'Euro (EUR €)'}</option>
                <option value="GBP">{isZh ? '英镑 (GBP £)' : 'British Pound (GBP £)'}</option>
                <option value="JPY">{isZh ? '日元 (JPY ¥)' : 'Japanese Yen (JPY ¥)'}</option>
              </select>
            </div>
          </div>
        </div>
      );
    }

    case 'pdf-to-slide': {
      const themeColor = options.themeColor || '#6366f1';

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? '网页全屏幻灯片放映模式' : 'Web Slide Show Presentation'}
            </label>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{isZh ? '演讲台主题配色' : 'Theme Accent Color'}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => onChange('themeColor', e.target.value)}
                  className="w-7 h-7 rounded border border-border cursor-pointer p-0.5"
                />
                <span className="font-mono text-muted-foreground">{themeColor}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'pdf-to-zip': {
      const compressionLevel = options.compressionLevel ?? 6;

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              {isZh ? '打包为 ZIP 归档' : 'ZIP Compression'}
            </label>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>{isZh ? '压缩等级' : 'Compression Level'}</span>
                <span className="font-semibold text-primary">{compressionLevel}</span>
              </div>
              <input
                type="range"
                min="1"
                max="9"
                value={compressionLevel}
                onChange={(e) => onChange('compressionLevel', parseInt(e.target.value) || 6)}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
