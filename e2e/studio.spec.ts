import { test, expect } from '@playwright/test';

test.describe('Smolji Studio E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Stub external CDN and upload requests so E2E tests are fast and deterministic in CI
    await page.route('https://emoji-cdn.mqrio.dev/**', async (route) => {
      // 1x1 transparent PNG
      const transparentPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: transparentPng,
      });
    });

    await page.goto('/');
  });

  test('renders full studio layout, header controls, canvas, and sidebars', async ({ page }) => {
    await expect(page).toHaveTitle(/Smolji/i);
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

    // Theme toggle
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
    await page.getByTitle('Toggle theme').click();
    await expect(html).toHaveClass(/light/);
    await page.getByTitle('Toggle theme').click();
    await expect(html).toHaveClass(/dark/);

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
      await expect(page.getByRole('button', { name: /Duplicate Layer/i })).toBeVisible();
      await page.getByRole('button', { name: /Duplicate Layer/i }).click();
      await expect(page.getByText('Layer 2')).toBeVisible();
    }

    // Toggle sidebars
    await page.getByTitle('Toggle Asset Library Panel').click();
    await page.getByTitle('Toggle Layer Properties Panel').click();
  });

  test('configures API settings modal, uploads via mocked ImgBB, and downloads PNG sticker', async ({ page }) => {
    await page.route('https://api.imgbb.com/1/upload**', async (route) => {
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
});
