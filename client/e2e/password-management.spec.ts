import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// The client package is ESM ("type": "module"), so CommonJS __dirname is not
// available — derive it from import.meta.url instead.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FIXTURE = path.resolve(__dirname, '../../server/src/test/fixtures/class-list-sample.xls');

const ADMIN_ID = process.env.E2E_ADMIN_ID ?? 'admin1';
// Seed users (server/src/seed/testUsers.ts) all use this password. The old
// default ('admin123') never matched the seed, so the suite only ran when
// the caller happened to export E2E_ADMIN_PW.
const ADMIN_PW = process.env.E2E_ADMIN_PW ?? '123456';

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:3001';
const ORIGIN = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

/**
 * Delete every pending password-import batch via the API. The test mutates a
 * shared database, so without this it is not isolated: leftover batches from a
 * prior (or failed) run break the "Bekleyen yükleme yok." assertion. Run it both
 * before (clear pollution) and after (clean up our own batch) the test.
 *
 * Uses page.request so the browser context's auth cookie is reused; adds the
 * Referer + double-submit X-CSRF-Token the server's csrfProtection requires.
 */
async function cleanupPendingBatches(page: Page): Promise<void> {
  const cookies = await page.context().cookies();
  const csrf = cookies.find((c) => c.name === 'csrfToken')?.value;
  const headers: Record<string, string> = { Referer: `${ORIGIN}/` };
  if (csrf) headers['X-CSRF-Token'] = csrf;

  const listed = await page.request.get(`${API_BASE}/api/admin/passwords/batches`, { headers });
  if (!listed.ok()) return;
  const body = (await listed.json()) as { items?: Array<{ batchId: string }> };
  for (const b of body.items ?? []) {
    await page.request.delete(
      `${API_BASE}/api/admin/passwords/batch/${encodeURIComponent(b.batchId)}`,
      { headers },
    );
  }
}

test.describe('Password Management — bulk import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    const idInput = page
      .locator(
        'input[type="text"], input[name="id"], input[placeholder*="kimlik" i], input[placeholder*="id" i]',
      )
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

  test.afterEach(async ({ page }) => {
    // Clean up whatever this test imported so the next run starts clean.
    await cleanupPendingBatches(page);
  });

  test('upload XLS → preview → import → download credentials → activate', async ({ page }) => {
    // The commit step performs ~444 user upserts against the (potentially
    // remote) database plus server-side XLSX generation, which routinely
    // exceeds the default 30s test timeout even though the feature works.
    test.setTimeout(120_000);

    // Start from a clean slate — drop any batches a previous/failed run left
    // behind, so the final "no pending batches" assertion is deterministic.
    await cleanupPendingBatches(page);

    await page.goto('/admin/sifre-yonetimi');
    // The page now uses the shared dashboard shell, so "Şifre Yönetimi" appears
    // both in the breadcrumb and the page heading. Target the heading to stay
    // unambiguous under strict mode.
    await expect(page.getByRole('heading', { name: 'Şifre Yönetimi' })).toBeVisible();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('XLS Seç').click();
    const chooser = await fileChooserPromise;
    await chooser.setFiles(FIXTURE);

    await page.getByRole('button', { name: 'Önizle' }).click();
    await expect(page.getByText(/Toplam:\s*444/)).toBeVisible({ timeout: 15_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'İçe Aktar ve Şifre Üret' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/credentials-\d{8}-[0-9a-f-]+\.xlsx/);

    await expect(page.getByText(/Bekleyen Yükleme/)).toBeVisible();
    await page.getByRole('button', { name: 'Aktif Et' }).first().click();
    await expect(page.getByText('Bekleyen yükleme yok.')).toBeVisible({ timeout: 15_000 });
  });
});
