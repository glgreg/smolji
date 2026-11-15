import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RootLayout, { metadata } from '../src/app/layout';
import LandingPage from '../src/app/page';
import PlaygroundPage, { metadata as playgroundMetadata } from '../src/app/playground/page';
import {
  resolveTheme,
  toggleThemePreference,
  THEME_STORAGE_KEY,
} from '../src/utils/theme';

vi.mock('next/font/google', () => ({
  Bricolage_Grotesque: () => ({ variable: '--font-display' }),
  Plus_Jakarta_Sans: () => ({ variable: '--font-sans' }),
  JetBrains_Mono: () => ({ variable: '--font-mono' }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/dynamic', () => ({
  default: () => {
    const MockDynamicApp = () => <div data-testid="dynamic-studio-app">Smolji Studio Mounted</div>;
    return MockDynamicApp;
  },
}));

describe('App Shell (layout.tsx, Landing Page /, & Playground /playground)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
  });

  it('exports SEO metadata for root and playground routes', () => {
    expect(metadata.title).toContain('Smolji');
    expect(metadata.description).toContain('PNG stickers');
    expect(playgroundMetadata.title).toBe('Playground | Smolji');
    expect(playgroundMetadata.description).toContain('no login required');
  });

  it('renders RootLayout with color-scheme meta and theme init script', () => {
    const layoutElement = RootLayout({
      children: <main data-testid="child-node">Studio Child</main>,
    });
    expect(layoutElement.type).toBe('html');
    expect(layoutElement.props.lang).toBe('en');
  });

  it('renders the Landing Page at / with direct CTAs to /playground, specimen bench, styles, and FAQ', () => {
    render(<LandingPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Layer emojis into sharp PNG stickers/i })
    ).toBeTruthy();

    const playgroundLinks = screen
      .getAllByRole('link', { name: /Playground/i })
      .filter((el) => el.getAttribute('href') === '/playground');
    expect(playgroundLinks.length).toBeGreaterThanOrEqual(3);

    // Verify specimen proof sheet interactivity
    fireEvent.click(screen.getByRole('button', { name: 'Google Noto' }));
    const proofImage = screen.getByAltText(/rendered in Google Noto sticker style/i);
    expect(proofImage.getAttribute('src')).toContain('style=google');

    fireEvent.click(screen.getByRole('button', { name: 'Circle' }));
    expect(screen.getByRole('button', { name: 'Circle' }).getAttribute('aria-pressed')).toBe('true');

    // Verify 11 styles catalog & non-exclusive FAQ disclosure
    expect(screen.getByText('One character, eleven foundries')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'SerenityOS' })).toBeTruthy();
    const faqSummary = screen.getByText(
      /Do I need an account or login to open the Playground\?/i
    );
    expect(faqSummary).toBeTruthy();
  });

  it('renders PlaygroundPage at /playground with dynamic client Studio App', () => {
    render(<PlaygroundPage />);
    expect(screen.getByTestId('dynamic-studio-app')).toBeTruthy();
  });

  it('resolves and toggles theme cleanly against localStorage overrides', () => {
    expect(resolveTheme()).toBe('light');
    const next = toggleThemePreference('light');
    expect(next).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    const reverted = toggleThemePreference('dark');
    expect(reverted).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
});
