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
  { name: 'Transparent', value: 'transparent', preview: 'bg-zinc-800 border border-zinc-700' },
  { name: 'Neon Aurora', value: 'linear-gradient(135deg, #a855f7, #6366f1, #3b82f6)', preview: 'bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500' },
  { name: 'Warm Sunset', value: 'linear-gradient(135deg, #f59e0b, #ef4444, #ec4899)', preview: 'bg-gradient-to-r from-amber-500 via-red-500 to-pink-500' },
  { name: 'Glacier Blue', value: 'linear-gradient(135deg, #0ea5e9, #2563eb, #1d4ed8)', preview: 'bg-gradient-to-r from-sky-500 via-blue-600 to-blue-800' },
  { name: 'Cyberpunk', value: 'linear-gradient(135deg, #f43f5e, #d946ef, #06b6d4)', preview: 'bg-gradient-to-r from-rose-500 via-fuchsia-500 to-cyan-500' },
  { name: 'Dark Space', value: 'linear-gradient(135deg, #1e1b4b, #111827, #09090b)', preview: 'bg-gradient-to-r from-indigo-950 via-zinc-900 to-zinc-950' },
  { name: 'Emerald Forest', value: 'linear-gradient(135deg, #34d399, #059669, #064e3b)', preview: 'bg-gradient-to-r from-emerald-400 via-emerald-600 to-emerald-900' },
  { name: 'Soft Peach', value: 'linear-gradient(135deg, #fed7aa, #fdba74, #f97316)', preview: 'bg-gradient-to-r from-orange-200 via-orange-300 to-orange-500' },
  { name: 'Cosmic Dust', value: 'linear-gradient(135deg, #312e81, #581c87, #831843)', preview: 'bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900' }
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
export async function uploadToImgBB(image: Blob | string, apiKey: string) {
  if (!apiKey) {
    throw new Error('ImgBB API Key is required. Please set it in Settings.');
  }

  let base64Data = '';
  if (image instanceof Blob) {
    base64Data = (await blobToBase64(image)) as string;
  } else if (typeof image === 'string') {
    // If it is a dataURL, strip the prefix
    base64Data = image.split(',')[1] || image;
  }

  const formData = new FormData();
  formData.append('image', base64Data);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Failed to upload image to ImgBB');
  }

  return result.data.url;
}

/**
 * Uploads an image (Blob or Base64 dataURL) to Imgur
 * @param {Blob|string} image - The blob or base64 data string to upload
 * @param {string} clientId - Imgur Client ID
 * @returns {Promise<string>} - The direct URL of the uploaded image
 */
export async function uploadToImgur(image: Blob | string, clientId: string) {
  if (!clientId) {
    throw new Error('Imgur Client ID is required. Please set it in Settings.');
  }

  let base64Data = '';
  if (image instanceof Blob) {
    base64Data = (await blobToBase64(image)) as string;
  } else if (typeof image === 'string') {
    base64Data = image.split(',')[1] || image;
  }

  const response = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: {
      Authorization: `Client-ID ${clientId}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      image: base64Data,
      type: 'base64'
    })
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.data?.error || 'Failed to upload image to Imgur');
  }

  return result.data.link;
}

/**
 * Helper to convert Blob to base64 string
 * @param {Blob} blob 
 * @returns {Promise<string>}
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read blob as Base64 string'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
