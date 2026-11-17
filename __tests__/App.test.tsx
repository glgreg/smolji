import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { GifWriter } from 'omggif';
import App from '../src/App';

function buildMultiFrameGifBuffer(): ArrayBuffer {
  const buf = new Uint8Array(4096);
  const writer = new GifWriter(buf, 4, 4, { loop: 0 });
  writer.addFrame(0, 0, 4, 4, new Array<number>(16).fill(0), {
    palette: [0xc23e1a, 0x000000],
    delay: 6,
    disposal: 2,
  });
  writer.addFrame(0, 0, 4, 4, new Array<number>(16).fill(0), {
    palette: [0x10b981, 0x000000],
    delay: 8,
    disposal: 2,
  });
  const len = writer.end();
  return buf.slice(0, len).buffer;
}

function createMock2DContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    clip: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    putImageData: vi.fn(),
    getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4).fill(200),
      width: w,
      height: h,
    })),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    textAlign: 'center',
    textBaseline: 'middle',
    font: '',
  };
}

describe('Project Styling & Assets Configuration', () => {
  it('should configure @tailwindcss/postcss in postcss.config.mjs', () => {
    const postcssPath = path.resolve(process.cwd(), 'postcss.config.mjs');
    expect(fs.existsSync(postcssPath)).toBe(true);
    const content = fs.readFileSync(postcssPath, 'utf8');
    expect(content).toContain('@tailwindcss/postcss');
  });

  it('should import tailwindcss and configure class-based dark variant and custom controls in globals.css', () => {
    const globalsPath = path.resolve(process.cwd(), 'src/app/globals.css');
    const content = fs.readFileSync(globalsPath, 'utf8');
    expect(content).toContain('@import "tailwindcss";');
    expect(content).toContain('@custom-variant dark');
    expect(content).toContain('.studio-range');
    expect(content).toContain('::-webkit-scrollbar');
  });

  it('should include public/logo.jpg asset referenced by the header', () => {
    const logoPath = path.resolve(process.cwd(), 'public/logo.jpg');
    expect(fs.existsSync(logoPath)).toBe(true);
  });
});

describe('App Component (Smolji Studio)', () => {
  let mockCtx: ReturnType<typeof createMock2DContext>;

  beforeEach(() => {
    localStorage.clear();
    mockCtx = createMock2DContext();

    if (typeof globalThis.ImageData === 'undefined') {
      class MockImageData {
        data: Uint8ClampedArray;
        width: number;
        height: number;
        constructor(data: Uint8ClampedArray, width: number, height: number) {
          this.data = data;
          this.width = width;
          this.height = height;
        }
      }
      vi.stubGlobal('ImageData', MockImageData);
    }

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((contextId: string) => {
      if (contextId === '2d') {
        return mockCtx as unknown as CanvasRenderingContext2D;
      }
      return null;
    }) as any);

    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,iVBORw0KGgo=');
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback: BlobCallback) => {
      callback(new Blob(['png-binary'], { type: 'image/png' }));
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 1200,
      bottom: 800,
      width: 1200,
      height: 800,
      toJSON: () => ({}),
    });

    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'blob:http://localhost/mock-object-url'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(),
    });

    Object.defineProperty(globalThis, 'ClipboardItem', {
      writable: true,
      value: class MockClipboardItem {
        data: Record<string, Blob>;
        constructor(data: Record<string, Blob>) {
          this.data = data;
        }
      },
    });

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: {
        write: vi.fn().mockResolvedValue(undefined),
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    class ImmediateImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      crossOrigin = '';
      naturalWidth = 320;
      naturalHeight = 160;
      width = 320;
      height = 160;
      private _src = '';
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          if (val.includes('fail')) {
            this.onerror?.();
          } else {
            if (val.startsWith('data:image/svg+xml')) {
              this.naturalWidth = 0;
              this.naturalHeight = 0;
              this.width = 0;
              this.height = 0;
            } else {
              this.naturalWidth = 320;
              this.naturalHeight = 160;
              this.width = 320;
              this.height = 160;
            }
            this.onload?.();
          }
        }, 0);
      }
      get src() {
        return this._src;
      }
    }
    vi.stubGlobal('Image', ImmediateImage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders initial studio layout, restores localStorage state, and toggles theme and sidebars', () => {
    localStorage.setItem('smolji_theme', 'light');
    localStorage.setItem('emoji_studio_keys', JSON.stringify({ imgbb: 'saved-bb', imgur: 'saved-imgur' }));
    localStorage.setItem(
      'emoji_studio_history',
      JSON.stringify([{ id: '1', emoji: '🚀', style: 'apple', date: '10:00', host: 'ImgBB', url: 'https://ibb.co/1' }])
    );

    render(<App />);
    expect(screen.getByText(/Smolji/i)).toBeTruthy();
    expect(screen.queryByText(/mojisnap/i)).toBeNull();
    expect(document.querySelectorAll('select')).toHaveLength(0);
    expect(document.documentElement.classList.contains('light')).toBe(true);

    // Toggle theme to dark
    const themeBtn = screen.getByTitle('Toggle theme');
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('smolji_theme')).toBe('dark');

    // Toggle left & right panels
    fireEvent.click(screen.getByTitle('Toggle Asset Library Panel'));
    fireEvent.click(screen.getByTitle('Toggle Layer Properties Panel'));

    // Zoom controls
    const zoomControls = within(screen.getByTitle('Zoom In').parentElement as HTMLElement);
    expect(zoomControls.getByText('85%')).toBeTruthy();
    fireEvent.click(screen.getByTitle('Zoom In'));
    expect(zoomControls.getByText('100%')).toBeTruthy();
    fireEvent.click(screen.getByTitle('Zoom Out'));
    expect(zoomControls.getByText('85%')).toBeTruthy();
    fireEvent.click(screen.getByTitle('Recenter view'));
    expect(zoomControls.getByText('85%')).toBeTruthy();
  });

  it('handles malformed JSON in localStorage gracefully without throwing', () => {
    localStorage.setItem('emoji_studio_keys', '{invalid-json');
    localStorage.setItem('emoji_studio_history', '{invalid-json');
    const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<App />);
    expect(screen.getByText(/Smolji/i)).toBeTruthy();
    expect(spyError).toHaveBeenCalled();
  });

  it('supports shortcode replacement, autocomplete suggestions, and adding layers', () => {
    render(<App />);
    const textarea = screen.getByPlaceholderText(/Search emoji by shortcode/i) as HTMLTextAreaElement;

    // Type partial shortcode to trigger suggestions
    textarea.setSelectionRange(0, 0);
    fireEvent.change(textarea, {
      target: { value: ':rock', selectionEnd: 5 },
    });

    const suggestionBtn = screen.getByText(/:rocket:/i);
    expect(suggestionBtn).toBeTruthy();
    fireEvent.click(suggestionBtn);

    expect(screen.getByText('Layer added to workspace.')).toBeTruthy();
    expect(screen.getByText('Layer 2')).toBeTruthy();

    // Auto-replace full shortcode :fire:
    fireEvent.change(textarea, {
      target: { value: ':fire:', selectionEnd: 6 },
    });
    expect(textarea.value).toBe('🔥');
  });

  it('manages layer hierarchy, transformations, style variations, and prevents deleting last layer', () => {
    render(<App />);

    // Trying to delete the only layer should show guard toast
    fireEvent.click(screen.getByTitle('Delete Layer'));
    expect(screen.getByText('At least one layer must remain in workspace!')).toBeTruthy();

    // Spawn a second layer using Style Variations Explorer '+' button
    const spawnButtons = screen.getAllByTitle('Spawn new Layer in this style');
    fireEvent.click(spawnButtons[0]);
    expect(screen.getByText('Layer 2')).toBeTruthy();

    // Reorder layers with Move Down / Move Up
    const moveDownButtons = screen.getAllByTitle('Move Down');
    fireEvent.click(moveDownButtons[1]);
    const moveUpButtons = screen.getAllByTitle('Move Up');
    fireEvent.click(moveUpButtons[0]);

    // Update layer style via custom StudioSelect dropdown
    const styleSelect = screen.getByRole('combobox', { name: 'Visual Style' });
    fireEvent.click(styleSelect);
    const styleListbox = screen.getByRole('listbox');
    fireEvent.click(within(styleListbox).getByRole('option', { name: /^Google Noto/i }));
    expect(styleSelect.textContent).toContain('Google Noto');

    // Update layer sliders (Scale, Rotation, Skew X, Skew Y, Opacity)
    const ranges = document.querySelectorAll('input[type="range"]');
    // Order in activeLayer panel: Scale(0), Rotation(1), SkewX(2), SkewY(3), Opacity(4), Corners(5)
    fireEvent.change(ranges[0], { target: { value: '1.5' } });
    fireEvent.change(ranges[1], { target: { value: '45' } });
    fireEvent.change(ranges[2], { target: { value: '15' } });
    fireEvent.change(ranges[3], { target: { value: '-10' } });
    fireEvent.change(ranges[4], { target: { value: '0.75' } });

    expect(screen.getByText('150%')).toBeTruthy();
    expect(screen.getByText('45°')).toBeTruthy();
    expect(screen.getByText('15°')).toBeTruthy();
    expect(screen.getByText('-10°')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();

    // Delete second layer
    const deleteButtons = screen.getAllByTitle('Delete Layer');
    fireEvent.click(deleteButtons[1]);
    expect(screen.getByText('Layer deleted.')).toBeTruthy();
  });

  it('handles keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+D, Arrows, Delete, Space)', () => {
    render(<App />);

    // Copy and Paste layer via keyboard
    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
    expect(screen.getByText('Copied layer settings!')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'v', ctrlKey: true });
    expect(screen.getByText('Layer pasted.')).toBeTruthy();
    expect(screen.getByText('Layer 2')).toBeTruthy();

    // Duplicate layer via Ctrl+D
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });
    expect(screen.getByText('Layer duplicated.')).toBeTruthy();
    expect(screen.getByText('Layer 3')).toBeTruthy();

    // Nudge with arrow keys
    fireEvent.keyDown(window, { key: 'ArrowUp', shiftKey: true });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    // Delete active layer via Delete key
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(screen.getByText('Layer deleted.')).toBeTruthy();

    // Spacebar pan toggle
    fireEvent.keyDown(window, { code: 'Space' });
    fireEvent.keyUp(window, { code: 'Space' });
  });

  it('handles canvas mouse, wheel, touch, and context menu interactions', () => {
    render(<App />);
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;

    // Ctrl + Wheel zoom in and out
    fireEvent.wheel(canvas, { deltaY: -100, ctrlKey: true });
    fireEvent.wheel(canvas, { deltaY: 100, ctrlKey: true });

    // Middle-click panning
    fireEvent.mouseDown(canvas, { button: 1, clientX: 500, clientY: 400 });
    fireEvent.mouseMove(canvas, { clientX: 520, clientY: 420 });
    fireEvent.mouseUp(canvas);

    // Click rotation handle of base layer (centered at 600, 400 in 1200x800 viewport; rot handle is at y = 256 - 128 - 28 = 100 in artboard -> cy = 400 + (100 - 256)*0.85 = 267.4)
    fireEvent.mouseDown(canvas, { button: 0, clientX: 600, clientY: 267 });
    fireEvent.mouseMove(canvas, { clientX: 650, clientY: 300 });
    fireEvent.mouseUp(canvas);

    // Click top-left scale handle (artX = 128, artY = 128 -> cx = 600 - 128*0.85 = 491.2, cy = 400 - 128*0.85 = 291.2)
    // First reset layer rotation via recenter or click center to select
    fireEvent.mouseDown(canvas, { button: 0, clientX: 600, clientY: 400 });
    fireEvent.mouseUp(canvas);

    // Right-click on center of canvas (hits base layer) -> Context Menu
    fireEvent.contextMenu(canvas, { clientX: 600, clientY: 400 });
    expect(screen.getByText('Duplicate Layer')).toBeTruthy();
    fireEvent.click(screen.getByText('Copy Layer Settings'));

    // Right-click on empty corner (10, 10) -> Empty canvas Context Menu
    fireEvent.contextMenu(canvas, { clientX: 10, clientY: 10 });
    expect(screen.getByText('Paste Layer')).toBeTruthy();
    fireEvent.click(screen.getByText('Paste Layer'));
    expect(screen.getByText('Layer 2')).toBeTruthy();

    // Right-click on center again to test Bring Forward / Send Backward / Duplicate / Delete from context menu
    fireEvent.contextMenu(canvas, { clientX: 600, clientY: 400 });
    fireEvent.click(screen.getByText('Send Backward'));

    fireEvent.contextMenu(canvas, { clientX: 600, clientY: 400 });
    fireEvent.click(screen.getByText('Bring Forward'));

    fireEvent.contextMenu(canvas, { clientX: 600, clientY: 400 });
    fireEvent.click(screen.getByText('Duplicate Layer'));

    fireEvent.contextMenu(canvas, { clientX: 600, clientY: 400 });
    fireEvent.click(screen.getByText('Delete Layer'));

    // Right-click on empty corner -> Reset Viewport
    fireEvent.contextMenu(canvas, { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByText('Reset Viewport'));

    // Touch gestures (1-finger and 2-finger pinch)
    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 600, clientY: 400 }],
    });
    fireEvent.touchStart(canvas, {
      touches: [
        { clientX: 550, clientY: 400 },
        { clientX: 650, clientY: 400 },
      ],
    });
    fireEvent.touchMove(canvas, {
      touches: [
        { clientX: 500, clientY: 400 },
        { clientX: 700, clientY: 400 },
      ],
    });
    fireEvent.touchEnd(canvas);

    // Click empty space to deselect layer, then 2-finger pinch zooms viewport
    fireEvent.mouseDown(canvas, { button: 0, clientX: 10, clientY: 10 });
    expect(screen.getByText(/No layer selected/i)).toBeTruthy();
    fireEvent.touchStart(canvas, {
      touches: [
        { clientX: 550, clientY: 400 },
        { clientX: 650, clientY: 400 },
      ],
    });
    fireEvent.touchMove(canvas, {
      touches: [
        { clientX: 500, clientY: 400 },
        { clientX: 700, clientY: 400 },
      ],
    });
    fireEvent.touchEnd(canvas);
  });

  it('customizes artboard background modes, corner radius, and export size', () => {
    render(<App />);

    // Switch to Invisible (transparent) background
    fireEvent.click(screen.getByText('Invisible'));

    // Switch to Solid background and update custom StudioColorPicker
    fireEvent.click(screen.getByText('Solid'));
    expect(screen.getByRole('button', { name: 'Open color picker' })).toBeTruthy();
    const hexInput = screen.getByLabelText('Hex color code') as HTMLInputElement;
    fireEvent.change(hexInput, { target: { value: '#ff0055' } });
    expect(hexInput.value.toLowerCase()).toBe('#ff0055');
    fireEvent.click(screen.getByRole('button', { name: 'Select color #10b981' }));
    expect(hexInput.value.toLowerCase()).toBe('#10b981');

    // Switch back to Gradient and pick Warm Sunset preset
    fireEvent.click(screen.getByText('Gradient'));
    fireEvent.click(screen.getByTitle('Warm Sunset'));

    // Change export size via custom segmented pills
    fireEvent.click(screen.getByRole('button', { name: '1024px' }));
    mockCtx.roundRect.mockClear();
    fireEvent.click(screen.getByTitle('Download PNG sticker file'));
    expect(mockCtx.roundRect).toHaveBeenCalledWith(0, 0, 1024, 1024, expect.any(Number));
  });

  it('exports PNG, copies to clipboard, downloads ZIP pack, and uploads to ImgBB and Imgur', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('imgbb')) {
        return {
          ok: true,
          json: async () => ({ success: true, data: { url: 'https://i.ibb.co/mock/sticker.png' } }),
        };
      }
      return {
        ok: true,
        json: async () => ({ success: true, data: { link: 'https://i.imgur.com/mock.png' } }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    // 1. Download PNG
    fireEvent.click(screen.getByTitle('Download PNG sticker file'));
    expect(screen.getByText('PNG saved!')).toBeTruthy();

    // 2. Copy PNG to clipboard
    fireEvent.click(screen.getByTitle('Copy PNG sticker image to clipboard'));
    await waitFor(() => {
      expect(screen.getByText('Copied sticker to clipboard!')).toBeTruthy();
    });

    // 3. Download ZIP pack
    fireEvent.click(screen.getByText('Download all Styles ZIP'));
    await waitFor(() => {
      expect(screen.getByText('ZIP folder downloaded!')).toBeTruthy();
    });

    // 4. Attempting upload without API key opens Settings modal
    fireEvent.click(screen.getByText('Link via ImgBB'));
    expect(screen.getByText('Please configure ImgBB settings first.')).toBeTruthy();
    expect(screen.getByText('API Settings')).toBeTruthy();

    // Fill in API keys in Settings modal, toggle visibility, and save
    const imgbbInput = document.getElementById('settings-imgbb-key') as HTMLInputElement;
    const imgurInput = document.getElementById('settings-imgur-id') as HTMLInputElement;
    expect(imgbbInput.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Show ImgBB API Key' }));
    expect(imgbbInput.type).toBe('text');
    fireEvent.change(imgbbInput, { target: { value: 'my-imgbb-key' } });
    fireEvent.change(imgurInput, { target: { value: 'my-imgur-id' } });
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByText('API Keys saved successfully!')).toBeTruthy();

    // 5. Upload via ImgBB and verify pure base64 payload (no data: prefix)
    fireEvent.click(screen.getByText('Link via ImgBB'));
    await waitFor(() => {
      expect(screen.getByDisplayValue('https://i.ibb.co/mock/sticker.png')).toBeTruthy();
    });
    const imgbbCall = fetchMock.mock.calls.find(([url]) => String(url).includes('imgbb'));
    expect(imgbbCall).toBeTruthy();
    const imgbbForm = imgbbCall?.[1]?.body as FormData;
    expect(imgbbForm.get('image')).toBe(Buffer.from('png-binary').toString('base64'));

    // 6. Upload via Imgur and verify pure base64 payload
    fireEvent.click(screen.getByText('Link via Imgur'));
    await waitFor(() => {
      expect(screen.getByDisplayValue('https://i.imgur.com/mock.png')).toBeTruthy();
    });
    const imgurCall = fetchMock.mock.calls.find(([url]) => String(url).includes('imgur'));
    expect(imgurCall).toBeTruthy();
    expect(JSON.parse(String(imgurCall?.[1]?.body))).toEqual({
      image: Buffer.from('png-binary').toString('base64'),
      type: 'base64',
    });

    // 7. Failed upload resets uploading button state and shows error toast
    const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: { message: 'Invalid base64 string.' } }),
    });
    fireEvent.click(screen.getByText('Link via ImgBB'));
    await waitFor(() => {
      expect(screen.getByText('Invalid base64 string.')).toBeTruthy();
    });
    expect(screen.getByText('Link via ImgBB')).toBeTruthy();
    expect(spyError).toHaveBeenCalled();
  });

  it('supports layer visibility toggling, catalog category & keyword filtering, and overview link', () => {
    render(<App />);

    // Brand link back to landing page
    const overviewLink = screen.getByTitle('Back to Smolji overview');
    expect(overviewLink.getAttribute('href')).toBe('/');

    // Toggle layer visibility on and off
    const hideBtn = screen.getByRole('button', { name: 'Hide Layer 1' });
    fireEvent.click(hideBtn);
    expect(screen.getByText('Hidden')).toBeTruthy();
    const showBtn = screen.getByRole('button', { name: 'Show Layer 1' });
    fireEvent.click(showBtn);
    expect(screen.queryByText('Hidden')).toBeNull();

    // Filter quick emoji library by category pill
    fireEvent.click(screen.getByRole('button', { name: 'Hands' }));
    expect(screen.getByTitle('Add 👍 layer')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    // Filter quick emoji library by keyword input
    const searchInput = screen.getByPlaceholderText(/Filter by keyword/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'rocket' } });
    expect(screen.getAllByTitle('Add 🚀 layer').length).toBeGreaterThanOrEqual(1);

    fireEvent.change(searchInput, { target: { value: 'zzznomatch999' } });
    expect(screen.getByText('No matching emojis found.')).toBeTruthy();
  });

  it('supports 64px and 2048px export resolutions cleanly', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '64px' }));
    mockCtx.roundRect.mockClear();
    fireEvent.click(screen.getByTitle('Download PNG sticker file'));
    expect(mockCtx.roundRect).toHaveBeenCalledWith(0, 0, 64, 64, expect.any(Number));

    fireEvent.click(screen.getByRole('button', { name: '2048px' }));
    mockCtx.roundRect.mockClear();
    fireEvent.click(screen.getByTitle('Download PNG sticker file'));
    expect(mockCtx.roundRect).toHaveBeenCalledWith(0, 0, 2048, 2048, expect.any(Number));
  });

  it('imports external and clipboard images (upload, drag-drop, Ctrl+V, Paste Image, Replace Image) with full operation parity', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
      })
    );

    render(<App />);

    // 1. File upload input adds image layer and exposes Image Source metadata without Style Variations
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const uploadInput = screen.getByLabelText('Upload external image files') as HTMLInputElement;
    const pngFile = new File([pngBytes], 'hero-logo.png', { type: 'image/png' });
    fireEvent.change(uploadInput, { target: { files: [pngFile] } });

    await waitFor(() => {
      expect(screen.getByText('Added image "hero-logo.png".')).toBeTruthy();
    });
    expect(screen.getByText('Image Source')).toBeTruthy();
    expect(screen.getByText('320×160px')).toBeTruthy();
    expect(screen.queryByText('Style Variations Explorer')).toBeNull();

    // 2. Full operation parity on the custom image layer (flip, duplicate, sliders, reorder, visibility)
    fireEvent.click(screen.getByTitle('Flip Horizontal'));
    fireEvent.click(screen.getByTitle('Flip Vertical'));
    fireEvent.click(screen.getByTitle('Duplicate active layer'));
    expect(screen.getByText('Layer duplicated.')).toBeTruthy();

    const ranges = document.querySelectorAll('input[type="range"]');
    fireEvent.change(ranges[0], { target: { value: '1.25' } });
    fireEvent.change(ranges[1], { target: { value: '30' } });
    expect(screen.getByText('125%')).toBeTruthy();
    expect(screen.getByText('30°')).toBeTruthy();

    // 3. Replace active image layer with SVG file (viewBox fallback 640x320)
    const replaceInput = screen.getByLabelText('Replace layer image file') as HTMLInputElement;
    const svgFile = new File(['<svg viewBox="0 0 640 320"></svg>'], 'badge.svg', { type: 'image/svg+xml' });
    fireEvent.change(replaceInput, { target: { files: [svgFile] } });
    await waitFor(() => {
      expect(screen.getByText('Replaced image with badge.svg.')).toBeTruthy();
    });
    expect(screen.getByText('640×320px')).toBeTruthy();

    // 4. Drag & Drop onto studio stage
    const stageRoot = document.querySelector('#studio-stage-canvas')?.parentElement as HTMLElement;
    fireEvent.dragOver(stageRoot, { dataTransfer: { types: ['Files'] } });
    expect(screen.getByText('Drop images to add layers')).toBeTruthy();
    const droppedWebp = new File([new TextEncoder().encode('RIFF\x00\x00\x00\x00WEBP')], 'sticker.webp', {
      type: 'image/webp',
    });
    fireEvent.drop(stageRoot, { dataTransfer: { files: [droppedWebp] } });
    await waitFor(() => {
      expect(screen.getByText('Added image "sticker.webp".')).toBeTruthy();
    });

    // 5. Global paste event with raw file AND data:image Data URL string
    const pastedPng = new File([pngBytes], 'clip-shot.png', { type: 'image/png' });
    const pasteFileEvent = Object.assign(new Event('paste', { bubbles: true, cancelable: true }), {
      clipboardData: {
        items: [{ kind: 'file', getAsFile: () => pastedPng }],
        files: [pastedPng],
        getData: () => '',
      },
    });
    window.dispatchEvent(pasteFileEvent);
    await waitFor(() => {
      expect(screen.getByText('Added image "clip-shot.png".')).toBeTruthy();
    });

    const dataUrlTextEvent = Object.assign(new Event('paste', { bubbles: true, cancelable: true }), {
      clipboardData: {
        items: [],
        files: [],
        getData: (type: string) =>
          type === 'text/plain' ? `data:image/png;base64,${Buffer.from(pngBytes).toString('base64')}` : '',
      },
    });
    window.dispatchEvent(dataUrlTextEvent);
    await waitFor(() => {
      expect(screen.getByText('Added image "pasted-image.png".')).toBeTruthy();
    });

    // 6. Async clipboard.read() via "Paste Image" button
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: {
        write: vi.fn().mockResolvedValue(undefined),
        writeText: vi.fn().mockResolvedValue(undefined),
        read: vi.fn().mockResolvedValueOnce([
          {
            types: ['image/png'],
            getType: async () => new Blob([pngBytes], { type: 'image/png' }),
          },
        ]),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Paste Image/i }));
    await waitFor(() => {
      expect(screen.getByText('Added image "clipboard-1.png".')).toBeTruthy();
    });

    // 7. Batch ZIP download preserves mixed custom images + emoji layers cleanly
    fireEvent.click(screen.getByText('Download all Styles ZIP'));
    await waitFor(
      () => {
        expect(screen.getByText('ZIP folder downloaded!')).toBeTruthy();
      },
      { timeout: 4000 }
    );
  });

  it('plays animated emojis live on canvas, handles Play/Pause & tab visibility, and exports animated GIF', async () => {
    const animatedGifBuffer = buildMultiFrameGifBuffer();
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('animated-noto-color-emoji')) {
        return {
          ok: true,
          arrayBuffer: async () => animatedGifBuffer,
        };
      }
      return { ok: false };
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    // Select 64px export size for fast deterministic quantization in jsdom
    fireEvent.click(screen.getByRole('button', { name: '64px' }));

    // Switch base layer to Animated Noto
    const styleSelect = screen.getByRole('combobox', { name: 'Visual Style' });
    fireEvent.click(styleSelect);
    const styleListbox = screen.getByRole('listbox');
    fireEvent.click(within(styleListbox).getByRole('option', { name: /^Animated Noto/i }));

    await waitFor(() => {
      expect(screen.getByText('ANIM')).toBeTruthy();
      expect(fetchMock).toHaveBeenCalled();
    });

    // Toggle Play/Pause button (accessible name stays constant; aria-pressed flips)
    const playToggle = screen.getByRole('button', { name: 'Play canvas animation' });
    expect(playToggle.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(playToggle);
    expect(playToggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(playToggle);
    expect(playToggle.getAttribute('aria-pressed')).toBe('true');

    // Pause cleanly on visibilitychange / contentvisibilityautostatechange
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    const canvas = document.getElementById('studio-stage-canvas') as HTMLCanvasElement;
    canvas.dispatchEvent(Object.assign(new Event('contentvisibilityautostatechange'), { skipped: true }));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));

    // Export composed animation as .gif
    fireEvent.click(screen.getByRole('button', { name: /Save GIF sticker/i }));
    await waitFor(() => {
      expect(screen.getByText('GIF saved!')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Save GIF sticker/i }).getAttribute('aria-disabled')).toBeNull();
    });

    const createUrlMock = URL.createObjectURL as unknown as ReturnType<typeof vi.fn>;
    const gifBlobCall = createUrlMock.mock.calls.find(
      ([arg]) => arg instanceof Blob && arg.type === 'image/gif'
    );
    expect(gifBlobCall).toBeTruthy();
  });
});


