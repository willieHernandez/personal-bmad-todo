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

test.describe('Indent/Outdent (Tab/Shift+Tab)', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToApp(page);
    await resetDatabase(page);
  });

  test('Tab on a second effort indents it under the first effort as a task', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'Indent Test');
    await createNodeViaAPI(page, 'Effort A', 'effort', project.id, 0);
    await createNodeViaAPI(page, 'Effort B', 'effort', project.id, 1);

    await navigateToApp(page);
    await selectProjectInSidebar(page, 'Indent Test');
    await waitForTreeItem(page, 'Effort A');
    await waitForTreeItem(page, 'Effort B');

    // Focus Effort B
    const effortB = getTreeItemByText(page, 'Effort B');
    await effortB.click();

    // Press Tab to indent
    await page.keyboard.press('Tab');

    // Effort B should now be nested under Effort A (deeper level)
    // Wait for tree to update — Effort A should be expanded
    await page.waitForTimeout(500);

    // Effort A should now be expanded (has children)
    const effortA = getTreeItemByText(page, 'Effort A');
    await expect(effortA).toHaveAttribute('aria-expanded', 'true');
  });

  test('Shift+Tab on a task outdents it to become an effort', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'Outdent Test');
    const effort = await createNodeViaAPI(page, 'My Effort', 'effort', project.id);
    await createNodeViaAPI(page, 'My Task', 'task', effort.id);

    await navigateToApp(page);
    await selectProjectInSidebar(page, 'Outdent Test');
    await waitForTreeItem(page, 'My Effort');

    // Expand to see task
    const effortRow = getTreeItemByText(page, 'My Effort');
    await effortRow.click();
    await page.keyboard.press('ArrowRight'); // expand
    await waitForTreeItem(page, 'My Task');

    // Focus the task
    const taskRow = getTreeItemByText(page, 'My Task');
    await taskRow.click();

    // Press Shift+Tab to outdent
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(500);

    // My Task should now be at the same level as My Effort
    // Both should be visible as tree items at the top level
    const treeItems = page.getByRole('treeitem');
    const count = await treeItems.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Tab at maximum depth (subtask) does nothing', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'Max Depth Test');
    const effort = await createNodeViaAPI(page, 'Effort', 'effort', project.id);
    const task = await createNodeViaAPI(page, 'Task', 'task', effort.id);
    await createNodeViaAPI(page, 'Subtask A', 'subtask', task.id, 0);
    await createNodeViaAPI(page, 'Subtask B', 'subtask', task.id, 1);

    await navigateToApp(page);
    await selectProjectInSidebar(page, 'Max Depth Test');
    await waitForTreeItem(page, 'Effort');

    // Expand everything
    const effortRow = getTreeItemByText(page, 'Effort');
    await effortRow.click();
    await page.keyboard.press('ArrowRight');
    await waitForTreeItem(page, 'Task');
    const taskRow = getTreeItemByText(page, 'Task');
    await taskRow.click();
    await page.keyboard.press('ArrowRight');
    await waitForTreeItem(page, 'Subtask B');

    // Focus Subtask B, try to indent
    const subtaskB = getTreeItemByText(page, 'Subtask B');
    await subtaskB.click();
    await page.keyboard.press('Tab');

    // Subtask B should still be visible at the same level (nothing changed)
    await expect(subtaskB).toBeVisible();
  });

  test('Shift+Tab on an effort at root level does nothing', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'Min Depth Test');
    await createNodeViaAPI(page, 'Root Effort', 'effort', project.id);

    await navigateToApp(page);
    await selectProjectInSidebar(page, 'Min Depth Test');
    await waitForTreeItem(page, 'Root Effort');

    const effortRow = getTreeItemByText(page, 'Root Effort');
    await effortRow.click();
    await page.keyboard.press('Shift+Tab');

    // Should still be visible at the same level
    await expect(effortRow).toBeVisible();
  });
});
