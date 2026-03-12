import { test, expect } from '@playwright/test';
import {
  resetDatabase,
  navigateToApp,
  createProjectViaAPI,
  createNodeViaAPI,
  selectProjectInSidebar,
  getTreeItemByText,
  getTreeItems,
  waitForTreeItem,
} from './helpers';

test.describe('Epic 1 - Story 1.6: Inline Rename & Delete', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToApp(page);
    await resetDatabase(page);
  });

  test.describe('Inline Rename', () => {
    test('Enter key activates inline rename on focused node', async ({
      page,
    }) => {
      const project = await createProjectViaAPI(page, 'Rename Project');
      await createNodeViaAPI(page, 'Original Name', 'effort', project.id);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Rename Project');
      await waitForTreeItem(page, 'Original Name');

      // Focus the node
      await getTreeItemByText(page, 'Original Name').click();

      // Press Enter to start renaming
      await page.keyboard.press('Enter');

      // An input should appear with the current title
      const input = page.getByTestId('tree-row-input');
      await expect(input).toBeVisible();
      await expect(input).toHaveValue('Original Name');
    });

    test('type new name and press Enter to confirm rename', async ({
      page,
    }) => {
      const project = await createProjectViaAPI(page, 'Rename Project');
      await createNodeViaAPI(page, 'Old Title', 'effort', project.id);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Rename Project');
      await waitForTreeItem(page, 'Old Title');

      // Focus and enter rename mode
      await getTreeItemByText(page, 'Old Title').click();
      await page.keyboard.press('Enter');

      const input = page.getByTestId('tree-row-input');
      await input.clear();
      await input.fill('New Title');
      await input.press('Enter');

      // The tree item should now show the new name
      await waitForTreeItem(page, 'New Title');
      await expect(getTreeItemByText(page, 'Old Title')).toBeHidden();
    });

    test('Escape cancels rename and restores original title', async ({
      page,
    }) => {
      const project = await createProjectViaAPI(page, 'Cancel Rename Project');
      await createNodeViaAPI(page, 'Keep This Name', 'effort', project.id);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Cancel Rename Project');
      await waitForTreeItem(page, 'Keep This Name');

      // Enter rename mode
      await getTreeItemByText(page, 'Keep This Name').click();
      await page.keyboard.press('Enter');

      const input = page.getByTestId('tree-row-input');
      await input.clear();
      await input.fill('Changed Text');

      // Press Escape to cancel
      await input.press('Escape');

      // Original name should still be there
      await waitForTreeItem(page, 'Keep This Name');
      await expect(getTreeItemByText(page, 'Changed Text')).toBeHidden();
    });

    test('double-click activates inline rename', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'DblClick Project');
      await createNodeViaAPI(page, 'Double Click Me', 'effort', project.id);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'DblClick Project');
      await waitForTreeItem(page, 'Double Click Me');

      // Double-click the node
      await getTreeItemByText(page, 'Double Click Me').dblclick();

      // Input should appear
      const input = page.getByTestId('tree-row-input');
      await expect(input).toBeVisible();
      await expect(input).toHaveValue('Double Click Me');
    });

    test('rename persists after page reload', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Persist Rename');
      await createNodeViaAPI(page, 'Before Rename', 'effort', project.id);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Persist Rename');
      await waitForTreeItem(page, 'Before Rename');

      // Rename
      await getTreeItemByText(page, 'Before Rename').click();
      await page.keyboard.press('Enter');

      const input = page.getByTestId('tree-row-input');
      await input.clear();
      await input.fill('After Rename');
      await input.press('Enter');

      await waitForTreeItem(page, 'After Rename');

      // Reload and verify persistence
      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Persist Rename');
      await waitForTreeItem(page, 'After Rename');
    });
  });

  test.describe('Delete', () => {
    test('Delete key removes focused node', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Delete Project');
      await createNodeViaAPI(page, 'To Be Deleted', 'effort', project.id, 0);
      await createNodeViaAPI(page, 'Stays Here', 'effort', project.id, 1);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Delete Project');

      await waitForTreeItem(page, 'To Be Deleted');
      await waitForTreeItem(page, 'Stays Here');

      // Focus the node to delete
      await getTreeItemByText(page, 'To Be Deleted').click();

      // Press Delete
      await page.keyboard.press('Delete');

      // The node should be gone
      await expect(getTreeItemByText(page, 'To Be Deleted')).toBeHidden();

      // The other node should still be there
      await expect(getTreeItemByText(page, 'Stays Here')).toBeVisible();
    });

    test('Backspace key also deletes focused node', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Backspace Delete');
      await createNodeViaAPI(page, 'Delete Me', 'effort', project.id, 0);
      await createNodeViaAPI(page, 'Keep Me', 'effort', project.id, 1);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Backspace Delete');

      await waitForTreeItem(page, 'Delete Me');
      await getTreeItemByText(page, 'Delete Me').click();
      await page.keyboard.press('Backspace');

      await expect(getTreeItemByText(page, 'Delete Me')).toBeHidden();
      await expect(getTreeItemByText(page, 'Keep Me')).toBeVisible();
    });

    test('delete moves focus to next sibling', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Focus After Delete');
      await createNodeViaAPI(page, 'First', 'effort', project.id, 0);
      await createNodeViaAPI(page, 'Second', 'effort', project.id, 1);
      await createNodeViaAPI(page, 'Third', 'effort', project.id, 2);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Focus After Delete');

      await waitForTreeItem(page, 'Second');
      await getTreeItemByText(page, 'Second').click();
      await page.keyboard.press('Delete');

      // Focus should move to next sibling "Third"
      await expect(getTreeItemByText(page, 'Third')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    test('delete node with descendants removes entire subtree', async ({
      page,
    }) => {
      const project = await createProjectViaAPI(page, 'Cascade Delete');
      const effort = await createNodeViaAPI(
        page,
        'Parent Effort',
        'effort',
        project.id
      );
      await createNodeViaAPI(page, 'Child Task', 'task', effort.id);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Cascade Delete');

      // Expand to see children
      await waitForTreeItem(page, 'Parent Effort');
      await getTreeItemByText(page, 'Parent Effort')
        .getByRole('button', { name: /Expand|Collapse/ })
        .click();
      await waitForTreeItem(page, 'Child Task');

      // Delete the parent
      await getTreeItemByText(page, 'Parent Effort').click();
      await page.keyboard.press('Delete');

      // Both parent and child should be gone
      await expect(getTreeItemByText(page, 'Parent Effort')).toBeHidden();
      await expect(getTreeItemByText(page, 'Child Task')).toBeHidden();
    });

    test('delete via trash icon button on hover', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Icon Delete');
      await createNodeViaAPI(page, 'Hover Delete Me', 'effort', project.id);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Icon Delete');

      await waitForTreeItem(page, 'Hover Delete Me');

      // Hover over the node to reveal the delete button
      await getTreeItemByText(page, 'Hover Delete Me').hover();

      // Click the delete button (it becomes visible on hover via CSS)
      const deleteBtn = getTreeItemByText(page, 'Hover Delete Me').getByTestId(
        'tree-row-delete'
      );
      // Force click since it may have opacity: 0 but still clickable
      await deleteBtn.click({ force: true });

      await expect(getTreeItemByText(page, 'Hover Delete Me')).toBeHidden();
    });

    test('deletion persists after page reload', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'Persist Delete');
      await createNodeViaAPI(page, 'Will Be Deleted', 'effort', project.id, 0);
      await createNodeViaAPI(page, 'Will Remain', 'effort', project.id, 1);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Persist Delete');

      await waitForTreeItem(page, 'Will Be Deleted');
      await getTreeItemByText(page, 'Will Be Deleted').click();
      await page.keyboard.press('Delete');

      await expect(getTreeItemByText(page, 'Will Be Deleted')).toBeHidden();

      // Reload and verify
      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'Persist Delete');

      await waitForTreeItem(page, 'Will Remain');
      await expect(getTreeItemByText(page, 'Will Be Deleted')).toBeHidden();
    });

    test('no confirmation dialog shown on delete', async ({ page }) => {
      const project = await createProjectViaAPI(page, 'No Confirm');
      await createNodeViaAPI(page, 'Quick Delete', 'effort', project.id);

      await page.reload();
      await page.locator('nav').first().waitFor({ state: 'visible' });
      await selectProjectInSidebar(page, 'No Confirm');

      await waitForTreeItem(page, 'Quick Delete');
      await getTreeItemByText(page, 'Quick Delete').click();

      // Set up a listener for dialog events (confirm/alert)
      let dialogAppeared = false;
      page.on('dialog', () => {
        dialogAppeared = true;
      });

      await page.keyboard.press('Delete');

      // Node should be deleted immediately without dialog
      await expect(getTreeItemByText(page, 'Quick Delete')).toBeHidden();
      expect(dialogAppeared).toBe(false);
    });
  });
});
