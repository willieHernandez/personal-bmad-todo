import { test, expect } from '@playwright/test';
import {
  resetDatabase,
  navigateToApp,
  createProjectViaAPI,
  createNodeViaAPI,
  selectProjectInSidebar,
  getTreeItemByText,
  waitForTreeItem,
} from './helpers';

test.describe('Epic 2 - Story 2.1: Detail Panel & Tabbed Views', () => {
  let projectId: string;
  let effortId: string;

  test.beforeEach(async ({ page }) => {
    await navigateToApp(page);
    await resetDatabase(page);

    // Seed hierarchy: project > effort > 3 tasks
    const project = await createProjectViaAPI(page, 'Detail Panel Project');
    projectId = project.id;
    const effort = await createNodeViaAPI(page, 'Effort One', 'effort', projectId, 0);
    effortId = effort.id;
    await createNodeViaAPI(page, 'Task Alpha', 'task', effortId, 0);
    await createNodeViaAPI(page, 'Task Beta', 'task', effortId, 1);
    await createNodeViaAPI(page, 'Task Gamma', 'task', effortId, 2);

    await page.reload();
    await page.locator('nav').first().waitFor({ state: 'visible' });
    await selectProjectInSidebar(page, 'Detail Panel Project');

    // Expand effort to see tasks
    const effortItem = getTreeItemByText(page, 'Effort One');
    const expanded = await effortItem.getAttribute('aria-expanded');
    if (expanded === 'false') {
      await effortItem.getByRole('button', { name: /Expand|Collapse/ }).click();
    }
    await waitForTreeItem(page, 'Task Alpha');
  });

  test('AC1: clicking a node opens the detail panel with title and content', async ({ page }) => {
    // Click a task
    await getTreeItemByText(page, 'Task Alpha').click();

    // Detail panel should appear with complementary role
    const panel = page.getByRole('complementary', { name: 'Task detail panel' });
    await expect(panel).toBeVisible();

    // Panel shows the node title in a tab
    await expect(panel.getByRole('tab', { name: /Task Alpha/ })).toBeVisible();

    // Tree remains visible beside the panel
    await expect(getTreeItemByText(page, 'Effort One')).toBeVisible();
  });

  test('AC1: detail panel shows type badge and content area', async ({ page }) => {
    await getTreeItemByText(page, 'Task Alpha').click();

    const panel = page.getByRole('complementary', { name: 'Task detail panel' });
    // Type badge within the tabpanel content
    const tabpanel = panel.getByRole('tabpanel');
    await expect(tabpanel.getByText('task', { exact: true })).toBeVisible();
    // Tabpanel role is present
    await expect(panel.getByRole('tabpanel')).toBeVisible();
  });

  test('AC2: clicking different nodes opens multiple tabs', async ({ page }) => {
    // Open first tab
    await getTreeItemByText(page, 'Task Alpha').click();
    const panel = page.getByRole('complementary', { name: 'Task detail panel' });
    await expect(panel).toBeVisible();

    // Open second tab
    await getTreeItemByText(page, 'Task Beta').click();

    // Tab bar should show both tabs
    const tablist = panel.getByRole('tablist');
    await expect(tablist).toBeVisible();
    const tabs = tablist.getByRole('tab');
    await expect(tabs).toHaveCount(2);

    // Both node names should appear in tabs
    await expect(tablist.getByText('Task Alpha')).toBeVisible();
    await expect(tablist.getByText('Task Beta')).toBeVisible();
  });

  test('AC2: clicking a tab switches to it', async ({ page }) => {
    await getTreeItemByText(page, 'Task Alpha').click();
    await getTreeItemByText(page, 'Task Beta').click();

    const panel = page.getByRole('complementary', { name: 'Task detail panel' });
    const tablist = panel.getByRole('tablist');

    // Task Beta should be active (most recently opened)
    const betaTab = tablist.getByRole('tab', { name: /Task Beta/ });
    await expect(betaTab).toHaveAttribute('aria-selected', 'true');

    // Click the Task Alpha tab
    const alphaTab = tablist.getByRole('tab', { name: /Task Alpha/ });
    await alphaTab.click();
    await expect(alphaTab).toHaveAttribute('aria-selected', 'true');
    await expect(betaTab).toHaveAttribute('aria-selected', 'false');

    // Content should show Task Alpha
    await expect(panel.getByRole('tabpanel').getByText('Task Alpha')).toBeVisible();
  });

  test('AC3: Escape key closes the detail panel', async ({ page }) => {
    await getTreeItemByText(page, 'Task Alpha').click();

    const panel = page.getByRole('complementary', { name: 'Task detail panel' });
    await expect(panel).toBeVisible();

    // Press Escape on the panel
    await page.keyboard.press('Escape');

    // Panel should close (width collapses to 0)
    // The tablist and content should no longer be visible
    await expect(panel.getByRole('tablist')).toBeHidden();
  });

  test('AC3: back button closes the detail panel', async ({ page }) => {
    await getTreeItemByText(page, 'Task Alpha').click();

    const panel = page.getByRole('complementary', { name: 'Task detail panel' });
    await expect(panel).toBeVisible();

    // Click the close/back button
    await panel.getByRole('button', { name: 'Close detail panel' }).click();

    // Panel content should be gone
    await expect(panel.getByRole('tablist')).toBeHidden();
  });

  test('AC3: focus returns to tree after panel close', async ({ page }) => {
    await getTreeItemByText(page, 'Task Alpha').click();

    const panel = page.getByRole('complementary', { name: 'Task detail panel' });
    await expect(panel).toBeVisible();

    // Close the panel
    await page.keyboard.press('Escape');

    // Focus should return to the tree — a treeitem should be focused
    const focusedRole = await page.evaluate(() => document.activeElement?.getAttribute('role'));
    expect(['treeitem', 'tree']).toContain(focusedRole);
  });

  test('AC4: closing a tab removes it and activates adjacent', async ({ page }) => {
    // Open 3 tabs
    await getTreeItemByText(page, 'Task Alpha').click();
    await getTreeItemByText(page, 'Task Beta').click();
    await getTreeItemByText(page, 'Task Gamma').click();

    const panel = page.getByRole('complementary', { name: 'Task detail panel' });
    const tablist = panel.getByRole('tablist');

    // Close the active tab (Task Gamma)
    const gammaCloseBtn = tablist.getByLabel(/Close Task Gamma tab/);
    await gammaCloseBtn.click();

    // Should now have 2 tabs
    await expect(tablist.getByRole('tab')).toHaveCount(2);

    // Adjacent tab (Task Beta) should now be active
    await expect(tablist.getByRole('tab', { name: /Task Beta/ })).toHaveAttribute('aria-selected', 'true');
  });

  test('AC4: closing the last tab closes the panel entirely', async ({ page }) => {
    await getTreeItemByText(page, 'Task Alpha').click();

    const panel = page.getByRole('complementary', { name: 'Task detail panel' });
    const tablist = panel.getByRole('tablist');

    // Close the only tab
    const closeBtn = tablist.getByLabel(/Close Task Alpha tab/);
    await closeBtn.click();

    // Panel content should be hidden
    await expect(panel.getByRole('tablist')).toBeHidden();
  });

  test('AC5: ARIA roles tablist, tab, and tabpanel are present', async ({ page }) => {
    await getTreeItemByText(page, 'Task Alpha').click();

    const panel = page.getByRole('complementary', { name: 'Task detail panel' });

    // tablist
    const tablist = panel.getByRole('tablist');
    await expect(tablist).toBeVisible();

    // tab
    const tab = tablist.getByRole('tab');
    await expect(tab).toHaveCount(1);
    await expect(tab).toHaveAttribute('aria-selected', 'true');

    // tabpanel with aria-labelledby
    const tabpanel = panel.getByRole('tabpanel');
    await expect(tabpanel).toBeVisible();
    const labelledBy = await tabpanel.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
  });

  test('AC5: tab keyboard navigation with arrow keys', async ({ page }) => {
    // Open multiple tabs
    await getTreeItemByText(page, 'Task Alpha').click();
    await getTreeItemByText(page, 'Task Beta').click();
    await getTreeItemByText(page, 'Task Gamma').click();

    const panel = page.getByRole('complementary', { name: 'Task detail panel' });
    const tablist = panel.getByRole('tablist');

    // Focus the active tab
    const gammaTab = tablist.getByRole('tab', { name: /Task Gamma/ });
    await gammaTab.focus();

    // ArrowLeft should move to Task Beta
    await page.keyboard.press('ArrowLeft');
    const betaTab = tablist.getByRole('tab', { name: /Task Beta/ });
    await expect(betaTab).toHaveAttribute('aria-selected', 'true');

    // ArrowLeft again to Task Alpha
    await page.keyboard.press('ArrowLeft');
    const alphaTab = tablist.getByRole('tab', { name: /Task Alpha/ });
    await expect(alphaTab).toHaveAttribute('aria-selected', 'true');

    // ArrowRight back to Task Beta
    await page.keyboard.press('ArrowRight');
    await expect(betaTab).toHaveAttribute('aria-selected', 'true');
  });

  test('middle-click closes a tab', async ({ page }) => {
    await getTreeItemByText(page, 'Task Alpha').click();
    await getTreeItemByText(page, 'Task Beta').click();

    const panel = page.getByRole('complementary', { name: 'Task detail panel' });
    const tablist = panel.getByRole('tablist');

    // Middle-click the first tab
    const alphaTab = tablist.getByRole('tab', { name: /Task Alpha/ });
    await alphaTab.click({ button: 'middle' });

    // Should only have 1 tab remaining
    await expect(tablist.getByRole('tab')).toHaveCount(1);
    await expect(tablist.getByText('Task Beta')).toBeVisible();
  });

  test('double-click still enters rename mode (no conflict)', async ({ page }) => {
    // Double-click should trigger rename, not just open the panel
    const treeItem = getTreeItemByText(page, 'Task Alpha');
    await treeItem.dblclick();

    // An input for renaming should appear
    const input = page.getByTestId('tree-row-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('Task Alpha');

    // Cancel the rename
    await input.press('Escape');
  });
});
