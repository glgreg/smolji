import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GifWriter } from 'omggif';
import {
  isSupportedImageFile,
  readBlobAsDataUrl,
  parseSvgDimensions,
  dataUrlToImageFile,
  loadExternalImageAsset,
  extractImageFilesFromDataTransfer,
  readClipboardImageFiles,
  getLayerDimensions,
  sanitizeExportFileStem,
} from '../src/utils/image';
import type { Layer } from '../src/types';

function makeTwoFrameGifFile(name = 'anim.gif'): File {
  const buf = new Uint8Array(4096);
  const writer = new GifWriter(buf, 4, 2, { loop: 0 });
  writer.addFrame(0, 0, 4, 2, [0, 0, 0, 0, 0, 0, 0, 0], {
    palette: [0xff0000, 0x000000],
    delay: 6,
    disposal: 2,
  });
  writer.addFrame(0, 0, 4, 2, [0, 0, 0, 0, 0, 0, 0, 0], {
    palette: [0x00ff00, 0x000000],
    delay: 8,
    disposal: 2,
  });
  const len = writer.end();
  return new File([buf.slice(0, len)], name, { type: 'image/gif' });
}

describe('External & Clipboard Image Utilities (src/utils/image.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('validates supported image MIME types and filename extensions', () => {
    expect(isSupportedImageFile(new File([''], 'photo.png', { type: 'image/png' }))).toBe(true);
    expect(isSupportedImageFile(new File([''], 'vector.svg', { type: '' }))).toBe(true);
    expect(isSupportedImageFile(new File([''], 'icon.ICO', { type: '' }))).toBe(true);
    expect(isSupportedImageFile(new Blob([''], { type: 'application/octet-stream' }), 'clip.avif')).toBe(true);
    expect(isSupportedImageFile(new File(['hi'], 'notes.txt', { type: 'text/plain' }))).toBe(false);
    expect(isSupportedImageFile(new Blob(['hi'], { type: '' }), 'archive.zip')).toBe(false);
  });

  it('reads Blobs as Data URLs and rejects invalid FileReader output', async () => {
    const dataUrl = await readBlobAsDataUrl(new Blob(['hello'], { type: 'image/png' }));
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);

    class BadFileReader {
      result: string | null = 'not-a-data-url';
      onloadend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.onloadend?.();
      }
    }
    vi.stubGlobal('FileReader', BadFileReader);
    await expect(readBlobAsDataUrl(new Blob(['x']))).rejects.toThrow('Failed to read image file as Data URL.');
  });

  it('parses SVG viewBox and px attributes while ignoring percentage sizing', () => {
    expect(parseSvgDimensions('<svg viewBox="0 0 320 160" width="100%" height="100%"></svg>')).toEqual({
      width: 320,
      height: 160,
    });
    expect(parseSvgDimensions('<svg width="240px" height="120"></svg>')).toEqual({
      width: 240,
      height: 120,
    });
    expect(parseSvgDimensions('<svg width="100%" height="50%"></svg>')).toBeNull();
    expect(parseSvgDimensions('')).toBeNull();
  });

  it('converts valid image Data URLs (base64 & SVG UTF-8) to File instances', () => {
    const pngFile = dataUrlToImageFile(
      `data:image/png;base64,${Buffer.from('png').toString('base64')}`,
      'stamp'
    );
    expect(pngFile).toBeInstanceOf(File);
    expect(pngFile?.name).toBe('stamp.png');
    expect(pngFile?.type).toBe('image/png');

    const svgFile = dataUrlToImageFile('data:image/svg+xml,%3Csvg%20width%3D%2210%22%3E%3C/svg%3E', 'vec.svg');
    expect(svgFile).toBeInstanceOf(File);
    expect(svgFile?.name).toBe('vec.svg');
    expect(svgFile?.type).toBe('image/svg+xml');

    expect(dataUrlToImageFile('https://example.com/a.png')).toBeNull();
    expect(dataUrlToImageFile('data:image/png;base64,!!!')).toBeNull();
  });

  it('loads raster PNG, SVG viewBox fallback, and animated GIF assets accurately', async () => {
    class DimensionImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 0;
      naturalHeight = 0;
      private _src = '';
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          if (val.includes('bad-corrupt')) {
            this.onerror?.();
            return;
          }
          if (val.startsWith('data:image/png')) {
            this.naturalWidth = 400;
            this.naturalHeight = 200;
          } else if (val.startsWith('data:image/gif')) {
            this.naturalWidth = 4;
            this.naturalHeight = 2;
          } else {
            this.naturalWidth = 0;
            this.naturalHeight = 0;
          }
          this.onload?.();
        }, 0);
      }
      get src() {
        return this._src;
      }
    }
    vi.stubGlobal('Image', DimensionImage);

    // 1. Raster PNG (sniffed even with blank MIME)
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const pngAsset = await loadExternalImageAsset(new File([pngHeader], 'banner.png', { type: '' }));
    expect(pngAsset.name).toBe('banner.png');
    expect(pngAsset.mimeType).toBe('image/png');
    expect(pngAsset.naturalWidth).toBe(400);
    expect(pngAsset.naturalHeight).toBe(200);
    expect(pngAsset.isAnimated).toBe(false);

    // 2. SVG fallback dimensions via viewBox
    const svgFile = new File(['<svg viewBox="0 0 800 400"></svg>'], 'shape.svg', { type: 'image/svg+xml' });
    const svgAsset = await loadExternalImageAsset(svgFile);
    expect(svgAsset.mimeType).toBe('image/svg+xml');
    expect(svgAsset.naturalWidth).toBe(800);
    expect(svgAsset.naturalHeight).toBe(400);
    expect(svgAsset.isAnimated).toBe(false);

    // 3. Multi-frame animated GIF
    const gifAsset = await loadExternalImageAsset(makeTwoFrameGifFile('dance.gif'));
    expect(gifAsset.mimeType).toBe('image/gif');
    expect(gifAsset.isAnimated).toBe(true);
    expect(gifAsset.animation?.frames).toHaveLength(2);
    expect(gifAsset.naturalWidth).toBe(4);
    expect(gifAsset.naturalHeight).toBe(2);

    // 4. Unsupported extension throws descriptive error
    await expect(
      loadExternalImageAsset(new File(['text'], 'readme.txt', { type: 'text/plain' }))
    ).rejects.toThrow('Unsupported file format for "readme.txt".');
  });

  it('extracts deduplicated image files from DataTransfer items and files', () => {
    const namedFile = new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' });
    const unnamedBlob = new File([new Uint8Array([4, 5, 6, 7])], '', { type: 'image/webp' });
    const ignoredTxt = new File([new Uint8Array([1, 2])], 'notes.txt', { type: 'text/plain' });

    const dtFromItems = {
      items: [
        { kind: 'string', getAsFile: () => null },
        { kind: 'file', getAsFile: () => namedFile },
        { kind: 'file', getAsFile: () => namedFile }, // duplicate filtered
        { kind: 'file', getAsFile: () => unnamedBlob },
        { kind: 'file', getAsFile: () => ignoredTxt },
      ],
      files: [],
    } as unknown as DataTransfer;

    const extracted = extractImageFilesFromDataTransfer(dtFromItems);
    expect(extracted).toHaveLength(2);
    expect(extracted[0].name).toBe('a.png');
    expect(extracted[1].name).toBe('pasted-image-4.webp');

    const dtFromFiles = {
      items: [],
      files: [namedFile, ignoredTxt],
    } as unknown as DataTransfer;
    const extractedFallback = extractImageFilesFromDataTransfer(dtFromFiles);
    expect(extractedFallback.map((f) => f.name)).toEqual(['a.png']);

    expect(extractImageFilesFromDataTransfer(null)).toEqual([]);
  });

  it('reads image blobs via navigator.clipboard.read and reports unavailable or empty states', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: {},
    });
    await expect(readClipboardImageFiles()).rejects.toThrow(
      'Direct clipboard reading is unavailable in this browser'
    );

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: {
        read: vi.fn().mockResolvedValue([
          {
            types: ['text/plain'],
            getType: async () => new Blob(['hi'], { type: 'text/plain' }),
          },
        ]),
      },
    });
    await expect(readClipboardImageFiles()).rejects.toThrow('No image found on the clipboard.');

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: {
        read: vi.fn().mockResolvedValue([
          {
            types: ['text/html', 'image/png'],
            getType: async () => new Blob(['png-data'], { type: 'image/png' }),
          },
        ]),
      },
    });
    const files = await readClipboardImageFiles();
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('clipboard-1.png');
    expect(files[0].type).toBe('image/png');
  });

  it('computes canonical dimensions preserving aspect ratio and sanitizes filenames', () => {
    expect(getLayerDimensions({ type: 'emoji', scale: 1 })).toEqual({ width: 256, height: 256 });
    expect(getLayerDimensions({ type: 'emoji', scale: 0.5 })).toEqual({ width: 128, height: 128 });
    expect(
      getLayerDimensions({ type: 'image', scale: 1, naturalWidth: 800, naturalHeight: 400 })
    ).toEqual({ width: 256, height: 128 });
    expect(
      getLayerDimensions({ type: 'image', scale: 0.5, naturalWidth: 300, naturalHeight: 600 })
    ).toEqual({ width: 64, height: 128 });

    const emojiLayer = { id: '1', type: 'emoji', emoji: '🚀', style: 'apple', x: 0, y: 0, scale: 1, rotation: 0, skewX: 0, skewY: 0, opacity: 1 } as Layer;
    const imageLayer = { id: '2', type: 'image', imageName: 'My Cool Logo (v2).PNG', x: 0, y: 0, scale: 1, rotation: 0, skewX: 0, skewY: 0, opacity: 1 } as Layer;
    expect(sanitizeExportFileStem(emojiLayer)).toBe('🚀');
    expect(sanitizeExportFileStem(imageLayer)).toBe('my-cool-logo-v2');
    expect(sanitizeExportFileStem(undefined)).toBe('sticker');
  });
});
