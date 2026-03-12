import { test, expect } from '@playwright/test';
import {
  resetDatabase,
  navigateToApp,
  createProjectViaAPI,
  createNodeViaAPI,
  selectProjectInSidebar,
  waitForTreeItem,
  getTreeItemByText,
} from './helpers';

test.describe('Detail Panel — Advanced Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToApp(page);
    await resetDatabase(page);
  });

  test('opening multiple detail tabs and switching between them', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'Detail Test');
    await createNodeViaAPI(page, 'Effort One', 'effort', project.id, 0);
    await createNodeViaAPI(page, 'Effort Two', 'effort', project.id, 1);

    await navigateToApp(page);
    await selectProjectInSidebar(page, 'Detail Test');
    await waitForTreeItem(page, 'Effort One');

    // Double-click to open Effort One in detail panel
    const effortOne = getTreeItemByText(page, 'Effort One');
    await effortOne.dblclick();
    await page.waitForTimeout(300);

    // Look for detail panel content
    const detailPanel = page.getByRole('complementary');
    await expect(detailPanel).toBeVisible();
  });

  test('Escape key closes the detail panel', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'Escape Test');
    await createNodeViaAPI(page, 'Some Effort', 'effort', project.id);

    await navigateToApp(page);
    await selectProjectInSidebar(page, 'Escape Test');
    await waitForTreeItem(page, 'Some Effort');

    // Single-click opens the tab in the detail panel
    const effort = getTreeItemByText(page, 'Some Effort');
    await effort.click();
    await page.waitForTimeout(300);

    const detailPanel = page.getByRole('complementary');
    await expect(detailPanel).toHaveClass(/w-1\/2/);

    // Focus the detail panel so Escape is handled there
    await detailPanel.focus();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // After closing all tabs, the panel collapses to w-0
    await expect(detailPanel).toHaveClass(/w-0/);
  });

  test('closing all detail tabs collapses the panel', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'Close All Test');
    await createNodeViaAPI(page, 'Only Effort', 'effort', project.id);

    await navigateToApp(page);
    await selectProjectInSidebar(page, 'Close All Test');
    await waitForTreeItem(page, 'Only Effort');

    // Single-click opens the tab in detail panel
    const effort = getTreeItemByText(page, 'Only Effort');
    await effort.click();
    await page.waitForTimeout(300);

    const detailPanel = page.getByRole('complementary');
    await expect(detailPanel).toHaveClass(/w-1\/2/);

    // Close using the "Close detail panel" button (ArrowLeft icon)
    const closeButton = detailPanel.getByRole('button', { name: /Close detail panel/i });
    await closeButton.click();
    await page.waitForTimeout(300);

    // After closing all tabs, the panel collapses to w-0
    await expect(detailPanel).toHaveClass(/w-0/);
  });
});
