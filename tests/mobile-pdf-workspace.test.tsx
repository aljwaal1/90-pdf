import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
  });
});
