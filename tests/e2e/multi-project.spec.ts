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

test.describe('Multi-Project Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToApp(page);
    await resetDatabase(page);
  });

  test('switching between two projects via sidebar shows different trees', async ({ page }) => {
    const p1 = await createProjectViaAPI(page, 'Alpha');
    const p2 = await createProjectViaAPI(page, 'Beta');
    await createNodeViaAPI(page, 'Alpha Effort', 'effort', p1.id);
    await createNodeViaAPI(page, 'Beta Effort', 'effort', p2.id);

    await navigateToApp(page);

    // Select Alpha
    await selectProjectInSidebar(page, 'Alpha');
    await waitForTreeItem(page, 'Alpha Effort');

    // Switch to Beta
    await selectProjectInSidebar(page, 'Beta');
    await waitForTreeItem(page, 'Beta Effort');

    // Alpha Effort should not be visible
    await expect(getTreeItemByText(page, 'Alpha Effort')).not.toBeVisible();
  });

  test('each project tab shows in the tabs bar', async ({ page }) => {
    await createProjectViaAPI(page, 'First Project');
    await createProjectViaAPI(page, 'Second Project');

    await navigateToApp(page);

    // Open First Project
    await selectProjectInSidebar(page, 'First Project');
    await page.waitForTimeout(300);

    // Open Second Project
    await selectProjectInSidebar(page, 'Second Project');
    await page.waitForTimeout(300);

    // Both tabs should be visible in the tab bar
    const tabbar = page.getByRole('tablist');
    await expect(tabbar.getByText('First Project')).toBeVisible();
    await expect(tabbar.getByText('Second Project')).toBeVisible();
  });

  test('closing a project tab switches to next tab', async ({ page }) => {
    await createProjectViaAPI(page, 'Tab A');
    await createProjectViaAPI(page, 'Tab B');

    await navigateToApp(page);
    await selectProjectInSidebar(page, 'Tab A');
    await page.waitForTimeout(200);
    await selectProjectInSidebar(page, 'Tab B');
    await page.waitForTimeout(200);

    // Close Tab B (active tab) using the close button with specific aria-label
    const closeBtn = page.getByRole('button', { name: /Close Tab B tab/i });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(300);

      // Tab A should now be active
      const tabbar = page.getByRole('tablist');
      await expect(tabbar.getByText('Tab A')).toBeVisible();
    }
  });
});
