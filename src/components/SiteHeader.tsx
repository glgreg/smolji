"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, ArrowRight } from 'lucide-react';
import { SmoljiMark } from './SmoljiMark';
import { SiteThemeToggle } from './SiteThemeToggle';

/**
 * Single-tree responsive site navigation header following the popover-to-inline pattern
 * and content-first auto-hide scrolling behavior.
 */
export function SiteHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navId = useId();
  const menuId = `site-menu-${navId.replace(/:/g, '')}`;
  const [fallbackOpen, setFallbackOpen] = useState(false);

  useEffect(() => {
    const header = headerRef.current;
    const inner = innerRef.current;
    const menu = menuRef.current;
    if (!header || !inner || !menu) return;

    const hasNativePopover =
      typeof HTMLElement !== 'undefined' && Object.hasOwn(HTMLElement.prototype, 'popover');

    let lastHeaderWidth = header.getBoundingClientRect().width;
    let frameId: number | null = null;

    const syncNavLayout = () => {
      let wasOpen = false;
      if (hasNativePopover) {
        try {
          wasOpen = menu.matches(':popover-open');
        } catch {
          wasOpen = false;
        }
      }

      header.classList.add('is-measuring', 'is-wide');
      menu.removeAttribute('popover');

      const fits = inner.scrollWidth <= inner.clientWidth;

      if (fits) {
        header.classList.add('is-wide');
        menu.removeAttribute('popover');
        setFallbackOpen(false);
      } else {
        header.classList.remove('is-wide');
        if (hasNativePopover) {
          menu.setAttribute('popover', 'auto');
          if (wasOpen && typeof menu.showPopover === 'function') {
            try {
              menu.showPopover();
            } catch {
              // ignore if hidden or detached
            }
          }
        }
      }

      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        header.classList.remove('is-measuring');
      });
    };

    syncNavLayout();

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            const currentWidth = header.getBoundingClientRect().width;
            const currentlyWide = header.classList.contains('is-wide');
            if (currentlyWide || currentWidth > lastHeaderWidth) {
              syncNavLayout();
            }
            lastHeaderWidth = currentWidth;
          })
        : null;

    observer?.observe(header);
    observer?.observe(menu);

    const handleToggle = () => {
      if (!menuButtonRef.current || !hasNativePopover) return;
      try {
        const isOpen = menu.matches(':popover-open');
        menuButtonRef.current.setAttribute('aria-expanded', String(isOpen));
      } catch {
        // ignore unsupported pseudo-class
      }
    };

    menu.addEventListener('toggle', handleToggle);

    let scrollCleanup: (() => void) | undefined;
    if (
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      !CSS.supports('container-type', 'scroll-state')
    ) {
      let lastY = window.scrollY;
      const onScroll = () => {
        const maxScroll = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight
        );
        const y = Math.max(0, Math.min(window.scrollY, maxScroll));
        if (y === lastY) return;
        header.classList.toggle('is-hidden', y > lastY && y > header.offsetHeight);
        lastY = y;
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      scrollCleanup = () => window.removeEventListener('scroll', onScroll);
    }

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      observer?.disconnect();
      menu.removeEventListener('toggle', handleToggle);
      scrollCleanup?.();
    };
  }, []);

  const handleNavLinkClick = () => {
    const menu = menuRef.current;
    setFallbackOpen(false);
    if (menu && typeof menu.hidePopover === 'function') {
      try {
        if (menu.matches(':popover-open')) {
          menu.hidePopover();
        }
      } catch {
        // ignore
      }
    }
  };

  const handleMenuButtonClick = () => {
    if (typeof HTMLElement !== 'undefined' && !Object.hasOwn(HTMLElement.prototype, 'popover')) {
      setFallbackOpen((prev) => !prev);
    }
  };

  return (
    <header
      ref={headerRef}
      className="site-header top-bar sticky top-0 z-40 border-b border-[#C7BEB1] dark:border-[#3A352F] bg-[#F6F2EA]/95 dark:bg-[#161513]/95 backdrop-blur-sm"
    >
      <div
        ref={innerRef}
        className="header-inner mx-auto max-w-6xl px-4 sm:px-6 min-h-16 flex items-center justify-between gap-3"
      >
        <Link
          href="/"
          aria-current="page"
          className="inline-flex items-center gap-2.5 rounded-xl px-1.5 py-1 text-[#1B1917] dark:text-[#F4EFE6] hover:opacity-90 transition-opacity"
        >
          <SmoljiMark className="w-8 h-8 shrink-0" decorative />
          <span className="font-display text-lg font-extrabold tracking-tight leading-none">
            Smolji
          </span>
        </Link>

        <nav aria-label="Primary" className="flex items-center">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={handleMenuButtonClick}
            popoverTarget={menuId}
            popoverTargetAction="toggle"
            aria-controls={menuId}
            aria-expanded={fallbackOpen}
            className="menu-button inline-flex items-center gap-1.5 min-h-9 px-3 py-1.5 rounded-xl border border-[#8F8578] dark:border-[#756C61] bg-[#FDFBF7] dark:bg-[#1F1D1A] text-xs font-semibold text-[#1B1917] dark:text-[#F4EFE6] cursor-pointer"
          >
            <Menu className="w-4 h-4 text-[#5B534B] dark:text-[#B8AFA4]" aria-hidden="true" />
            <span>Menu</span>
          </button>

          <ul
            ref={menuRef}
            id={menuId}
            popover="auto"
            className={`site-menu rounded-2xl border border-[#8F8578] dark:border-[#756C61] bg-[#FDFBF7] dark:bg-[#1F1D1A] p-2 shadow-xl text-sm font-medium text-[#5B534B] dark:text-[#B8AFA4] ${
              fallbackOpen ? 'is-fallback-open' : ''
            }`}
          >
            <li>
              <a
                href="#styles"
                onClick={handleNavLinkClick}
                className="flex items-center min-h-9 px-3 py-1.5 rounded-lg hover:bg-[#EDE7DC] dark:hover:bg-[#292622] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] transition-colors"
              >
                Styles
              </a>
            </li>
            <li>
              <a
                href="#workflow"
                onClick={handleNavLinkClick}
                className="flex items-center min-h-9 px-3 py-1.5 rounded-lg hover:bg-[#EDE7DC] dark:hover:bg-[#292622] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] transition-colors"
              >
                Workflow
              </a>
            </li>
            <li>
              <a
                href="#faq"
                onClick={handleNavLinkClick}
                className="flex items-center min-h-9 px-3 py-1.5 rounded-lg hover:bg-[#EDE7DC] dark:hover:bg-[#292622] hover:text-[#1B1917] dark:hover:text-[#F4EFE6] transition-colors"
              >
                FAQ
              </a>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <SiteThemeToggle />
          <Link
            href="/playground"
            className="inline-flex items-center gap-1.5 min-h-9 px-3.5 sm:px-4 py-2 rounded-xl bg-[#C23E1A] hover:bg-[#A83314] text-white text-xs sm:text-sm font-bold shadow-sm transition-colors"
          >
            <span>Open Playground</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
