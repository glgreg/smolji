import { parseGIF, decompressFrames, type ParsedFrame, type ParsedGif } from 'gifuct-js';
import { GifWriter } from 'omggif';

export interface DecodedAnimationFrame {
  image: CanvasImageSource;
  delayMs: number;
  width: number;
  height: number;
}

export interface DecodedAnimationSequence {
  kind: 'animated';
  frames: DecodedAnimationFrame[];
  totalDurationMs: number;
  width: number;
  height: number;
}

export interface GifFrameInput {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  delayMs: number;
}

export interface QuantizedFrameResult {
  palette: number[];
  indexedPixels: Uint8Array;
  transparentIndex: number | null;
}

export interface EncodeGifOptions {
  width: number;
  height: number;
  loop?: number | null;
  onProgress?: (completedFrames: number, totalFrames: number) => void;
}

const ASCII_DECODER = typeof TextDecoder !== 'undefined' ? new TextDecoder('ascii') : null;

function readAscii(bytes: Uint8Array, start: number, length: number): string {
  if (start + length > bytes.length) return '';
  const slice = bytes.subarray(start, start + length);
  if (ASCII_DECODER) {
    return ASCII_DECODER.decode(slice);
  }
  let out = '';
  for (let i = 0; i < slice.length; i++) {
    out += String.fromCharCode(slice[i]);
  }
  return out;
}

/**
 * Inspects leading magic bytes of an image binary buffer to identify its MIME type.
 * @param {Uint8Array} bytes - Raw image bytes
 * @param {string} [fallbackMime] - Declared MIME type fallback
 * @returns {string} - Detected MIME type or fallback
 */
export function sniffImageMimeType(bytes: Uint8Array, fallbackMime = ''): string {
  if (bytes.length >= 6) {
    const sig6 = readAscii(bytes, 0, 6);
    if (sig6 === 'GIF87a' || sig6 === 'GIF89a') {
      return 'image/gif';
    }
  }
  if (bytes.length >= 12) {
    const riff = readAscii(bytes, 0, 4);
    const webp = readAscii(bytes, 8, 4);
    if (riff === 'RIFF' && webp === 'WEBP') {
      return 'image/webp';
    }
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return 'image/bmp';
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x00 &&
    (bytes[2] === 0x01 || bytes[2] === 0x02) &&
    bytes[3] === 0x00
  ) {
    return 'image/x-icon';
  }
  if (bytes.length >= 12 && readAscii(bytes, 4, 8) === 'ftypavif') {
    return 'image/avif';
  }
  const headText = readAscii(bytes, 0, Math.min(bytes.length, 256)).trimStart().toLowerCase();
  if (headText.startsWith('<svg') || (headText.startsWith('<?xml') && headText.includes('<svg'))) {
    return 'image/svg+xml';
  }
  return fallbackMime.toLowerCase();
}

/**
 * Decodes a base64 or URI-encoded Data URL into an ArrayBuffer without network I/O.
 * @param {string} dataUrl - Source Data URL string
 * @returns {ArrayBuffer | null}
 */
export function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer | null {
  if (!dataUrl.startsWith('data:')) return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  const header = dataUrl.slice(0, commaIdx);
  const body = dataUrl.slice(commaIdx + 1);
  if (header.toLowerCase().includes(';base64')) {
    try {
      const bin = atob(body.replace(/\s+/g, ''));
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        out[i] = bin.charCodeAt(i);
      }
      return out.buffer;
    } catch {
      return null;
    }
  }
  try {
    const decoded = decodeURIComponent(body);
    const encoded = new TextEncoder().encode(decoded);
    const out = new Uint8Array(encoded.length);
    out.set(encoded);
    return out.buffer;
  } catch {
    return null;
  }
}

/**
 * Normalizes a frame delay in milliseconds to match browser playback timing.
 * Delays under 20ms are normalized to 100ms per browser GIF conventions.
 * @param {number | undefined} rawDelayMs - Raw frame duration in milliseconds
 * @returns {number} - Clamped frame duration in milliseconds
 */
export function normalizeFrameDelayMs(rawDelayMs: number | undefined): number {
  if (typeof rawDelayMs !== 'number' || !Number.isFinite(rawDelayMs) || rawDelayMs <= 0) {
    return 100;
  }
  return rawDelayMs < 20 ? 100 : Math.round(rawDelayMs);
}

function createFrameSurface(rgba: Uint8ClampedArray, width: number, height: number): CanvasImageSource {
  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = width;
  frameCanvas.height = height;
  const ctx = frameCanvas.getContext('2d');
  if (ctx && typeof ctx.putImageData === 'function') {
    if (typeof ctx.createImageData === 'function') {
      const imgData = ctx.createImageData(width, height);
      imgData.data.set(rgba);
      ctx.putImageData(imgData, 0, 0);
    } else if (typeof ImageData !== 'undefined') {
      const pixelCopy = new Uint8ClampedArray(rgba.length);
      pixelCopy.set(rgba);
      ctx.putImageData(new ImageData(pixelCopy, width, height), 0, 0);
    }
  }
  return frameCanvas;
}

/**
 * Decodes an animated GIF ArrayBuffer into full-canvas composited frames using gifuct-js.
 * Returns null if the GIF cannot be parsed or contains fewer than 2 frames.
 * @param {ArrayBuffer} buffer - GIF binary buffer
 * @returns {DecodedAnimationSequence | null}
 */
export function decodeGifAnimation(buffer: ArrayBuffer): DecodedAnimationSequence | null {
  let parsed: ParsedGif;
  let rawFrames: ParsedFrame[];
  try {
    parsed = parseGIF(buffer);
    rawFrames = decompressFrames(parsed, true);
  } catch {
    return null;
  }

  if (!rawFrames || rawFrames.length <= 1) {
    return null;
  }

  const width = parsed.lsd.width || rawFrames[0]?.dims?.width || 0;
  const height = parsed.lsd.height || rawFrames[0]?.dims?.height || 0;
  if (width <= 0 || height <= 0) {
    return null;
  }

  const composite = new Uint8ClampedArray(width * height * 4);
  let previousSnapshot: Uint8ClampedArray | null = null;
  let prevDisposal = 0;
  let prevDims: { left: number; top: number; width: number; height: number } | null = null;

  const frames: DecodedAnimationFrame[] = [];
  let totalDurationMs = 0;

  for (const frame of rawFrames) {
    if (prevDims) {
      if (prevDisposal === 2) {
        for (let row = 0; row < prevDims.height; row++) {
          const y = prevDims.top + row;
          if (y < 0 || y >= height) continue;
          for (let col = 0; col < prevDims.width; col++) {
            const x = prevDims.left + col;
            if (x < 0 || x >= width) continue;
            const offset = (y * width + x) * 4;
            composite[offset] = 0;
            composite[offset + 1] = 0;
            composite[offset + 2] = 0;
            composite[offset + 3] = 0;
          }
        }
      } else if (prevDisposal === 3 && previousSnapshot) {
        composite.set(previousSnapshot);
      }
    }

    if (frame.disposalType === 3) {
      previousSnapshot = composite.slice();
    } else {
      previousSnapshot = null;
    }

    const { left, top, width: patchW, height: patchH } = frame.dims;
    const patch = frame.patch;

    for (let row = 0; row < patchH; row++) {
      const targetY = top + row;
      if (targetY < 0 || targetY >= height) continue;
      for (let col = 0; col < patchW; col++) {
        const targetX = left + col;
        if (targetX < 0 || targetX >= width) continue;
        const srcIdx = (row * patchW + col) * 4;
        const alpha = patch[srcIdx + 3];
        if (alpha === 0) continue;
        const dstIdx = (targetY * width + targetX) * 4;
        composite[dstIdx] = patch[srcIdx];
        composite[dstIdx + 1] = patch[srcIdx + 1];
        composite[dstIdx + 2] = patch[srcIdx + 2];
        composite[dstIdx + 3] = alpha;
      }
    }

    const delayMs = normalizeFrameDelayMs(frame.delay);
    totalDurationMs += delayMs;
    frames.push({
      image: createFrameSurface(composite, width, height),
      delayMs,
      width,
      height,
    });

    prevDisposal = frame.disposalType ?? 0;
    prevDims = frame.dims;
  }

  return frames.length > 1
    ? {
        kind: 'animated',
        frames,
        totalDurationMs,
        width,
        height,
      }
    : null;
}

interface WebCodecsImageDecoder {
  tracks: {
    ready: Promise<void>;
    selectedTrack: { frameCount: number } | null;
  };
  decode(options: { frameIndex: number }): Promise<{ image: CanvasImageSource & { displayWidth?: number; displayHeight?: number; codedWidth?: number; codedHeight?: number; duration?: number | null; close?: () => void } }>;
  close(): void;
}

interface ImageDecoderConstructorLike {
  new (init: { data: BufferSource; type: string }): WebCodecsImageDecoder;
  isTypeSupported(type: string): Promise<boolean>;
}

/**
 * Decodes an animated image buffer (GIF, animated WebP, APNG) via the WebCodecs ImageDecoder API
 * when supported by the browser, with pure-JS gifuct-js decoding prioritized/fallback for GIFs.
 * @param {ArrayBuffer} buffer - Raw encoded image buffer
 * @param {string} [declaredMime] - Optional declared MIME type
 * @returns {Promise<DecodedAnimationSequence | null>}
 */
export async function decodeAnimatedImage(
  buffer: ArrayBuffer,
  declaredMime = ''
): Promise<DecodedAnimationSequence | null> {
  const bytes = new Uint8Array(buffer);
  const mimeType = sniffImageMimeType(bytes, declaredMime);

  if (mimeType === 'image/gif') {
    const gifDecoded = decodeGifAnimation(buffer);
    if (gifDecoded) {
      return gifDecoded;
    }
  }

  const ImageDecoderCtor = (globalThis as { ImageDecoder?: ImageDecoderConstructorLike }).ImageDecoder;
  if (!ImageDecoderCtor || !mimeType) {
    return null;
  }

  try {
    const supported = await ImageDecoderCtor.isTypeSupported(mimeType);
    if (!supported) {
      return null;
    }
  } catch {
    return null;
  }

  let decoder: WebCodecsImageDecoder | null = null;
  try {
    decoder = new ImageDecoderCtor({ data: buffer, type: mimeType });
    await decoder.tracks.ready;
    const track = decoder.tracks.selectedTrack;
    const frameCount = track?.frameCount ?? 0;
    if (!track || frameCount <= 1) {
      return null;
    }

    const cappedFrames = Math.min(frameCount, 240);
    const frames: DecodedAnimationFrame[] = [];
    let totalDurationMs = 0;
    let seqWidth = 0;
    let seqHeight = 0;

    for (let i = 0; i < cappedFrames; i++) {
      const result = await decoder.decode({ frameIndex: i });
      const videoFrame = result.image;
      const w = videoFrame.displayWidth || videoFrame.codedWidth || 1;
      const h = videoFrame.displayHeight || videoFrame.codedHeight || 1;
      if (seqWidth === 0) {
        seqWidth = w;
        seqHeight = h;
      }

      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = w;
      frameCanvas.height = h;
      const ctx = frameCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoFrame, 0, 0, w, h);
      }

      const durationMs = normalizeFrameDelayMs(
        typeof videoFrame.duration === 'number' ? videoFrame.duration / 1000 : 100
      );
      if (typeof videoFrame.close === 'function') {
        videoFrame.close();
      }

      totalDurationMs += durationMs;
      frames.push({
        image: frameCanvas,
        delayMs: durationMs,
        width: w,
        height: h,
      });
    }

    return frames.length > 1
      ? {
          kind: 'animated',
          frames,
          totalDurationMs,
          width: seqWidth,
          height: seqHeight,
        }
      : null;
  } catch {
    return null;
  } finally {
    decoder?.close();
  }
}

/**
 * Resolves the active frame for an animated asset at a given elapsed millisecond timestamp.
 * @param {DecodedAnimationSequence} sequence - Decoded multi-frame animation
 * @param {number} elapsedMs - Elapsed playback time in milliseconds
 * @returns {DecodedAnimationFrame | null}
 */
export function getFrameAtTime(
  sequence: DecodedAnimationSequence,
  elapsedMs: number
): DecodedAnimationFrame | null {
  const { frames, totalDurationMs } = sequence;
  if (frames.length === 0) return null;
  if (frames.length === 1 || totalDurationMs <= 0) return frames[0];

  const wrapped = ((elapsedMs % totalDurationMs) + totalDurationMs) % totalDurationMs;
  let elapsed = 0;
  for (const frame of frames) {
    elapsed += frame.delayMs;
    if (wrapped < elapsed) {
      return frame;
    }
  }
  return frames[frames.length - 1];
}

/**
 * Computes deterministic frame timestamps for GIF export across zero, one, or multiple animated layers.
 * @param {DecodedAnimationSequence[]} animations - Active animated sequences on visible layers
 * @returns {number[]} - Frame duration array in milliseconds (minimum 1 frame)
 */
export function buildExportFrameDurations(animations: DecodedAnimationSequence[]): number[] {
  const valid = animations.filter((seq) => seq.frames.length > 1 && seq.totalDurationMs > 0);
  if (valid.length === 0) {
    return [100];
  }

  if (valid.length === 1) {
    const rawDelays = valid[0].frames.map((f) => Math.max(20, Math.round(f.delayMs)));
    if (rawDelays.length <= 120) {
      return rawDelays;
    }
    const total = rawDelays.reduce((acc, ms) => acc + ms, 0);
    const stepMs = Math.max(40, Math.round(total / 120));
    const count = Math.max(2, Math.min(120, Math.round(total / stepMs)));
    return Array.from({ length: count }, () => stepMs);
  }

  // Multiple independent animated layers: find a balanced loop ceiling up to 6 seconds at ~20fps
  const maxDur = Math.min(
    6000,
    valid.reduce((max, seq) => Math.max(max, seq.totalDurationMs), 0)
  );
  const stepMs = maxDur > 2400 ? Math.max(50, Math.ceil(maxDur / 100)) : 50;
  const frameCount = Math.max(2, Math.min(120, Math.round(maxDur / stepMs)));
  return Array.from({ length: frameCount }, () => stepMs);
}

interface ColorBucket {
  r: number;
  g: number;
  b: number;
  sumR: number;
  sumG: number;
  sumB: number;
  count: number;
}

interface ColorBox {
  buckets: ColorBucket[];
  minR: number;
  maxR: number;
  minG: number;
  maxG: number;
  minB: number;
  maxB: number;
  totalWeight: number;
}

function makeColorBox(buckets: ColorBucket[]): ColorBox {
  let minR = 255;
  let maxR = 0;
  let minG = 255;
  let maxG = 0;
  let minB = 255;
  let maxB = 0;
  let totalWeight = 0;

  for (const b of buckets) {
    if (b.r < minR) minR = b.r;
    if (b.r > maxR) maxR = b.r;
    if (b.g < minG) minG = b.g;
    if (b.g > maxG) maxG = b.g;
    if (b.b < minB) minB = b.b;
    if (b.b > maxB) maxB = b.b;
    totalWeight += b.count;
  }

  return { buckets, minR, maxR, minG, maxG, minB, maxB, totalWeight };
}

/**
 * Quantizes an RGBA frame into an indexed GIF palette (up to 256 colors) using Median Cut
 * and a 15-bit LUT for fast per-pixel nearest-color mapping.
 * @param {Uint8ClampedArray} rgba - Frame RGBA bytes
 * @param {number} width - Frame width in pixels
 * @param {number} height - Frame height in pixels
 * @returns {QuantizedFrameResult}
 */
export function quantizeRgbaFrame(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): QuantizedFrameResult {
  const totalPixels = width * height;
  const bucketMap = new Int32Array(32768);
  bucketMap.fill(-1);
  const buckets: ColorBucket[] = [];

  // Sample every pixel up to 512x512; stride histogram at higher sizes while still detecting transparency everywhere
  const stride = totalPixels > 262144 ? Math.max(1, Math.floor(totalPixels / 131072)) : 1;
  let hasTransparency = false;

  for (let i = 0; i < totalPixels; i++) {
    const p = i * 4;
    const a = rgba[p + 3];
    if (a < 128) {
      hasTransparency = true;
      continue;
    }
    if (stride > 1 && i % stride !== 0 && buckets.length > 0) {
      continue;
    }
    const r = rgba[p];
    const g = rgba[p + 1];
    const b = rgba[p + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const existingIdx = bucketMap[key];
    if (existingIdx === -1) {
      bucketMap[key] = buckets.length;
      buckets.push({ r, g, b, sumR: r, sumG: g, sumB: b, count: 1 });
    } else {
      const entry = buckets[existingIdx];
      entry.sumR += r;
      entry.sumG += g;
      entry.sumB += b;
      entry.count += 1;
    }
  }

  // Fallback pass in case a huge strided image had all opaque pixels outside sampled stride
  if (buckets.length === 0 && !hasTransparency) {
    buckets.push({ r: 0, g: 0, b: 0, sumR: 0, sumG: 0, sumB: 0, count: 1 });
  }

  const maxOpaqueColors = hasTransparency ? 255 : 256;
  const boxes: ColorBox[] = buckets.length > 0 ? [makeColorBox(buckets)] : [];

  while (boxes.length > 0 && boxes.length < maxOpaqueColors) {
    let splitIdx = -1;
    let bestScore = -1;

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.buckets.length <= 1) continue;
      const span = Math.max(box.maxR - box.minR, box.maxG - box.minG, box.maxB - box.minB);
      if (span <= 0) continue;
      const score = span * Math.log2(box.totalWeight + 1);
      if (score > bestScore) {
        bestScore = score;
        splitIdx = i;
      }
    }

    if (splitIdx === -1) break;

    const target = boxes[splitIdx];
    const rSpan = target.maxR - target.minR;
    const gSpan = target.maxG - target.minG;
    const bSpan = target.maxB - target.minB;
    const channel: 'r' | 'g' | 'b' =
      gSpan >= rSpan && gSpan >= bSpan ? 'g' : rSpan >= bSpan ? 'r' : 'b';

    const sorted = target.buckets.toSorted((a, b) => a[channel] - b[channel]);
    const halfWeight = target.totalWeight / 2;
    let running = 0;
    let cutIndex = 1;
    for (let i = 0; i < sorted.length - 1; i++) {
      running += sorted[i].count;
      if (running >= halfWeight) {
        cutIndex = i + 1;
        break;
      }
    }

    const leftBox = makeColorBox(sorted.slice(0, cutIndex));
    const rightBox = makeColorBox(sorted.slice(cutIndex));
    boxes.splice(splitIdx, 1, leftBox, rightBox);
  }

  const transparentIndex = hasTransparency ? 0 : null;
  const opaqueRgbColors: number[] = boxes.map((box) => {
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let totalCount = 0;
    for (const bucket of box.buckets) {
      totalR += bucket.sumR;
      totalG += bucket.sumG;
      totalB += bucket.sumB;
      totalCount += bucket.count;
    }
    const avgR = totalCount > 0 ? Math.min(255, Math.round(totalR / totalCount)) : 0;
    const avgG = totalCount > 0 ? Math.min(255, Math.round(totalG / totalCount)) : 0;
    const avgB = totalCount > 0 ? Math.min(255, Math.round(totalB / totalCount)) : 0;
    return (avgR << 16) | (avgG << 8) | avgB;
  });

  const usedSlots = opaqueRgbColors.length + (hasTransparency ? 1 : 0);
  let paletteSize = 2;
  while (paletteSize < usedSlots && paletteSize < 256) {
    paletteSize *= 2;
  }

  const palette = new Array<number>(paletteSize).fill(0);
  const opaqueStartIndex = hasTransparency ? 1 : 0;
  for (let i = 0; i < opaqueRgbColors.length && opaqueStartIndex + i < 256; i++) {
    palette[opaqueStartIndex + i] = opaqueRgbColors[i];
  }
  const activeColorEnd = Math.min(256, opaqueStartIndex + opaqueRgbColors.length);

  // Extract channel arrays for fast lookup
  const palR = new Uint8Array(activeColorEnd);
  const palG = new Uint8Array(activeColorEnd);
  const palB = new Uint8Array(activeColorEnd);
  for (let i = opaqueStartIndex; i < activeColorEnd; i++) {
    const rgb = palette[i];
    palR[i] = (rgb >> 16) & 0xff;
    palG[i] = (rgb >> 8) & 0xff;
    palB[i] = rgb & 0xff;
  }

  const lut = new Int16Array(32768);
  lut.fill(-1);
  const indexedPixels = new Uint8Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const p = i * 4;
    if (hasTransparency && rgba[p + 3] < 128) {
      indexedPixels[i] = 0;
      continue;
    }
    if (activeColorEnd <= opaqueStartIndex) {
      indexedPixels[i] = 0;
      continue;
    }

    const r = rgba[p];
    const g = rgba[p + 1];
    const b = rgba[p + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

    let mappedIdx = lut[key];
    if (mappedIdx === -1) {
      let bestDist = Infinity;
      mappedIdx = opaqueStartIndex;
      for (let c = opaqueStartIndex; c < activeColorEnd; c++) {
        const dr = r - palR[c];
        const dg = g - palG[c];
        const db = b - palB[c];
        const dist = dr * dr * 2 + dg * dg * 4 + db * db * 3;
        if (dist < bestDist) {
          bestDist = dist;
          mappedIdx = c;
          if (dist === 0) break;
        }
      }
      lut[key] = mappedIdx;
    }
    indexedPixels[i] = mappedIdx;
  }

  return {
    palette,
    indexedPixels,
    transparentIndex,
  };
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Encodes one or more RGBA image frames into an animated (or single-frame) GIF89a Uint8Array.
 * Automatically resizes the internal omggif byte buffer if LZW output approaches capacity.
 * @param {GifFrameInput[]} frames - Ordered frames to encode
 * @param {EncodeGifOptions} options - Target GIF width, height, loop count, and progress callback
 * @returns {Promise<Uint8Array>} - Valid GIF89a binary payload
 */
export async function encodeGifFrames(
  frames: GifFrameInput[],
  options: EncodeGifOptions
): Promise<Uint8Array> {
  const { width, height, loop = 0, onProgress } = options;
  if (frames.length === 0) {
    throw new Error('Cannot encode GIF without at least one frame.');
  }
  if (width <= 0 || height <= 0 || width > 65535 || height > 65535) {
    throw new Error(`Invalid GIF export dimensions: ${width}x${height}`);
  }

  try {
    const isAnimated = frames.length > 1;
    const perFrameBudget = width * height * 2 + 4096;
    let buf = new Uint8Array(Math.max(16384, perFrameBudget * Math.min(frames.length, 4)));

    const firstQuantized = quantizeRgbaFrame(frames[0].data, width, height);
    const writer = new GifWriter(buf, width, height, {
      loop: isAnimated ? loop : null,
      palette: isAnimated ? null : firstQuantized.palette,
    });

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const quantized = i === 0 ? firstQuantized : quantizeRgbaFrame(frame.data, width, height);

      const pos = writer.getOutputBufferPosition();
      if (buf.length - pos < perFrameBudget) {
        const grown = new Uint8Array(Math.max(buf.length * 2, pos + perFrameBudget));
        grown.set(buf.subarray(0, pos));
        buf = grown;
        writer.setOutputBuffer(buf);
      }

      const delayCentiseconds = Math.max(2, Math.round(normalizeFrameDelayMs(frame.delayMs) / 10));
      writer.addFrame(0, 0, width, height, quantized.indexedPixels, {
        palette: isAnimated ? quantized.palette : null,
        delay: delayCentiseconds,
        disposal: isAnimated ? 2 : 0,
        transparent: quantized.transparentIndex,
      });

      onProgress?.(i + 1, frames.length);
      if (isAnimated && i < frames.length - 1) {
        await yieldToEventLoop();
      }
    }

    const totalLength = writer.end();
    const outBuffer = writer.getOutputBuffer();
    if (outBuffer instanceof Uint8Array) {
      return outBuffer.slice(0, totalLength);
    }
    return Uint8Array.from(outBuffer.slice(0, totalLength));
  } catch (err) {
    throw new Error('Failed to encode composition to GIF.', { cause: err });
  }
}
