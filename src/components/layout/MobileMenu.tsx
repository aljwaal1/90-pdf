'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { X, ChevronRight, ChevronDown, FileText, Search } from 'lucide-react';
import { type Locale } from '@/lib/i18n/config';
import { type ToolCategory } from '@/types/tool';
import { Button } from '@/components/ui/Button';

export interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
}

interface CategoryItem {
  id: ToolCategory;
  labelKey: string;
  href: string;
}

// Get all focusable elements within a container
const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
};

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, locale }) => {
  const t = useTranslations('home.categories');
  const tCommon = useTranslations('common');
  const menuRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const categories: CategoryItem[] = [
    { id: 'edit-annotate', labelKey: 'editAnnotate', href: `/${locale}/tools?category=edit-annotate` },
    { id: 'convert-to-pdf', labelKey: 'convertToPdf', href: `/${locale}/tools?category=convert-to-pdf` },
    { id: 'convert-from-pdf', labelKey: 'convertFromPdf', href: `/${locale}/tools?category=convert-from-pdf` },
    { id: 'organize-manage', labelKey: 'organizeManage', href: `/${locale}/tools?category=organize-manage` },
    { id: 'optimize-repair', labelKey: 'optimizeRepair', href: `/${locale}/tools?category=optimize-repair` },
    { id: 'secure-pdf', labelKey: 'securePdf', href: `/${locale}/tools?category=secure-pdf` },
  ];

  const mainNavItems = [
    { href: `/${locale}`, label: tCommon('navigation.home') },
    { href: `/${locale}/studio`, label: locale === 'ar' ? 'استوديو PDF' : 'PDF Studio' },
    { href: `/${locale}/tools`, label: tCommon('navigation.tools'), hasSubmenu: true },
    { href: `/${locale}/workflow`, label: locale === 'ar' ? 'سير العمل' : 'Workflow' },
    { href: `/${locale}/about`, label: tCommon('navigation.about') },
    { href: `/${locale}/faq`, label: tCommon('navigation.faq') },
    { href: `/${locale}/privacy`, label: tCommon('navigation.privacy') },
    { href: `/${locale}/contact`, label: tCommon('navigation.contact') },
  ];

  // Keep the original scroll lock when this drawer closes.
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Focus the close button when menu opens
      closeButtonRef.current?.focus();
      
      // Prevent body scroll
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previousOverflow;
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen]);

  // Handle keyboard navigation with focus trap
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap - Tab key handling
      if (event.key === 'Tab' && menuRef.current) {
        const focusableElements = getFocusableElements(menuRef.current);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Touch gesture handling for swipe to close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStart === null) return;
    
    const deltaX = e.changedTouches[0].clientX - touchStart.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.y;
    // Close toward the drawer's physical edge; ignore vertical scrolling.
    const towardEdge = locale === 'ar' ? deltaX < -100 : deltaX > 100;
    if (towardEdge && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      onClose();
    }
    setTouchStart(null);
  }, [touchStart, onClose, locale]);

  const handleCategoryToggle = useCallback((categoryId: string) => {
    setExpandedCategory((prev) => (prev === categoryId ? null : categoryId));
  }, []);

  const handleLinkClick = useCallback(() => {
    onClose();
    setExpandedCategory(null);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Menu */}
      <div
        ref={menuRef}
        className={`
          fixed top-0 h-[100dvh] max-h-[100dvh] pb-[var(--app-safe-bottom,24px)] pt-[var(--app-safe-top,0px)] box-border overflow-hidden flex flex-col w-80 max-w-[85vw] bg-[hsl(var(--color-background))] 
          shadow-xl z-50 md:hidden
          ${locale === 'ar' ? 'left-0' : 'right-0'}
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : locale === 'ar' ? '-translate-x-full' : 'translate-x-full'}
        `}
        role="dialog"
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        aria-modal="true"
        aria-label={locale === 'ar' ? 'قائمة التنقل' : 'Mobile navigation menu'}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--color-border))]">
          <span className="text-lg font-bold text-[hsl(var(--color-primary))]">
            {tCommon('brand')}
          </span>
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={tCommon('buttons.close')}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-4 flex-1 min-h-0 overflow-y-auto overscroll-contain pb-8" aria-label="Mobile navigation">
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Link href={`/${locale}/studio`} onClick={handleLinkClick} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--color-primary))] px-3 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2">
              <FileText className="h-4 w-4" aria-hidden="true" />{locale === 'ar' ? 'فتح الاستوديو' : 'Open Studio'}
            </Link>
            <Link href={`/${locale}/tools`} onClick={handleLinkClick} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--color-border))] bg-[hsl(var(--color-muted))] px-3 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">
              <Search className="h-4 w-4" aria-hidden="true" />{locale === 'ar' ? 'جميع الأدوات' : 'All tools'}
            </Link>
          </div>
          <ul className="flex flex-col gap-1">
            {mainNavItems.map((item) => (
              <li key={item.href}>
                {item.hasSubmenu ? (
                  <div>
                    <button
                      onClick={() => handleCategoryToggle('tools')}
                      className="flex items-center justify-between w-full px-4 py-3 text-start text-[hsl(var(--color-foreground))] hover:bg-[hsl(var(--color-muted))] rounded-[var(--radius-md)] transition-colors"
                      aria-expanded={expandedCategory === 'tools'}
                    >
                      <span className="font-medium">{item.label}</span>
                      {expandedCategory === 'tools' ? (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                    
                    {/* Submenu */}
                    {expandedCategory === 'tools' && (
                      <ul className="ms-4 mt-1 border-s-2 border-[hsl(var(--color-border))]">
                        <li>
                          <Link
                            href={item.href}
                            className="block px-4 py-2 text-sm text-[hsl(var(--color-foreground))] hover:text-[hsl(var(--color-primary))] hover:bg-[hsl(var(--color-muted))] rounded-[var(--radius-md)] transition-colors"
                            onClick={handleLinkClick}
                          >
                            {tCommon('navigation.tools')}
                          </Link>
                        </li>
                        {categories.map((category) => (
                          <li key={category.id}>
                            <Link
                              href={category.href}
                              className="block px-4 py-2 text-sm text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-primary))] hover:bg-[hsl(var(--color-muted))] rounded-[var(--radius-md)] transition-colors"
                              onClick={handleLinkClick}
                            >
                              {t(category.labelKey)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className="block px-4 py-3 font-medium text-[hsl(var(--color-foreground))] hover:bg-[hsl(var(--color-muted))] rounded-[var(--radius-md)] transition-colors"
                    onClick={handleLinkClick}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default MobileMenu;
