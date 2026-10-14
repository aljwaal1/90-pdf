import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { StudioToolDrawer } from '@/components/studio/StudioToolDrawer';

describe('StudioToolDrawer - Full Tool Parameters Alignment', () => {
  const onApplyMock = vi.fn().mockResolvedValue(undefined);
  const onExportMock = vi.fn().mockResolvedValue(undefined);
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders split-pdf with full options (ranges, everyN, all, evenOdd)', async () => {
    render(
      <StudioToolDrawer
        toolId="split-pdf"
        onClose={onCloseMock}
        onApply={onApplyMock}
        onExport={onExportMock}
        isApplying={false}
        locale="en"
        totalPages={10}
      />
    );

    expect(screen.getByText('拆分模式')).toBeInTheDocument();
    expect(screen.getByText('自定义区间')).toBeInTheDocument();
    expect(screen.getByText('每隔 N 页')).toBeInTheDocument();
    expect(screen.getByText('奇偶页拆分')).toBeInTheDocument();

    // Select everyN mode
    fireEvent.click(screen.getByText('每隔 N 页'));
    expect(screen.getByText('每隔几页拆为一个文档')).toBeInTheDocument();

    // Click submit
    fireEvent.click(screen.getByRole('button', { name: /Apply Changes/i }));
    await waitFor(() => {
      expect(onApplyMock).toHaveBeenCalledWith('split-pdf', expect.objectContaining({
        splitMode: 'everyN',
      }));
    });
  });

  it('renders table-of-contents with title, font and bookmark options', async () => {
    render(
      <StudioToolDrawer
        toolId="table-of-contents"
        onClose={onCloseMock}
        onApply={onApplyMock}
        onExport={onExportMock}
        isApplying={false}
        locale="en"
      />
    );

    expect(screen.getByText('目录生成选项')).toBeInTheDocument();
    expect(screen.getByText('目录标题')).toBeInTheDocument();
    expect(screen.getByText('同步生成 PDF 侧边栏书签')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Apply Changes/i }));
    await waitFor(() => {
      expect(onApplyMock).toHaveBeenCalledWith('table-of-contents', expect.objectContaining({
        title: expect.any(String),
      }));
    });
  });

  it('renders sanitize-pdf with full item checklist', async () => {
    render(
      <StudioToolDrawer
        toolId="sanitize-pdf"
        onClose={onCloseMock}
        onApply={onApplyMock}
        onExport={onExportMock}
        isApplying={false}
        locale="en"
      />
    );

    expect(screen.getByText('安全深度脱敏项勾选')).toBeInTheDocument();
    expect(screen.getByText('剔除所有可执行 JavaScript 脚本')).toBeInTheDocument();
    expect(screen.getByText('剥离嵌入的内嵌文件附件')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Apply Changes/i }));
    await waitFor(() => {
      expect(onApplyMock).toHaveBeenCalledWith('sanitize-pdf', expect.objectContaining({
        removeJavaScript: true,
      }));
    });
  });

  it('renders pdf-to-markdown export options', async () => {
    render(
      <StudioToolDrawer
        toolId="pdf-to-markdown"
        onClose={onCloseMock}
        onApply={onApplyMock}
        onExport={onExportMock}
        isApplying={false}
        locale="en"
      />
    );

    expect(screen.getByText('导出 Markdown 结构化选项')).toBeInTheDocument();
    expect(screen.getByText('在各节标注页码来源注释')).toBeInTheDocument();
    expect(screen.getByText('忠实保留原文物理硬换行')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Export & Save/i }));
    await waitFor(() => {
      expect(onExportMock).toHaveBeenCalledWith('pdf-to-markdown', expect.objectContaining({
        preserveLineBreaks: true,
      }));
    });
  });

  it('renders pdf-booklet saddle-stitch binding parameters', async () => {
    render(
      <StudioToolDrawer
        toolId="pdf-booklet"
        onClose={onCloseMock}
        onApply={onApplyMock}
        onExport={onExportMock}
        isApplying={false}
        locale="en"
      />
    );

    expect(screen.getByText('小册子装订拼版')).toBeInTheDocument();
    expect(screen.getByText('1x2 骑马订 (双页并排)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Apply Changes/i }));
    await waitFor(() => {
      expect(onApplyMock).toHaveBeenCalledWith('pdf-booklet', expect.any(Object));
    });
  });

  it('renders text-color options with custom color and mode', async () => {
    render(
      <StudioToolDrawer
        toolId="text-color"
        onClose={onCloseMock}
        onApply={onApplyMock}
        onExport={onExportMock}
        isApplying={false}
        locale="en"
      />
    );

    expect(screen.getByText('文本颜色替换与染色')).toBeInTheDocument();
    expect(screen.getByText('深色字替换')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Apply Changes/i }));
    await waitFor(() => {
      expect(onApplyMock).toHaveBeenCalledWith('text-color', expect.any(Object));
    });
  });
});
