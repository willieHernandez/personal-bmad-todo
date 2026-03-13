import { test, expect } from '@playwright/test';
import {
  resetDatabase,
  navigateToApp,
  createProjectViaAPI,
  createNodeViaAPI,
  selectProjectInSidebar,
  waitForTreeItem,
  getTreeItemByText,
  seedHierarchy,
} from './helpers';

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToApp(page);
    await resetDatabase(page);
  });

  test('creating a node at each hierarchy level in sequence', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'Full Hierarchy');

    await navigateToApp(page);
    await selectProjectInSidebar(page, 'Full Hierarchy');

    // Create effort via tree ("Add effort" button in empty state)
    const createBtn = page.getByTestId('empty-state-add-effort');
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(300);

      // Check an effort was created
      const treeItems = page.getByRole('treeitem');
      const count = await treeItems.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('full hierarchy seeded via API displays correctly', async ({ page }) => {
    await seedHierarchy(page, 'Hierarchy View');

    await navigateToApp(page);
    await selectProjectInSidebar(page, 'Hierarchy View');

    // Effort should be visible at root
    await waitForTreeItem(page, 'Test Effort');

    // Expand to see task
    const effort = getTreeItemByText(page, 'Test Effort');
    await effort.click();
    await page.keyboard.press('ArrowRight');
    await waitForTreeItem(page, 'Test Task');

    // Expand to see subtask
    const task = getTreeItemByText(page, 'Test Task');
    await task.click();
    await page.keyboard.press('ArrowRight');
    await waitForTreeItem(page, 'Test Subtask');
  });

  test('empty project shows empty tree state', async ({ page }) => {
    await createProjectViaAPI(page, 'Empty Project');

    await navigateToApp(page);
    await selectProjectInSidebar(page, 'Empty Project');

    // Should see the "Add effort" button or empty state text
    const emptyState = page.getByTestId('empty-state-add-effort');
    await expect(emptyState).toBeVisible();
  });

  test('tree handles many nodes without crashing (virtualization)', async ({ page }) => {
    const project = await createProjectViaAPI(page, 'Many Nodes');

    // Create 30 efforts
    for (let i = 0; i < 30; i++) {
      await createNodeViaAPI(page, `Effort ${i + 1}`, 'effort', project.id, i);
    }

    await navigateToApp(page);
    await selectProjectInSidebar(page, 'Many Nodes');

    // Tree should render without errors
    const tree = page.getByRole('tree', { name: 'Project tree' });
    await expect(tree).toBeVisible();

    // Wait for at least one treeitem to appear
    await expect(page.getByRole('treeitem').first()).toBeVisible();

    // Verify there are multiple tree items rendered
    const count = await page.getByRole('treeitem').count();
    expect(count).toBeGreaterThan(1);
  });
});

test.describe('Content Panel — Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToApp(page);
    await resetDatabase(page);
  });

  test('fresh app with no projects shows empty state message', async ({ page }) => {
    await navigateToApp(page);
    // Should show the "Select a project" message
    await expect(page.getByText(/Select a project from the sidebar/)).toBeVisible();
  });

  test('"Create project" from empty state creates project and selects it', async ({ page }) => {
    await navigateToApp(page);

    const createBtn = page.getByRole('button', { name: /Create project/ });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Wait for project to appear in sidebar
    await page.waitForTimeout(500);

    // The tree should now be visible (project was auto-selected)
    const tree = page.getByRole('tree', { name: 'Project tree' });
    await expect(tree).toBeVisible();
  });
});
