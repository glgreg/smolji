import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GifWriter, GifReader } from 'omggif';
import {
  sniffImageMimeType,
  dataUrlToArrayBuffer,
  normalizeFrameDelayMs,
  decodeGifAnimation,
  decodeAnimatedImage,
  getFrameAtTime,
  buildExportFrameDurations,
  quantizeRgbaFrame,
  encodeGifFrames,
  type DecodedAnimationSequence,
  type GifFrameInput,
} from '../src/utils/gif';

function buildTestGifBuffer(options: {
  width: number;
  height: number;
  frames: Array<{
    palette: number[];
    indices: number[];
    delayCs: number;
    disposal?: number;
    transparent?: number | null;
  }>;
  loop?: number | null;
}): ArrayBuffer {
  const { width, height, frames, loop = 0 } = options;
  const buf = new Uint8Array(Math.max(4096, width * height * frames.length * 4));
  const writer = new GifWriter(buf, width, height, {
    loop: frames.length > 1 ? loop : null,
    palette: frames.length === 1 ? frames[0].palette : null,
  });

  for (const frame of frames) {
    writer.addFrame(0, 0, width, height, frame.indices, {
      palette: frames.length > 1 ? frame.palette : null,
      delay: frame.delayCs,
      disposal: frame.disposal ?? 2,
      transparent: frame.transparent ?? null,
    });
  }

  const len = writer.end();
  return buf.slice(0, len).buffer;
}

describe('GIF & Animated Media Utilities (src/utils/gif.ts)', () => {
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

  describe('sniffImageMimeType', () => {
    it('identifies GIF87a, GIF89a, WebP, PNG, JPEG, BMP, ICO, AVIF, and SVG signatures', () => {
      const ascii = (str: string) => new TextEncoder().encode(str);
      expect(sniffImageMimeType(ascii('GIF89a...'))).toBe('image/gif');
      expect(sniffImageMimeType(ascii('GIF87a...'))).toBe('image/gif');
      expect(sniffImageMimeType(ascii('RIFF\x00\x00\x00\x00WEBP'))).toBe('image/webp');
      expect(sniffImageMimeType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
      expect(sniffImageMimeType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
      expect(sniffImageMimeType(new Uint8Array([0x42, 0x4d, 0x10, 0x00]))).toBe('image/bmp');
      expect(sniffImageMimeType(new Uint8Array([0x00, 0x00, 0x01, 0x00]))).toBe('image/x-icon');
      expect(sniffImageMimeType(new Uint8Array([0x00, 0x00, 0x02, 0x00]))).toBe('image/x-icon');
      expect(sniffImageMimeType(ascii('\x00\x00\x00\x1cftypavif'))).toBe('image/avif');
      expect(sniffImageMimeType(ascii('  <svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe('image/svg+xml');
      expect(sniffImageMimeType(ascii('<?xml version="1.0"?><svg></svg>'))).toBe('image/svg+xml');
      expect(sniffImageMimeType(new Uint8Array([1, 2, 3]), 'IMAGE/TIFF')).toBe('image/tiff');
    });
  });

  describe('dataUrlToArrayBuffer', () => {
    it('decodes base64 and URI-encoded Data URLs and returns null for malformed inputs', () => {
      const b64 = Buffer.from('GIF89a').toString('base64');
      const buf = dataUrlToArrayBuffer(`data:image/gif;base64,${b64}`);
      expect(buf).toBeInstanceOf(ArrayBuffer);
      expect(new TextDecoder().decode(buf as ArrayBuffer)).toBe('GIF89a');

      const svgBuf = dataUrlToArrayBuffer('data:image/svg+xml,%3Csvg%3E%3C/svg%3E');
      expect(svgBuf).toBeInstanceOf(ArrayBuffer);
      expect(new TextDecoder().decode(svgBuf as ArrayBuffer)).toBe('<svg></svg>');

      expect(dataUrlToArrayBuffer('https://example.com/a.gif')).toBeNull();
      expect(dataUrlToArrayBuffer('data:image/gif;base64')).toBeNull();
      expect(dataUrlToArrayBuffer('data:image/gif;base64,!!!invalid!!!')).toBeNull();
      expect(dataUrlToArrayBuffer('data:image/svg+xml,%E0%A4%A')).toBeNull();
    });
  });

  describe('normalizeFrameDelayMs', () => {
    it('normalizes zero, negative, non-finite, or sub-20ms delays to 100ms', () => {
      expect(normalizeFrameDelayMs(undefined)).toBe(100);
      expect(normalizeFrameDelayMs(NaN)).toBe(100);
      expect(normalizeFrameDelayMs(0)).toBe(100);
      expect(normalizeFrameDelayMs(-15)).toBe(100);
      expect(normalizeFrameDelayMs(10)).toBe(100);
      expect(normalizeFrameDelayMs(19)).toBe(100);
      expect(normalizeFrameDelayMs(20)).toBe(20);
      expect(normalizeFrameDelayMs(42.7)).toBe(43);
    });
  });

  describe('decodeGifAnimation', () => {
    it('decodes multi-frame GIF disposal modes 0/2/3 into composited frames', () => {
      const putImageCalls: ImageData[] = [];
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((contextId: string) => {
        if (contextId !== '2d') return null;
        return {
          putImageData: (imgData: ImageData) => {
            putImageCalls.push(imgData);
          },
        } as unknown as CanvasRenderingContext2D;
      }) as never);

      // Frame 0: solid red (disposal 1: keep), Frame 1: green with disposal 2 (clear to transparent),
      // Frame 2: blue overlay (disposal 3: save snapshot prior to frame -> checks restore path cleanly)
      const gifBuf = buildTestGifBuffer({
        width: 2,
        height: 2,
        frames: [
          {
            palette: [0xff0000, 0x000000],
            indices: [0, 0, 0, 0],
            delayCs: 6, // 60ms
            disposal: 1,
          },
          {
            palette: [0x00ff00, 0x000000],
            indices: [0, 0, 0, 0],
            delayCs: 8, // 80ms
            disposal: 2,
          },
          {
            palette: [0x0000ff, 0x000000],
            indices: [0, 1, 1, 0],
            delayCs: 10, // 100ms
            disposal: 3,
            transparent: 1,
          },
          {
            palette: [0xffff00, 0x000000],
            indices: [1, 1, 1, 1],
            delayCs: 4, // 40ms
            disposal: 0,
            transparent: 1,
          },
        ],
      });

      const decoded = decodeGifAnimation(gifBuf);
      expect(decoded).not.toBeNull();
      expect(decoded?.kind).toBe('animated');
      expect(decoded?.width).toBe(2);
      expect(decoded?.height).toBe(2);
      expect(decoded?.frames).toHaveLength(4);
      expect(decoded?.totalDurationMs).toBe(280);
      expect(putImageCalls).toHaveLength(4);

      // Frame 0: red opaque
      expect(Array.from(putImageCalls[0].data.slice(0, 4))).toEqual([255, 0, 0, 255]);
      // Frame 1: green opaque
      expect(Array.from(putImageCalls[1].data.slice(0, 4))).toEqual([0, 255, 0, 255]);
      // Frame 2: pixel (1,0) cleared by prevDisposal=2 and transparent in frame 2 -> alpha 0
      expect(Array.from(putImageCalls[2].data.slice(4, 8))).toEqual([0, 0, 0, 0]);
      // Frame 3: prevDisposal=3 restored snapshot before frame 2 (after disposal=2 cleared frame 1), then transparent pixels keep alpha=0
      expect(putImageCalls[3].data[3]).toBe(0);
    });

    it('returns null for single-frame GIFs and invalid binary buffers', () => {
      const singleGif = buildTestGifBuffer({
        width: 2,
        height: 2,
        frames: [{ palette: [0xff0000, 0x000000], indices: [0, 0, 0, 0], delayCs: 10 }],
      });
      expect(decodeGifAnimation(singleGif)).toBeNull();
      expect(decodeGifAnimation(new TextEncoder().encode('not a gif').buffer)).toBeNull();
    });
  });

  describe('decodeAnimatedImage', () => {
    it('uses WebCodecs ImageDecoder for animated WebP/APNG and closes frames & decoder', async () => {
      const drawImage = vi.fn();
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((contextId: string) => {
        if (contextId !== '2d') return null;
        return { drawImage } as unknown as CanvasRenderingContext2D;
      }) as never);

      const closeFrameSpies = [vi.fn(), vi.fn()];
      const closeDecoderSpy = vi.fn();
      class MockImageDecoder {
        tracks = {
          ready: Promise.resolve(),
          selectedTrack: { frameCount: 2 },
        };
        decode = vi.fn(async ({ frameIndex }: { frameIndex: number }) => ({
          image: {
            displayWidth: 32,
            displayHeight: 16,
            duration: frameIndex === 0 ? 50000 : 80000,
            close: closeFrameSpies[frameIndex],
          },
        }));
        close = closeDecoderSpy;
        static isTypeSupported = vi.fn(async (mime: string) => mime === 'image/webp');
      }

      vi.stubGlobal('ImageDecoder', MockImageDecoder);

      const webpBuf = new TextEncoder().encode('RIFF\x00\x00\x00\x00WEBP').buffer;
      const result = await decodeAnimatedImage(webpBuf, 'image/webp');
      expect(result).not.toBeNull();
      expect(result?.frames).toHaveLength(2);
      expect(result?.width).toBe(32);
      expect(result?.height).toBe(16);
      expect(result?.frames[0].delayMs).toBe(50);
      expect(result?.frames[1].delayMs).toBe(80);
      expect(result?.totalDurationMs).toBe(130);
      expect(closeFrameSpies[0]).toHaveBeenCalledTimes(1);
      expect(closeFrameSpies[1]).toHaveBeenCalledTimes(1);
      expect(closeDecoderSpy).toHaveBeenCalledTimes(1);

      // Unsupported MIME or missing ImageDecoder returns null cleanly
      expect(await decodeAnimatedImage(new TextEncoder().encode('unknown').buffer, '')).toBeNull();
      expect(await decodeAnimatedImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer, 'image/jpeg')).toBeNull();
    });

    it('returns null gracefully when ImageDecoder reports <=1 frame or throws', async () => {
      const closeDecoderSpy = vi.fn();
      class SingleTrackImageDecoder {
        tracks = {
          ready: Promise.resolve(),
          selectedTrack: { frameCount: 1 },
        };
        decode = vi.fn();
        close = closeDecoderSpy;
        static isTypeSupported = vi.fn(async () => true);
      }
      vi.stubGlobal('ImageDecoder', SingleTrackImageDecoder);

      const pngBuf = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer;
      expect(await decodeAnimatedImage(pngBuf, 'image/png')).toBeNull();
      expect(closeDecoderSpy).toHaveBeenCalledTimes(1);

      class ThrowingImageDecoder {
        tracks = { ready: Promise.reject(new Error('decode boom')), selectedTrack: null };
        decode = vi.fn();
        close = vi.fn();
        static isTypeSupported = vi.fn(async () => true);
      }
      vi.stubGlobal('ImageDecoder', ThrowingImageDecoder);
      expect(await decodeAnimatedImage(pngBuf, 'image/png')).toBeNull();
    });
  });

  describe('getFrameAtTime & buildExportFrameDurations', () => {
    const makeSequence = (delays: number[]): DecodedAnimationSequence => ({
      kind: 'animated',
      width: 10,
      height: 10,
      totalDurationMs: delays.reduce((a, b) => a + b, 0),
      frames: delays.map((delayMs, i) => ({
        image: { id: i } as unknown as CanvasImageSource,
        delayMs,
        width: 10,
        height: 10,
      })),
    });

    it('resolves frames cyclically across positive and negative wrapped timestamps', () => {
      const seq = makeSequence([50, 100, 50]); // total 200
      expect((getFrameAtTime(seq, 0)?.image as unknown as { id: number }).id).toBe(0);
      expect((getFrameAtTime(seq, 60)?.image as unknown as { id: number }).id).toBe(1);
      expect((getFrameAtTime(seq, 175)?.image as unknown as { id: number }).id).toBe(2);
      expect((getFrameAtTime(seq, 260)?.image as unknown as { id: number }).id).toBe(1);
      expect((getFrameAtTime(seq, -10)?.image as unknown as { id: number }).id).toBe(2);

      const empty = makeSequence([]);
      expect(getFrameAtTime(empty, 0)).toBeNull();

      const single = makeSequence([100]);
      expect((getFrameAtTime(single, 999)?.image as unknown as { id: number }).id).toBe(0);
    });

    it('builds export durations for 0, 1 (including >120 frame downsample), and multiple sequences', () => {
      expect(buildExportFrameDurations([])).toEqual([100]);

      const shortSeq = makeSequence([60, 80, 120]);
      expect(buildExportFrameDurations([shortSeq])).toEqual([60, 80, 120]);

      const longSeq = makeSequence(Array.from({ length: 160 }, () => 50));
      const sampledSingle = buildExportFrameDurations([longSeq]);
      expect(sampledSingle.length).toBeLessThanOrEqual(120);
      expect(sampledSingle.length).toBeGreaterThanOrEqual(2);

      const seqA = makeSequence([60, 60]);
      const seqB = makeSequence(Array.from({ length: 15 }, () => 200));
      const combined = buildExportFrameDurations([seqA, seqB]);
      expect(combined.length).toBeLessThanOrEqual(120);
      expect(combined.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('quantizeRgbaFrame & encodeGifFrames', () => {
    it('quantizes opaque and alpha-transparent images and handles >512x512 striding', () => {
      // 4x2 frame with alpha transparency + distinct colors
      const rgba = new Uint8ClampedArray(4 * 2 * 4);
      const colors = [
        [255, 0, 0, 255],
        [0, 255, 0, 255],
        [0, 0, 255, 255],
        [255, 255, 0, 255],
        [255, 0, 255, 255],
        [0, 255, 255, 255],
        [20, 40, 60, 0], // transparent
        [100, 150, 200, 127], // semi-transparent (<128 -> transparent index 0)
      ];
      colors.forEach(([r, g, b, a], idx) => {
        rgba[idx * 4] = r;
        rgba[idx * 4 + 1] = g;
        rgba[idx * 4 + 2] = b;
        rgba[idx * 4 + 3] = a;
      });

      const q = quantizeRgbaFrame(rgba, 4, 2);
      expect(q.transparentIndex).toBe(0);
      expect(q.indexedPixels[6]).toBe(0);
      expect(q.indexedPixels[7]).toBe(0);
      expect(q.palette.length).toBeGreaterThanOrEqual(8);

      // Opaque strided > 512x512 test
      const bigW = 520;
      const bigH = 520;
      const bigRgba = new Uint8ClampedArray(bigW * bigH * 4);
      for (let i = 0; i < bigW * bigH; i++) {
        bigRgba[i * 4] = (i * 13) & 0xff;
        bigRgba[i * 4 + 1] = (i * 29) & 0xff;
        bigRgba[i * 4 + 2] = (i * 53) & 0xff;
        bigRgba[i * 4 + 3] = 255;
      }
      const qBig = quantizeRgbaFrame(bigRgba, bigW, bigH);
      expect(qBig.transparentIndex).toBeNull();
      expect(qBig.palette.length).toBeLessThanOrEqual(256);
      expect(qBig.indexedPixels).toHaveLength(bigW * bigH);
    });

    it('encodes single-frame and animated multi-frame GIF89a binaries round-tripped by GifReader', async () => {
      await expect(encodeGifFrames([], { width: 10, height: 10 })).rejects.toThrow(
        'Cannot encode GIF without at least one frame.'
      );
      await expect(
        encodeGifFrames([{ data: new Uint8ClampedArray(4), width: 1, height: 1, delayMs: 50 }], {
          width: 0,
          height: 10,
        })
      ).rejects.toThrow('Invalid GIF export dimensions');

      const makeRgbaFrame = (seed: number, w: number, h: number): GifFrameInput => {
        const data = new Uint8ClampedArray(w * h * 4);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const p = (y * w + x) * 4;
            data[p] = ((x + seed) * 23) & 0xff;
            data[p + 1] = ((y + seed) * 37) & 0xff;
            data[p + 2] = ((x + y + seed) * 41) & 0xff;
            data[p + 3] = x === 0 && y === 0 ? 0 : 255;
          }
        }
        return { data, width: w, height: h, delayMs: 60 };
      };

      // Single frame encode (loop: null)
      const singleBytes = await encodeGifFrames([makeRgbaFrame(1, 8, 8)], {
        width: 8,
        height: 8,
        loop: null,
      });
      const singleReader = new GifReader(singleBytes);
      expect(singleReader.width).toBe(8);
      expect(singleReader.height).toBe(8);
      expect(singleReader.numFrames()).toBe(1);

      // Multi-frame animated encode with 8 frames + progress callback
      const progressCalls: Array<[number, number]> = [];
      const animatedFrames = Array.from({ length: 8 }, (_, idx) => makeRgbaFrame(idx * 5, 32, 32));
      const animatedBytes = await encodeGifFrames(animatedFrames, {
        width: 32,
        height: 32,
        loop: 0,
        onProgress: (done, total) => progressCalls.push([done, total]),
      });

      expect(new TextDecoder('ascii').decode(animatedBytes.subarray(0, 6))).toBe('GIF89a');
      expect(progressCalls).toEqual([
        [1, 8],
        [2, 8],
        [3, 8],
        [4, 8],
        [5, 8],
        [6, 8],
        [7, 8],
        [8, 8],
      ]);
      const animReader = new GifReader(animatedBytes);
      expect(animReader.numFrames()).toBe(8);
      expect(animReader.loopCount()).toBe(0);
    });
  });
});
