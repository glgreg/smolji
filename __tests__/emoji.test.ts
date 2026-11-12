import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EMOJI_STYLES,
  GRADIENTS,
  POPULAR_EMOJIS,
  getGemojiList,
  getEmojiUrl,
  parseEmojis,
  uploadToImgBB,
  uploadToImgur,
} from '../src/utils/emoji';

describe('Emoji Utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Catalogs and Gemoji List', () => {
    it('EMOJI_STYLES contains supported vendor styles with required metadata', () => {
      expect(EMOJI_STYLES.length).toBeGreaterThanOrEqual(10);
      for (const style of EMOJI_STYLES) {
        expect(style).toHaveProperty('id');
        expect(style).toHaveProperty('name');
        expect(style).toHaveProperty('desc');
        expect(style).toHaveProperty('format');
      }
      expect(EMOJI_STYLES.some((s) => s.id === 'microsoft-3D-fluent')).toBe(true);
    });

    it('GRADIENTS contains transparent and linear-gradient presets', () => {
      expect(GRADIENTS[0].value).toBe('transparent');
      expect(GRADIENTS.slice(1).every((g) => g.value.startsWith('linear-gradient'))).toBe(true);
    });

    it('POPULAR_EMOJIS contains categories with arrays of emojis', () => {
      expect(POPULAR_EMOJIS).toHaveProperty('Faces & Expressions');
      expect(Array.isArray(POPULAR_EMOJIS['Faces & Expressions'])).toBe(true);
      expect(POPULAR_EMOJIS['Faces & Expressions'].length).toBeGreaterThan(0);
    });

    it('getGemojiList returns the list of gemoji descriptors', () => {
      const list = getGemojiList();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(100);
      expect(list[0]).toHaveProperty('emoji');
      expect(list[0]).toHaveProperty('names');
    });
  });

  describe('getEmojiUrl', () => {
    it('generates encoded CDN URLs for valid emoji and style', () => {
      const url = getEmojiUrl('🚀', 'microsoft-3D-fluent');
      expect(url).toBe('https://emoji-cdn.mqrio.dev/%F0%9F%9A%80?style=microsoft-3D-fluent');
    });

    it('returns empty string when emoji is empty', () => {
      expect(getEmojiUrl('', 'apple')).toBe('');
    });
  });

  describe('parseEmojis', () => {
    it('returns empty array when text is empty', () => {
      expect(parseEmojis('')).toEqual([]);
    });

    it('extracts unique emojis and preserves ZWJ grapheme clusters via Intl.Segmenter', () => {
      const text = 'Launch 🚀 with ❤️‍🔥 and 🚀 again plus 🍎';
      const emojis = parseEmojis(text);
      expect(emojis).toEqual(['🚀', '❤️‍🔥', '🍎']);
    });

    it('falls back to regex extraction when Intl.Segmenter is unavailable', () => {
      const originalIntl = globalThis.Intl;
      vi.stubGlobal('Intl', {});

      const emojis = parseEmojis('Fallback 🚀 and 🍎 test 🚀');
      expect(emojis).toEqual(['🚀', '🍎']);

      const noMatches = parseEmojis('Plain text without emojis');
      expect(noMatches).toEqual([]);

      vi.stubGlobal('Intl', originalIntl);
    });
  });

  describe('uploadToImgBB', () => {
    it('throws an error when API key is missing', async () => {
      await expect(uploadToImgBB('data:image/png;base64,AAAA', '')).rejects.toThrow(
        'ImgBB API Key is required. Please set it in Settings.'
      );
    });

    it('uploads a base64 dataURL string and returns the hosted URL', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { url: 'https://i.ibb.co/example/sticker.png' },
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const url = await uploadToImgBB('data:image/png;base64,iVBORw0KGgo=', 'test-imgbb-key');
      expect(url).toBe('https://i.ibb.co/example/sticker.png');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.imgbb.com/1/upload?key=test-imgbb-key',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('uploads a Blob instance by converting it via FileReader', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { url: 'https://i.ibb.co/blob/sticker.png' },
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const blob = new Blob(['fake-png-bytes'], { type: 'image/png' });
      const url = await uploadToImgBB(blob, 'blob-key');
      expect(url).toBe('https://i.ibb.co/blob/sticker.png');
    });

    it('throws the API error message when ImgBB responds with an error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({
            success: false,
            error: { message: 'Invalid API v1 key.' },
          }),
        })
      );

      await expect(uploadToImgBB('rawBase64String', 'bad-key')).rejects.toThrow('Invalid API v1 key.');
    });

    it('throws default error message when ImgBB response lacks specific error details', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({ success: false }),
        })
      );

      await expect(uploadToImgBB('rawBase64String', 'bad-key')).rejects.toThrow(
        'Failed to upload image to ImgBB'
      );
    });
  });

  describe('uploadToImgur', () => {
    it('throws an error when Client ID is missing', async () => {
      await expect(uploadToImgur('data:image/png;base64,AAAA', '')).rejects.toThrow(
        'Imgur Client ID is required. Please set it in Settings.'
      );
    });

    it('uploads a Blob or dataURL to Imgur and returns the image link', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { link: 'https://i.imgur.com/sticker.png' },
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const blob = new Blob(['fake-image'], { type: 'image/png' });
      const link = await uploadToImgur(blob, 'imgur-client-123');
      expect(link).toBe('https://i.imgur.com/sticker.png');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.imgur.com/3/image',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Client-ID imgur-client-123',
            'Content-Type': 'application/json',
          },
        })
      );

      const linkFromString = await uploadToImgur('data:image/png;base64,AAAA', 'imgur-client-123');
      expect(linkFromString).toBe('https://i.imgur.com/sticker.png');
    });

    it('throws API error message or fallback when Imgur upload fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({
            success: false,
            data: { error: 'Rate limit exceeded' },
          }),
        })
      );

      await expect(uploadToImgur('rawBase64', 'client-id')).rejects.toThrow('Rate limit exceeded');

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({ success: false }),
        })
      );

      await expect(uploadToImgur('rawBase64', 'client-id')).rejects.toThrow(
        'Failed to upload image to Imgur'
      );
    });
  });
});
