// Emoji styles and CDN integration configuration
import { gemoji } from 'gemoji';

export const EMOJI_STYLES = [
  { id: 'apple', name: 'Apple', desc: 'Original iOS/macOS style', format: 'PNG' },
  { id: 'google', name: 'Google Noto', desc: 'Google Noto Color Emoji design', format: 'PNG' },
  { id: 'microsoft-3D-fluent', name: 'Fluent 3D', desc: 'Microsoft Fluent 3D tridimensional render', format: 'PNG' },
  { id: 'twitter', name: 'Twitter (Twemoji)', desc: 'Flat open-source vector design', format: 'SVG/PNG' },
  { id: 'openmoji', name: 'OpenMoji', desc: 'Clean, artistic outline drawings', format: 'SVG/PNG' },
  { id: 'toss-face', name: 'Toss Face', desc: 'Modern minimalist vector style', format: 'PNG' },
  { id: 'whatsapp', name: 'WhatsApp', desc: 'Mobile chat style from WhatsApp', format: 'PNG' },
  { id: 'facebook', name: 'Facebook', desc: 'Social media network style from Meta', format: 'PNG' },
  { id: 'animated-noto-color-emoji', name: 'Animated Noto', desc: 'Google Noto Animated graphics', format: 'GIF/WebP' },
  { id: 'telegram', name: 'Telegram', desc: 'Telegram app native vectorized style', format: 'PNG' },
  { id: 'serenityos', name: 'SerenityOS', desc: 'Retro classic pixel-art style', format: 'PNG' }
];

export const GRADIENTS = [
  { name: 'Transparent', value: 'transparent', preview: 'bg-stone-800 border border-stone-700' },
  { name: 'Tangerine Press', value: 'linear-gradient(135deg, #fb923c, #e04f26, #b93815)', preview: 'bg-gradient-to-br from-orange-400 via-orange-600 to-red-700' },
  { name: 'Warm Sunset', value: 'linear-gradient(135deg, #f59e0b, #ef4444, #ec4899)', preview: 'bg-gradient-to-br from-amber-500 via-red-500 to-pink-500' },
  { name: 'Paper Peach', value: 'linear-gradient(135deg, #fed7aa, #fdba74, #ea580c)', preview: 'bg-gradient-to-br from-orange-200 via-orange-300 to-orange-600' },
  { name: 'Botanical Sage', value: 'linear-gradient(135deg, #6ee7b7, #2d6a4f, #1b4332)', preview: 'bg-gradient-to-br from-emerald-300 via-emerald-800 to-emerald-950' },
  { name: 'Glacier Cobalt', value: 'linear-gradient(135deg, #38bdf8, #2563eb, #1e3a8a)', preview: 'bg-gradient-to-br from-sky-400 via-blue-600 to-blue-900' },
  { name: 'Espresso Ink', value: 'linear-gradient(135deg, #57534e, #292524, #1c1917)', preview: 'bg-gradient-to-br from-stone-600 via-stone-800 to-stone-950' },
  { name: 'Marigold Honey', value: 'linear-gradient(135deg, #fde68a, #f59e0b, #b45309)', preview: 'bg-gradient-to-br from-amber-200 via-amber-500 to-amber-700' },
  { name: 'Cyberpunk', value: 'linear-gradient(135deg, #f43f5e, #d946ef, #06b6d4)', preview: 'bg-gradient-to-br from-rose-500 via-fuchsia-500 to-cyan-500' },
  { name: 'Nordic Slate', value: 'linear-gradient(135deg, #475569, #1e293b, #0f172a)', preview: 'bg-gradient-to-br from-slate-600 via-slate-800 to-slate-950' }
];

export const POPULAR_EMOJIS = {
  'Faces & Expressions': [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😜', '🤪', '😎',
    '🥳', '😏', '🤔', '🤫', '🤭', '🫡', '😳', '🥺', '😭', '🤯'
  ],
  'Gestures & Hands': [
    '👍', '👎', '👊', '✊', '🤛', '🤜', '✌️', '👌', '🤌', '🤏',
    '🤝', '🙏', '👏', '🙌', '👐', '✍️', '💅', '💪', '🫶', '❤️'
  ],
  'Hearts & Symbols': [
    '🩷', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❤️‍🔥', '❣️', '💕', '🔥', '✨', '🎉', '🌟', '⭐', '💥', '💯'
  ],
  'Animals & Nature': [
    '🐶', '🐱', '🦊', '🦁', '🐻', '🐼', '🦄', '🐝', '🦋', '🦖',
    '🐙', '🦈', '🌈', '☀️', '🌙', '❄️', '⚡', '🌊', '🌸', '🍁'
  ],
  'Objects & Technology': [
    '🚀', '🛸', '🤖', '👾', '💻', '📱', '🎮', '🎨', '🎸', '📷',
    '💡', '🔋', '💎', '🔑', '📦', '🍕', '🍔', '🥑', '🍩', '🍺'
  ],
  'Activities & Sports': [
    '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸',
    '🥅', '🏒', '🏑', '🏏', '⛳', '🏹', '🎣', '🥊', '🥋', '🎽'
  ],
  'Food & Drink': [
    '🍎', '🍏', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈',
    '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦'
  ]
};

/**
 * Returns the raw list of gemojis
 * @returns {Array}
 */
export function getGemojiList() {
  return gemoji || [];
}

/**
 * Returns the CDN URL for a given emoji and style.
 * @param {string} emoji - The raw emoji character (e.g. '🎉')
 * @param {string} style - The style ID (e.g. 'google')
 * @returns {string} - The full URL to fetch the emoji image
 */
export function getEmojiUrl(emoji: string, style: string) {
  if (!emoji) return '';
  return `https://emoji-cdn.mqrio.dev/${encodeURIComponent(emoji)}?style=${style}`;
}

let cachedSegmenter: Intl.Segmenter | null = null;

/**
 * Parses text to extract all valid emoji grapheme clusters.
 * @param {string} text - The input text containing emojis
 * @returns {string[]} - An array of unique emoji strings
 */
export function parseEmojis(text: string) {
  if (!text) return [];
  
  // Use Intl.Segmenter to accurately extract grapheme clusters (essential for ZWJ sequences)
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    if (!cachedSegmenter) {
      cachedSegmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    }
    const segments = Array.from(cachedSegmenter.segment(text)).map(s => s.segment);
    
    // Emoji regex checking both standard emojis and extended pictographics (like ZWJ and modifiers)
    const emojiRegex = /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u;
    
    // Filter segments that are emojis and make unique
    const found = segments.filter(char => emojiRegex.test(char));
    return [...new Set(found)];
  } else {
    // Fallback regex (less precise for ZWJ emojis, but works in older environments)
    const fallbackRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{1F1E6}-\u{1F1FF}]/gu;
    const matches = text.match(fallbackRegex) || [];
    return [...new Set(matches)];
  }
}

/**
 * Uploads an image (Blob or Base64 dataURL) to ImgBB
 * @param {Blob|string} image - The blob or base64 data string to upload
 * @param {string} apiKey - ImgBB API key
 * @returns {Promise<string>} - The direct URL of the uploaded image
 */
export async function uploadToImgBB(image: Blob | string, apiKey: string): Promise<string> {
  const trimmedKey = (apiKey || '').trim();
  if (!trimmedKey) {
    throw new Error('ImgBB API Key is required. Please set it in Settings.');
  }

  const base64Data = await resolveBase64Image(image);

  const formData = new FormData();
  formData.append('image', base64Data);

  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${encodeURIComponent(trimmedKey)}`,
    {
      method: 'POST',
      body: formData,
    }
  );

  let result: {
    success?: boolean;
    data?: { url?: string };
    error?: { message?: string };
  } | null = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok || !result?.success || !result.data?.url) {
    throw new Error(result?.error?.message || 'Failed to upload image to ImgBB');
  }

  return result.data.url;
}

/**
 * Uploads an image (Blob or Base64 dataURL) to Imgur
 * @param {Blob|string} image - The blob or base64 data string to upload
 * @param {string} clientId - Imgur Client ID
 * @returns {Promise<string>} - The direct URL of the uploaded image
 */
export async function uploadToImgur(image: Blob | string, clientId: string): Promise<string> {
  const trimmedClientId = (clientId || '').trim();
  if (!trimmedClientId) {
    throw new Error('Imgur Client ID is required. Please set it in Settings.');
  }

  const base64Data = await resolveBase64Image(image);

  const response = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: {
      Authorization: `Client-ID ${trimmedClientId}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: base64Data,
      type: 'base64',
    }),
  });

  let result: {
    success?: boolean;
    data?: { link?: string; error?: string };
  } | null = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok || !result?.success || !result.data?.link) {
    throw new Error(result?.data?.error || 'Failed to upload image to Imgur');
  }

  return result.data.link;
}

/**
 * Strips any `data:...;base64,` prefix so image hosting APIs receive raw Base64.
 * @param {string} value - Data URL, raw Base64 string, or remote URL
 * @returns {string} - Pure Base64 payload (or preserved remote URL)
 */
function stripDataUrlPrefix(value: string): string {
  const trimmed = value.trim();
  if (trimmed.toLowerCase().startsWith('data:')) {
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex === -1) {
      return '';
    }
    return trimmed.slice(commaIndex + 1).replace(/\s+/g, '');
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return trimmed.replace(/\s+/g, '');
}

/**
 * Normalizes a Blob or Data URL / Base64 string into a non-empty raw Base64 payload.
 * @param {Blob|string} image - Source image Blob or Base64 string
 * @returns {Promise<string>} - Pure Base64 string without data URL prefix
 */
async function resolveBase64Image(image: Blob | string): Promise<string> {
  const raw =
    image instanceof Blob
      ? await blobToBase64(image)
      : typeof image === 'string'
        ? image
        : '';
  const base64Data = stripDataUrlPrefix(raw);
  if (!base64Data) {
    throw new Error('Image data is empty or invalid.');
  }
  return base64Data;
}

/**
 * Helper to convert Blob to pure base64 string without data URL prefix.
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // FileReader.readAsDataURL prepends `data:<mime>;base64,`, which ImgBB/Imgur reject as invalid base64.
        resolve(stripDataUrlPrefix(reader.result));
      } else {
        reject(new Error('Failed to read blob as Base64 string'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob as Base64 string'));
    reader.readAsDataURL(blob);
  });
}
