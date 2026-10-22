import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PDFDocument } from 'pdf-lib';
import MobilePdfWorkspace from '@/app/[locale]/mobile-pdf/MobilePdfWorkspace';

vi.mock('tauri-plugin-android-fs-api', () => ({
  isAndroid: () => false,
}));

describe('Quick mobile PDF workspace', () => {
  it('offers localized PDF tools with an accessible processing action', () => {
    render(<MobilePdfWorkspace locale="ar" />);
    expect(screen.getByRole('heading', { name: 'أدوات PDF السريعة' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'معالجة وحفظ PDF' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'دمج' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'تدوير' }));
    expect(screen.getByText('زاوية التدوير')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تدوير' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('resets file input on operation changes to avoid stale merge selections', () => {
    const { container } = render(<MobilePdfWorkspace locale="en" />);
    const initial = container.querySelector('input[type="file"]');
    expect(initial).toHaveAttribute('multiple');
    fireEvent.click(screen.getByRole('button', { name: 'Extract' }));
    const next = container.querySelector('input[type="file"]');
    expect(next).not.toBe(initial);
    expect(next).not.toHaveAttribute('multiple');
    expect(screen.getByRole('button', { name: 'Process and save PDF' })).toBeDisabled();
    expect(screen.getByDisplayValue('90-pdf-result.pdf')).toBeInTheDocument();
    expect(screen.getByText('Input safety limit: 80 MB total')).toBeInTheDocument();
  });
  it('lets users select pages by tapping numbered buttons', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([200, 300]);
    doc.addPage([200, 300]);
    const bytes = await doc.save();
    const file = new File([new Uint8Array(bytes)], 'pages.pdf', { type: 'application/pdf' });
    render(<MobilePdfWorkspace locale="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Extract' }));
    const picker = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
    fireEvent.change(picker, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
  });
});
