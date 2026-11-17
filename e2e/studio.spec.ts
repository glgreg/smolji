import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import { test, expect } from '@playwright/test';
import { GifWriter, GifReader } from 'omggif';

const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

function crc32(bytes: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createSolidPngBuffer(width: number, height: number): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const offset = y * rowSize;
    raw[offset] = 0;
    for (let x = 0; x < width; x++) {
      const px = offset + 1 + x * 4;
      raw[px] = 194;
      raw[px + 1] = 62;
      raw[px + 2] = 26;
      raw[px + 3] = 255;
    }
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function createAnimatedGifBuffer(): Buffer {
  const buf = new Uint8Array(4096);
  const writer = new GifWriter(buf, 8, 8, { loop: 0 });
  writer.addFrame(0, 0, 8, 8, new Array<number>(64).fill(0), {
    palette: [0xc23e1a, 0x000000],
    delay: 6,
    disposal: 2,
  });
  writer.addFrame(0, 0, 8, 8, new Array<number>(64).fill(0), {
    palette: [0x10b981, 0x000000],
    delay: 8,
    disposal: 2,
  });
  const len = writer.end();
  return Buffer.from(buf.subarray(0, len));
}

test.describe('Smolji Landing Page (/) & Navigation E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://emoji-cdn.mqrio.dev/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: TRANSPARENT_PNG,
      });
    });
  });

  test('renders creative foundry landing page, interactive specimen proof, non-exclusive FAQ, and zero-login CTA to /playground', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Smolji/i);
    await expect(
      page.getByRole('heading', { level: 1, name: /Layer emojis into sharp PNG stickers/i })
    ).toBeVisible();

    // Interactive specimen proof bench
    await page.getByRole('button', { name: '🔥' }).click();
    await page.getByRole('button', { name: 'Google Noto' }).click();
    await expect(page.getByAltText(/🔥 rendered in Google Noto sticker style/i)).toBeVisible();
    await page.getByRole('button', { name: 'Circle' }).click();
    await expect(page.getByRole('button', { name: 'Circle' })).toHaveAttribute('aria-pressed', 'true');

    // Multiple FAQ items can stay open independently
    const faqFirst = page.getByText(/Do I need an account or login to open the Playground\?/i);
    const faqSecond = page.getByText(/Which emoji sets are licensed for commercial sticker packs\?/i);
    await faqFirst.click();
    await faqSecond.click();
    await expect(page.getByText(/opens straight into the canvas studio/i)).toBeVisible();
    await expect(page.getByText(/MIT\), Twitter Twemoji/i)).toBeVisible();

    // Click primary CTA to enter /playground without login or barriers
    await page.getByRole('link', { name: /Open Playground/i }).first().click();
    await expect(page).toHaveURL(/\/playground$/);
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByText('Studio Assets')).toBeVisible();
  });

  test('switches responsive header to popover menu on narrow mobile viewports', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const menuBtn = page.getByRole('button', { name: /Menu/i });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    await expect(page.getByRole('link', { name: 'Styles', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'FAQ', exact: true })).toBeVisible();
  });
});

test.describe('Smolji Studio E2E Suite (/playground)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://emoji-cdn.mqrio.dev/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: TRANSPARENT_PNG,
      });
    });

    await page.goto('/playground');
  });

  test('renders full studio layout, header controls, canvas, and sidebars', async ({ page }) => {
    await expect(page).toHaveTitle(/Playground \| Smolji/i);
    await expect(page.getByRole('heading', { name: 'Smolji' })).toBeVisible();
    await expect(page.getByText('Studio Assets')).toBeVisible();
    await expect(page.getByText('Layers Hierarchy')).toBeVisible();
    await expect(page.getByText('Artboard Style')).toBeVisible();

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('converts shortcodes, autocompletes suggestions, and adds layers to hierarchy', async ({ page }) => {
    const textarea = page.getByPlaceholder(/Search emoji by shortcode/i);
    await expect(textarea).toBeVisible();

    // Type full shortcode :fire: and verify auto-replacement
    await textarea.fill(':fire:');
    await expect(textarea).toHaveValue('🔥');

    // Click detected emoji to add a new layer
    const detectedSection = page.locator('span:has-text("Detected Emojis")').locator('..');
    await detectedSection.getByRole('button', { name: '🔥' }).click();
    await expect(page.getByText('Layer added to workspace.')).toBeVisible();
    await expect(page.getByText('Layer 2')).toBeVisible();

    // Trigger autocomplete suggestions with partial shortcode
    await textarea.fill(':rock');
    const rocketSuggestion = page.getByRole('button', { name: /:rocket:/i });
    await expect(rocketSuggestion).toBeVisible();
    await rocketSuggestion.click();
    await expect(page.getByText('Layer 3')).toBeVisible();
  });

  test('updates layer properties, reorders layers, and enforces single-layer minimum invariant', async ({ page }) => {
    // Attempt to delete the only layer -> should trigger guard toast
    await page.getByTitle('Delete Layer').click();
    await expect(page.getByText('At least one layer must remain in workspace!')).toBeVisible();

    // Change visual style via custom StudioSelect dropdown
    const styleTrigger = page.getByRole('combobox', { name: 'Visual Style' });
    await styleTrigger.click();
    await page.getByRole('option', { name: /Google Noto/i }).click();
    await expect(styleTrigger).toContainText('Google Noto');

    // Spawn a second layer from Style Variations Explorer
    await page.getByTitle('Spawn new Layer in this style').first().click();
    await expect(page.getByText('Layer 2')).toBeVisible();

    // Reorder layers and delete the second layer
    await page.getByTitle('Move Down').nth(1).click();
    await page.getByTitle('Move Up').first().click();
    await page.getByTitle('Delete Layer').nth(1).click();
    await expect(page.getByText('Layer deleted.')).toBeVisible();
  });

  test('customizes artboard style, toggles theme & sidebars, and uses viewport zoom and context menu', async ({ page }) => {
    // Zoom controls
    await expect(page.getByText('85%')).toBeVisible();
    await page.getByTitle('Zoom In').click();
    await expect(page.getByText('100%').first()).toBeVisible();
    await page.getByTitle('Zoom Out').click();
    await expect(page.getByText('85%')).toBeVisible();
    await page.getByTitle('Recenter view').click();

    // Theme toggle respects system default (light in headless) and persists explicit dark override
    const html = page.locator('html');
    await expect(html).toHaveClass(/light/);
    await page.getByTitle('Toggle theme').click();
    await expect(html).toHaveClass(/dark/);
    await page.reload();
    await expect(html).toHaveClass(/dark/);
    await page.getByTitle('Toggle theme').click();
    await expect(html).toHaveClass(/light/);

    // Artboard background modes
    await page.getByRole('button', { name: 'Invisible' }).click();
    await page.getByRole('button', { name: 'Solid' }).click();
    await expect(page.getByRole('button', { name: 'Open color picker' })).toBeVisible();
    await expect(page.getByLabel('Hex color code')).toBeVisible();
    await page.getByRole('button', { name: 'Gradient' }).click();
    await page.getByTitle('Cyberpunk').click();

    // Right-click canvas to open custom context menu and duplicate layer
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await canvas.evaluate(
        (el, coords) => {
          el.dispatchEvent(
            new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              clientX: coords.cx,
              clientY: coords.cy,
              button: 2,
            })
          );
        },
        { cx, cy }
      );
      await expect(page.getByRole('menuitem', { name: /Duplicate Layer/i })).toBeVisible();
      await page.getByRole('menuitem', { name: /Duplicate Layer/i }).click();
      await expect(page.getByText('Layer 2')).toBeVisible();
    }

    // Toggle sidebars
    await page.getByTitle('Toggle Asset Library Panel').click();
    await page.getByTitle('Toggle Layer Properties Panel').click();
  });

  test('configures API settings modal, uploads via mocked ImgBB, and downloads PNG sticker', async ({ page }) => {
    await page.route('https://api.imgbb.com/1/upload**', async (route) => {
      const bodyText = route.request().postData() ?? '';
      const match = /name="image"\r\n\r\n([^\r\n]+)/.exec(bodyText);
      const imageValue = match?.[1] ?? '';

      if (!imageValue || imageValue.startsWith('data:') || !/^[A-Za-z0-9+/=]+$/.test(imageValue)) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            status_code: 400,
            error: { message: 'Invalid base64 string.' },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { url: 'https://i.ibb.co/e2e/smolji.png' },
        }),
      });
    });

    // Clicking Link via ImgBB without key opens Settings modal
    await page.getByRole('button', { name: 'Link via ImgBB' }).click();
    await expect(page.getByRole('heading', { name: /API Settings/i })).toBeVisible();

    await page.locator('#settings-imgbb-key').fill('e2e-imgbb-key');
    await page.locator('#settings-imgur-id').fill('e2e-imgur-id');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('API Keys saved successfully!')).toBeVisible();

    // Upload via ImgBB and verify Direct Link Result
    await page.getByRole('button', { name: 'Link via ImgBB' }).click();
    await expect(page.locator('input[value="https://i.ibb.co/e2e/smolji.png"]')).toBeVisible();

    // Trigger PNG sticker download and verify filename
    const downloadPromise = page.waitForEvent('download');
    await page.getByTitle('Download PNG sticker file').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^smolji_.*_sticker_512px\.png$/);
  });

  test('supports 64px and 2048px export resolutions cleanly', async ({ page }) => {
    await page.getByRole('button', { name: '64px', exact: true }).click();
    const download64Promise = page.waitForEvent('download');
    await page.getByTitle('Download PNG sticker file').click();
    const download64 = await download64Promise;
    expect(download64.suggestedFilename()).toMatch(/^smolji_.*_sticker_64px\.png$/);

    await page.getByRole('button', { name: '2048px', exact: true }).click();
    const download2048Promise = page.waitForEvent('download');
    await page.getByTitle('Download PNG sticker file').click();
    const download2048 = await download2048Promise;
    expect(download2048.suggestedFilename()).toMatch(/^smolji_.*_sticker_2048px\.png$/);
    const savedPath = await download2048.path();
    expect(savedPath).toBeTruthy();
    if (savedPath) {
      const bytes = await fs.readFile(savedPath);
      expect(bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(true);
    }
  });

  test('imports external images, replaces with SVG, accepts clipboard paste event, and runs transform parity', async ({ page }) => {
    const uploadInput = page.locator('input[aria-label="Upload external image files"]');
    await uploadInput.setInputFiles({
      name: 'banner-wide.png',
      mimeType: 'image/png',
      buffer: createSolidPngBuffer(40, 20),
    });

    await expect(page.getByText('Added image "banner-wide.png".')).toBeVisible();
    await expect(page.getByText('Image Source')).toBeVisible();
    await expect(page.getByText('40×20px')).toBeVisible();

    // Parity controls on external image layer
    await page.getByTitle('Flip Horizontal').click();
    await page.getByTitle('Flip Vertical').click();
    await page.getByTitle('Duplicate active layer').click();
    await expect(page.getByText('Layer duplicated.')).toBeVisible();

    // Replace active layer with an SVG graphic
    const replaceInput = page.locator('input[aria-label="Replace layer image file"]');
    await replaceInput.setInputFiles({
      name: 'vector-mark.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect width="120" height="60" fill="#c23e1a"/></svg>'),
    });
    await expect(page.getByText('Replaced image with vector-mark.svg.')).toBeVisible();
    await expect(page.getByText('120×60px')).toBeVisible();

    // Simulate clipboard paste event on window with a PNG File
    const pngBase64 = createSolidPngBuffer(16, 16).toString('base64');
    await page.evaluate((b64) => {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      const file = new File([bytes], 'clipboard-e2e.png', { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      const evt = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      });
      window.dispatchEvent(evt);
    }, pngBase64);

    await expect(page.getByText('Added image "clipboard-e2e.png".')).toBeVisible();

    // Export PNG composed with pasted image layers
    const downloadPromise = page.waitForEvent('download');
    await page.getByTitle('Download PNG sticker file').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^smolji_.*_sticker_512px\.png$/);
  });

  test('plays animated emoji live in canvas and exports a valid multi-frame GIF89a file', async ({ page }) => {
    const gifBuffer = createAnimatedGifBuffer();
    await page.route('https://emoji-cdn.mqrio.dev/**', async (route) => {
      if (route.request().url().includes('style=animated-noto-color-emoji')) {
        await route.fulfill({
          status: 200,
          contentType: 'image/gif',
          body: gifBuffer,
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: TRANSPARENT_PNG,
      });
    });

    const styleTrigger = page.getByRole('combobox', { name: 'Visual Style' });
    await styleTrigger.click();
    await page.getByRole('option', { name: /Animated Noto/i }).click();

    await expect(page.getByText('ANIM', { exact: true })).toBeVisible();
    const playToggle = page.getByRole('button', { name: 'Play canvas animation' });
    await expect(playToggle).toBeVisible();
    await expect(playToggle).toHaveAttribute('aria-pressed', 'true');

    await playToggle.click();
    await expect(playToggle).toHaveAttribute('aria-pressed', 'false');
    await playToggle.click();
    await expect(playToggle).toHaveAttribute('aria-pressed', 'true');

    const gifDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Save GIF sticker/i }).click();
    const gifDownload = await gifDownloadPromise;
    expect(gifDownload.suggestedFilename()).toMatch(/^smolji_.*_sticker_512px\.gif$/);
    await expect(page.getByText('GIF saved!')).toBeVisible();

    const gifPath = await gifDownload.path();
    expect(gifPath).toBeTruthy();
    if (gifPath) {
      const exportedBytes = await fs.readFile(gifPath);
      expect(exportedBytes.subarray(0, 6).toString('ascii')).toBe('GIF89a');
      const reader = new GifReader(exportedBytes);
      expect(reader.numFrames()).toBeGreaterThanOrEqual(2);
    }
  });
});
