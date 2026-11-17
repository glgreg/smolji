import type { Layer } from '../types';
import {
  decodeAnimatedImage,
  sniffImageMimeType,
  type DecodedAnimationSequence,
} from './gif';

export interface LoadedImageAsset {
  dataUrl: string;
  name: string;
  mimeType: string;
  naturalWidth: number;
  naturalHeight: number;
  isAnimated: boolean;
  animation: DecodedAnimationSequence | null;
}

const IMAGE_EXTENSION_RE = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico|tiff?)$/i;

/**
 * Checks whether a File/Blob represents a supported raster or vector image format.
 * @param {Blob} file - Candidate file or clipboard blob
 * @param {string} [fileName] - Optional file name when MIME type is blank
 * @returns {boolean}
 */
export function isSupportedImageFile(file: Blob, fileName = ''): boolean {
  if (file.type && file.type.toLowerCase().startsWith('image/')) {
    return true;
  }
  const effectiveName =
    fileName || ('name' in file && typeof (file as File).name === 'string' ? (file as File).name : '');
  return IMAGE_EXTENSION_RE.test(effectiveName);
}

/**
 * Reads a Blob as a Base64 Data URL string.
 * @param {Blob} blob - Source binary blob
 * @returns {Promise<string>}
 */
export function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string' && reader.result.startsWith('data:')) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file as Data URL.'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image file as Data URL.'));
    reader.readAsDataURL(blob);
  });
}

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image bytes.'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image bytes.'));
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Measures an SVG XML string's declared dimensions or viewBox fallback aspect ratio.
 * @param {string} svgText - Raw SVG markup
 * @returns {{ width: number; height: number } | null}
 */
export function parseSvgDimensions(svgText: string): { width: number; height: number } | null {
  const viewBoxMatch = /viewBox\s*=\s*["']\s*[-+]?\d*\.?\d+[\s,]+[-+]?\d*\.?\d+[\s,]+(\d*\.?\d+)[\s,]+(\d*\.?\d+)\s*["']/i.exec(
    svgText
  );
  if (viewBoxMatch) {
    const w = parseFloat(viewBoxMatch[1]);
    const h = parseFloat(viewBoxMatch[2]);
    if (w > 0 && h > 0) {
      return { width: w, height: h };
    }
  }
  const wMatch = /\bwidth\s*=\s*["']\s*(\d*\.?\d+)(?:px)?\s*["']/i.exec(svgText);
  const hMatch = /\bheight\s*=\s*["']\s*(\d*\.?\d+)(?:px)?\s*["']/i.exec(svgText);
  if (wMatch && hMatch) {
    const w = parseFloat(wMatch[1]);
    const h = parseFloat(hMatch[1]);
    if (w > 0 && h > 0) {
      return { width: w, height: h };
    }
  }
  return null;
}

/**
 * Converts a validated `data:image/...` Data URL into a Blob File for clipboard ingestion.
 * @param {string} dataUrl - Source image Data URL
 * @param {string} [fileName] - Output filename
 * @returns {File | null}
 */
export function dataUrlToImageFile(dataUrl: string, fileName = 'pasted-image.png'): File | null {
  const match = /^data:(image\/[a-z0-9.+-]+)(?:;charset=[^;,]+)?(;base64)?,([\s\S]+)$/i.exec(
    dataUrl.trim()
  );
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const isBase64 = Boolean(match[2]);
  const payload = match[3];
  try {
    let bytes: Uint8Array;
    if (isBase64) {
      const raw = atob(payload.replace(/\s+/g, ''));
      bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        bytes[i] = raw.charCodeAt(i);
      }
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(payload));
    }
    const ext = mimeType.split('/')[1]?.split('+')[0] || 'png';
    const safeName = fileName.includes('.') ? fileName : `${fileName}.${ext}`;
    return new File([Uint8Array.from(bytes)], safeName, { type: mimeType });
  } catch {
    return null;
  }
}

function measureImageElement(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth || img.width || 0;
      const nh = img.naturalHeight || img.height || 0;
      resolve({ width: nw, height: nh });
    };
    img.onerror = () => reject(new Error('Unsupported or corrupted image file.'));
    img.src = src;
  });
}

function inferExtensionMime(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.avif')) return 'image/avif';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  return 'image/png';
}

function normalizeDataUrlMime(dataUrl: string, detectedMime: string): string {
  if (!detectedMime) return dataUrl;
  return dataUrl.replace(/^data:(?:image\/[^;]+|application\/octet-stream)?;/i, `data:${detectedMime};`);
}

/**
 * Loads an external image Blob or File into a canvas-ready Data URL, inspects its dimensions,
 * and decodes animation frames when the asset is animated (GIF, WebP, or APNG).
 * @param {Blob} blob - Image File or Blob from disk, drop, or clipboard
 * @param {string} [fallbackName] - Optional display filename
 * @returns {Promise<LoadedImageAsset>}
 */
export async function loadExternalImageAsset(
  blob: Blob,
  fallbackName = 'External Image'
): Promise<LoadedImageAsset> {
  const rawName =
    'name' in blob && typeof (blob as File).name === 'string' && (blob as File).name.trim()
      ? (blob as File).name.trim()
      : fallbackName;

  if (!isSupportedImageFile(blob, rawName)) {
    throw new Error(`Unsupported file format for "${rawName}".`);
  }

  try {
    const buffer = await readBlobAsArrayBuffer(blob);
    const bytes = new Uint8Array(buffer);
    const declaredOrExtMime = blob.type || inferExtensionMime(rawName);
    const detectedMime = sniffImageMimeType(bytes, declaredOrExtMime);
    const isSvg = detectedMime === 'image/svg+xml' || rawName.toLowerCase().endsWith('.svg');

    let svgDims: { width: number; height: number } | null = null;
    if (isSvg && typeof TextDecoder !== 'undefined') {
      svgDims = parseSvgDimensions(new TextDecoder().decode(bytes));
    }

    const animation = isSvg ? null : await decodeAnimatedImage(buffer, detectedMime);
    const rawDataUrl = await readBlobAsDataUrl(blob);
    const dataUrl = normalizeDataUrlMime(rawDataUrl, isSvg ? 'image/svg+xml' : detectedMime);

    const measured = await measureImageElement(dataUrl);
    const naturalWidth =
      (isSvg && svgDims?.width ? svgDims.width : 0) ||
      (measured.width > 0 ? measured.width : 0) ||
      animation?.width ||
      512;
    const naturalHeight =
      (isSvg && svgDims?.height ? svgDims.height : 0) ||
      (measured.height > 0 ? measured.height : 0) ||
      animation?.height ||
      512;

    return {
      dataUrl,
      name: rawName,
      mimeType: isSvg ? 'image/svg+xml' : detectedMime || 'image/png',
      naturalWidth,
      naturalHeight,
      isAnimated: Boolean(animation && animation.frames.length > 1),
      animation,
    };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Unsupported')) {
      throw err;
    }
    throw new Error(`Could not load image "${rawName}".`, { cause: err });
  }
}

/**
 * Extracts all image File items from a ClipboardEvent or DragEvent DataTransfer object.
 * @param {DataTransfer | null | undefined} dataTransfer - Event dataTransfer or clipboardData
 * @returns {File[]}
 */
export function extractImageFilesFromDataTransfer(
  dataTransfer: DataTransfer | null | undefined
): File[] {
  if (!dataTransfer) return [];
  const results: File[] = [];
  const seen = new Set<string>();

  const pushUnique = (file: File | null, idx: number) => {
    if (!file) return;
    if (!isSupportedImageFile(file, file.name)) return;
    const key = `${file.name}:${file.size}:${file.type}`;
    if (seen.has(key) && file.size > 0) return;
    seen.add(key);
    const namedFile =
      file.name && file.name.trim()
        ? file
        : new File([file], `pasted-image-${idx + 1}.${(file.type.split('/')[1] || 'png').replace(/[^a-z0-9]/gi, '')}`, {
            type: file.type || 'image/png',
          });
    results.push(namedFile);
  };

  if (dataTransfer.items && dataTransfer.items.length > 0) {
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i];
      if (item.kind === 'file') {
        pushUnique(item.getAsFile(), i);
      }
    }
  }

  if (results.length === 0 && dataTransfer.files && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      pushUnique(dataTransfer.files[i], i);
    }
  }

  return results;
}

/**
 * Reads image blobs directly from the async Clipboard API (`navigator.clipboard.read()`).
 * Throws descriptive errors when clipboard access is unsupported or contains no image data.
 * @returns {Promise<File[]>}
 */
export async function readClipboardImageFiles(): Promise<File[]> {
  if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.read !== 'function') {
    throw new Error('Direct clipboard reading is unavailable in this browser. Press Ctrl+V to paste instead.');
  }

  const items = await navigator.clipboard.read();
  const files: File[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const imageType = item.types.find((t) => t.toLowerCase().startsWith('image/'));
    if (imageType) {
      const blob = await item.getType(imageType);
      const ext = imageType.split('/')[1]?.split('+')[0] || 'png';
      files.push(new File([blob], `clipboard-${i + 1}.${ext}`, { type: imageType }));
    }
  }

  if (files.length === 0) {
    throw new Error('No image found on the clipboard.');
  }

  return files;
}

/**
 * Computes canonical 512x512 artboard dimensions for any layer while preserving aspect ratio on external images.
 * Emoji layers maintain the historical 256 * scale square box.
 * @param {Pick<Layer, 'type' | 'scale' | 'naturalWidth' | 'naturalHeight'>} layer - Target layer
 * @returns {{ width: number; height: number }}
 */
export function getLayerDimensions(
  layer: Pick<Layer, 'type' | 'scale' | 'naturalWidth' | 'naturalHeight'>
): { width: number; height: number } {
  const scale = typeof layer.scale === 'number' && Number.isFinite(layer.scale) ? layer.scale : 1;
  if (layer.type !== 'image') {
    const side = 256 * scale;
    return { width: side, height: side };
  }

  const nw = layer.naturalWidth && layer.naturalWidth > 0 ? layer.naturalWidth : 256;
  const nh = layer.naturalHeight && layer.naturalHeight > 0 ? layer.naturalHeight : 256;

  if (nw >= nh) {
    return {
      width: 256 * scale,
      height: 256 * (nh / nw) * scale,
    };
  }

  return {
    width: 256 * (nw / nh) * scale,
    height: 256 * scale,
  };
}

/**
 * Builds a clean filename stem from the bottom-most sticker layer.
 * @param {Layer | undefined} layer - Reference layer
 * @returns {string}
 */
export function sanitizeExportFileStem(layer?: Layer): string {
  if (!layer) return 'sticker';
  if (layer.type === 'image') {
    const base = (layer.imageName || 'image').replace(/\.[^.]+$/, '');
    const cleaned = base
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return cleaned || 'image';
  }
  return layer.emoji || 'sticker';
}
