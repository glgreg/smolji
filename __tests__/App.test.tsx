import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/App';

function createMock2DContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    transform: vi.fn(),
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

describe('App Component (MojiSnap Studio)', () => {
  let mockCtx: ReturnType<typeof createMock2DContext>;

  beforeEach(() => {
    localStorage.clear();
    mockCtx = createMock2DContext();

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
      private _src = '';
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          if (val.includes('fail')) {
            this.onerror?.();
          } else {
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
    localStorage.setItem('mojisnap_theme', 'light');
    localStorage.setItem('emoji_studio_keys', JSON.stringify({ imgbb: 'saved-bb', imgur: 'saved-imgur' }));
    localStorage.setItem(
      'emoji_studio_history',
      JSON.stringify([{ id: '1', emoji: '🚀', style: 'apple', date: '10:00', host: 'ImgBB', url: 'https://ibb.co/1' }])
    );

    render(<App />);
    expect(screen.getByText(/MojiSnap/i)).toBeTruthy();
    expect(document.documentElement.classList.contains('light')).toBe(true);

    // Toggle theme to dark
    const themeBtn = screen.getByTitle('Toggle theme');
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('mojisnap_theme')).toBe('dark');

    // Toggle left & right panels
    fireEvent.click(screen.getByTitle('Toggle Asset Library Panel'));
    fireEvent.click(screen.getByTitle('Toggle Layer Properties Panel'));

    // Zoom controls
    expect(screen.getByText('85%')).toBeTruthy();
    fireEvent.click(screen.getByTitle('Zoom In'));
    expect(screen.getAllByText('100%').length).toBeGreaterThanOrEqual(3);
    fireEvent.click(screen.getByTitle('Zoom Out'));
    expect(screen.getByText('85%')).toBeTruthy();
    fireEvent.click(screen.getByTitle('Recenter view'));
    expect(screen.getByText('85%')).toBeTruthy();
  });

  it('handles malformed JSON in localStorage gracefully without throwing', () => {
    localStorage.setItem('emoji_studio_keys', '{invalid-json');
    localStorage.setItem('emoji_studio_history', '{invalid-json');
    const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<App />);
    expect(screen.getByText(/MojiSnap/i)).toBeTruthy();
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

    // Update layer style via select dropdown
    const styleSelect = document.getElementById('layer-style') as HTMLSelectElement;
    fireEvent.change(styleSelect, { target: { value: 'google' } });
    expect(styleSelect.value).toBe('google');

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

    // Switch to Solid background and change color picker
    fireEvent.click(screen.getByText('Solid'));
    const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement;
    expect(colorInput).toBeTruthy();
    fireEvent.change(colorInput, { target: { value: '#ff0055' } });
    expect(colorInput.value).toBe('#ff0055');

    // Switch back to Gradient and pick Warm Sunset preset
    fireEvent.click(screen.getByText('Gradient'));
    fireEvent.click(screen.getByTitle('Warm Sunset'));

    // Change export size
    const selects = document.querySelectorAll('select');
    const exportSelect = selects[selects.length - 1] as HTMLSelectElement;
    fireEvent.change(exportSelect, { target: { value: '1024' } });
    expect(exportSelect.value).toBe('1024');
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

    // Fill in API keys in Settings modal and save
    const imgbbInput = document.getElementById('settings-imgbb-key') as HTMLInputElement;
    const imgurInput = document.getElementById('settings-imgur-id') as HTMLInputElement;
    fireEvent.change(imgbbInput, { target: { value: 'my-imgbb-key' } });
    fireEvent.change(imgurInput, { target: { value: 'my-imgur-id' } });
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByText('API Keys saved successfully!')).toBeTruthy();

    // 5. Upload via ImgBB
    fireEvent.click(screen.getByText('Link via ImgBB'));
    await waitFor(() => {
      expect(screen.getByDisplayValue('https://i.ibb.co/mock/sticker.png')).toBeTruthy();
    });

    // 6. Upload via Imgur
    fireEvent.click(screen.getByText('Link via Imgur'));
    await waitFor(() => {
      expect(screen.getByDisplayValue('https://i.imgur.com/mock.png')).toBeTruthy();
    });
  });
});
