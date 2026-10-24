import { expect, test } from '@playwright/test';

/**
 * The critical demo path, exercised through the real UI:
 * load sample → baseline → disruption → impact → recovery → compare → export.
 */
test.describe('Pre-Mortem Dispatch — critical workflow', () => {
  test('baseline to disruption to recovery to export', async ({ page }) => {
    // --- 1. Load the bundled sample dataset -------------------------------
    await page.goto('/datasets');
    await expect(page.getByRole('heading', { name: 'Datasets', exact: true })).toBeVisible();

    await page.getByRole('button', { name: /load sample dataset/i }).click();
    await expect(page.getByText(/Dataset imported/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/No issues/i)).toBeVisible();

    // --- 2. Generate the baseline plan -----------------------------------
    await page.goto('/planner');
    await page.getByRole('button', { name: /generate baseline/i }).click();
    await expect(page.getByText(/Baseline plan created/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('All demand fulfilled under the modelled constraints.')).toBeVisible();

    // --- 3. Simulate a route closure -------------------------------------
    await page.goto('/disruption');
    await page.getByLabel('Disruption type').selectOption('route_closure');
    await page.getByLabel('Route').selectOption('RT-03');
    await page.getByRole('button', { name: /simulate disruption/i }).click();

    await expect(page.getByText(/Route closure: set route RT-03 available=False/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Unmet demand after disruption')).toBeVisible();
    // Fulfillment must visibly degrade from the 100% baseline
    await expect(page.getByText(/^89\.9% fulfilled$/)).toBeVisible();

    // --- 4. Run recovery -------------------------------------------------
    await page.goto('/recovery');
    await page.getByRole('button', { name: /run recovery/i }).click();
    await expect(page.getByRole('button', { name: /re-run recovery/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Recovery actions')).toBeVisible();
    await expect(page.getByText(/Trade-off explanation/i)).toBeVisible();

    // --- 5. Compare ------------------------------------------------------
    await page.goto('/compare');
    await expect(page.getByText('KPI comparison')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Recovered', { exact: false }).first()).toBeVisible();

    // --- 6. Export -------------------------------------------------------
    await page.goto('/exports');
    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await page.getByRole('button', { name: /download csv/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/pre-mortem-scenario-.*\.csv/);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const csv = Buffer.concat(chunks).toString('utf8');

    expect(csv).toContain('Allocations');
    expect(csv).toContain('KPIs');
    expect(csv).toContain('RT-03'); // baseline used the lane that we later closed
  });

  test('empty states explain what to do next', async ({ page }) => {
    await page.goto('/recovery');
    // The scenario selector and its empty-state guidance must both be reachable
    await expect(page.getByLabel('Scenario')).toBeVisible();
    await expect(page.getByText('No recovery run yet.')).toBeVisible();
  });
});
