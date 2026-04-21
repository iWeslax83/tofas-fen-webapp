import { test, expect } from '@playwright/test';
import path from 'path';

const FIXTURE = path.resolve(__dirname, '../../server/src/test/fixtures/class-list-sample.xls');

const ADMIN_ID = process.env.E2E_ADMIN_ID ?? 'admin1';
const ADMIN_PW = process.env.E2E_ADMIN_PW ?? 'admin123';

test.describe('Password Management — bulk import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    const idInput = page
      .locator('input[type="text"], input[name="id"], input[placeholder*="kimlik" i], input[placeholder*="id" i]')
      .first();
    const passwordInput = page.locator('input[type="password"]').first();
    await idInput.fill(ADMIN_ID);
    await passwordInput.fill(ADMIN_PW);
    const submitButton = page
      .locator('button[type="submit"], button:has-text("Giriş"), button:has-text("Login")')
      .first();
    await submitButton.click();
    // Wait until we leave /login — success path lands on /admin or similar
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10_000 });
  });

  test('upload XLS → preview → import → download credentials → activate', async ({ page }) => {
    await page.goto('/admin/sifre-yonetimi');
    await expect(page.getByText('Şifre Yönetimi')).toBeVisible();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('XLS Seç').click();
    const chooser = await fileChooserPromise;
    await chooser.setFiles(FIXTURE);

    await page.getByRole('button', { name: 'Önizle' }).click();
    await expect(page.getByText(/Toplam:\s*444/)).toBeVisible({ timeout: 10_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'İçe Aktar ve Şifre Üret' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/credentials-\d{8}-[0-9a-f-]+\.xlsx/);

    await expect(page.getByText(/Bekleyen Batch/)).toBeVisible();
    await page.getByRole('button', { name: 'Aktif Et' }).first().click();
    await expect(page.getByText('Bekleyen batch yok.')).toBeVisible({ timeout: 10_000 });
  });
});
