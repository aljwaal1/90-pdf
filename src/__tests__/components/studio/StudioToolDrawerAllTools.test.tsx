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

    expect(screen.getByText(/Split Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom Ranges/i)).toBeInTheDocument();
    expect(screen.getByText(/Every N Pages/i)).toBeInTheDocument();
    expect(screen.getByText(/Odd \/ Even/i)).toBeInTheDocument();

    // Select everyN mode
    fireEvent.click(screen.getByText(/Every N Pages/i));
    expect(screen.getByText(/Pages Per Chunk/i)).toBeInTheDocument();

    // Split PDF opens its dedicated view rather than the in-place processor.
    fireEvent.click(screen.getByRole('button', { name: /Open View/i }));
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

    expect(screen.getAllByText(/Table of Contents/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Title/i)).toBeInTheDocument();
    expect(screen.getByText('Generate PDF Outline Bookmark')).toBeInTheDocument();

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

    expect(screen.getByText(/Sanitization Scope/i)).toBeInTheDocument();
    expect(screen.getByText(/JavaScript/i)).toBeInTheDocument();
    expect(screen.getByText(/attachments/i)).toBeInTheDocument();

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

    expect(screen.getByText(/Markdown Export Options/i)).toBeInTheDocument();
    expect(screen.getByText(/Include Page Number Headers/i)).toBeInTheDocument();
    expect(screen.getByText(/line breaks/i)).toBeInTheDocument();

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

    expect(screen.getAllByText(/Booklet Layout/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/1x2/i)).toBeInTheDocument();

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

    expect(screen.getByText(/Text Color Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Dark/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Apply Changes/i }));
    await waitFor(() => {
      expect(onApplyMock).toHaveBeenCalledWith('text-color', expect.any(Object));
    });
  });
});
