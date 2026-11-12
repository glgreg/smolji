import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RootLayout, { metadata } from '../src/app/layout';
import Page from '../src/app/page';

vi.mock('next/dynamic', () => ({
  default: () => {
    const MockDynamicApp = () => <div data-testid="dynamic-studio-app">Smolji Studio Mounted</div>;
    return MockDynamicApp;
  },
}));

describe('App Shell (layout.tsx & page.tsx)', () => {
  it('exports SEO metadata for Smolji', () => {
    expect(metadata.title).toContain('Smolji');
    expect(metadata.description).toContain('PNG stickers');
  });

  it('renders RootLayout with children', () => {
    const layoutElement = RootLayout({
      children: <main data-testid="child-node">Studio Child</main>,
    });
    expect(layoutElement.type).toBe('html');
    expect(layoutElement.props.lang).toBe('en');
  });

  it('renders Page with the client-side dynamic App component', () => {
    render(<Page />);
    expect(screen.getByTestId('dynamic-studio-app')).toBeTruthy();
  });
});
